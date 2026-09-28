import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verifyToken } from "@/lib/auth";
import { sql } from "drizzle-orm";

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

// ── PUT: تعديل بيانات سيارة مسجلة بالـ ID ──
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

    const plateNumber = body.plate_number || body.plateNumber || "";
    const company = body.company || "";
    const brand = body.brand || "";
    const model = body.model || "";
    const year = body.year ? parseInt(String(body.year), 10) : null;
    const governorate = body.governorate || "";
    const region = body.region || "";
    const department = body.department || "";
    const driverName = body.driver_name || body.driverName || "";
    const status = body.status || "active";
    const currentKm = body.current_km !== undefined ? parseFloat(String(body.current_km)) : 0;
    const licenseExpiry = body.license_expiry || body.licenseExpiry || null;
    const fuelType = body.fuel_type || body.fuelType || "بنزين";

    await db.execute(sql`
      UPDATE vehicles
      SET 
        plate_number = ${plateNumber},
        company = ${company},
        brand = ${brand},
        model = ${model},
        year = ${year},
        governorate = ${governorate},
        region = ${region},
        department = ${department},
        driver_name = ${driverName},
        status = ${status},
        current_km = ${currentKm},
        license_expiry = ${licenseExpiry},
        fuel_type = ${fuelType}
      WHERE id = ${vehicleId}
    `);

    return NextResponse.json({ success: true, message: "تم تعديل بيانات السيارة بنجاح" });
  } catch (error: any) {
    console.error("PUT Vehicle Error:", error);
    return NextResponse.json({ error: error.message || "فشل في تعديل بيانات السيارة" }, { status: 500 });
  }
}

// ── DELETE: حذف سيارة نهائياً مع مسح السجلات المرتبطة تلقائياً ──
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

    // 1. مسح السجلات المرتبطة أولاً لمنع خطأ Foreign Key Constraint في Neon DB
    try { await db.execute(sql`DELETE FROM fuel WHERE vehicle_id = ${vehicleId} OR vehicle_id::text = ${String(vehicleId)}`); } catch {}
    try { await db.execute(sql`DELETE FROM oil_changes WHERE vehicle_id = ${vehicleId} OR vehicle_id::text = ${String(vehicleId)}`); } catch {}
    try { await db.execute(sql`DELETE FROM work_orders WHERE vehicle_id = ${vehicleId} OR vehicle_id::text = ${String(vehicleId)}`); } catch {}
    try { await db.execute(sql`DELETE FROM vehicle_parts WHERE vehicle_id = ${vehicleId} OR vehicle_id::text = ${String(vehicleId)}`); } catch {}

    // 2. حذف السيارة نفسها من جدول السيارات
    await db.execute(sql`DELETE FROM vehicles WHERE id = ${vehicleId}`);

    return NextResponse.json({ success: true, message: "تم حذف السيارة وكافة السجلات المرتبطة بها بنجاح" });
  } catch (error: any) {
    console.error("DELETE Vehicle Error:", error);
    return NextResponse.json({ error: error.message || "فشل في حذف السيارة" }, { status: 500 });
  }
}
