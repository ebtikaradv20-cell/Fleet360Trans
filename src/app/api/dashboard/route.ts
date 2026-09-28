import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // إحصائيات سريعة من قاعدة البيانات
    const vehiclesCount = await db.execute(sql`SELECT COUNT(*) as count FROM vehicles`);
    const openOrders = await db.execute(
      sql`SELECT COUNT(*) as count FROM work_orders WHERE status != 'completed'`
    );
    const fuelCost = await db.execute(
      sql`SELECT COALESCE(SUM(total_cost::numeric), 0) as total FROM fuel_records`
    );
    const lowStock = await db.execute(
      sql`SELECT COUNT(*) as count FROM spare_parts WHERE quantity <= minimum_quantity`
    );

    // تنبيهات
    const licenseAlerts = await db.execute(sql`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE license_expiry IS NOT NULL 
      AND license_expiry <= (CURRENT_DATE + INTERVAL '30 days')
    `);

    const oilAlerts = await db.execute(sql`
      SELECT COUNT(*) as count FROM oil_changes 
      WHERE next_change_date IS NOT NULL 
      AND next_change_date <= (CURRENT_DATE + INTERVAL '7 days')
    `);

    const vRows = (vehiclesCount as any).rows || vehiclesCount;
    const oRows = (openOrders as any).rows || openOrders;
    const fRows = (fuelCost as any).rows || fuelCost;
    const sRows = (lowStock as any).rows || lowStock;
    const lRows = (licenseAlerts as any).rows || licenseAlerts;
    const oilRows = (oilAlerts as any).rows || oilAlerts;

    return NextResponse.json({
      totalVehicles: Number(vRows?.[0]?.count || 0),
      openWorkOrders: Number(oRows?.[0]?.count || 0),
      totalFuelCost: Number(fRows?.[0]?.total || 0),
      lowStockParts: Number(sRows?.[0]?.count || 0),
      licenseAlerts: Number(lRows?.[0]?.count || 0),
      oilAlerts: Number(oilRows?.[0]?.count || 0),
      insuranceAlerts: 0,
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({
      totalVehicles: 0,
      openWorkOrders: 0,
      totalFuelCost: 0,
      lowStockParts: 0,
      licenseAlerts: 0,
      oilAlerts: 0,
      insuranceAlerts: 0,
    });
  }
}
