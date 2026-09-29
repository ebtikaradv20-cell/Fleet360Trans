import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

function auth(req: NextRequest) {
  try {
    const token = req.cookies.get("fleet360_token")?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

// ── GET: جلب جميع المستخدمين ──
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db.select({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      permissions: users.permissions,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.id));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET Users Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST: إضافة مستخدم جديد + تشفير كلمة السر بـ bcrypt ──
export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "").trim().toLowerCase();
    const rawPassword = String(body.password || "").trim();
    const name = String(body.name || "").trim();
    const role = String(body.role || "user");
    const permissions = typeof body.permissions === "string" ? body.permissions : JSON.stringify(body.permissions || []);

    if (!username || !rawPassword || !name) {
      return NextResponse.json({ error: "جميع الحقول الأساسية مطلوبة (اسم المستخدم، الاسم، كلمة السر)" }, { status: 400 });
    }

    // ⚡ تشفير كلمة السر بـ bcrypt تلقائياً لضمان الأمان
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const [newUser] = await db.insert(users).values({
      username,
      password: hashedPassword,
      name,
      role,
      permissions,
    }).returning({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      permissions: users.permissions,
      createdAt: users.createdAt,
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error("POST User Error:", error);
    if (String(error?.message).includes("unique") || String(error?.message).includes("duplicate")) {
      return NextResponse.json({ error: "اسم المستخدم مسجل مسبقاً، اختر اسماً آخر." }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || "فشل في إضافة المستخدم" }, { status: 500 });
  }
}
