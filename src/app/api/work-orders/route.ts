import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verifyToken } from "@/lib/auth";
import { sql } from "drizzle-orm";

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

// ── GET: جلب كل أوامر الصيانة حسب صلاحية المستخدم ──
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let raw;
    if (user.role === "owner" || user.role === "super_admin") {
      raw = await db.execute(sql`SELECT * FROM work_orders ORDER BY id DESC`);
    } else {
      raw = await db.execute(sql`SELECT * FROM work_orders WHERE tenant_id = ${user.tenantId || "master"} ORDER BY id DESC`);
    }

    const rows = (raw as any).rows || raw || [];
    const formatted = rows.map((r: any) => ({
      ...r,
      orderNumber: r.order_number,
      vehicleId: r.vehicle_id,
      plateNumber: r.plate_number,
      maintenanceType: r.maintenance_type,
      startDate: r.start_date,
      endDate: r.end_date,
      technicianName: r.technician_name,
      receivedBy: r.received_by,
      invoiceUrl: r.invoice_url,
      lifespanKm: r.lifespan_km,
      lastMaintenanceDate: r.last_maintenance_date,
      nextMaintenanceDate: r.next_maintenance_date,
      createdAt: r.created_at,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET Work Orders Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST: إضافة أمر صيانة جديد ──
export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const b = await req.json().catch(() => ({}));
    const plateNumber = String(b.plateNumber || "").trim();
    const vehicleId = b.vehicleId ? Number(b.vehicleId) : null;
    if (!plateNumber) return NextResponse.json({ error: "رقم اللوحة مطلوب" }, { status: 400 });

    // ⚡ المالك والمدير الرئيسي: الحالة المختارة تُطبّق فوراً، غيرهم: بانتظار الموافقة
    const isHighLevel = user.role === "owner" || user.role === "super_admin";
    const selectedStatus = String(b.status || "in_progress");
    const finalStatus = isHighLevel ? selectedStatus : "pending_approval";

    const payload = {
      tenant_id: user.tenantId || "master",
      order_number: String(b.orderNumber || `WO-${Date.now()}`),
      vehicle_id: vehicleId,
      plate_number: plateNumber,
      maintenance_type: String(b.maintenanceType || "صيانة ميكانيكا"),
      status: finalStatus,
      workshop: String(b.workshop || ""),
      description: String(b.description || ""),
      cost: Number(b.cost) || 0,
      start_date: toDateOrNull(b.startDate),
      end_date: toDateOrNull(b.endDate),
      technician_name: String(b.technicianName || ""),
      received_by: String(b.receivedBy || ""),
      lifespan_km: Number(b.lifespanKm) || 0,
      last_maintenance_date: toDateOrNull(b.lastMaintenanceDate),
      next_maintenance_date: toDateOrNull(b.nextMaintenanceDate),
      invoice_url: String(b.invoiceUrl || ""),
      notes: String(b.notes || ""),
    };

    const result = await db.execute(sql`
      INSERT INTO work_orders (
        tenant_id, order_number, vehicle_id, plate_number, maintenance_type, status, workshop,
        description, cost, start_date, end_date, technician_name, received_by, lifespan_km,
        last_maintenance_date, next_maintenance_date, invoice_url, notes
      ) VALUES (
        ${payload.tenant_id}, ${payload.order_number}, ${payload.vehicle_id}, ${payload.plate_number},
        ${payload.maintenance_type}, ${payload.status}, ${payload.workshop}, ${payload.description},
        ${payload.cost}, ${payload.start_date}, ${payload.end_date}, ${payload.technician_name},
        ${payload.received_by}, ${payload.lifespan_km}, ${payload.last_maintenance_date},
        ${payload.next_maintenance_date}, ${payload.invoice_url}, ${payload.notes}
      ) RETURNING *
    `);

    const row = (result as any).rows?.[0] || (result as any)[0];

    // ⚡ دورة الإشعارات (Workflow Notifications)
    // 🛡️ محمية بـ try/catch مستقلة: لو فشلت الإشعارات، نجاح حفظ الصيانة نفسه لا يتأثر إطلاقاً
    try {
      if (!isHighLevel) {
        await db.execute(sql`
          INSERT INTO approvals (tenant_id, module_name, record_id, request_type, status, notes, requested_by)
          VALUES (${user.tenantId || "master"}, 'work_orders', ${row.id}, 'add', 'pending', ${"طلب إنشاء صيانة: " + payload.maintenance_type}, ${user.username})
        `);

        await db.execute(sql`
          INSERT INTO notifications (tenant_id, target_username, title, message, link)
          SELECT tenant_id, username, 'طلب صيانة جديد بانتظار الاعتماد', ${`طلب من ${user.username} للسيارة ${plateNumber}`}, '/dashboard/approvals'
          FROM users WHERE role IN ('super_admin', 'owner')
        `);

        await db.execute(sql`
          INSERT INTO notifications (tenant_id, target_username, title, message, link)
          VALUES (${user.tenantId || "master"}, ${user.username}, 'تم إرسال الطلب', ${`تم إرسال أمر صيانة السيارة ${plateNumber} للإدارة للموافقة`}, '/dashboard/work-orders')
        `);
      } else {
        await db.execute(sql`
          INSERT INTO notifications (tenant_id, target_username, title, message, link)
          SELECT tenant_id, username, 'بدء صيانة جديدة', ${`الإدارة بدأت صيانة (${payload.maintenance_type}) للسيارة ${plateNumber}`}, '/dashboard/work-orders'
          FROM users WHERE role IN ('admin', 'user') AND tenant_id = ${user.tenantId || "master"}
        `);
      }
    } catch (notifyErr) {
      console.error("Notification/Approval side-effect failed (non-blocking):", notifyErr);
    }

    if (!isHighLevel) {
      return NextResponse.json({ success: true, data: row, message: "تم الإرسال للإدارة للاعتماد." }, { status: 201 });
    }
    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (e: any) {
    console.error("POST Work Order Error:", e);
    return NextResponse.json({ error: `فشل الحفظ: ${e.message}` }, { status: 500 });
  }
}
