import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verifyToken } from "@/lib/auth";
import { sql } from "drizzle-orm";

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
    
    // جلب البيانات باستخدام استعلام SQL مباشر لضمان عدم حدوث أي خطأ في الـ ORM Schema
    const rawVehicles = await db.execute(sql`SELECT * FROM vehicles`);
    const rows = rawVehicles.rows || rawVehicles;

    // إعادة تشكيل البيانات بصيغة متكاملة تخدم الـ Frontend بأمان مطلَق
    const formattedVehicles = (Array.isArray(rows) ? rows : []).map((v: any) => ({
      id: v?.id ?? 0,
      plateNumber: String(v?.plate_number || v?.plateNumber || "غير محدد"),
      plate_number: String(v?.plate_number || v?.plateNumber || "غير محدد"),
      brand: String(v?.brand || "غير محدد"),
      model: String(v?.model || "غير محدد"),
      year: Number(v?.year || 2020),
      department: String(v?.department || "غير محدد"),
      driverName: String(v?.driver_name || v?.driverName || "غير متوفر"),
      driver_name: String(v?.driver_name || v?.driverName || "غير متوفر"),
      status: String(v?.status || "active"),
      currentKm: Number(v?.current_km ?? v?.currentKm ?? 0),
      current_km: Number(v?.current_km ?? v?.currentKm ?? 0),
      licenseExpiry: v?.license_expiry || v?.licenseExpiry || "",
      insuranceExpiry: v?.insurance_expiry || v?.insuranceExpiry || "",
      color: String(v?.color || ""),
      vin: String(v?.vin || ""),
      notes: String(v?.notes || ""),
    }));

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
    
    const plateNumber = body.plate_number || body.plateNumber || "مؤقت";
    const brand = body.brand || "";
    const model = body.model || "";
    const year = body.year ? parseInt(body.year, 10) : null;
    const department = body.department || "";
    const driverName = body.driver_name || body.driverName || "";
    const status = body.status || "active";
    const currentKm = body.current_km !== undefined ? parseFloat(body.current_km) : 0;
    const color = body.color || null;
    const vin = body.vin || null;
    const notes = body.notes || null;

    const result = await db.execute(sql`
      INSERT INTO vehicles (plate_number, brand, model, year, department, driver_name, status, current_km, color, vin, notes)
      VALUES (${plateNumber}, ${brand}, ${model}, ${year}, ${department}, ${driverName}, ${status}, ${currentKm}, ${color}, ${vin}, ${notes})
      RETURNING *
    `);

    const newRow = result.rows?.[0] || result[0];

    return NextResponse.json({ success: true, data: newRow }, { status: 201 });
  } catch (error: any) {
    console.error("Database Insert Error:", error);
    return NextResponse.json({ error: error.message || "Failed to insert vehicle" }, { status: 500 });
  }
}
