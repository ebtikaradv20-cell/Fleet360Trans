import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { oilChanges, vehicles } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId");

    let rows =
      vehicleId
        ? await db.select().from(oilChanges).where(eq(oilChanges.vehicleId, Number(vehicleId))).orderBy(desc(oilChanges.id))
        : await db.select().from(oilChanges).orderBy(desc(oilChanges.id));

    let allVehicles: any[] = [];
    try {
      allVehicles = await db.select().from(vehicles);
    } catch {}

    const enriched = rows.map((r: any) => {
      const v = allVehicles.find((x: any) => Number(x.id) === Number(r.vehicleId));
      const currentKm = Number(v?.currentKm ?? v?.current_km ?? 0);
      const nextKm = Number(r.nextChangeKm ?? r.next_change_km ?? 0);
      const alertKm = Number(r.alertKmBefore ?? r.alert_km_before ?? 500);
      const kmAlert = nextKm > 0 ? nextKm - currentKm <= alertKm : false;
      const nextDateRaw = r.nextChangeDate ?? r.next_change_date;
      const nextDate = nextDateRaw ? new Date(nextDateRaw) : null;
      const alertDays = Number(r.alertDaysBefore ?? r.alert_days_before ?? 7);
      const dayAlert =
        nextDate && !isNaN(nextDate.getTime())
          ? Math.ceil((nextDate.getTime() - Date.now()) / 86400000) <= alertDays
          : false;

      return {
        ...r,
        plateNumber: r.plateNumber || r.plate_number || "",
        kmAtChange: r.kmAtChange ?? r.km_at_change ?? 0,
        oilType: r.oilType || r.oil_type || "",
        oilBrand: r.oilBrand || r.oil_brand || "",
        nextChangeKm: nextKm,
        nextChangeDate: nextDateRaw || "",
        changeDate: r.changeDate || r.change_date || "",
        cost: Number(r.cost || 0),
        kmAlert,
        dayAlert,
        currentKm,
      };
    });

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const b = await req.json().catch(() => ({}));

    let plateNumber = String(b.plateNumber || b.plate_number || "").trim();
    let vehicleId = b.vehicleId != null && b.vehicleId !== "" ? Number(b.vehicleId) : null;

    if ((!vehicleId || isNaN(vehicleId)) && plateNumber) {
      try {
        const found = await db.select().from(vehicles).where(eq(vehicles.plateNumber, plateNumber)).limit(1);
        if (found[0]?.id) vehicleId = found[0].id;
      } catch {}
    }

    if (!plateNumber) {
      return NextResponse.json({ error: "رقم اللوحة مطلوب" }, { status: 400 });
    }

    const kmAtChange = Number(b.kmAtChange ?? b.km_at_change) || 0;
    const nextChangeKm =
      Number(b.nextChangeKm ?? b.next_change_km) || (kmAtChange > 0 ? kmAtChange + 5000 : 0);

    const [row] = await db
      .insert(oilChanges)
      .values({
        vehicleId: vehicleId && !isNaN(vehicleId) ? vehicleId : null,
        plateNumber,
        changeDate: toDate(b.changeDate || b.change_date),
        kmAtChange,
        oilType: String(b.oilType || b.oil_type || "5W30"),
        oilBrand: String(b.oilBrand || b.oil_brand || ""),
        filterChanged: to01(b.filterChanged ?? b.filter_changed),
        airFilterChanged: to01(b.airFilterChanged ?? b.air_filter_changed),
        fuelFilterChanged: to01(b.fuelFilterChanged ?? b.fuel_filter_changed),
        nextChangeKm,
        nextChangeDate: toDate(b.nextChangeDate || b.next_change_date),
        alertKmBefore: Number(b.alertKmBefore ?? b.alert_km_before) || 500,
        alertDaysBefore: Number(b.alertDaysBefore ?? b.alert_days_before) || 7,
        cost: String(Number(b.cost) || 0),
        technician: String(b.technician || ""),
      } as any)
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

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (e: any) {
    console.error("POST oil-changes:", e);
    return NextResponse.json({ error: `فشل الحفظ: ${e?.message || e}` }, { status: 500 });
  }
}
