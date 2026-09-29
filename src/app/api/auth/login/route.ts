import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!username || !password) {
      return NextResponse.json({ error: "اسم المستخدم وكلمة المرور مطلوبان" }, { status: 400 });
    }

    const foundUsers = await db.select().from(users).where(eq(users.username, username)).limit(1);
    const user = foundUsers[0];

    if (!user) {
      return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    let isPasswordValid = false;
    try { isPasswordValid = await bcrypt.compare(password, user.password); } catch { isPasswordValid = false; }

    if (!isPasswordValid && (user.password === password || user.password === String(password))) {
      isPasswordValid = true;
      try {
        const hashed = await bcrypt.hash(password, 10);
        await db.update(users).set({ password: hashed }).where(eq(users.id, user.id));
      } catch (err) {}
    }

    if (!isPasswordValid) {
      return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    let perms: string[] = [];
    try { perms = JSON.parse(user.permissions || "[]"); } catch {}

    // ✅ إضافة الـ tenantId للتوكن لفصل بيانات هذا اليوزر عن غيره
    const token = signToken({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role || "user",
      permissions: perms,
      tenantId: user.tenantId || "master", // 👈 السر هنا
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: perms,
        tenantId: user.tenantId || "master",
      },
    });

    response.cookies.set("fleet360_token", token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 });
  }
}
