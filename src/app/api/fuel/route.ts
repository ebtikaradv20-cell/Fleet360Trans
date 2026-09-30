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
    const raw = await db.execute(sql`SELECT * FROM fuel_records WHERE tenant_id = ${user.tenantId} AND is_deleted = 0 ORDER BY id DESC`);
    return NextResponse.json((raw as any).rows || raw || []);
  } catch (error) { return NextResponse.json([], { status: 200 }); }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    let plateNumber = String(body.plateNumber || "").trim();
    let vehicleId = body.vehicleId ? Number(body.vehicleId) : null;
    if (!plateNumber) return NextResponse.json({ error: "رقم اللوحة مطلوب" }, { status: 400 });

    const litersNum = Number(body.liters) || 0;
    const costPerLiterNum = Number(body.costPerLiter) || 0;
    const totalCostNum = Number(body.totalCost) || (litersNum * costPerLiterNum);
    const odometerNum = Number(body.odometer) || 0;

    const result = await db.execute(sql`
      INSERT INTO fuel_records (tenant_id, vehicle_id, plate_number, driver_name, liters, cost_per_liter, total_cost, odometer, station, fuel_date)
      VALUES (${user.tenantId}, ${vehicleId}, ${plateNumber}, ${body.driverName || ""}, ${litersNum}, ${costPerLiterNum}, ${totalCostNum}, ${odometerNum}, ${body.station || ""}, ${body.fuelDate || null})
      RETURNING *
    `);
    
    // ⚡ تحديث عداد السيارة
    if (vehicleId && odometerNum > 0) {
      try { await db.execute(sql`UPDATE vehicles SET current_km = GREATEST(COALESCE(current_km, 0), ${odometerNum}) WHERE id = ${vehicleId} AND tenant_id = ${user.tenantId}`); } catch {}
    }

    // ⚡ تسجيل الحركة في الـ Audit Log أوتوماتيكياً
    try {
      await db.execute(sql`
        INSERT INTO history_logs (tenant_id, plate_number, module_name, action_type, user_name)
        VALUES (${user.tenantId}, ${plateNumber}, 'سجلات الوقود', 'إضافة فاتورة وقود جديدة', ${user.username})
      `);
    } catch (logErr) { console.error("History Log Error:", logErr); }

    return NextResponse.json({ success: true, data: (result as any).rows?.[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: `فشل الحفظ: ${error.message}` }, { status: 500 });
  }
}
