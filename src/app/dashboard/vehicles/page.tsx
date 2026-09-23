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

    // إدخال البيانات باستخدام Drizzle ORM مع تنظيف النصوص الفارغة وتحويلها إلى null لتجنب أخطاء قاعدة البيانات
    const newVehicle = await db.insert(vehicles).values({
      plateNumber: body.plateNumber || body.plate_number || "",
      brand: body.brand || "",
      model: body.model || "",
      year: body.year ? Number(body.year) : new Date().getFullYear(),
      department: body.department || "عام", // وضع قيمة افتراضية في حال ترك الحقل فارغاً
      driverName: body.driverName || body.driver_name || null,
      status: body.status || "active",
      currentKm: body.currentKm !== undefined && body.currentKm !== "" ? Number(body.currentKm) : 0,
      licenseExpiry: body.licenseExpiry && body.licenseExpiry.trim() !== "" ? body.licenseExpiry : null,
      insuranceExpiry: body.insuranceExpiry && body.insuranceExpiry.trim() !== "" ? body.insuranceExpiry : null,
      color: body.color || null,
      vin: body.vin || null,
      notes: body.notes || null,
    }).returning();

    return NextResponse.json({ success: true, vehicle: newVehicle[0] });
  } catch (error) {
    console.error("Error adding vehicle:", error);
    return NextResponse.json({ error: "Failed to add vehicle", details: String(error) }, { status: 500 });
  }
}
