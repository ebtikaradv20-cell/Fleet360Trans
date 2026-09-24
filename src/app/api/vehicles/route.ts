import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { verifyToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function auth(req: NextRequest) {
  try {
    const token = req.cookies.get("fleet360_token")?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // جلب البيانات من قاعدة البيانات بأمان
    const rawVehicles = await db.select().from(vehicles).catch(() => []);
    
    // تنسيق البيانات لتطابق كافة احتمالات الواجهة الأمامية
    const formattedVehicles = (rawVehicles || []).map((v: any) => ({
      id: v?.id ?? 0,
      plateNumber: String(v?.plateNumber || v?.plate_number || "غير محدد"),
      plate_number: String(v?.plateNumber || v?.plate_number || "غير محدد"),
      brand: String(v?.brand || "غير محدد"),
      model: String(v?.model || "غير محدد"),
      year: Number(v?.year || 2020),
      department: String(v?.department || "غير محدد"),
      driverName: String(v?.driverName || v?.driver_name || "غير متوفر"),
      driver_name: String(v?.driverName || v?.driver_name || "غير متوفر"),
      status: String(v?.status || "active"),
      currentKm: Number(v?.currentKm ?? v?.current_km ?? 0),
      current_km: Number(v?.currentKm ?? v?.current_km ?? 0),
      licenseExpiry: v?.licenseExpiry || v?.license_expiry || "",
      insuranceExpiry: v?.insuranceExpiry || v?.insurance_expiry || "",
      color: String(v?.color || ""),
      vin: String(v?.vin || ""),
      notes: String(v?.notes || ""),
    }));

    // إرجاع البيانات في شكل كائن آمن ومتوافق مع المكونات التي تتوقع data أو مصفوفة مباشرة
    return NextResponse.json(formattedVehicles, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error("API Critical Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    const newVehicle = await db.insert(vehicles).values({
      plateNumber: body.plate_number || body.plateNumber || "مؤقت",
      brand: body.brand || "",
      model: body.model || "",
      year: body.year ? parseInt(body.year, 10) : null,
      department: body.department || "",
      driverName: body.driver_name || body.driverName || "",
      status: body.status || "active",
      currentKm: body.current_km !== undefined ? parseFloat(body.current_km) : 0,
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
