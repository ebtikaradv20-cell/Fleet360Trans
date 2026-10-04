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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const notifId = Number(params.id);

    // 🔒 التأكد من أن الإشعار يخص المستخدم الحالي فقط
    await db.execute(sql`
      UPDATE notifications SET is_read = 1
      WHERE id = ${notifId} AND target_username = ${user.username}
    `);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "فشل التحديث" }, { status: 500 });
  }
}
