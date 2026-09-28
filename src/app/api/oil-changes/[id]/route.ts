import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { oilChanges, vehicles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
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

function toDateOrNull(val: any): string | null {
  if (!val || String(val).trim() === "" || String(val).includes("mm/dd")) return null;
  const d = new Date(String(val).trim());
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function toBoolInt(val: any): number {
  if (val === true || val === 1 || val === "1" || val === "true") return 1;
  return 0;
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "معرف غير صحيح" }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    let plateNumber = String(body.plateNumber || body.plate_number || "").trim();
    let vehicleId: number | null = body.vehicleId ? Number(body.vehicleId) : null;

    if ((!vehicleId || isNaN(vehicleId)) && plateNumber) {
      try {
        const found = await db
          .select()
          .from(vehicles)
          .where(eq(vehicles.plateNumber, plateNumber))
          .limit(1);
        if (found[0]?.id) vehicleId = found[0].id;
      } catch {}
    }

    const kmAtChange = Number(body.kmAtChange ?? body.km_at_change ?? 0) || 0;

    const updateData = {
      vehicleId: vehicleId && !isNaN(vehicleId) ? vehicleId : null,
      plateNumber,
      changeDate: toDateOrNull(body.changeDate || body.change_date),
      kmAtChange,
      oilType: String(body.oilType || body.oil_type || "5W30"),
      oilBrand: String(body.oilBrand || body.oil_brand || ""),
      filterChanged: toBoolInt(body.filterChanged ?? body.filter_changed),
      airFilterChanged: toBoolInt(body.airFilterChanged ?? body.air_filter_changed),
      fuelFilterChanged: toBoolInt(body.fuelFilterChanged ?? body.fuel_filter_changed),
      nextChangeKm: Number(body.nextChangeKm ?? body.next_change_km ?? 0) || 0,
      nextChangeDate: toDateOrNull(body.nextChangeDate || body.next_change_date),
      alertKmBefore: Number(body.alertKmBefore ?? body.alert_km_before ?? 500) || 500,
      alertDaysBefore: Number(body.alertDaysBefore ?? body.alert_days_before ?? 7) || 7,
      cost: String(body.cost ?? 0),
      technician: String(body.technician || ""),
    };

    const [row] = await db
      .update(oilChanges)
      .set(updateData as any)
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
  } catch (error: any) {
    console.error("PUT Oil Changes Error:", error);
    return NextResponse.json(
      { error: `فشل التعديل: ${error?.message || String(error)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const id = Number(params.id);

    await db.delete(oilChanges).where(eq(oilChanges.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "فشل الحذف" },
      { status: 500 }
    );
  }
}
