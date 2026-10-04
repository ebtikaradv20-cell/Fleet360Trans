import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try {
    const token = req.cookies.get("fleet360_token")?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

// ── GET: جلب قائمة الفنيين والسائقين والمهندسين ──
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = user.tenantId || "master";
    const isSuperAdmin = user.role === "super_admin";

    let result;
    if (isSuperAdmin) {
      result = await db.execute(sql`
        SELECT * FROM drivers 
        WHERE (is_deleted = 0 OR is_deleted IS NULL)
        ORDER BY id DESC
      `);
    } else {
      result = await db.execute(sql`
        SELECT * FROM drivers 
        WHERE (tenant_id = ${tenantId} OR tenant_id IS NULL)
          AND (is_deleted = 0 OR is_deleted IS NULL)
        ORDER BY id DESC
      `);
    }

    const rows = (result as any).rows || result || [];
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET Drivers Error:", error);
    return NextResponse.json({ error: "فشل جلب قائمة الأفراد" }, { status: 500 });
  }
}

// ── POST: إضافة فرد جديد (سائق / فني / مهندس) ──
export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const b = await req.json().catch(() => ({}));
    const name = String(b.name || "").trim();
    const role = String(b.role || "سائق").trim();
    const phone = String(b.phone || "").trim();
    const notes = String(b.notes || "").trim();
    const tenantId = user.tenantId || "master";

    if (!name) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    }

    const result = await db.execute(sql`
      INSERT INTO drivers (name, role, phone, notes, tenant_id, is_deleted)
      VALUES (${name}, ${role}, ${phone}, ${notes}, ${tenantId}, 0)
      RETURNING *
    `);

    const rows = (result as any).rows || result || [];
    return NextResponse.json({
      success: true,
      message: "تمت إضافة البيانات بنجاح",
      data: rows[0]
    });
  } catch (error: any) {
    console.error("POST Driver Error:", error);
    return NextResponse.json({ error: `فشل الحفظ: ${error.message}` }, { status: 500 });
  }
}

// ── PUT: تعديل بيانات الفرد ──
export async function PUT(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const b = await req.json().catch(() => ({}));
    const id = Number(b.id);
    const name = String(b.name || "").trim();
    const role = String(b.role || "سائق").trim();
    const phone = String(b.phone || "").trim();
    const notes = String(b.notes || "").trim();

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "المعرف غير صالح" }, { status: 400 });
    }

    const result = await db.execute(sql`
      UPDATE drivers SET
        name = ${name},
        role = ${role},
        phone = ${phone},
        notes = ${notes}
      WHERE id = ${id}
      RETURNING *
    `);

    const rows = (result as any).rows || result || [];
    return NextResponse.json({
      success: true,
      message: "تم تحديث البيانات بنجاح",
      data: rows[0]
    });
  } catch (error: any) {
    console.error("PUT Driver Error:", error);
    return NextResponse.json({ error: `فشل التعديل: ${error.message}` }, { status: 500 });
  }
}

// ── DELETE: حذف الفرد ──
export async function DELETE(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    if (!id) {
      const b = await req.json().catch(() => ({}));
      id = b.id;
    }

    const driverId = Number(id);
    if (!driverId || isNaN(driverId)) {
      return NextResponse.json({ error: "المعرف غير صالح" }, { status: 400 });
    }

    await db.execute(sql`
      UPDATE drivers SET is_deleted = 1 WHERE id = ${driverId}
    `);

    return NextResponse.json({
      success: true,
      message: "تم الحذف بنجاح"
    });
  } catch (error: any) {
    console.error("DELETE Driver Error:", error);
    return NextResponse.json({ error: `فشل الحذف: ${error.message}` }, { status: 500 });
  }
}
