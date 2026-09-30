import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantFilter = user.role === "super_admin" || user.role === "owner" ? sql`1=1` : sql`tenant_id = ${user.tenantId}`;

    // ── الإحصائيات الأساسية ──
    const vCount = await db.execute(sql`SELECT COUNT(*) as count FROM vehicles WHERE is_deleted = 0 AND ${tenantFilter}`);
    const woCount = await db.execute(sql`SELECT COUNT(*) as count FROM work_orders WHERE status != 'completed' AND is_deleted = 0 AND ${tenantFilter}`);
    const fuelCost = await db.execute(sql`SELECT COALESCE(SUM(total_cost::numeric), 0) as total FROM fuel_records WHERE is_deleted = 0 AND ${tenantFilter}`);
    
    // ── التنبيهات ──
    const licenseAlertsRaw = await db.execute(sql`SELECT id, plate_number FROM vehicles WHERE license_expiry IS NOT NULL AND license_expiry <= (CURRENT_DATE + INTERVAL '30 days') AND is_deleted = 0 AND ${tenantFilter}`);
    const oilAlertsRaw = await db.execute(sql`SELECT id, plate_number FROM oil_changes WHERE is_deleted = 0 AND ((next_change_date IS NOT NULL AND next_change_date <= (CURRENT_DATE + INTERVAL '7 days')) OR (next_change_km > 0 AND (next_change_km - km_at_change) <= alert_km_before)) AND ${tenantFilter}`);

    // ── 📊 التحليلات المالية (آخر 6 شهور) ──
    const monthlyStatsRaw = await db.execute(sql`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
        SUM(CASE WHEN source = 'fuel' THEN cost ELSE 0 END) as fuel_cost,
        SUM(CASE WHEN source = 'maintenance' THEN cost ELSE 0 END) as maintenance_cost
      FROM (
        SELECT fuel_date as created_at, total_cost as cost, 'fuel' as source FROM fuel_records WHERE is_deleted = 0 AND ${tenantFilter}
        UNION ALL
        SELECT start_date as created_at, cost, 'maintenance' as source FROM work_orders WHERE is_deleted = 0 AND ${tenantFilter}
      ) combined_data
      WHERE created_at >= (CURRENT_DATE - INTERVAL '6 months')
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `);

    return NextResponse.json({
      totalVehicles: Number((vCount as any).rows?.[0]?.count || 0),
      openWorkOrders: Number((woCount as any).rows?.[0]?.count || 0),
      totalFuelCost: Number((fuelCost as any).rows?.[0]?.total || 0),
      licenseAlerts: ((licenseAlertsRaw as any).rows || []).length,
      oilAlerts: ((oilAlertsRaw as any).rows || []).length,
      monthlyAnalytics: (monthlyStatsRaw as any).rows || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: "API Error" }, { status: 500 });
  }
}
