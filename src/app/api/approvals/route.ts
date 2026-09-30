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
    if (!user || user.role === "user") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let raw;
    if (user.role === "super_admin") {
      raw = await db.execute(sql`SELECT * FROM approvals ORDER BY id DESC`);
    } else {
      raw = await db.execute(sql`SELECT * FROM approvals WHERE tenant_id = ${user.tenantId} ORDER BY id DESC`);
    }

    return NextResponse.json((raw as any).rows || raw || []);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}
