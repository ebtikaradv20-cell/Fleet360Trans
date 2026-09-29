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

    // 1. البحث عن المستخدم
    const foundUsers = await db.select().from(users).where(eq(users.username, username)).limit(1);
    const user = foundUsers[0];

    if (!user) {
      return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    // 2. الفحص الذكي لكلمة المرور (يدعم المشفر وغير المشفر)
    let isPasswordValid = false;

    // أ) تجربة المقارنة بالتشفير
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } catch {
      isPasswordValid = false;
    }

    // ب) تجربة النص المباشر (لو الكلمة محفوظة كـ Plain Text مثل 123)
    if (!isPasswordValid && (user.password === password || user.password === String(password))) {
      isPasswordValid = true;
      // تشفير كلمة السر تلقائياً في قاعدة البيانات لتأمينها مستقبلاً
      try {
        const hashed = await bcrypt.hash(password, 10);
        await db.update(users).set({ password: hashed }).where(eq(users.id, user.id));
      } catch (err) {
        console.error("Auto hash update error:", err);
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    // 3. تجهيز الجلسة والتوكن
    let perms: string[] = [];
    try { perms = JSON.parse(user.permissions || "[]"); } catch {}

    const token = signToken({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role || "user",
      permissions: perms,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: perms,
      },
    });

    response.cookies.set("fleet360_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 أيام
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 });
  }
}
