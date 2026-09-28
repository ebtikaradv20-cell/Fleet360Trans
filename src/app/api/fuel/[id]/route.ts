import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fuelRecords } from "@/db/schema";
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

// ── PUT: تعديل سجل وقود + تحديث عداد السيارة التلقائي ──
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

    const body = await req.json();

    const payload = {
      vehicleId: body.vehicleId ? Number(body.vehicleId) : null,
      plateNumber: body.plateNumber || body.plate_number || "",
      driverName: body.driverName || body.driver_name || "",
      liters: body.liters !== undefined ? String(body.liters) : "0",
      costPerLiter: body.costPerLiter !== undefined ? String(body.costPerLiter) : "0",
      totalCost: body.totalCost !== undefined ? String(body.totalCost) : "0",
      odometer: body.odometer ? Number(body.odometer) : 0,
      station: body.station || "",
      fuelDate: body.fuelDate || body.fuel_date || null,
    };

    const [row] = await db.update(fuelRecords)
      .set(payload)
      .where(eq(fuelRecords.id, id))
      .returning();

    // ⚡ التزامن التلقائي: تحديث عداد الكيلومتر في جدول السيارات تلقائياً
    const targetVehicleId = payload.vehicleId;
    const odometer = payload.odometer;

    if (targetVehicleId && odometer > 0) {
      try {
        await db.execute(sql`
          UPDATE vehicles 
          SET current_km = GREATEST(COALESCE(current_km, 0), ${odometer})
          WHERE id = ${targetVehicleId}
        `);
      } catch (syncErr) {
        console.error("Auto-sync Vehicle Km Error on Fuel PUT:", syncErr);
      }
    }

    return NextResponse.json(row);
  } catch (error: any) {
    console.error("PUT Fuel Error:", error);
    return NextResponse.json({ error: error.message || "فشل في تعديل سجل الوقود" }, { status: 500 });
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
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const params = await context.params;
    const id = Number(params.id);

    await db.delete(fuelRecords).where(eq(fuelRecords.id, id));
    return NextResponse.json({ success: true, message: "تم حذف سجل الوقود بنجاح" });
  } catch (error: any) {
    console.error("DELETE Fuel Error:", error);
    return NextResponse.json({ error: error.message || "فشل في حذف سجل الوقود" }, { status: 500 });
  }
}
