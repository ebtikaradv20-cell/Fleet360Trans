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

    // إدخال البيانات باستخدام Drizzle ORM مباشرة لتجنب أخطاء ترتيب الـ Parameters
    const newVehicle = await db.insert(vehicles).values({
      plateNumber: body.plate_number || body.plateNumber,
      brand: body.brand,
      model: body.model,
      year: body.year ? Number(body.year) : null,
      department: body.department,
      driverName: body.driver_name || body.driverName,
      status: body.status || "active",
      currentKm: body.current_km ? Number(body.current_km) : 0,
      licenseExpiry: body.license_expiry || body.licenseExpiry,
      insuranceExpiry: body.insurance_expiry || body.insuranceExpiry,
      color: body.color,
      vin: body.vin,
      notes: body.notes,
    }).returning();

    return NextResponse.json({ success: true, vehicle: newVehicle[0] });
  } catch (error) {
    console.error("Error adding vehicle:", error);
    return NextResponse.json({ error: "Failed to add vehicle", details: String(error) }, { status: 500 });
  }
}
