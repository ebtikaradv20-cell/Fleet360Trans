import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders, vehicles } from "@/db/schema";
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
  if (!val || String(val).trim() === "") return null;
  const d = new Date(String(val).trim());
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
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

    const updateData = {
      orderNumber: String(body.orderNumber || body.order_number || ""),
      vehicleId: vehicleId && !isNaN(vehicleId) ? vehicleId : null,
      plateNumber,
      maintenanceType: String(body.maintenanceType || body.maintenance_type || ""),
      status: String(body.status || "pending"),
      workshop: String(body.workshop || ""),
      description: String(body.description || ""),
      cost: String(body.cost ?? 0),
      startDate: toDateOrNull(body.startDate || body.start_date),
      endDate: toDateOrNull(body.endDate || body.end_date),
      technicianName: String(body.technicianName || body.technician_name || ""),
    };

    const [row] = await db
      .update(workOrders)
      .set(updateData as any)
      .where(eq(workOrders.id, id))
      .returning();

    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    console.error("PUT Work Orders Error:", error);
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

    await db.delete(workOrders).where(eq(workOrders.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "فشل الحذف" },
      { status: 500 }
    );
  }
}
