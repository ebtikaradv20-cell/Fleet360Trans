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
  if (!val || String(val).trim() === "" || String(val).includes("mm/dd")) return null;
  const d = new Date(String(val).trim());
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// ── PUT: تعديل أمر الصيانة ──
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

    const updateData = {
      orderNumber: String(body.orderNumber || body.order_number || ""),
      vehicleId: vehicleId && !isNaN(vehicleId) ? vehicleId : null,
      plateNumber,
      maintenanceType: String(body.maintenanceType || body.maintenance_type || ""),
      status: String(body.status || "pending"),
      workshop: String(body.workshop || ""),
      description: String(body.description || ""),
      cost: String(Number(body.cost) || 0),
      startDate: toDateOrNull(body.startDate || body.start_date),
      endDate: toDateOrNull(body.endDate || body.end_date),
      technicianName: String(body.technicianName || body.technician_name || ""),
      receivedBy: String(body.receivedBy || body.received_by || ""),
      lifespanKm: String(Number(body.lifespanKm || body.lifespan_km) || 0),
      lastMaintenanceDate: toDateOrNull(body.lastMaintenanceDate || body.last_maintenance_date),
      nextMaintenanceDate: toDateOrNull(body.nextMaintenanceDate || body.next_maintenance_date),
      invoiceUrl: String(body.invoiceUrl || body.invoice_url || ""),
    };

    const [row] = await db
      .update(workOrders)
      .set(updateData as any)
      .where(eq(workOrders.id, id))
      .returning();

    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    console.error("PUT Work Order Error:", error);
    return NextResponse.json({ error: error?.message || "فشل التعديل" }, { status: 500 });
  }
}

// ── DELETE: الحذف الذكي بطلب موافقة للـ Admins والعاديين ──
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const workOrderId = Number(params.id);
    if (!workOrderId) return NextResponse.json({ error: "معرف غير صحيح" }, { status: 400 });

    // 1. إذا كان الموظف Super Admin يتم الحذف الوهمي مباشرة (Soft Delete)
    if (user.role === "super_admin") {
      await db.execute(sql`UPDATE work_orders SET is_deleted = 1, status = 'deleted' WHERE id = ${workOrderId}`);
      return NextResponse.json({ success: true, message: "تم أرشفة أمر الصيانة بنجاح (Soft Delete)" });
    } 
    // 2. إذا كان مدير فرع أو مستخدم عادي يُرفع طلب موافقة للمدير الرئيسي
    else {
      // إشارة بأن الطلب قيد انتظار الموافقة على الحذف
      await db.execute(sql`UPDATE work_orders SET status = 'pending_deletion' WHERE id = ${workOrderId}`);
      
      // إضافة الطلب في جدول الموافقات
      await db.execute(sql`
        INSERT INTO approvals (tenant_id, module_name, record_id, request_type, status, notes, requested_by)
        VALUES (${user.tenantId || 'master'}, 'work_orders', ${workOrderId}, 'delete', 'pending', 'طلب حذف أمر صيانة', ${user.username})
      `);

      return NextResponse.json({ success: true, message: "تم إرسال طلب الحذف للإدارة الرئيسية للموافقة." });
    }

  } catch (error: any) {
    console.error("DELETE Work Order Error:", error);
    return NextResponse.json({ error: error?.message || "فشل إجراء الحذف" }, { status: 500 });
  }
}
