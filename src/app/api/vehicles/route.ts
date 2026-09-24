import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { verifyToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function auth(req: NextRequest) {
  const token = req.cookies.get("fleet360_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const rawVehicles = await db.select().from(vehicles);
    
    // إرجاع البيانات بكل الاحتمالات الهيكلية لتجنب أي فشل في الـ Frontend
    const formattedVehicles = rawVehicles.map((v: any) => ({
      id: v.id,
      plateNumber: v.plateNumber || v.plate_number || "غير محدد",
      plate_number: v.plateNumber || v.plate_number || "غير محدد",
      brand: v.brand || "غير محدد",
      model: v.model || "غير محدد",
      year: v.year || 2020,
      department: v.department || "غير محدد",
      driverName: v.driverName || v.driver_name || "غير متوفر",
      driver_name: v.driverName || v.driver_name || "غير متوفر",
      status: v.status || "active",
      currentKm: v.currentKm ?? v.current_km ?? 0,
      current_km: v.currentKm ?? v.current_km ?? 0,
      licenseExpiry: v.licenseExpiry || v.license_expiry || null,
      license_expiry: v.licenseExpiry || v.license_expiry || null,
      insuranceExpiry: v.insuranceExpiry || v.insurance_expiry || null,
      insurance_expiry: v.insuranceExpiry || v.insurance_expiry || null,
      color: v.color || "أبيض",
      vin: v.vin || null,
      notes: v.notes || "",
    }));

    return NextResponse.json(formattedVehicles, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error("Database Fetch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
