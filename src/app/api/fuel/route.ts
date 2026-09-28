import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fuelRecords } from "@/db/schema";
import { ilike, or, and, gte, lte, sql } from "drizzle-orm";
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

// ── GET: جلب سجلات الوقود مع الفلاتر والبحث ──
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const driver = searchParams.get("driver") || "";
    const station = searchParams.get("station") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    let conditions = [];
    if (search) conditions.push(or(ilike(fuelRecords.plateNumber, `%${search}%`), ilike(fuelRecords.driverName, `%${search}%`)));
    if (driver) conditions.push(ilike(fuelRecords.driverName, `%${driver}%`));
    if (station) conditions.push(ilike(fuelRecords.station, `%${station}%`));
    if (from) conditions.push(gte(fuelRecords.createdAt, new Date(from)));
    if (to) conditions.push(lte(fuelRecords.createdAt, new Date(to + "T23:59:59")));

    const rows = conditions.length > 0
      ? await db.select().from(fuelRecords).where(and(...conditions)).orderBy(sql`${fuelRecords.createdAt} DESC`)
      : await db.select().from(fuelRecords).orderBy(sql`${fuelRecords.createdAt} DESC`);

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET Fuel Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST: إضافة سجل وقود جديد + تحديث عداد السيارة التلقائي ──
export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && !user.permissions?.includes("fuel:write")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const payload = {
      vehicleId: body.vehicleId ? Number(body.vehicleId) : null,
      plateNumber: body.plateNumber || body.plate_number || "",
      driverName: body.driverName || body.driver_name || "",
      liters: body.liters !== undefined ? String(body.liters) : "0",
      costPerLiter: body.costPerLiter !== undefined ? String(body.costPerLiter) : "0",
      totalCost: body.totalCost !== undefined ? String(body.totalCost) : "0",
      odometer: body.odometer ? Number(body.odometer) : 0,
      station: body.station || "",
      fuelDate: body.fuelDate || body.fuel_date || null,
    };

    // 1. إضافة سجل الوقود
    const [row] = await db.insert(fuelRecords).values(payload).returning();

    // 2. ⚡ التزامن التلقائي: تحديث عداد الكيلومتر في جدول السيارات تلقائياً
    const targetVehicleId = payload.vehicleId;
    const odometer = payload.odometer;

    if (targetVehicleId && odometer > 0) {
      try {
        await db.execute(sql`
          UPDATE vehicles 
          SET current_km = GREATEST(COALESCE(current_km, 0), ${odometer})
          WHERE id = ${targetVehicleId}
        `);
      } catch (syncErr) {
        console.error("Auto-sync Vehicle Km Error on Fuel POST:", syncErr);
      }
    }

    return NextResponse.json(row, { status: 201 });
  } catch (error: any) {
    console.error("POST Fuel Error:", error);
    return NextResponse.json({ error: error.message || "فشل في تسجيل سجل الوقود" }, { status: 500 });
  }
}
