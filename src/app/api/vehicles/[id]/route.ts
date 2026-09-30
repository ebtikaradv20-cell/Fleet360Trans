import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
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

// ── PUT: تعديل بيانات سيارة ──
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

// ── DELETE: الحذف الذكي (Soft Delete للمدير الرئيسي / طلب موافقة للمستويات الأقل) ──
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

    // إذا كان الموظف Super Admin يتم الحذف الوهمي مباشرة (Soft Delete)
    if (user.role === "super_admin") {
      await db.execute(sql`UPDATE vehicles SET is_deleted = 1, deleted_by = ${user.username}, deleted_at = NOW() WHERE id = ${vehicleId}`);
      return NextResponse.json({ success: true, message: "تم أرشفة السيارة بنجاح (Soft Delete)" });
    } 
    // إذا كان الموظف بمستوى أقل يُرسل طلب موافقة للمدير
    else {
      await db.execute(sql`UPDATE vehicles SET status = 'pending_deletion' WHERE id = ${vehicleId}`);
      await db.execute(sql`
        INSERT INTO approvals (tenant_id, module_name, record_id, request_type, status, notes, requested_by)
        VALUES (${user.tenantId || 'master'}, 'vehicles', ${vehicleId}, 'delete', 'pending', 'طلب حذف سيارة من الأسطول', ${user.username})
      `);

      return NextResponse.json({ success: true, message: "تم إرسال طلب الحذف للإدارة الرئيسية للموافقة." });
    }
  } catch (error: any) {
    console.error("DELETE Vehicle Error:", error);
    return NextResponse.json({ error: error?.message || "فشل إجراء الحذف" }, { status: 500 });
  }
}
