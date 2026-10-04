import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

const ROLE_POWER: Record<string, number> = { owner: 4, super_admin: 3, admin: 2, user: 1 };

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // المستخدم العادي لا يملك صلاحية الوصول لمركز الموافقات إطلاقاً
    if ((ROLE_POWER[user.role] ?? 1) < ROLE_POWER.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const raw = await db.execute(sql`
      SELECT a.*, u.role AS requested_by_role
      FROM approvals a
      LEFT JOIN users u ON u.username = a.requested_by
      ORDER BY CASE WHEN a.status = 'pending' THEN 1 ELSE 2 END, a.id DESC
    `);

    let rows = (raw as any).rows || raw || [];

    // ⚡ فلترة حسب التسلسل الهرمي: كل مستوى يرى فقط الطلبات القادمة ممن هم أدنى منه
    if (user.role === "super_admin") {
      rows = rows.filter((r: any) => (ROLE_POWER[r.requested_by_role] ?? 1) < ROLE_POWER.super_admin);
    } else if (user.role === "admin") {
      rows = rows.filter((r: any) =>
        r.tenant_id === (user.tenantId || "master") &&
        (ROLE_POWER[r.requested_by_role] ?? 1) < ROLE_POWER.admin
      );
    }
    // owner: يرى كل الطلبات بدون أي فلترة

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET Approvals Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
