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

    const { searchParams } = new URL(req.url);
    const vId = searchParams.get("vehicleId");

    // ⚡ فلترة بالفرع
    let raw;
    if (vId) {
      raw = await db.execute(sql`SELECT * FROM oil_changes WHERE tenant_id = ${user.tenantId} AND vehicle_id = ${Number(vId)} ORDER BY id DESC`);
    } else {
      raw = await db.execute(sql`SELECT * FROM oil_changes WHERE tenant_id = ${user.tenantId} ORDER BY id DESC`);
    }

    const rows = (raw as any).rows || raw || [];
    
    // سحب العداد الحالي للسيارة من جدول السيارات
    const vRaw = await db.execute(sql`SELECT id, current_km FROM vehicles WHERE tenant_id = ${user.tenantId}`);
    const allVehicles = (vRaw as any).rows || vRaw || [];

    const enriched = rows.map((r: any) => {
      const v = allVehicles.find((x: any) => Number(x.id) === Number(r.vehicle_id));
      const currentKm = Number(v?.current_km ?? 0);
      const nextKm = Number(r.next_change_km ?? 0);
      const alertKm = Number(r.alert_km_before ?? 500);
      const kmAlert = nextKm > 0 ? (nextKm - currentKm) <= alertKm : false;

      return {
        ...r, plateNumber: r.plate_number, kmAtChange: r.km_at_change, oilType: r.oil_type, oilBrand: r.oil_brand,
        filterChanged: r.filter_changed, airFilterChanged: r.air_filter_changed, fuelFilterChanged: r.fuel_filter_changed,
        nextChangeKm: nextKm, nextChangeDate: r.next_change_date, changeDate: r.change_date, cost: Number(r.cost), kmAlert, currentKm
      };
    });

    return NextResponse.json(enriched);
  } catch { return NextResponse.json([]); }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = await req.json().catch(() => ({}));

    const result = await db.execute(sql`
      INSERT INTO oil_changes (
        tenant_id, vehicle_id, plate_number, change_date, km_at_change, oil_type, oil_brand, 
        filter_changed, air_filter_changed, fuel_filter_changed, next_change_km, next_change_date, cost, technician
      ) VALUES (
        ${user.tenantId}, ${Number(b.vehicleId) || null}, ${b.plateNumber || ""}, ${b.changeDate || null}, ${Number(b.kmAtChange) || 0}, 
        ${b.oilType || "5W30"}, ${b.oilBrand || ""}, ${b.filterChanged ? 1 : 0}, ${b.airFilterChanged ? 1 : 0}, ${b.fuelFilterChanged ? 1 : 0}, 
        ${Number(b.nextChangeKm) || 0}, ${b.nextChangeDate || null}, ${Number(b.cost) || 0}, ${b.technician || ""}
      ) RETURNING *
    `);

    if (b.vehicleId && Number(b.kmAtChange) > 0) {
      try { await db.execute(sql`UPDATE vehicles SET current_km = GREATEST(COALESCE(current_km, 0), ${Number(b.kmAtChange)}) WHERE id = ${Number(b.vehicleId)} AND tenant_id = ${user.tenantId}`); } catch {}
    }

    return NextResponse.json({ success: true, data: (result as any).rows?.[0] }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
