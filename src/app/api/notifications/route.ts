import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

// ── GET: جلب إشعارات المستخدم الحالي غير المقروءة ──
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const raw = await db.execute(sql`
      SELECT * FROM notifications
      WHERE target_username = ${user.username} AND is_read = 0
      ORDER BY created_at DESC
      LIMIT 30
    `);
    const rows = (raw as any).rows || raw || [];
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET Notifications Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── PATCH: تعليم كل إشعارات المستخدم كمقروءة ──
export async function PATCH(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await db.execute(sql`
      UPDATE notifications SET is_read = 1
      WHERE target_username = ${user.username} AND is_read = 0
    `);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "فشل التحديث" }, { status: 500 });
  }
}
