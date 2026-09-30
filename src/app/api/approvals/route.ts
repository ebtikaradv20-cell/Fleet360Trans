import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // المدير الرئيسي يرى كل الطلبات، مدير الفرع يرى طلباته المعلقة فقط لمتابعتها
    let raw;
    if (user.role === "super_admin") {
      raw = await db.execute(sql`SELECT * FROM approvals ORDER BY CASE WHEN status = 'pending' THEN 1 ELSE 2 END, id DESC`);
    } else {
      raw = await db.execute(sql`SELECT * FROM approvals WHERE tenant_id = ${user.tenantId} ORDER BY id DESC`);
    }

    const rows = (raw as any).rows || raw || [];
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET Approvals Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
