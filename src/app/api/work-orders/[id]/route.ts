import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders } from "@/db/schema";
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
      orderNumber: body.orderNumber || "",
      vehicleId: Number(body.vehicleId) || null,
      plateNumber: body.plateNumber || "",
      maintenanceType: body.maintenanceType || "",
      status: body.status || "pending",
      workshop: body.workshop || "",
      description: body.description || "",
      cost: Number(body.cost) || 0,
      technicianName: body.technicianName || "",
      notes: body.notes || "",
      startDate: body.startDate && body.startDate.trim() !== "" ? body.startDate : null,
      endDate: body.endDate && body.endDate.trim() !== "" ? body.endDate : null,
    };

    const [row] = await db.update(workOrders)
      .set(payload)
      .where(eq(workOrders.id, id))
      .returning();

    return NextResponse.json({ success: true, data: row });
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
    await db.execute(sql`DELETE FROM work_orders WHERE id = ${Number(params.id)}`);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
