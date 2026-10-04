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

function toDateOrNull(val: any): string | null {
  if (!val || String(val).trim() === "" || String(val).includes("mm/dd")) return null;
  const d = new Date(String(val).trim());
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

const ROLE_POWER: Record<string, number> = { owner: 4, super_admin: 3, admin: 2, user: 1 };

// ── PUT: تعديل بيانات سيارة (مع حماية عزل الفروع) ──
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const vehicleId = Number(params.id);
    if (!vehicleId) return NextResponse.json({ error: "معرف السيارة غير صحيح" }, { status: 400 });

    // 🔒 حماية العزل: التأكد أن السيارة تتبع نفس فرع المستخدم (إلا owner/super_admin)
    const isHighLevel = user.role === "owner" || user.role === "super_admin";
    if (!isHighLevel) {
      const check = await db.execute(sql`SELECT tenant_id FROM vehicles WHERE id = ${vehicleId}`);
      const target = (check as any).rows?.[0] || (check as any)[0];
      if (!target) return NextResponse.json({ error: "السيارة غير موجودة" }, { status: 404 });
      if (target.tenant_id !== (user.tenantId || "master")) {
        return NextResponse.json({ error: "لا تملك صلاحية التعديل على سيارة خارج نطاق فرعك" }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));

    const updateData = {
      plateNumber: String(body.plate_number || body.plateNumber || "").trim(),
      vin: String(body.vin || "").trim(),
      company: String(body.company || "").trim(),
      brand: String(body.brand || "").trim(),
      model: String(body.model || "").trim(),
      year: body.year ? Number(body.year) : null,
      governorate: String(body.governorate || "").trim(),
      region: String(body.region || "").trim(),
      department: String(body.department || "").trim(),
      driverName: String(body.driver_name || body.driverName || "").trim(),
      status: String(body.status || "active"),
      currentKm: Number(body.current_km ?? body.currentKm) || 0,
      licenseExpiry: toDateOrNull(body.license_expiry || body.licenseExpiry),
      fuelType: String(body.fuel_type || body.fuelType || "بنزين"),
    };

    await db.execute(sql`
      UPDATE vehicles SET
        plate_number = ${updateData.plateNumber},
        vin = ${updateData.vin},
        company = ${updateData.company},
        brand = ${updateData.brand},
        model = ${updateData.model},
        year = ${updateData.year},
        governorate = ${updateData.governorate},
        region = ${updateData.region},
        department = ${updateData.department},
        driver_name = ${updateData.driverName},
        status = ${updateData.status},
        current_km = ${updateData.currentKm},
        license_expiry = ${updateData.licenseExpiry},
        fuel_type = ${updateData.fuelType}
      WHERE id = ${vehicleId}
    `);

    return NextResponse.json({ success: true, message: "تم تعديل بيانات السيارة بنجاح" });
  } catch (error: any) {
    console.error("PUT Vehicle Error:", error);
    return NextResponse.json({ error: error?.message || "فشل في تعديل بيانات السيارة" }, { status: 500 });
  }
}

// ── DELETE: الحذف الذكي حسب التسلسل الهرمي ──
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const vehicleId = Number(params.id);
    if (!vehicleId) return NextResponse.json({ error: "معرف السيارة غير صحيح" }, { status: 400 });

    const isHighLevel = user.role === "owner" || user.role === "super_admin";
    const tenantId = user.tenantId || "master";

    // 🔒 حماية العزل: مدير الفرع لا يحذف سيارة خارج فرعه
    if (!isHighLevel) {
      const check = await db.execute(sql`SELECT tenant_id, plate_number FROM vehicles WHERE id = ${vehicleId}`);
      const target = (check as any).rows?.[0] || (check as any)[0];
      if (!target) return NextResponse.json({ error: "السيارة غير موجودة" }, { status: 404 });
      if (target.tenant_id !== tenantId) {
        return NextResponse.json({ error: "لا تملك صلاحية حذف سيارة خارج نطاق فرعك" }, { status: 403 });
      }

      // ⚡ إنشاء طلب موافقة (بدون تغيير حالة السيارة نفسها لتفادي تعليقها إذا رُفض الطلب)
      await db.execute(sql`
        INSERT INTO approvals (tenant_id, module_name, record_id, request_type, status, notes, requested_by)
        VALUES (${tenantId}, 'vehicles', ${vehicleId}, 'delete', 'pending', ${`طلب حذف السيارة ${target.plate_number} من الأسطول`}, ${user.username})
      `);

      // 🛡️ إشعارات التسلسل الهرمي (محمية: لا تؤثر على نجاح الطلب)
      try {
        if (user.role === "user") {
          await db.execute(sql`
            INSERT INTO notifications (tenant_id, target_username, title, message, link)
            SELECT tenant_id, username, 'طلب حذف سيارة بانتظار الاعتماد', ${`طلب من ${user.username} لحذف السيارة ${target.plate_number}`}, '/dashboard/approvals'
            FROM users WHERE tenant_id = ${tenantId} AND role = 'admin'
          `);
        }
        await db.execute(sql`
          INSERT INTO notifications (tenant_id, target_username, title, message, link)
          SELECT tenant_id, username, 'طلب حذف سيارة بانتظار الاعتماد', ${`طلب من ${user.username} لحذف السيارة ${target.plate_number}`}, '/dashboard/approvals'
          FROM users WHERE role IN ('super_admin', 'owner')
        `);
      } catch (notifyErr) {
        console.error("Notification failed (non-blocking):", notifyErr);
      }

      return NextResponse.json({ success: true, message: "تم إرسال طلب الحذف للإدارة الرئيسية للموافقة." });
    }

    // owner / super_admin: حذف وهمي مباشر
    await db.execute(sql`UPDATE vehicles SET is_deleted = 1, deleted_by = ${user.username}, deleted_at = NOW() WHERE id = ${vehicleId}`);
    return NextResponse.json({ success: true, message: "تم أرشفة السيارة بنجاح" });
  } catch (error: any) {
    console.error("DELETE Vehicle Error:", error);
    return NextResponse.json({ error: error?.message || "فشل إجراء الحذف" }, { status: 500 });
  }
}
