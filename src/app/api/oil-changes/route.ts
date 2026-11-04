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

    const tenantFilter =
      user.role === "super_admin" || user.role === "owner" || !user.tenantId
        ? sql`1=1`
        : sql`(tenant_id = ${user.tenantId} OR tenant_id IS NULL OR tenant_id = 'master')`;

    const records = await db.execute(sql`
      SELECT 
        id,
        tenant_id,
        vehicle_id,
        COALESCE(plate_number, '') as plate_number,
        COALESCE(plate_number, '') as "plateNumber",
        COALESCE(oil_type, 'تغيير زيت وفلاتر') as oil_type,
        COALESCE(oil_type, 'تغيير زيت وفلاتر') as "oilType",
        COALESCE(brand, oil_brand, '-') as brand,
        COALESCE(filter_type, CASE WHEN filter_changed = 1 THEN 'مع فلتر' ELSE 'بدون فلتر' END) as "filterType",
        COALESCE(current_km, odometer_at_change, 0) as "currentKm",
        COALESCE(current_km, odometer_at_change, 0) as current_km,
        COALESCE(next_km, next_change_km, 0) as "nextKm",
        COALESCE(next_km, next_change_km, 0) as next_km,
        COALESCE(cost, 0)::numeric as cost,
        COALESCE(change_date::text, created_at::date::text, '') as "changeDate",
        COALESCE(change_date::text, created_at::date::text, '') as change_date,
        COALESCE(is_deleted, 0) as is_deleted
      FROM oil_changes
      WHERE (is_deleted = 0 OR is_deleted IS NULL) AND ${tenantFilter}
      ORDER BY id DESC
    `);

    const rows = (records as any).rows || records || [];
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET oil-changes error:", error);
    return NextResponse.json({ error: "API Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const currentKm = parseFloat(String(body.currentKm ?? body.current_km ?? 0)) || 0;
    const nextKm = parseFloat(String(body.nextKm ?? body.next_km ?? 0)) || 0;
    const cost = parseFloat(String(body.cost ?? body.total_cost ?? 0)) || 0;
    const oilType = String(body.oilType || body.oil_type || "تغيير زيت وفلاتر").trim();
    const brand = String(body.brand || "").trim();
    const changeDate = body.changeDate || body.change_date || new Date().toISOString().slice(0, 10);
    const filterType = String(body.filterType || "مع فلتر");
    const filterChanged = filterType.includes("مع") ? 1 : 0;

    await db.execute(sql`
      UPDATE oil_changes
      SET
        oil_type = ${oilType},
        brand = ${brand},
        oil_brand = ${brand},
        cost = ${cost},
        change_date = ${changeDate}::date,
        current_km = ${currentKm},
        odometer_at_change = ${currentKm},
        next_km = ${nextKm},
        next_change_km = ${nextKm},
        filter_changed = ${filterChanged},
        filter_type = ${filterType}
      WHERE id = ${Number(id)}
    `);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT oil-changes error:", error);
    return NextResponse.json({ error: "Failed to update", details: error?.message }, { status: 500 });
  }
}
