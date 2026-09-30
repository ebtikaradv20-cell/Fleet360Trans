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
    if (!user || user.role !== "super_admin") {
      return NextResponse.json({ error: "غير مصرح لك باتخاذ القرار (Super Admin Only)" }, { status: 403 });
    }

    const params = await context.params;
    const approvalId = Number(params.id);
    const body = await req.json();
    const newStatus = body.status; // 'approved' أو 'rejected'

    const raw = await db.execute(sql`SELECT * FROM approvals WHERE id = ${approvalId}`);
    const approval = (raw as any).rows?.[0] || (raw as any)[0];
    
    if (!approval) return NextResponse.json({ error: "طلب غير موجود" }, { status: 404 });

    // تحديث حالة الطلب
    await db.execute(sql`
      UPDATE approvals 
      SET status = ${newStatus}, approved_by = ${user.username}, approved_at = NOW() 
      WHERE id = ${approvalId}
    `);

    // ⚡ التنفيذ التلقائي لقرار الموافقة على أي قسم
    if (newStatus === "approved" && approval.request_type === "delete") {
      if (approval.module_name === "vehicles") {
        await db.execute(sql`UPDATE vehicles SET is_deleted = 1, status = 'deleted' WHERE id = ${approval.record_id}`);
      } else if (approval.module_name === "work_orders") {
        await db.execute(sql`UPDATE work_orders SET is_deleted = 1, status = 'deleted' WHERE id = ${approval.record_id}`);
      } else if (approval.module_name === "fuel_records") {
        await db.execute(sql`UPDATE fuel_records SET is_deleted = 1 WHERE id = ${approval.record_id}`);
      } else if (approval.module_name === "oil_changes") {
        await db.execute(sql`UPDATE oil_changes SET is_deleted = 1 WHERE id = ${approval.record_id}`);
      }
    } 
    // ⚡ حالة الرفض: إرجاع السجل لربطه وحالته الأصلية
    else if (newStatus === "rejected") {
      if (approval.module_name === "vehicles") {
        await db.execute(sql`UPDATE vehicles SET status = 'active' WHERE id = ${approval.record_id}`);
      } else if (approval.module_name === "work_orders") {
        await db.execute(sql`UPDATE work_orders SET status = 'pending' WHERE id = ${approval.record_id}`);
      }
    }

    return NextResponse.json({ success: true, message: `تمت معالجة الطلب بـ (${newStatus === 'approved' ? 'القبول' : 'الرفض'}).` });
  } catch (error: any) {
    console.error("PUT Approval Error:", error);
    return NextResponse.json({ error: error?.message || "فشل معالجة الطلب" }, { status: 500 });
  }
}
