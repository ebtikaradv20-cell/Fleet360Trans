import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("fleet360_token")?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // معالجة آمنة للتواريخ لمنع أخطاء التوافق مع قاعدة البيانات
    const licenseExpiryInput = body.license_expiry || body.licenseExpiry;
    const insuranceExpiryInput = body.insurance_expiry || body.insuranceExpiry;

    const licenseExpiry = licenseExpiryInput ? new Date(licenseExpiryInput) : null;
    const insuranceExpiry = insuranceExpiryInput ? new Date(insuranceExpiryInput) : null;

    // إدخال البيانات باستخدام Drizzle ORM مباشرة وبأعلى معايير الأمان
    const newVehicle = await db.insert(vehicles).values({
      plateNumber: body.plate_number || body.plateNumber || "",
      brand: body.brand || "",
      model: body.model || "",
      year: body.year ? Number(body.year) : null,
      department: body.department || "",
      driverName: body.driver_name || body.driverName || "",
      status: body.status || "active",
      currentKm: body.current_km !== undefined ? Number(body.current_km) : 0,
      licenseExpiry,
      insuranceExpiry,
      color: body.color || null,
      vin: body.vin || null,
      notes: body.notes || null,
    }).returning();

    return NextResponse.json({ success: true, vehicle: newVehicle[0] }, { status: 201 });
  } catch (error: any) {
    console.error("Error adding vehicle:", error);
    return NextResponse.json({ error: "Failed to add vehicle", details: error.message || String(error) }, { status: 500 });
  }
}
