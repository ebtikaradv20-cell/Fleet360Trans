import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { oilChanges, vehicles } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

function auth(req: NextRequest) {
  try {
    const token = req.cookies.get("fleet360_token")?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

// ── GET: جلب سجلات الزيوت مع فحص تنبيهات الكيلومترات ──
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    let conditions = [];
    if (vehicleId) conditions.push(eq(oilChanges.vehicleId, parseInt(vehicleId)));
    if (from) conditions.push(gte(oilChanges.createdAt, new Date(from)));
    if (to) conditions.push(lte(oilChanges.createdAt, new Date(to + "T23:59:59")));

    const rows = conditions.length > 0
      ? await db.select().from(oilChanges).where(and(...conditions)).orderBy(oilChanges.createdAt)
      : await db.select().from(oilChanges).orderBy(oilChanges.createdAt);

    const allVehicles = await db.select().from(vehicles);
    const enriched = rows.map(r => {
      const v = allVehicles.find(v => v.id === r.vehicleId);
      const currentKm = v?.currentKm || 0;
      const kmAlert = r.nextChangeKm && r.alertKmBefore
        ? (r.nextChangeKm - currentKm) <= r.alertKmBefore
        : false;
      const now = new Date();
      const nextDate = r.nextChangeDate ? new Date(r.nextChangeDate) : null;
      const dayAlert = nextDate && r.alertDaysBefore
        ? Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= r.alertDaysBefore
        : false;
      return { ...r, kmAlert, dayAlert, currentKm };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error("GET Oil Changes Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST: إضافة سجل زيت + تحديث الكيلومتر في جدول السيارات تلقائياً ──
export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // 1. إضافة سجل تغيير الزيت
    const [row] = await db.insert(oilChanges).values(body).returning();

    // 2. ⚡ التزامن التلقائي: تحديث عداد السيارة في جدول السيارات فوراً
    const targetVehicleId = Number(body.vehicleId || row?.vehicleId);
    const kmAtChange = Number(body.kmAtChange || row?.kmAtChange || 0);

    if (targetVehicleId && kmAtChange > 0) {
      try {
        await db.execute(sql`
          UPDATE vehicles 
          SET current_km = GREATEST(COALESCE(current_km, 0), ${kmAtChange})
          WHERE id = ${targetVehicleId}
        `);
      } catch (syncErr) {
        console.error("Failed to auto-sync vehicle currentKm:", syncErr);
      }
    }

    return NextResponse.json(row, { status: 201 });
  } catch (error: any) {
    console.error("POST Oil Changes Error:", error);
    return NextResponse.json({ error: error.message || "فشل في إضافة سجل تغيير الزيت" }, { status: 500 });
  }
}
