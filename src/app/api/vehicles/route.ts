import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { verifyToken } from "@/lib/auth";

// دالة التحقق من الصلاحيات
function auth(req: NextRequest) {
  const token = req.cookies.get("fleet360_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // جلب كل السيارات (أو يمكنك ترك منطق الـ GET القديم كما هو لو كان يحتوي على فلترة)
    const allVehicles = await db.select().from(vehicles);
    return NextResponse.json(allVehicles);
  } catch (error: any) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch vehicles" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // إدخال البيانات باستخدام Drizzle ORM مع تحديد الأسماء صراحة لمنع تداخل الأعمدة
    const newVehicle = await db.insert(vehicles).values({
      plateNumber: body.plate_number || body.plateNumber || "",
      brand: body.brand || "",
      model: body.model || "",
      year: body.year ? parseInt(body.year) : null,
      department: body.department || "",
      driverName: body.driver_name || body.driverName || "",
      status: body.status || "active",
      currentKm: body.current_km ? parseFloat(body.current_km) : (body.currentKm ? parseFloat(body.currentKm) : 0),
      licenseExpiry: body.license_expiry ? new Date(body.license_expiry) : (body.licenseExpiry ? new Date(body.licenseExpiry) : null),
      insuranceExpiry: body.insurance_expiry ? new Date(body.insurance_expiry) : (body.insuranceExpiry ? new Date(body.insuranceExpiry) : null),
      color: body.color || null,
      vin: body.vin || null,
      notes: body.notes || null,
    }).returning();

    return NextResponse.json({ success: true, data: newVehicle[0] }, { status: 201 });
  } catch (error: any) {
    console.error("Error inserting vehicle:", error);
    return NextResponse.json({ error: error.message || "Failed to insert vehicle" }, { status: 500 });
  }
}
