import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fuelRecords } from "@/db/schema";
import { sql } from "drizzle-orm";
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

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const raw = await db.execute(sql`SELECT * FROM fuel_records ORDER BY id DESC`);
    return NextResponse.json(raw.rows || raw);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST: معالجة آمنة للحقول لمنع خطأ Neon DB ──
export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // 🔴 السر هنا: تحويل القيم لنوع الرقم الصحيح بدلاً من النصوص
    const payload = {
      vehicleId: Number(body.vehicleId) || null,
      plateNumber: body.plateNumber || "",
      driverName: body.driverName || "",
      liters: Number(body.liters) || 0,
      costPerLiter: Number(body.costPerLiter) || 0,
      totalCost: Number(body.totalCost) || 0,
      odometer: Number(body.odometer) || 0,
      station: body.station || "",
      fuelDate: body.fuelDate && body.fuelDate.trim() !== "" ? body.fuelDate : null,
    };

    // 1. إضافة سجل الوقود بـ Execute لتخطي صرامة الـ Types
    const result = await db.execute(sql`
      INSERT INTO fuel_records (vehicle_id, plate_number, driver_name, liters, cost_per_liter, total_cost, odometer, station, fuel_date)
      VALUES (${payload.vehicleId}, ${payload.plateNumber}, ${payload.driverName}, ${payload.liters}, ${payload.costPerLiter}, ${payload.totalCost}, ${payload.odometer}, ${payload.station}, ${payload.fuelDate})
      RETURNING *
    `);

    const newRow = result.rows?.[0] || result[0];

    // 2. تحديث عداد السيارة التلقائي
    if (payload.vehicleId && payload.odometer > 0) {
      try {
        await db.execute(sql`
          UPDATE vehicles 
          SET current_km = GREATEST(COALESCE(current_km, 0), ${payload.odometer})
          WHERE id = ${payload.vehicleId}
        `);
      } catch (syncErr) {
        console.error("Sync Error:", syncErr);
      }
    }

    return NextResponse.json({ success: true, data: newRow }, { status: 201 });
  } catch (error: any) {
    console.error("POST Fuel Error:", error);
    return NextResponse.json({ error: `فشل الحفظ: ${error.message}` }, { status: 500 });
  }
}
