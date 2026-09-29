import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
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

// ── PUT: تعديل بيانات المستخدم مع تشفير كلمة السر لو تم تغييرها ──
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const currentUser = auth(req);
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = await context.params;
    const userId = Number(params.id);
    const body = await req.json().catch(() => ({}));

    const updateData: any = {
      name: String(body.name || "").trim(),
      username: String(body.username || "").trim().toLowerCase(),
      role: String(body.role || "user"),
      permissions: typeof body.permissions === "string" ? body.permissions : JSON.stringify(body.permissions || []),
    };

    // تشفير كلمة السر فقط في حالة إدخال كلمة سر جديدة
    if (body.password && String(body.password).trim() !== "") {
      updateData.password = await bcrypt.hash(String(body.password).trim(), 10);
    }

    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        permissions: users.permissions,
      });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("PUT User Error:", error);
    return NextResponse.json({ error: error?.message || "فشل في تعديل المستخدم" }, { status: 500 });
  }
}

// ── DELETE: حذف مستخدم ──
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const currentUser = auth(req);
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = await context.params;
    const userId = Number(params.id);

    if (userId === currentUser.userId) {
      return NextResponse.json({ error: "لا يمكنك حذف حسابك الخاص" }, { status: 400 });
    }

    await db.delete(users).where(eq(users.id, userId));
    return NextResponse.json({ success: true, message: "تم حذف المستخدم بنجاح" });
  } catch (error: any) {
    console.error("DELETE User Error:", error);
    return NextResponse.json({ error: error?.message || "فشل في حذف المستخدم" }, { status: 500 });
  }
}
