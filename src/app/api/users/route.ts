import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ✅ المدير الماستر يرى الجميع، مدير الفرع يرى مستخدمي فرعه فقط!
    let rows;
    if (user.tenantId === "master") {
      rows = await db.select().from(users).orderBy(desc(users.id));
    } else {
      rows = await db.select().from(users).where(eq(users.tenantId, user.tenantId)).orderBy(desc(users.id));
    }
    return NextResponse.json(rows);
  } catch (error) { return NextResponse.json([], { status: 200 }); }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const username = String(body.username || "").trim().toLowerCase();
    const rawPassword = String(body.password || "").trim();
    const name = String(body.name || "").trim();
    
    // ⚡ الذكاء المعماري: تحديد الـ Tenant
    let assignedTenant = user.tenantId; // الافتراضي: يأخذ نفس فرع المدير الذي أنشأه
    if (body.role === "admin" && body.createNewBranch) {
      assignedTenant = username; // إذا اختار فرع مستقل، يصبح اسم الفرع هو نفس اسم اليوزر!
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const [newUser] = await db.insert(users).values({
      username, password: hashedPassword, name, role: body.role || "user",
      permissions: typeof body.permissions === "string" ? body.permissions : JSON.stringify(body.permissions || []),
      tenantId: assignedTenant, // 👈 حفظ الفرع في الداتا بيز
    }).returning();

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: any) {
    if (String(error?.message).includes("unique")) return NextResponse.json({ error: "اسم المستخدم مسجل مسبقاً" }, { status: 400 });
    return NextResponse.json({ error: "فشل الإضافة" }, { status: 500 });
  }
}
