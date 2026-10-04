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

// ── GET: جلب أمر صيانة محدد برقم الـ ID ──
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await Promise.resolve(context.params);
    const id = Number(params?.id);

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "معرّف أمر الصيانة غير صالح" }, { status: 400 });
    }

    let raw;
    if (user.role === "super_admin") {
      raw = await db.execute(sql`SELECT * FROM work_orders WHERE id = ${id}`);
    } else {
      raw = await db.execute(
        sql`SELECT * FROM work_orders WHERE id = ${id} AND tenant_id = ${user.tenantId || 'master'}`
      );
    }

    const rows = (raw as any).rows || raw || [];
    const r = rows[0];

    if (!r) {
      return NextResponse.json({ error: "أمر الصيانة غير موجود" }, { status: 404 });
    }

    const formatted = {
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
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET Single Work Order Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب أمر الصيانة" }, { status: 500 });
  }
}

// ── DELETE: حذف أمر الصيانة (يدعم النقل لسجل المحذوفات والحذف النهائي) ──
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await Promise.resolve(context.params);
    const id = Number(params?.id);

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "معرّف أمر الصيانة غير صالح" }, { status: 400 });
    }

    const isSuperAdmin = user.role === "super_admin";
    const tenantId = user.tenantId || "master";
    const isPermanent = req.nextUrl.searchParams.get("permanent") === "true";

    let result;

    if (isPermanent) {
      // حذف نهائي من قاعدة البيانات (إذا طُلب ذلك من سلة المهملات)
      if (isSuperAdmin) {
        result = await db.execute(sql`DELETE FROM work_orders WHERE id = ${id} RETURNING *`);
      } else {
        result = await db.execute(
          sql`DELETE FROM work_orders WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *`
        );
      }
    } else {
      // الحذف الناعم القياسي (نقل إلى سجل المحذوفات والمرفوض)
      if (isSuperAdmin) {
        result = await db.execute(sql`
          UPDATE work_orders 
          SET is_deleted = 1, status = 'deleted' 
          WHERE id = ${id} 
          RETURNING *
        `);
      } else {
        result = await db.execute(sql`
          UPDATE work_orders 
          SET is_deleted = 1, status = 'deleted' 
          WHERE id = ${id} AND tenant_id = ${tenantId} 
          RETURNING *
        `);
      }
    }

    const rows = (result as any).rows || result || [];
    const deletedRow = rows[0];

    if (!deletedRow) {
      return NextResponse.json(
        { error: "أمر الصيانة غير موجود أو لا تملك صلاحية حذفه" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isPermanent ? "تم الحذف النهائي لأمر الصيانة بنجاح" : "تم نقل أمر الصيانة إلى سجل المحذوفات بنجاح",
      data: deletedRow,
    });
  } catch (error: any) {
    console.error("DELETE Work Order Error:", error);
    return NextResponse.json({ error: `فشل الحذف: ${error.message}` }, { status: 500 });
  }
}

// ── PUT: تعديل أمر الصيانة ──
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await Promise.resolve(context.params);
    const id = Number(params?.id);

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "معرّف أمر الصيانة غير صالح" }, { status: 400 });
    }

    const b = await req.json().catch(() => ({}));
    const isSuperAdmin = user.role === "super_admin";
    const tenantId = user.tenantId || "master";

    const vehicleId = b.vehicleId ? Number(b.vehicleId) : null;
    const plateNumber = String(b.plateNumber || b.plate_number || "").trim();
    const maintenanceType = String(b.maintenanceType || b.maintenance_type || "صيانة ميكانيكا");
    const status = String(b.status || "in_progress");
    const workshop = String(b.workshop || "");
    const description = String(b.description || "");
    const cost = Number(b.cost) || 0;
    const startDate = toDateOrNull(b.startDate || b.start_date);
    const endDate = toDateOrNull(b.endDate || b.end_date);
    const technicianName = String(b.technicianName || b.technician_name || "");
    const receivedBy = String(b.receivedBy || b.received_by || "");
    const lifespanKm = Number(b.lifespanKm || b.lifespan_km) || 0;
    const invoiceUrl = String(b.invoiceUrl || b.invoice_url || "");
    const notes = String(b.notes || "");
    const isDeleted = b.is_deleted !== undefined ? Number(b.is_deleted) : 0;

    let result;
    if (isSuperAdmin) {
      result = await db.execute(sql`
        UPDATE work_orders SET
          vehicle_id = ${vehicleId},
          plate_number = ${plateNumber},
          maintenance_type = ${maintenanceType},
          status = ${status},
          workshop = ${workshop},
          description = ${description},
          cost = ${cost},
          start_date = ${startDate},
          end_date = ${endDate},
          technician_name = ${technicianName},
          received_by = ${receivedBy},
          lifespan_km = ${lifespanKm},
          invoice_url = ${invoiceUrl},
          notes = ${notes},
          is_deleted = ${isDeleted}
        WHERE id = ${id}
        RETURNING *
      `);
    } else {
      result = await db.execute(sql`
        UPDATE work_orders SET
          vehicle_id = ${vehicleId},
          plate_number = ${plateNumber},
          maintenance_type = ${maintenanceType},
          status = ${status},
          workshop = ${workshop},
          description = ${description},
          cost = ${cost},
          start_date = ${startDate},
          end_date = ${endDate},
          technician_name = ${technicianName},
          received_by = ${receivedBy},
          lifespan_km = ${lifespanKm},
          invoice_url = ${invoiceUrl},
          notes = ${notes},
          is_deleted = ${isDeleted}
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `);
    }

    const rows = (result as any).rows || result || [];
    const updatedRow = rows[0];

    if (!updatedRow) {
      return NextResponse.json(
        { error: "أمر الصيانة غير موجود أو لا تملك صلاحية تعديله" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedRow,
      message: "تم تعديل أمر الصيانة بنجاح",
    });
  } catch (error: any) {
    console.error("PUT Work Order Error:", error);
    return NextResponse.json({ error: `فشل التعديل: ${error.message}` }, { status: 500 });
  }
}
