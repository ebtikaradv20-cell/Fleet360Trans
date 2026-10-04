import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

const ROLE_POWER: Record<string, number> = {
  owner: 4,
  super_admin: 3,
  admin: 2,
  user: 1,
};

function powerOf(role?: string) {
  return ROLE_POWER[role || "user"] ?? 1;
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);

    if (!user || powerOf(user.role) < ROLE_POWER.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rows;
    if (user.role === "owner" || user.role === "super_admin") {
      rows = await db.select().from(users).orderBy(desc(users.id));
    } else {
      rows = await db.select().from(users).where(eq(users.tenantId, user.tenantId || 'master')).orderBy(desc(users.id));
    }
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);

    if (!user || powerOf(user.role) < ROLE_POWER.admin) {
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const body = await req.json();
    const username = String(body.username || "").trim().toLowerCase();
    const rawPassword = String(body.password || "").trim();
    const name = String(body.name || "").trim();
    let requestedRole = String(body.role || "user").trim();

    if (!username || !rawPassword || !name) {
      return NextResponse.json({ error: "الاسم واسم الدخول وكلمة المرور مطلوبين" }, { status: 400 });
    }

    if (user.role !== "owner" && powerOf(requestedRole) >= powerOf(user.role)) {
      requestedRole = "user";
    }

    if (user.role === "admin") {
      requestedRole = "user";
    }

    let assignedTenant = user.tenantId || "master";

    const canCreateBranch = user.role === "owner" || user.role === "super_admin";
    if (canCreateBranch && requestedRole === "admin" && body.createNewBranch) {
      assignedTenant = username;
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const result = await db.execute(sql`
      INSERT INTO users (username, password, name, role, permissions, tenant_id)
      VALUES (
        ${username}, ${hashedPassword}, ${name}, ${requestedRole}, 
        ${typeof body.permissions === "string" ? body.permissions : JSON.stringify(body.permissions || [])}, 
        ${assignedTenant}
      ) RETURNING id, username, name, role, permissions, tenant_id, created_at
    `);

    const newUser = (result as any).rows?.[0] || (result as any)[0];

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: any) {
    if (String(error?.message).includes("unique")) {
      return NextResponse.json({ error: "اسم المستخدم مسجل مسبقاً" }, { status: 400 });
    }
    return NextResponse.json({ error: "فشل الإضافة" }, { status: 500 });
  }
}
