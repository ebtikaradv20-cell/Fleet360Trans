import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const raw = await db.execute(sql`SELECT * FROM work_orders WHERE tenant_id = ${user.tenantId} ORDER BY id DESC`);
    const rows = (raw as any).rows || raw || [];
    const formatted = rows.map((r: any) => ({
      ...r, orderNumber: r.order_number, vehicleId: r.vehicle_id, plateNumber: r.plate_number,
      maintenanceType: r.maintenance_type, startDate: r.start_date, endDate: r.end_date, technicianName: r.technician_name
    }));
    return NextResponse.json(formatted);
  } catch { return NextResponse.json([]); }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = await req.json().catch(() => ({}));

    const result = await db.execute(sql`
      INSERT INTO work_orders (
        tenant_id, order_number, vehicle_id, plate_number, maintenance_type, status, workshop, description, cost, start_date, end_date, technician_name
      ) VALUES (
        ${user.tenantId}, ${b.orderNumber || `WO-${Date.now()}`}, ${Number(b.vehicleId) || null}, ${b.plateNumber || ""}, 
        ${b.maintenanceType || ""}, ${b.status || "pending"}, ${b.workshop || ""}, ${b.description || ""}, ${Number(b.cost) || 0}, 
        ${b.startDate || null}, ${b.endDate || null}, ${b.technicianName || ""}
      ) RETURNING *
    `);

    return NextResponse.json({ success: true, data: (result as any).rows?.[0] }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
