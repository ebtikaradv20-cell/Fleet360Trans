import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { oilChanges, vehicles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try {
    const t = req.cookies.get("fleet360_token")?.value;
    return t ? verifyToken(t) : null;
  } catch {
    return null;
  }
}

function toDate(v: any): string | null {
  if (!v || String(v).trim() === "" || String(v).includes("mm/dd")) return null;
  const d = new Date(String(v).trim());
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function to01(v: any): number {
  return v === true || v === 1 || v === "1" || v === "true" ? 1 : 0;
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    const b = await req.json().catch(() => ({}));

    let plateNumber = String(b.plateNumber || b.plate_number || "").trim();
    let vehicleId = b.vehicleId != null && b.vehicleId !== "" ? Number(b.vehicleId) : null;

    if ((!vehicleId || isNaN(vehicleId)) && plateNumber) {
      try {
        const found = await db.select().from(vehicles).where(eq(vehicles.plateNumber, plateNumber)).limit(1);
        if (found[0]?.id) vehicleId = found[0].id;
      } catch {}
    }

    const kmAtChange = Number(b.kmAtChange ?? b.km_at_change) || 0;

    const [row] = await db
      .update(oilChanges)
      .set({
        vehicleId: vehicleId && !isNaN(vehicleId) ? vehicleId : null,
        plateNumber,
        changeDate: toDate(b.changeDate || b.change_date),
        kmAtChange,
        oilType: String(b.oilType || b.oil_type || "5W30"),
        oilBrand: String(b.oilBrand || b.oil_brand || ""),
        filterChanged: to01(b.filterChanged ?? b.filter_changed),
        airFilterChanged: to01(b.airFilterChanged ?? b.air_filter_changed),
        fuelFilterChanged: to01(b.fuelFilterChanged ?? b.fuel_filter_changed),
        nextChangeKm: Number(b.nextChangeKm ?? b.next_change_km) || 0,
        nextChangeDate: toDate(b.nextChangeDate || b.next_change_date),
        alertKmBefore: Number(b.alertKmBefore ?? b.alert_km_before) || 500,
        alertDaysBefore: Number(b.alertDaysBefore ?? b.alert_days_before) || 7,
        cost: String(Number(b.cost) || 0),
        technician: String(b.technician || ""),
      } as any)
      .where(eq(oilChanges.id, id))
      .returning();

    if (vehicleId && kmAtChange > 0) {
      try {
        await db.execute(sql`
          UPDATE vehicles
          SET current_km = GREATEST(COALESCE(current_km, 0), ${kmAtChange})
          WHERE id = ${vehicleId}
        `);
      } catch {}
    }

    return NextResponse.json({ success: true, data: row });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "فشل التعديل" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await ctx.params;
    await db.delete(oilChanges).where(eq(oilChanges.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "فشل الحذف" }, { status: 500 });
  }
}
