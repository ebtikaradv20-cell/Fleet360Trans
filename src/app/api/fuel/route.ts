import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fuelRecords, vehicles } from "@/db/schema";
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

export async function GET() {
  try {
    const rows = await db.select().from(fuelRecords).orderBy(desc(fuelRecords.id));
    return NextResponse.json(rows);
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

    const liters = Number(b.liters) || 0;
    const costPerLiter = Number(b.costPerLiter ?? b.cost_per_liter) || 0;
    const totalCost = Number(b.totalCost ?? b.total_cost) || liters * costPerLiter;
    const odometer = Number(b.odometer) || 0;

    // ✅ ربط بالاسم — مش بالترتيب
    const [row] = await db
      .insert(fuelRecords)
      .values({
        vehicleId: vehicleId && !isNaN(vehicleId) ? vehicleId : null,
        plateNumber,
        driverName: String(b.driverName || b.driver_name || ""),
        liters: String(liters),
        costPerLiter: String(costPerLiter),
        totalCost: String(totalCost),
        odometer,
        station: String(b.station || ""),
        fuelDate: toDate(b.fuelDate || b.fuel_date),
      } as any)
      .returning();

    // تحديث عداد السيارة
    if (vehicleId && odometer > 0) {
      try {
        await db.execute(sql`
          UPDATE vehicles
          SET current_km = GREATEST(COALESCE(current_km, 0), ${odometer})
          WHERE id = ${vehicleId}
        `);
      } catch {}
    }

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (e: any) {
    console.error("POST fuel:", e);
    return NextResponse.json({ error: `فشل الحفظ: ${e?.message || e}` }, { status: 500 });
  }
}
