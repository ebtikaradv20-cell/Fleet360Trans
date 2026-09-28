import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { oilChanges, vehicles } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
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
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function toBoolInt(val: any): number {
  if (val === true || val === 1 || val === "1" || val === "true") return 1;
  return 0;
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId") || "";

    let rows;
    if (vehicleId) {
      rows = await db
        .select()
        .from(oilChanges)
        .where(eq(oilChanges.vehicleId, parseInt(vehicleId)))
        .orderBy(desc(oilChanges.id));
    } else {
      rows = await db.select().from(oilChanges).orderBy(desc(oilChanges.id));
    }

    // إثراء بالتنبيهات + العداد الحالي
    let allVehicles: any[] = [];
    try {
      allVehicles = await db.select().from(vehicles);
    } catch {
      try {
        const raw = await db.execute(sql`SELECT id, current_km FROM vehicles`);
        allVehicles = (raw as any).rows || raw || [];
      } catch {
        allVehicles = [];
      }
    }

    const enriched = rows.map((r: any) => {
      const v = allVehicles.find(
        (x: any) => Number(x.id) === Number(r.vehicleId)
      );
      const currentKm = Number(v?.currentKm ?? v?.current_km ?? 0);
      const nextKm = Number(r.nextChangeKm ?? r.next_change_km ?? 0);
      const alertKm = Number(r.alertKmBefore ?? r.alert_km_before ?? 500);
      const kmAlert = nextKm > 0 ? nextKm - currentKm <= alertKm : false;

      const nextDateRaw = r.nextChangeDate ?? r.next_change_date;
      const nextDate = nextDateRaw ? new Date(nextDateRaw) : null;
      const alertDays = Number(r.alertDaysBefore ?? r.alert_days_before ?? 7);
      const dayAlert =
        nextDate && !isNaN(nextDate.getTime())
          ? Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= alertDays
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
  } catch (error) {
    console.error("GET Oil Changes Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    let plateNumber = String(body.plateNumber || body.plate_number || "").trim();
    let vehicleId: number | null = body.vehicleId ? Number(body.vehicleId) : null;

    // لو مفيش vehicleId → نبحث باللوحة
    if ((!vehicleId || isNaN(vehicleId)) && plateNumber) {
      try {
        const found = await db
          .select()
          .from(vehicles)
          .where(eq(vehicles.plateNumber, plateNumber))
          .limit(1);
        if (found[0]?.id) vehicleId = found[0].id;
      } catch {
        try {
          const raw = await db.execute(
            sql`SELECT id FROM vehicles WHERE plate_number = ${plateNumber} LIMIT 1`
          );
          const row = (raw as any).rows?.[0] || (raw as any)[0];
          if (row?.id) vehicleId = Number(row.id);
        } catch {}
      }
    }

    if (!plateNumber) {
      return NextResponse.json({ error: "رقم اللوحة مطلوب" }, { status: 400 });
    }

    const kmAtChange = Number(body.kmAtChange ?? body.km_at_change ?? 0) || 0;
    const nextChangeKm =
      Number(body.nextChangeKm ?? body.next_change_km ?? 0) ||
      (kmAtChange > 0 ? kmAtChange + 5000 : 0);

    // إدخال بـ Drizzle بأسماء الحقول الصحيحة (مفيش لخبطة ترتيب)
    const insertData = {
      vehicleId: vehicleId && !isNaN(vehicleId) ? vehicleId : null,
      plateNumber,
      changeDate: toDateOrNull(body.changeDate || body.change_date),
      kmAtChange,
      oilType: String(body.oilType || body.oil_type || "5W30"),
      oilBrand: String(body.oilBrand || body.oil_brand || ""),
      filterChanged: toBoolInt(body.filterChanged ?? body.filter_changed),
      airFilterChanged: toBoolInt(body.airFilterChanged ?? body.air_filter_changed),
      fuelFilterChanged: toBoolInt(body.fuelFilterChanged ?? body.fuel_filter_changed),
      nextChangeKm,
      nextChangeDate: toDateOrNull(body.nextChangeDate || body.next_change_date),
      alertKmBefore: Number(body.alertKmBefore ?? body.alert_km_before ?? 500) || 500,
      alertDaysBefore: Number(body.alertDaysBefore ?? body.alert_days_before ?? 7) || 7,
      cost: String(body.cost ?? 0),
      technician: String(body.technician || ""),
    };

    const [row] = await db.insert(oilChanges).values(insertData as any).returning();

    // تزامن عداد السيارة تلقائياً
    if (vehicleId && kmAtChange > 0) {
      try {
        await db.execute(sql`
          UPDATE vehicles
          SET current_km = GREATEST(COALESCE(current_km, 0), ${kmAtChange})
          WHERE id = ${vehicleId}
        `);
      } catch (syncErr) {
        console.error("Auto-sync vehicle km on oil change:", syncErr);
      }
    }

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (error: any) {
    console.error("POST Oil Changes Error:", error);
    return NextResponse.json(
      { error: `فشل الحفظ: ${error?.message || String(error)}` },
      { status: 500 }
    );
  }
}
