import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders, vehicles } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
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
  if (!val || String(val).trim() === "" || String(val).includes("mm/dd")) return null;
  const d = new Date(String(val).trim());
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// ── GET: جلب الصيانات غير المحذوفة وهمياً ──
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

// ── POST: إضافة أمر صيانة مع الاحترام التام للحالة المحددة ──
export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const b = await req.json().catch(() => ({}));
    let plateNumber = String(b.plateNumber || b.plate_number || "").trim();
    let vehicleId = b.vehicleId ? Number(b.vehicleId) : null;

    if (!plateNumber) return NextResponse.json({ error: "رقم اللوحة مطلوب" }, { status: 400 });

    // ⚡ قراءة الحالة المحددة من الفورم (قيد التنفيذ / مكتمل / معلق)
    const selectedStatus = String(b.status || "in_progress");
    const isSuperAdmin = user.role === "super_admin";

    // لو اليوزر مش Super Admin -> الحالة تكون بانتظار الموافقة
    const finalStatus = isSuperAdmin ? selectedStatus : "pending_approval";

    const payload = {
      tenant_id: user.tenantId || 'master',
      order_number: String(b.orderNumber || `WO-${Date.now()}`),
      vehicle_id: vehicleId,
      plate_number: plateNumber,
      maintenance_type: String(b.maintenanceType || "صيانة ميكانيكا"),
      status: finalStatus,
      workshop: String(b.workshop || ""),
      description: String(b.description || ""),
      cost: Number(b.cost) || 0,
      start_date: toDateOrNull(b.startDate || b.start_date),
      end_date: toDateOrNull(b.endDate || b.end_date),
      technician_name: String(b.technicianName || b.technician_name || ""),
      received_by: String(b.receivedBy || b.received_by || ""),
      lifespan_km: Number(b.lifespanKm || b.lifespan_km) || 0,
      invoice_url: String(b.invoiceUrl || b.invoice_url || ""),
      notes: String(b.notes || "")
    };

    const result = await db.execute(sql`
      INSERT INTO work_orders (
        tenant_id, order_number, vehicle_id, plate_number, maintenance_type, status, workshop, 
        description, cost, start_date, end_date, technician_name, received_by, lifespan_km, 
        invoice_url, notes
      ) VALUES (
        ${payload.tenant_id}, ${payload.order_number}, ${payload.vehicle_id}, ${payload.plate_number}, 
        ${payload.maintenance_type}, ${payload.status}, ${payload.workshop}, ${payload.description}, 
        ${payload.cost}, ${payload.start_date}, ${payload.end_date}, ${payload.technician_name}, 
        ${payload.received_by}, ${payload.lifespan_km}, ${payload.invoice_url}, ${payload.notes}
      ) RETURNING *
    `);

    const newRow = (result as any).rows?.[0] || (result as any)[0];

    // ⚡ إذا كان المستخدم غير Super Admin -> إنشاء طلب في جدول الموافقات
    if (!isSuperAdmin && newRow?.id) {
      await db.execute(sql`
        INSERT INTO approvals (tenant_id, module_name, record_id, request_type, status, notes, requested_by)
        VALUES (${user.tenantId || 'master'}, 'work_orders', ${newRow.id}, 'add', 'pending', ${`طلب إنشاء امر صيانة (${payload.maintenance_type}) بحالة: ${selectedStatus}`}, ${user.username})
      `);
      return NextResponse.json({ success: true, data: newRow, message: "تم إرسال أمر الصيانة لـ Super Admin للموافقة." }, { status: 201 });
    }

    return NextResponse.json({ success: true, data: newRow }, { status: 201 });
  } catch (e: any) {
    console.error("POST Work Order Error:", e);
    return NextResponse.json({ error: `فشل الحفظ: ${e.message}` }, { status: 500 });
  }
}
