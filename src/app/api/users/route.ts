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

// ⚡ تدرج الصلاحيات: كل مستوى رقم أعلى يملك صلاحيات أوسع
const ROLE_LEVEL: Record<string, number> = {
  owner: 4,       // المالك - صلاحية مطلقة
  super_admin: 3, // المدير الرئيسي
  admin: 2,       // مدير الفرع
  user: 1,        // مستخدم عادي
};

function levelOf(role?: string) {
  return ROLE_LEVEL[role || "user"] ?? 1;
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);

    // ✅ owner و super_admin و admin (مدير الفرع) بس اللي يقدروا يشوفوا قائمة المستخدمين
    if (!user || levelOf(user.role) < ROLE_LEVEL.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rows;
    // ✅ المالك والمدير الرئيسي يشوفوا كل المستخدمين في كل الفروع
    if (user.role === "owner" || user.role === "super_admin") {
      rows = await db.select().from(users).orderBy(desc(users.id));
    } else {
      // مدير الفرع يشوف مستخدمين فرعه فقط (عزل كامل حسب الطلب)
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

    if (!user || levelOf(user.role) < ROLE_LEVEL.admin) {
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

    // 🔒 حماية من تصعيد الصلاحيات (Privilege Escalation):
    // محدش يقدر يضيف حساب برتبة أعلى من رتبته أو مساوية له (المالك مستثنى)
    if (user.role !== "owner" && levelOf(requestedRole) >= levelOf(user.role)) {
      requestedRole = "user";
    }

    // مدير الفرع (admin) صلاحيته تضيف "مستخدم عادي" بس، مهما بعت أي role تاني
    if (user.role === "admin") {
      requestedRole = "user";
    }

    // ⚡ تحديد مساحة العمل (Tenant)
    let assignedTenant = user.tenantId || "master";

    // إنشاء فرع مستقل جديد: متاح فقط لـ owner أو super_admin، وبس وقت إضافة "مدير فرع"
    const canCreateBranch = user.role === "owner" || user.role === "super_admin";
    if (canCreateBranch && requestedRole === "admin" && body.createNewBranch) {
      assignedTenant = username;
    } else if (canCreateBranch && body.tenantId) {
      // تحديد فرع معيّن يضيف له المستخدم (اختياري لـ owner/super_admin)
      assignedTenant = String(body.tenantId);
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
