import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
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

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const id = Number(params.id);
    const body = await req.json();

    const payload = {
      vehicleId: Number(body.vehicleId) || null,
      plateNumber: body.plateNumber || "",
      driverName: body.driverName || "",
      liters: Number(body.liters) || 0,
      costPerLiter: Number(body.costPerLiter) || 0,
      totalCost: Number(body.totalCost) || 0,
      odometer: Number(body.odometer) || 0,
      station: body.station || "",
      fuelDate: body.fuelDate && body.fuelDate.trim() !== "" ? body.fuelDate : null,
    };

    await db.execute(sql`
      UPDATE fuel_records 
      SET 
        vehicle_id = ${payload.vehicleId}, plate_number = ${payload.plateNumber}, driver_name = ${payload.driverName}, 
        liters = ${payload.liters}, cost_per_liter = ${payload.costPerLiter}, total_cost = ${payload.totalCost}, 
        odometer = ${payload.odometer}, station = ${payload.station}, fuel_date = ${payload.fuelDate}
      WHERE id = ${id}
    `);

    if (payload.vehicleId && payload.odometer > 0) {
      try {
        await db.execute(sql`UPDATE vehicles SET current_km = GREATEST(COALESCE(current_km, 0), ${payload.odometer}) WHERE id = ${payload.vehicleId}`);
      } catch (e) {}
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    await db.execute(sql`DELETE FROM fuel_records WHERE id = ${Number(params.id)}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
