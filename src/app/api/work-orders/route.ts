import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders, vehicles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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
    const rows = await db.select().from(workOrders).orderBy(desc(workOrders.id));
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

    const [row] = await db
      .insert(workOrders)
      .values({
        orderNumber: String(b.orderNumber || b.order_number || `WO-${Date.now()}`),
        vehicleId: vehicleId && !isNaN(vehicleId) ? vehicleId : null,
        plateNumber,
        maintenanceType: String(b.maintenanceType || b.maintenance_type || "صيانة ميكانيكا"),
        status: String(b.status || "pending"),
        workshop: String(b.workshop || ""),
        description: String(b.description || ""),
        cost: String(Number(b.cost) || 0),
        startDate: toDate(b.startDate || b.start_date),
        endDate: toDate(b.endDate || b.end_date),
        technicianName: String(b.technicianName || b.technician_name || ""),
      } as any)
      .returning();

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (e: any) {
    console.error("POST work-orders:", e);
    return NextResponse.json({ error: `فشل الحفظ: ${e?.message || e}` }, { status: 500 });
  }
}
