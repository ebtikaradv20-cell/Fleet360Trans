import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fuelRecords, vehicles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

function auth(req: NextRequest) {
  try {
    const token = req.cookies.get("fleet360_token")?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

function cleanDate(val: any): string | null {
  if (!val || String(val).trim() === "" || String(val).includes("mm/dd")) return null;
  const d = new Date(String(val).trim());
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// ── PUT: تعديل سجل وقود ──
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "معرف السجل غير صحيح" }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    let plateNumber = String(body.plateNumber || body.plate_number || "").trim();
    let vehicleId: number | null = body.vehicleId ? Number(body.vehicleId) : null;

    if ((!vehicleId || isNaN(vehicleId)) && plateNumber) {
      try {
        const found = await db.select().from(vehicles).where(eq(vehicles.plateNumber, plateNumber)).limit(1);
        if (found[0]?.id) vehicleId = found[0].id;
      } catch {}
    }

    const litersNum = Number(body.liters) || 0;
    const costPerLiterNum = Number(body.costPerLiter ?? body.cost_per_liter) || 0;
    const totalCostNum = Number(body.totalCost ?? body.total_cost) || (litersNum * costPerLiterNum);
    const odometerNum = Number(body.odometer) || 0;

    const updateData = {
      vehicleId: vehicleId && !isNaN(vehicleId) ? vehicleId : null,
      plateNumber,
      driverName: String(body.driverName || body.driver_name || ""),
      liters: String(litersNum),
      costPerLiter: String(costPerLiterNum),
      totalCost: String(totalCostNum),
      odometer: odometerNum,
      station: String(body.station || ""),
      fuelDate: cleanDate(body.fuelDate || body.fuel_date),
    };

    const [updatedRow] = await db.update(fuelRecords)
      .set(updateData as any)
      .where(eq(fuelRecords.id, id))
      .returning();

    if (updateData.vehicleId && updateData.odometer > 0) {
      try {
        await db.execute(sql`
          UPDATE vehicles 
          SET current_km = GREATEST(COALESCE(current_km, 0), ${updateData.odometer})
          WHERE id = ${updateData.vehicleId}
        `);
      } catch (syncErr) {
        console.error("Auto-sync Vehicle Km Error on PUT:", syncErr);
      }
    }

    return NextResponse.json({ success: true, data: updatedRow });
  } catch (error: any) {
    console.error("PUT Fuel Error:", error);
    return NextResponse.json({ error: `فشل التعديل: ${error?.message || String(error)}` }, { status: 500 });
  }
}

// ── DELETE: حذف سجل وقود ──
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const id = Number(params.id);

    await db.delete(fuelRecords).where(eq(fuelRecords.id, id));
    return NextResponse.json({ success: true, message: "تم حذف سجل الوقود بنجاح" });
  } catch (error: any) {
    console.error("DELETE Fuel Error:", error);
    return NextResponse.json({ error: error?.message || "فشل في حذف سجل الوقود" }, { status: 500 });
  }
}
