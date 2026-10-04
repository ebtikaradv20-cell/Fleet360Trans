import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

// تحديد قوة كل دور (للمقارنة الهرمية)
const ROLE_POWER: Record<string, number> = {
  owner: 4,
  super_admin: 3,
  admin: 2,
  user: 1
};

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const caller = auth(req);
    if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const targetUserId = Number(params.id);
    const body = await req.json().catch(() => ({}));

    const rawTarget = await db.execute(sql`SELECT * FROM users WHERE id = ${targetUserId}`);
    const targetUser = (rawTarget as any).rows?.[0] || (rawTarget as any)[0];
    if (!targetUser) return NextResponse.json({ error: "مستخدم غير موجود" }, { status: 404 });

    const callerPower = ROLE_POWER[caller.role] || 0;
    const targetPower = ROLE_POWER[targetUser.role] || 0;
    const newRolePower = ROLE_POWER[body.role] || 0;

    if (targetPower === 4 && caller.userId !== targetUserId) {
      return NextResponse.json({ error: "لا يمكن المساس بحساب المالك (Owner)!" }, { status: 403 });
    }
    if (callerPower <= targetPower && caller.userId !== targetUserId) {
      return NextResponse.json({ error: "صلاحياتك لا تسمح بتعديل هذا المستوى الإداري." }, { status: 403 });
    }
    if (newRolePower >= callerPower && caller.userId !== targetUserId) {
      return NextResponse.json({ error: "لا يمكنك ترقية مستخدم لمستوى أعلى من مستواك أو مساوٍ لك." }, { status: 403 });
    }

    const updateData: any = {
      name: String(body.name || "").trim(),
      username: String(body.username || "").trim().toLowerCase(),
      role: String(body.role || targetUser.role),
      permissions: typeof body.permissions === "string" ? body.permissions : JSON.stringify(body.permissions || []),
    };

    if (body.password && String(body.password).trim() !== "") {
      updateData.password = await bcrypt.hash(String(body.password).trim(), 10);
    }

    await db.update(users).set(updateData).where(eq(users.id, targetUserId));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const caller = auth(req);
    if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const targetUserId = Number(params.id);

    // منع حذف النفس
    if (caller.userId === targetUserId) {
      return NextResponse.json({ error: "لا يمكنك حذف حسابك الخاص!" }, { status: 400 });
    }

    const rawTarget = await db.execute(sql`SELECT * FROM users WHERE id = ${targetUserId}`);
    const targetUser = (rawTarget as any).rows?.[0] || (rawTarget as any)[0];
    if (!targetUser) return NextResponse.json({ error: "مستخدم غير موجود" }, { status: 404 });

    const callerPower = ROLE_POWER[caller.role] || 0;
    const targetPower = ROLE_POWER[targetUser.role] || 0;

    // لا أحد يحذف المالك (Owner)
    if (targetPower === 4) {
      return NextResponse.json({ error: "لا يمكن حذف حساب المالك (Owner)!" }, { status: 403 });
    }

    // لا يمكنك حذف شخص أعلى منك أو يساويك في المستوى
    if (callerPower <= targetPower) {
      return NextResponse.json({ error: "صلاحياتك لا تسمح بحذف هذا المستوى الإداري." }, { status: 403 });
    }

    await db.delete(users).where(eq(users.id, targetUserId));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
