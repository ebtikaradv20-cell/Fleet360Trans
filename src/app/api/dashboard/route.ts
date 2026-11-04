import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try { 
    return verifyToken(req.cookies.get("fleet360_token")?.value || ""); 
  } catch { 
    return null; 
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ✅ فلتر المستأجر المطور لدعم السجلات العامة والمستوردة
    const tenantFilter =
      user.role === "super_admin" || user.role === "owner" || !user.tenantId
        ? sql`1=1`
        : sql`(tenant_id = ${user.tenantId} OR tenant_id IS NULL OR tenant_id = 'master')`;

    // ── 📊 1. التحليلات المالية الشهرية الحقيقية (آخر 6 شهور) مع معالجة التواريخ والـ Nulls ──
    const monthlyStatsRaw = await db.execute(sql`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
        DATE_TRUNC('month', created_at) as sort_date,
        COALESCE(SUM(CASE WHEN source = 'fuel' THEN cost ELSE 0 END), 0)::numeric as fuel_cost,
        COALESCE(SUM(CASE WHEN source = 'fuel' THEN liters ELSE 0 END), 0)::numeric as fuel_liters,
        COALESCE(SUM(CASE WHEN source = 'maintenance' THEN cost ELSE 0 END), 0)::numeric as maintenance_cost
      FROM (
        SELECT 
          COALESCE(fuel_date::timestamp, created_at, NOW()) as created_at, 
          COALESCE(NULLIF(total_cost::text, '')::numeric, 0) as cost,
          COALESCE(NULLIF(liters::text, '')::numeric, 0) as liters,
          'fuel' as source 
        FROM fuel_records 
        WHERE (is_deleted = 0 OR is_deleted IS NULL) AND ${tenantFilter}
        
        UNION ALL
        
        SELECT 
          COALESCE(start_date::timestamp, created_at, NOW()) as created_at, 
          COALESCE(NULLIF(cost::text, '')::numeric, 0) as cost,
          0 as liters,
          'maintenance' as source 
        FROM work_orders 
        WHERE (is_deleted = 0 OR is_deleted IS NULL) AND ${tenantFilter}
      ) combined_data
      WHERE created_at >= (CURRENT_DATE - INTERVAL '6 months')
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `);

    // ── 📊 2. ملخص شامل وحقيقي لجميع المعاملات (Total Operations Summary) ──
    const totalStatsRaw = await db.execute(sql`
      SELECT
        COALESCE(COUNT(CASE WHEN source = 'fuel' THEN 1 END), 0) as total_fuel_ops,
        COALESCE(SUM(CASE WHEN source = 'fuel' THEN cost ELSE 0 END), 0)::numeric as total_fuel_cost,
        COALESCE(SUM(CASE WHEN source = 'fuel' THEN liters ELSE 0 END), 0)::numeric as total_fuel_liters,
        
        COALESCE(COUNT(CASE WHEN source = 'maintenance' THEN 1 END), 0) as total_maintenance_ops,
        COALESCE(SUM(CASE WHEN source = 'maintenance' THEN cost ELSE 0 END), 0)::numeric as total_maintenance_cost,

        COALESCE(SUM(CASE WHEN source = 'fuel' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN cost ELSE 0 END), 0)::numeric as this_month_fuel_cost,
        COALESCE(SUM(CASE WHEN source = 'fuel' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN liters ELSE 0 END), 0)::numeric as this_month_fuel_liters,
        COALESCE(SUM(CASE WHEN source = 'maintenance' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN cost ELSE 0 END), 0)::numeric as this_month_maintenance_cost
      FROM (
        SELECT 
          COALESCE(fuel_date::timestamp, created_at, NOW()) as created_at, 
          COALESCE(NULLIF(total_cost::text, '')::numeric, 0) as cost,
          COALESCE(NULLIF(liters::text, '')::numeric, 0) as liters,
          'fuel' as source 
        FROM fuel_records 
        WHERE (is_deleted = 0 OR is_deleted IS NULL) AND ${tenantFilter}
        
        UNION ALL
        
        SELECT 
          COALESCE(start_date::timestamp, created_at, NOW()) as created_at, 
          COALESCE(NULLIF(cost::text, '')::numeric, 0) as cost,
          0 as liters,
          'maintenance' as source 
        FROM work_orders 
        WHERE (is_deleted = 0 OR is_deleted IS NULL) AND ${tenantFilter}
      ) all_transactions
    `);

    // ── 📊 3. عدد المركبات الفعلي ──
    const vehicleCountRaw = await db.execute(sql`
      SELECT COUNT(*)::int as count FROM vehicles WHERE (is_deleted = 0 OR is_deleted IS NULL) AND ${tenantFilter}
    `);

    // ── 📊 4. أحدث المعاملات المكتملة ──
    const recentTransactionsRaw = await db.execute(sql`
      SELECT 
        id,
        'fuel' as type,
        COALESCE(plate_number, '') as plate_number,
        COALESCE(driver_name, '') as driver_name,
        COALESCE(NULLIF(total_cost::text, '')::numeric, 0) as cost,
        COALESCE(NULLIF(liters::text, '')::numeric, 0) as liters,
        COALESCE(fuel_date::timestamp, created_at, NOW()) as date,
        COALESCE(station, '') as station
      FROM fuel_records
      WHERE (is_deleted = 0 OR is_deleted IS NULL) AND ${tenantFilter}
      ORDER BY date DESC
      LIMIT 10
    `);

    const monthlyRows = ((monthlyStatsRaw as any).rows || monthlyStatsRaw || []).map((r: any) => ({
      month: r.month,
      fuel_cost: Number(r.fuel_cost) || 0,
      fuel_liters: Number(r.fuel_liters) || 0,
      maintenance_cost: Number(r.maintenance_cost) || 0,
      fuelCost: Number(r.fuel_cost) || 0,
      maintenanceCost: Number(r.maintenance_cost) || 0,
    }));

    const totalStats = ((totalStatsRaw as any).rows || totalStatsRaw || [])[0] || {};
    const vehicleCount = ((vehicleCountRaw as any).rows || vehicleCountRaw || [])[0]?.count || 0;
    const recentTx = ((recentTransactionsRaw as any).rows || recentTransactionsRaw || []).map((t: any) => ({
      ...t,
      cost: Number(t.cost) || 0,
      liters: Number(t.liters) || 0,
    }));

    const summary = {
      totalVehicles: Number(vehicleCount) || 0,
      totalFuelCost: Number(totalStats.total_fuel_cost) || 0,
      totalFuelLiters: Number(totalStats.total_fuel_liters) || 0,
      totalFuelOperations: Number(totalStats.total_fuel_ops) || 0,
      totalMaintenanceCost: Number(totalStats.total_maintenance_cost) || 0,
      totalMaintenanceOperations: Number(totalStats.total_maintenance_ops) || 0,
      thisMonthFuelCost: Number(totalStats.this_month_fuel_cost) || 0,
      thisMonthFuelLiters: Number(totalStats.this_month_fuel_liters) || 0,
      thisMonthMaintenanceCost: Number(totalStats.this_month_maintenance_cost) || 0,
      // كواشف التوافق للواجهات بمختلف المسميات:
      fuel_cost: Number(totalStats.total_fuel_cost) || 0,
      fuel_liters: Number(totalStats.total_fuel_liters) || 0,
      maintenance_cost: Number(totalStats.total_maintenance_cost) || 0,
    };

    return NextResponse.json({
      success: true,
      monthlyAnalytics: monthlyRows,
      summary,
      stats: summary,
      recentTransactions: recentTx,
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "API Error", details: error?.message }, { status: 500 });
  }
}
