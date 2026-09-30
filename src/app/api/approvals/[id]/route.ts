import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    // فقط الـ Super Admin له حق اتخاذ القرار
    if (!user || user.role !== "super_admin") {
      return NextResponse.json({ error: "غير مصرح لك باتخاذ القرار" }, { status: 403 });
    }

    const params = await context.params;
    const approvalId = Number(params.id);
    const body = await req.json();
    const newStatus = body.status; // 'approved' أو 'rejected'

    // 1. جلب بيانات الطلب
    const raw = await db.execute(sql`SELECT * FROM approvals WHERE id = ${approvalId}`);
    const approval = (raw as any).rows?.[0] || (raw as any)[0];
    
    if (!approval) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    if (approval.status !== "pending") return NextResponse.json({ error: "تم الرد على هذا الطلب مسبقاً" }, { status: 400 });

    // 2. تحديث حالة الطلب في جدول الموافقات
    await db.execute(sql`
      UPDATE approvals 
      SET status = ${newStatus}, approved_by = ${user.username}, approved_at = NOW() 
      WHERE id = ${approvalId}
    `);

    // 3. التنفيذ الفعلي للإجراء بناءً على القرار
    if (approval.module_name === "vehicles" && approval.request_type === "delete") {
      if (newStatus === "approved") {
        // موافقة: حذف وهمي للسيارة (إخفاؤها)
        await db.execute(sql`
          UPDATE vehicles 
          SET is_deleted = 1, deleted_by = ${user.username}, deleted_at = NOW(), status = 'deleted' 
          WHERE id = ${approval.record_id}
        `);
      } else if (newStatus === "rejected") {
        // رفض: إرجاع السيارة للعمل الطبيعي
        await db.execute(sql`
          UPDATE vehicles 
          SET status = 'active' 
          WHERE id = ${approval.record_id}
        `);
      }
    }

    return NextResponse.json({ success: true, message: `تم ${newStatus === 'approved' ? 'قبول' : 'رفض'} الطلب بنجاح.` });
  } catch (error: any) {
    console.error("PUT Approval Error:", error);
    return NextResponse.json({ error: error?.message || "فشل معالجة الطلب" }, { status: 500 });
  }
}
