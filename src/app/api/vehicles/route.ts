import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verifyToken } from "@/lib/auth";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

function toDateOrNull(val: any): string | null {
  if (!val || String(val).trim() === "" || String(val).includes("mm/dd")) return null;
  const d = new Date(String(val).trim());
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// ── GET: جلب السيارات (تتجاهل المحذوف وهمياً وتدعم Multi-Tenancy) ──
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ⚡ السطر الذهبي: فلترة السيارات حسب الفرع وإخفاء المحذوف وهمياً `is_deleted = 0`
    let raw;
    if (user.role === "super_admin") {
      raw = await db.execute(sql`SELECT * FROM vehicles WHERE is_deleted = 0 ORDER BY id DESC`);
    } else {
      raw = await db.execute(sql`SELECT * FROM vehicles WHERE tenant_id = ${user.tenantId || 'master'} AND is_deleted = 0 ORDER BY id DESC`);
    }
    
    const rows = (raw as any).rows || raw || [];

    const formattedVehicles = rows.map((v: any) => ({
      id: v?.id ?? 0,
      plateNumber: String(v?.plate_number || v?.plateNumber || "غير محدد"),
      plate_number: String(v?.plate_number || v?.plateNumber || "غير محدد"),
      vin: String(v?.vin || ""),
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
    }));

    return NextResponse.json(formattedVehicles);
  } catch (error: any) {
    console.error("GET Vehicles Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST: إضافة سيارة جديدة ──
export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const plateNumber = String(body.plate_number || body.plateNumber || "").trim();
    if (!plateNumber) return NextResponse.json({ error: "رقم اللوحة مطلوب" }, { status: 400 });

    const result = await db.execute(sql`
      INSERT INTO vehicles (
        tenant_id, plate_number, vin, company, brand, model, year, governorate, region, 
        department, driver_name, status, current_km, license_expiry, fuel_type
      )
      VALUES (
        ${user.tenantId || 'master'}, ${plateNumber}, ${body.vin || ""}, ${body.company || ""}, 
        ${body.brand || ""}, ${body.model || ""}, ${Number(body.year) || null}, 
        ${body.governorate || ""}, ${body.region || ""}, ${body.department || ""}, 
        ${body.driver_name || body.driverName || ""}, ${body.status || "active"}, 
        ${Number(body.current_km) || 0}, ${toDateOrNull(body.license_expiry)}, ${body.fuel_type || "بنزين"}
      ) RETURNING *
    `);

    return NextResponse.json({ success: true, data: (result as any).rows?.[0] || (result as any)[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: `فشل الحفظ: ${error.message}` }, { status: 500 });
  }
}
