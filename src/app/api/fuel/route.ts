import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fuelRecords, vehicles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ⚡ السطر السحري لفصل البيانات حسب الفرع
    const raw = await db.execute(sql`SELECT * FROM fuel_records WHERE tenant_id = ${user.tenantId} ORDER BY id DESC`);
    return NextResponse.json((raw as any).rows || raw || []);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const b = await req.json().catch(() => ({}));
    let plateNumber = String(b.plateNumber || "").trim();
    let vehicleId = b.vehicleId ? Number(b.vehicleId) : null;

    if (!plateNumber) return NextResponse.json({ error: "رقم اللوحة مطلوب" }, { status: 400 });

    const litersNum = Number(b.liters) || 0;
    const costPerLiterNum = Number(b.costPerLiter) || 0;
    const totalCostNum = Number(b.totalCost) || (litersNum * costPerLiterNum);
    const odometerNum = Number(b.odometer) || 0;

    // ⚡ إدخال الفرع إجبارياً
    const result = await db.execute(sql`
      INSERT INTO fuel_records (tenant_id, vehicle_id, plate_number, driver_name, liters, cost_per_liter, total_cost, odometer, station, fuel_date)
      VALUES (${user.tenantId}, ${vehicleId}, ${plateNumber}, ${b.driverName || ""}, ${litersNum}, ${costPerLiterNum}, ${totalCostNum}, ${odometerNum}, ${b.station || ""}, ${b.fuelDate || null})
      RETURNING *
    `);
    
    if (vehicleId && odometerNum > 0) {
      try {
        await db.execute(sql`UPDATE vehicles SET current_km = GREATEST(COALESCE(current_km, 0), ${odometerNum}) WHERE id = ${vehicleId} AND tenant_id = ${user.tenantId}`);
      } catch {}
    }

    return NextResponse.json({ success: true, data: (result as any).rows?.[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: `فشل الحفظ: ${error.message}` }, { status: 500 });
  }
}
