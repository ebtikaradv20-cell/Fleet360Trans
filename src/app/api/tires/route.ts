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

// ── GET: جلب سجلات الكاوتش ──
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isSuperAdmin = user.role === "super_admin";
    const tenantId = user.tenantId || "master";

    let result;
    if (isSuperAdmin) {
      result = await db.execute(sql`
        SELECT * FROM tires 
        WHERE (is_deleted = 0 OR is_deleted IS NULL)
        ORDER BY id DESC
      `);
    } else {
      result = await db.execute(sql`
        SELECT * FROM tires 
        WHERE (tenant_id = ${tenantId} OR tenant_id IS NULL)
          AND (is_deleted = 0 OR is_deleted IS NULL)
        ORDER BY id DESC
      `);
    }

    const rows = (result as any).rows || result || [];
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET Tires Error:", error);
    return NextResponse.json({ error: "فشل جلب بيانات الكاوتش" }, { status: 500 });
  }
}

// ── POST: إضافة سجل كاوتش جديد ──
export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const b = await req.json().catch(() => ({}));
    const tenantId = user.tenantId || "master";

    const vehicleId = b.vehicleId ? Number(b.vehicleId) : null;
    const plateNumber = String(b.plateNumber || b.plate_number || "").trim();
    const brand = String(b.brand || "").trim();
    const size = String(b.size || "").trim();
    const installDate = b.installDate || b.installation_date || new Date().toISOString().slice(0, 10);
    const odometerAtInstall = Number(b.odometerAtInstall || b.odometer_at_install) || 0;
    const nextChangeKm = Number(b.nextChangeKm || b.next_change_km) || 0;
    const cost = Number(b.cost) || 0;
    const notes = String(b.notes || "");

    const result = await db.execute(sql`
      INSERT INTO tires (
        vehicle_id, plate_number, brand, size, 
        install_date, odometer_at_install, next_change_km, 
        cost, notes, tenant_id, is_deleted
      ) VALUES (
        ${vehicleId}, ${plateNumber}, ${brand}, ${size},
        ${installDate}, ${odometerAtInstall}, ${nextChangeKm},
        ${cost}, ${notes}, ${tenantId}, 0
      )
      RETURNING *
    `);

    const rows = (result as any).rows || result || [];
    return NextResponse.json({
      success: true,
      data: rows[0],
      message: "تم حفظ بيانات الكاوتش بنجاح"
    });
  } catch (error: any) {
    console.error("POST Tire Error:", error);
    return NextResponse.json({ error: `فشل الحفظ: ${error.message}` }, { status: 500 });
  }
}

// ── DELETE: حذف أمر الكاوتش نهائياً أو نقله للمحذوفات ──
export async function DELETE(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
    }

    const tireId = Number(id);
    if (!tireId || isNaN(tireId)) {
      return NextResponse.json({ error: "معرّف الكاوتش غير صالح" }, { status: 400 });
    }

    const isSuperAdmin = user.role === "super_admin";
    const tenantId = user.tenantId || "master";

    let result;
    if (isSuperAdmin) {
      result = await db.execute(sql`
        DELETE FROM tires WHERE id = ${tireId} RETURNING *
      `);
    } else {
      result = await db.execute(sql`
        DELETE FROM tires 
        WHERE id = ${tireId} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
        RETURNING *
      `);
    }

    const rows = (result as any).rows || result || [];
    if (!rows || rows.length === 0) {
      // محاولة Soft Delete إذا كان العمود موجوداً
      if (isSuperAdmin) {
        result = await db.execute(sql`UPDATE tires SET is_deleted = 1 WHERE id = ${tireId} RETURNING *`);
      } else {
        result = await db.execute(sql`UPDATE tires SET is_deleted = 1 WHERE id = ${tireId} AND tenant_id = ${tenantId} RETURNING *`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف أمر الكاوتش بنجاح",
      deletedId: tireId
    });
  } catch (error: any) {
    console.error("DELETE Tire Error:", error);
    return NextResponse.json({ error: `فشل الحذف: ${error.message}` }, { status: 500 });
  }
}
