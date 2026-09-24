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
    
    // خريطة تحويل بيانات متوافقة 100% مع TypeScript والـ Frontend
    const formattedVehicles = rawVehicles.map((v: any) => ({
      id: v.id,
      plateNumber: v.plateNumber || v.plate_number || "",
      brand: v.brand || "غير محدد",
      model: v.model || "",
      year: v.year || 2020,
      department: v.department || "",
      driverName: v.driverName || v.driver_name || "",
      status: v.status || "active",
      currentKm: v.currentKm ?? v.current_km ?? 0,
      licenseExpiry: v.licenseExpiry || v.license_expiry || "",
      insuranceExpiry: v.insuranceExpiry || v.insurance_expiry || "",
      color: v.color || "",
      vin: v.vin || "",
      notes: v.notes || "",
      createdAt: v.createdAt || v.created_at || new Date().toISOString(),
      updatedAt: v.updatedAt || v.updated_at || new Date().toISOString()
    }));

    return NextResponse.json(formattedVehicles, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error("Database Fetch Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const newVehicle = await db.insert(vehicles).values({
      plateNumber: body.plate_number || body.plateNumber || "",
      brand: body.brand || "",
      model: body.model || "",
      year: body.year ? parseInt(body.year, 10) : null,
      department: body.department || "",
      driverName: body.driver_name || body.driverName || "",
      status: body.status || "active",
      currentKm: body.current_km !== undefined ? parseFloat(body.current_km) : (body.currentKm !== undefined ? parseFloat(body.currentKm) : 0),
      color: body.color || null,
      vin: body.vin || null,
      notes: body.notes || null,
    }).returning();

    return NextResponse.json({ success: true, data: newVehicle[0] }, { status: 201 });
  } catch (error: any) {
    console.error("Database Insert Error:", error);
    return NextResponse.json({ error: error.message || "Failed to insert vehicle" }, { status: 500 });
  }
}
