import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

const ROLE_POWER: Record<string, number> = { owner: 4, super_admin: 3, admin: 2, user: 1 };

// خريطة أسماء الوحدات (modules) إلى أسماء الجداول الفعلية
const TABLE_MAP: Record<string, string> = {
  work_orders: "work_orders",
  vehicles: "vehicles",
  fuel_records: "fuel_records",
  oil_changes: "oil_changes",
  spare_parts: "spare_parts",
  tires: "tires",
  vehicle_inspections: "vehicle_inspections",
};

const MODULE_LINKS: Record<string, string> = {
  work_orders: "/dashboard/work-orders",
  vehicles: "/dashboard/vehicles",
  fuel_records: "/dashboard/fuel",
  oil_changes: "/dashboard/oil-changes",
  spare_parts: "/dashboard/spare-parts",
  tires: "/dashboard/tires",
  vehicle_inspections: "/dashboard/health",
};

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const caller = auth(req);
    if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const callerPower = ROLE_POWER[caller.role] ?? 1;
    if (callerPower < ROLE_POWER.admin) {
      return NextResponse.json({ error: "ليست لديك صلاحية اتخاذ قرارات إدارية" }, { status: 403 });
    }

    const params = await context.params;
    const approvalId = Number(params.id);
    const body = await req.json().catch(() => ({}));
    const newStatus = body.status; // 'approved' أو 'rejected'

    if (newStatus !== "approved" && newStatus !== "rejected") {
      return NextResponse.json({ error: "قيمة حالة غير صحيحة" }, { status: 400 });
    }

    const raw = await db.execute(sql`
      SELECT a.*, u.role AS requested_by_role
      FROM approvals a
      LEFT JOIN users u ON u.username = a.requested_by
      WHERE a.id = ${approvalId}
    `);
    const approval = (raw as any).rows?.[0] || (raw as any)[0];
    if (!approval) return NextResponse.json({ error: "طلب غير موجود" }, { status: 404 });

    if (approval.status !== "pending") {
      return NextResponse.json({ error: "تم البت في هذا الطلب مسبقاً" }, { status: 400 });
    }

    const requesterPower = ROLE_POWER[approval.requested_by_role] ?? 1;

    // ⚡ حماية هرمية: لا موافقة إلا من مستوى أعلى فعلياً من مقدم الطلب
    if (callerPower <= requesterPower) {
      return NextResponse.json({ error: "صلاحياتك لا تسمح بالبت في طلب من هذا المستوى الإداري" }, { status: 403 });
    }

    // ⚡ مدير الفرع مقيّد بنطاق فرعه فقط
    if (caller.role === "admin" && approval.tenant_id !== (caller.tenantId || "master")) {
      return NextResponse.json({ error: "هذا الطلب خارج نطاق صلاحية فرعك" }, { status: 403 });
    }

    await db.execute(sql`
      UPDATE approvals SET status = ${newStatus}, approved_by = ${caller.username}, approved_at = NOW()
      WHERE id = ${approvalId}
    `);

    const tableName = TABLE_MAP[approval.module_name];

    // ⚡ تنفيذ الأثر الفعلي على السجل المرتبط حسب نوع الطلب
    try {
      if (tableName && approval.request_type === "delete") {
        if (newStatus === "approved") {
          if (tableName === "vehicles") {
            await db.execute(sql`UPDATE vehicles SET is_deleted = 1, deleted_by = ${caller.username}, deleted_at = NOW() WHERE id = ${approval.record_id}`);
          } else if (tableName === "work_orders") {
            await db.execute(sql`UPDATE work_orders SET is_deleted = 1 WHERE id = ${approval.record_id}`);
          } else if (tableName === "fuel_records") {
            await db.execute(sql`UPDATE fuel_records SET is_deleted = 1 WHERE id = ${approval.record_id}`);
          } else if (tableName === "oil_changes") {
            await db.execute(sql`UPDATE oil_changes SET is_deleted = 1 WHERE id = ${approval.record_id}`);
          } else if (tableName === "spare_parts") {
            await db.execute(sql`UPDATE spare_parts SET is_deleted = 1 WHERE id = ${approval.record_id}`);
          } else if (tableName === "tires") {
            await db.execute(sql`UPDATE tires SET is_deleted = 1 WHERE id = ${approval.record_id}`);
          } else if (tableName === "vehicle_inspections") {
            await db.execute(sql`UPDATE vehicle_inspections SET is_deleted = 1 WHERE id = ${approval.record_id}`);
          }
        }
        // عند الرفض: لا يتغير السجل الأصلي ويبقى نشطاً كما هو
      } else if (approval.module_name === "work_orders" && approval.request_type === "add") {
        if (newStatus === "approved") {
          await db.execute(sql`UPDATE work_orders SET status = 'in_progress' WHERE id = ${approval.record_id}`);
        } else {
          await db.execute(sql`UPDATE work_orders SET is_deleted = 1, status = 'rejected' WHERE id = ${approval.record_id}`);
        }
      }
    } catch (effectErr) {
      console.error("Approval side-effect failed:", effectErr);
    }

    // ⚡ إشعار مقدم الطلب بالنتيجة (محمي: لا يوقف نجاح العملية الأساسية)
    try {
      const link = MODULE_LINKS[approval.module_name] || "/dashboard";
      const title = newStatus === "approved" ? "تمت الموافقة على طلبك" : "تم رفض طلبك";
      const message = newStatus === "approved"
        ? `تمت الموافقة على طلبك: ${approval.notes || ""}`
        : `تم رفض طلبك من قبل ${caller.username}: ${approval.notes || ""}`;

      await db.execute(sql`
        INSERT INTO notifications (tenant_id, target_username, title, message, link)
        VALUES (${approval.tenant_id}, ${approval.requested_by}, ${title}, ${message}, ${link})
      `);
    } catch (notifyErr) {
      console.error("Notification failed (non-blocking):", notifyErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT Approval Error:", error);
    return NextResponse.json({ error: "فشل معالجة الطلب" }, { status: 500 });
  }
}
