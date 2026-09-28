import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fuelRecords } from "@/db/schema";
import { sql, desc } from "drizzle-orm";
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

// ── GET: جلب سجلات الوقود ──
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db.select().from(fuelRecords).orderBy(desc(fuelRecords.id));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET Fuel Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST: إضافة سجل وقود بـ Drizzle ORM الصريح (بدون أخطاء ترتيب) ──
export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    // معالجة صيغة التاريخ بذكاء لضمان صيغة YYYY-MM-DD
    let formattedDate: string | null = null;
    if (body.fuelDate || body.fuel_date) {
      const rawDate = String(body.fuelDate || body.fuel_date).trim();
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toISOString().slice(0, 10);
        }
      }
    }

    // تجهيز الكائن بالأسماء المتطابقة مع Drizzle Schema
    const insertData = {
      vehicleId: body.vehicleId ? Number(body.vehicleId) : null,
      plateNumber: String(body.plateNumber || body.plate_number || ""),
      driverName: String(body.driverName || body.driver_name || ""),
      liters: String(body.liters ?? 0),
      costPerLiter: String(body.costPerLiter ?? body.cost_per_liter ?? 0),
      totalCost: String(body.totalCost ?? body.total_cost ?? 0),
      odometer: body.odometer ? Number(body.odometer) : 0,
      station: String(body.station || ""),
      fuelDate: formattedDate,
    };

    // 1. الإدخال المباشر عن طريق Drizzle ORM لمنع لخبطة الترتيب
    const [insertedRow] = await db.insert(fuelRecords).values(insertData).returning();

    // 2. ⚡ التزامن التلقائي: تحديث عداد السيارة الكلي في جدول السيارات
    if (insertData.vehicleId && insertData.odometer > 0) {
      try {
        await db.execute(sql`
          UPDATE vehicles 
          SET current_km = GREATEST(COALESCE(current_km, 0), ${insertData.odometer})
          WHERE id = ${insertData.vehicleId}
        `);
      } catch (syncErr) {
        console.error("Auto-sync Vehicle Km Error:", syncErr);
      }
    }

    return NextResponse.json({ success: true, data: insertedRow }, { status: 201 });
  } catch (error: any) {
    console.error("POST Fuel Error:", error);
    return NextResponse.json({ error: `فشل الحفظ: ${error?.message || String(error)}` }, { status: 500 });
  }
}
