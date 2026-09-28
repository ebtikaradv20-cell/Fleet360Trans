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

// ── GET: جلب السيارات ──
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const rawVehicles = await db.execute(sql`SELECT * FROM vehicles ORDER BY id DESC`);
    const rows = rawVehicles.rows || rawVehicles;

    const formattedVehicles = (Array.isArray(rows) ? rows : []).map((v: any) => ({
      id: v?.id ?? 0,
      plateNumber: String(v?.plate_number || v?.plateNumber || "غير محدد"),
      plate_number: String(v?.plate_number || v?.plateNumber || "غير محدد"),
      company: String(v?.company || ""),
      brand: String(v?.brand || "غير محدد"),
      model: String(v?.model || "غير محدد"),
      year: Number(v?.year || 2020),
      governorate: String(v?.governorate || ""),
      region: String(v?.region || ""),
      department: String(v?.department || "غير محدد"),
      driverName: String(v?.driver_name || v?.driverName || "غير متوفر"),
      driver_name: String(v?.driver_name || v?.driverName || "غير متوفر"),
      status: String(v?.status || "active"),
      currentKm: Number(v?.current_km ?? v?.currentKm ?? 0),
      current_km: Number(v?.current_km ?? v?.currentKm ?? 0),
      licenseExpiry: v?.license_expiry || v?.licenseExpiry || "",
      license_expiry: v?.license_expiry || v?.licenseExpiry || "",
      fuelType: String(v?.fuel_type || v?.fuelType || "بنزين"),
      fuel_type: String(v?.fuel_type || v?.fuelType || "بنزين"),
      insuranceExpiry: v?.insurance_expiry || v?.insuranceExpiry || "",
      color: String(v?.color || ""),
      vin: String(v?.vin || ""),
      notes: String(v?.notes || ""),
      createdAt: v?.created_at || v?.createdAt || "",
    }));

    return NextResponse.json(formattedVehicles, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error: any) {
    console.error("API GET Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST: إضافة سيارة جديدة مع تحويل التواريخ الفارغة لـ NULL وآمنة ──
export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    
    const plateNumber = body.plate_number || body.plateNumber || "مؤقت";
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
    
    // ✅ تصحيح التواريخ: تحويل النص الفارغ إلى NULL لتفادي خطأ Postgres
    const licenseExpiry = body.license_expiry && String(body.license_expiry).trim() !== "" ? body.license_expiry : null;
    const fuelType = body.fuel_type || body.fuelType || "بنزين";
    const color = body.color || null;
    const vin = body.vin || null;
    const notes = body.notes || null;

    const result = await db.execute(sql`
      INSERT INTO vehicles (
        plate_number, company, brand, model, year, governorate, region, 
        department, driver_name, status, current_km, license_expiry, fuel_type, color, vin, notes
      )
      VALUES (
        ${plateNumber}, ${company}, ${brand}, ${model}, ${year}, ${governorate}, ${region}, 
        ${department}, ${driverName}, ${status}, ${currentKm}, ${licenseExpiry}, ${fuelType}, ${color}, ${vin}, ${notes}
      )
      RETURNING *
    `);

    const newRow = result.rows?.[0] || result[0];

    return NextResponse.json({ success: true, data: newRow }, { status: 201 });
  } catch (error: any) {
    console.error("Database Insert Error:", error);
    return NextResponse.json({ 
      error: `فشل في حفظ البيانات: ${error.message || "خطأ في الاتصال بقاعدة البيانات"}` 
    }, { status: 500 });
  }
}
