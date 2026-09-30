import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = auth(req);
    if (!user || (user.role !== "super_admin" && user.role !== "owner")) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const params = await context.params;
    const approvalId = Number(params.id);
    const body = await req.json();
    const newStatus = body.status; // 'approved' أو 'rejected'

    const raw = await db.execute(sql`SELECT * FROM approvals WHERE id = ${approvalId}`);
    const approval = (raw as any).rows?.[0] || (raw as any)[0];
    if (!approval) return NextResponse.json({ error: "طلب غير موجود" }, { status: 404 });

    await db.execute(sql`UPDATE approvals SET status = ${newStatus}, approved_by = ${user.username}, approved_at = NOW() WHERE id = ${approvalId}`);

    // ⚡ معالجة أمر الشغل + الإشعارات
    if (approval.module_name === "work_orders") {
      if (approval.request_type === "add") {
        if (newStatus === "approved") {
          await db.execute(sql`UPDATE work_orders SET status = 'in_progress' WHERE id = ${approval.record_id}`);
          // إشعار للموظف بالقبول
          await db.execute(sql`INSERT INTO notifications (tenant_id, target_username, title, message, link) VALUES (${approval.tenant_id}, ${approval.requested_by}, 'تمت الموافقة!', 'تم اعتماد أمر الصيانة الخاص بك وهو الآن قيد التنفيذ.', '/dashboard/work-orders')`);
        } else {
          await db.execute(sql`UPDATE work_orders SET is_deleted = 1, status = 'rejected' WHERE id = ${approval.record_id}`);
          // إشعار للموظف بالرفض
          await db.execute(sql`INSERT INTO notifications (tenant_id, target_username, title, message, link) VALUES (${approval.tenant_id}, ${approval.requested_by}, 'طلب مرفوض', 'تم رفض طلب أمر الصيانة من قبل الإدارة.', '/dashboard/work-orders')`);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "فشل معالجة الطلب" }, { status: 500 });
  }
}
