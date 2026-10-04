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

// ── GET: جلب سجل إطار واحد ──
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await Promise.resolve(context.params);
    const id = Number(params?.id);

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
    }

    const result = await db.execute(sql`SELECT * FROM tires WHERE id = ${id}`);
    const rows = (result as any).rows || result || [];

    if (!rows[0]) {
      return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: "حدث خطأ أثناء جلب البيانات" }, { status: 500 });
  }
}

// ── DELETE: حذف الإطار المحدد بالمعرف الديناميكي ──
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await Promise.resolve(context.params);
    const id = Number(params?.id);

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
    }

    const isSuperAdmin = user.role === "super_admin";
    const tenantId = user.tenantId || "master";

    let result;
    if (isSuperAdmin) {
      result = await db.execute(sql`DELETE FROM tires WHERE id = ${id} RETURNING *`);
    } else {
      result = await db.execute(sql`
        DELETE FROM tires 
        WHERE id = ${id} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
        RETURNING *
      `);
    }

    const rows = (result as any).rows || result || [];
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "العنصر غير موجود أو تم حذفه مسبقاً" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف أمر الكاوتش بنجاح",
      deletedId: id
    });
  } catch (error: any) {
    console.error("DELETE Tire by ID Error:", error);
    return NextResponse.json({ error: `فشل الحذف: ${error.message}` }, { status: 500 });
  }
}

// ── PUT: تعديل بيانات الإطار ──
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await Promise.resolve(context.params);
    const id = Number(params?.id);

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
    }

    const b = await req.json().catch(() => ({}));
    const brand = String(b.brand || "");
    const size = String(b.size || "");
    const cost = Number(b.cost) || 0;
    const nextChangeKm = Number(b.nextChangeKm || b.next_change_km) || 0;
    const notes = String(b.notes || "");

    const result = await db.execute(sql`
      UPDATE tires SET
        brand = ${brand},
        size = ${size},
        cost = ${cost},
        next_change_km = ${nextChangeKm},
        notes = ${notes}
      WHERE id = ${id}
      RETURNING *
    `);

    const rows = (result as any).rows || result || [];
    return NextResponse.json({
      success: true,
      message: "تم تعديل السجل بنجاح",
      data: rows[0]
    });
  } catch (error: any) {
    return NextResponse.json({ error: `فشل التعديل: ${error.message}` }, { status: 500 });
  }
}
