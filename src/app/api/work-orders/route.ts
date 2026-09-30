import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders } from "@/db/schema";
import { sql } from "drizzle-orm";
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

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // جلب الأوامر غير المحذوفة وهمياً
    let raw;
    if (user.role === "super_admin") {
      raw = await db.execute(sql`SELECT * FROM work_orders WHERE is_deleted = 0 ORDER BY id DESC`);
    } else {
      raw = await db.execute(sql`SELECT * FROM work_orders WHERE tenant_id = ${user.tenantId || 'master'} AND is_deleted = 0 ORDER BY id DESC`);
    }

    const rows = (raw as any).rows || raw || [];
    const formatted = rows.map((r: any) => ({
      ...r,
      orderNumber: r.order_number || r.orderNumber,
      vehicleId: r.vehicle_id || r.vehicleId,
      plateNumber: r.plate_number || r.plateNumber,
      maintenanceType: r.maintenance_type || r.maintenanceType,
      startDate: r.start_date || r.startDate,
      endDate: r.end_date || r.endDate,
      technicianName: r.technician_name || r.technicianName,
      receivedBy: r.received_by || r.receivedBy,
      invoiceUrl: r.invoice_url || r.invoiceUrl,
      lifespanKm: r.lifespan_km || r.lifespanKm,
      lastMaintenanceDate: r.last_maintenance_date || r.lastMaintenanceDate,
      nextMaintenanceDate: r.next_maintenance_date || r.nextMaintenanceDate,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET Work Orders Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const b = await req.json().catch(() => ({}));

    const result = await db.execute(sql`
      INSERT INTO work_orders (
        tenant_id, order_number, vehicle_id, plate_number, maintenance_type, status, workshop, 
        description, cost, start_date, end_date, technician_name, received_by, lifespan_km, 
        last_maintenance_date, next_maintenance_date, invoice_url, notes
      ) VALUES (
        ${user.tenantId || 'master'}, ${b.orderNumber || `WO-${Date.now()}`}, ${Number(b.vehicleId) || null}, 
        ${b.plateNumber || ""}, ${b.maintenanceType || "صيانة ميكانيكا"}, ${b.status || "pending"}, 
        ${b.workshop || ""}, ${b.description || ""}, ${Number(b.cost) || 0}, 
        ${b.startDate || null}, ${b.endDate || null}, ${b.technicianName || ""}, 
        ${b.receivedBy || ""}, ${Number(b.lifespanKm) || 0}, ${b.lastMaintenanceDate || null}, 
        ${b.nextMaintenanceDate || null}, ${b.invoiceUrl || ""}, ${b.notes || ""}
      ) RETURNING *
    `);

    return NextResponse.json({ success: true, data: (result as any).rows?.[0] || (result as any)[0] }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: `فشل الحفظ: ${e.message}` }, { status: 500 });
  }
}
