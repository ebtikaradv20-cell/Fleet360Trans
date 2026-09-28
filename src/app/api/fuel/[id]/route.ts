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

// ── PUT: تعديل سجل وقود آمن ──
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

    let formattedDate: string | null = null;
    if (body.fuelDate || body.fuel_date) {
      const rawDate = String(body.fuelDate || body.fuel_date).trim();
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toISOString().slice(0, 10);
        }
      }
    }

    const updateData = {
      vehicleId: body.vehicleId ? Number(body.vehicleId) : null,
      plateNumber: String(body.plateNumber || body.plate_number || ""),
      driverName: String(body.driverName || body.driver_name || ""),
      liters: String(body.liters ?? 0),
      costPerLiter: String(body.costPerLiter ?? body.cost_per_liter ?? 0),
      totalCost: String(body.totalCost ?? body.total_cost ?? 0),
      odometer: body.odometer ? Number(body.odometer) : 0,
      station: String(body.station || ""),
      fuelDate: formattedDate,
    };

    const [updatedRow] = await db.update(fuelRecords)
      .set(updateData)
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
