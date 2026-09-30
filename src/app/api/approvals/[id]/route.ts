import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql, eq } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import { approvals } from "@/db/schema";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = auth(req);
    if (!user || user.role !== "super_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const approvalId = Number(params.id);
    const body = await req.json();

    // جلب الطلب
    const raw = await db.execute(sql`SELECT * FROM approvals WHERE id = ${approvalId}`);
    const approval = (raw as any).rows?.[0] || (raw as any)[0];
    if (!approval) return NextResponse.json({ error: "طلب غير موجود" }, { status: 404 });

    // تحديث حالة الطلب (قبول/رفض)
    await db.update(approvals).set({ status: body.status, approvedBy: user.username, approvedAt: new Date() }).where(eq(approvals.id, approvalId));

    // تنفيذ الفعل لو تمت الموافقة
    if (body.status === "approved" && approval.request_type === "delete" && approval.module_name === "vehicles") {
       await db.execute(sql`UPDATE vehicles SET is_deleted = 1, deleted_by = ${user.username}, deleted_at = NOW() WHERE id = ${approval.record_id}`);
    } 
    else if (body.status === "rejected" && approval.module_name === "vehicles") {
       await db.execute(sql`UPDATE vehicles SET status = 'active' WHERE id = ${approval.record_id}`); // إرجاعها للعمل
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "فشل معالجة الطلب" }, { status: 500 });
  }
}
