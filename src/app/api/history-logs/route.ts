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

    const { searchParams } = new URL(req.url);
    const plateNumber = searchParams.get("plateNumber");

    let raw;
    if (plateNumber) {
      if (user.role === "super_admin") {
        raw = await db.execute(sql`SELECT * FROM history_logs WHERE plate_number = ${plateNumber} ORDER BY created_at DESC`);
      } else {
        raw = await db.execute(sql`SELECT * FROM history_logs WHERE plate_number = ${plateNumber} AND tenant_id = ${user.tenantId || 'master'} ORDER BY created_at DESC`);
      }
    } else {
      return NextResponse.json([]); // يجب تحديد سيارة
    }

    const rows = (raw as any).rows || raw || [];
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET History Logs Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
