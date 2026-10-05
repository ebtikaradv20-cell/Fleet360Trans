import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verifyToken } from "@/lib/auth";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try {
    return verifyToken(req.cookies.get("fleet360_token")?.value || "");
  } catch {
    return null;
  }
}

// دالة لمعالجة وتوحيد التواريخ
function toDateOrNull(val: any): string | null {
  if (!val || String(val).trim() === "" || String(val).includes("mm/dd") || String(val) === "-") return null;
  const str = String(val).trim();

  const ymd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;

  const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  const num = Number(str);
  if (!isNaN(num) && num > 25000 && num < 70000) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// التأكد الذاتي التلقائي من وجود الأعمدة في قاعدة البيانات
let columnsChecked = false;
async function ensureColumns() {
  if (columnsChecked) return;
  try {
    await db.execute(sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sap_number TEXT`);
    await db.execute(sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS chassis_number TEXT`);
    await db.execute(sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS notes TEXT`);
    columnsChecked = true;
  } catch {
    // تجاهل في حال كانت الأعمدة موجودة مسبقاً
  }
}

// ── GET: جلب السيارات واسترجاع رقم الساب والشاسيه والملاحظات ──
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureColumns();

    const isHighLevel = user.role === "owner" || user.role === "super_admin";

    let raw;
    if (isHighLevel) {
      raw = await db.execute(sql`SELECT * FROM vehicles WHERE is_deleted = 0 ORDER BY id DESC`);
    } else {
      raw = await db.execute(
        sql`SELECT * FROM vehicles WHERE tenant_id = ${user.tenantId || 'master'} AND is_deleted = 0 ORDER BY id DESC`
      );
    }

    const rows = (raw as any).rows || raw || [];

    const formattedVehicles = rows.map((v: any) => {
      const sapRaw = v?.sap_number ?? v?.sapNumber ?? v?.sap ?? "";
      const chassisRaw = v?.chassis_number ?? v?.chassisNumber ?? v?.vin ?? "";

      return {
        id: v?.id ?? 0,
        plateNumber: String(v?.plate_number || v?.plateNumber || "غير محدد"),
        plate_number: String(v?.plate_number || v?.plateNumber || "غير محدد"),
        // تضمين رقم الساب بدقة كنص أو رقم
        sapNumber: sapRaw !== null && sapRaw !== undefined ? String(sapRaw).trim() : "",
        sap_number: sapRaw !== null && sapRaw !== undefined ? String(sapRaw).trim() : "",
        vin: String(chassisRaw),
        chassisNumber: String(chassisRaw),
        chassis_number: String(chassisRaw),
        company: String(v?.company || "ترانس جاس"),
        brand: String(v?.brand || v?.model || "غير محدد"),
        model: String(v?.model || v?.brand || "غير محدد"),
        year: v?.year ? String(v.year) : "",
        governorate: String(v?.governorate || "كفر الشيخ"),
        region: String(v?.region || ""),
        department: String(v?.department || "تشغيل وصيانة"),
        driverName: String(v?.driver_name || v?.driverName || "غير متوفر"),
        driver_name: String(v?.driver_name || v?.driverName || "غير متوفر"),
        status: String(v?.status || "تعمل"),
        currentKm: Number(v?.current_km ?? v?.currentKm ?? 0),
        current_km: Number(v?.current_km ?? v?.currentKm ?? 0),
        licenseExpiry: v?.license_expiry ? String(v.license_expiry).slice(0, 10) : (v?.licenseExpiry || ""),
        license_expiry: v?.license_expiry ? String(v.license_expiry).slice(0, 10) : (v?.licenseExpiry || ""),
        fuelType: String(v?.fuel_type || v?.fuelType || "سولار و غاز طبيعى"),
        fuel_type: String(v?.fuel_type || v?.fuelType || "سولار و غاز طبيعى"),
        notes: String(v?.notes || ""),
        tenant_id: v?.tenant_id || "master",
      };
    });

    return NextResponse.json(formattedVehicles);
  } catch (error: any) {
    console.error("GET Vehicles Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST: إضافة سيارة جديدة أو تحديث الساب لسيارة قائمة (Upsert ذكي) ──
export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureColumns();

    const body = await req.json().catch(() => ({}));
    const plateNumber = String(body.plate_number || body.plateNumber || "").trim();
    if (!plateNumber) return NextResponse.json({ error: "رقم اللوحة مطلوب" }, { status: 400 });

    const sapNumber = String(body.sap_number ?? body.sapNumber ?? body.sap ?? body.sap_code ?? "").trim();
    const chassis = String(body.chassis_number || body.chassisNumber || body.vin || "").trim();
    const model = String(body.model || body.brand || "بيك اب دوبل").trim();
    const year = body.year ? Number(body.year) : null;
    const company = String(body.company || "ترانس جاس").trim();
    const governorate = String(body.governorate || "كفر الشيخ").trim();
    const region = String(body.region || "").trim();
    const department = String(body.department || "تشغيل وصيانة").trim();
    const driverName = String(body.driver_name || body.driverName || "").trim();
    const status = String(body.status || "تعمل").trim();
    const currentKm = Number(body.current_km || body.currentKm || 0);
    const licenseExpiry = toDateOrNull(body.license_expiry || body.licenseExpiry);
    const fuelType = String(body.fuel_type || body.fuelType || "سولار و غاز طبيعى").trim();
    const notes = String(body.notes || "").trim();

    // فحص ما إذا كانت السيارة مسجلة مسبقاً بنفس رقم اللوحة لتحديث بياناتها ورقم الساب
    const check = await db.execute(sql`
      SELECT id FROM vehicles 
      WHERE plate_number = ${plateNumber} AND is_deleted = 0 
      LIMIT 1
    `);
    const existing = (check as any).rows?.[0] || (check as any)[0];

    let result;
    if (existing?.id) {
      result = await db.execute(sql`
        UPDATE vehicles SET
          sap_number = ${sapNumber},
          vin = ${chassis},
          chassis_number = ${chassis},
          company = ${company},
          brand = ${model},
          model = ${model},
          year = ${year},
          governorate = ${governorate},
          region = ${region},
          department = ${department},
          driver_name = ${driverName},
          status = ${status},
          current_km = ${currentKm},
          license_expiry = ${licenseExpiry},
          fuel_type = ${fuelType},
          notes = ${notes}
        WHERE id = ${existing.id}
        RETURNING *
      `);
    } else {
      result = await db.execute(sql`
        INSERT INTO vehicles (
          tenant_id, plate_number, sap_number, vin, chassis_number, company, 
          brand, model, year, governorate, region, department, driver_name, 
          status, current_km, license_expiry, fuel_type, notes
        )
        VALUES (
          ${user.tenantId || 'master'}, ${plateNumber}, ${sapNumber}, ${chassis}, 
          ${chassis}, ${company}, ${model}, ${model}, ${year}, ${governorate}, 
          ${region}, ${department}, ${driverName}, ${status}, ${currentKm}, 
          ${licenseExpiry}, ${fuelType}, ${notes}
        )
        RETURNING *
      `);
    }

    const savedRow = (result as any).rows?.[0] || (result as any)[0];
    return NextResponse.json({ success: true, data: savedRow }, { status: 201 });
  } catch (error: any) {
    console.error("POST Vehicles Error:", error);
    return NextResponse.json({ error: `فشل الحفظ: ${error.message}` }, { status: 500 });
  }
}

// ── PUT: تعديل بيانات السيارة ورقم الساب مباشرة بالـ ID ──
export async function PUT(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureColumns();

    const body = await req.json().catch(() => ({}));
    const id = body.id;
    const plateNumber = String(body.plate_number || body.plateNumber || "").trim();
    const sapNumber = String(body.sap_number ?? body.sapNumber ?? body.sap ?? body.sap_code ?? "").trim();
    const chassis = String(body.chassis_number || body.chassisNumber || body.vin || "").trim();
    const model = String(body.model || body.brand || "").trim();
    const year = body.year ? Number(body.year) : null;
    const company = String(body.company || "ترانس جاس").trim();
    const governorate = String(body.governorate || "كفر الشيخ").trim();
    const region = String(body.region || "").trim();
    const department = String(body.department || "تشغيل وصيانة").trim();
    const driverName = String(body.driver_name || body.driverName || "").trim();
    const status = String(body.status || "تعمل").trim();
    const currentKm = Number(body.current_km || body.currentKm || 0);
    const licenseExpiry = toDateOrNull(body.license_expiry || body.licenseExpiry);
    const fuelType = String(body.fuel_type || body.fuelType || "سولار و غاز طبيعى").trim();
    const notes = String(body.notes || "").trim();

    let result;
    if (id) {
      result = await db.execute(sql`
        UPDATE vehicles SET
          plate_number = COALESCE(NULLIF(${plateNumber}, ''), plate_number),
          sap_number = ${sapNumber},
          vin = ${chassis},
          chassis_number = ${chassis},
          company = ${company},
          brand = ${model},
          model = ${model},
          year = ${year},
          governorate = ${governorate},
          region = ${region},
          department = ${department},
          driver_name = ${driverName},
          status = ${status},
          current_km = ${currentKm},
          license_expiry = ${licenseExpiry},
          fuel_type = ${fuelType},
          notes = ${notes}
        WHERE id = ${id}
        RETURNING *
      `);
    } else if (plateNumber) {
      result = await db.execute(sql`
        UPDATE vehicles SET
          sap_number = ${sapNumber},
          vin = ${chassis},
          chassis_number = ${chassis},
          company = ${company},
          brand = ${model},
          model = ${model},
          year = ${year},
          governorate = ${governorate},
          region = ${region},
          department = ${department},
          driver_name = ${driverName},
          status = ${status},
          current_km = ${currentKm},
          license_expiry = ${licenseExpiry},
          fuel_type = ${fuelType},
          notes = ${notes}
        WHERE plate_number = ${plateNumber} AND is_deleted = 0
        RETURNING *
      `);
    } else {
      return NextResponse.json({ error: "معرف السيارة أو رقم اللوحة مطلوب" }, { status: 400 });
    }

    const updatedRow = (result as any).rows?.[0] || (result as any)[0];
    return NextResponse.json({ success: true, data: updatedRow }, { status: 200 });
  } catch (error: any) {
    console.error("PUT Vehicles Error:", error);
    return NextResponse.json({ error: `فشل التعديل: ${error.message}` }, { status: 500 });
  }
}
