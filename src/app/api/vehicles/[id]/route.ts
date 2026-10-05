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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const vehicleId = Number(resolvedParams.id);
    if (!vehicleId) return NextResponse.json({ error: "معرف السيارة غير صالح" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const sapNumber = String(
      body.sap_number ?? body.sapNumber ?? body.sap ?? body.sap_code ?? ""
    ).trim();

    const plateNumber = String(body.plate_number || body.plateNumber || "").trim();
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
    const licenseExpiry = body.license_expiry || body.licenseExpiry || null;
    const fuelType = String(body.fuel_type || body.fuelType || "سولار و غاز طبيعى").trim();
    const notes = String(body.notes || "").trim();

    // التأكد من وجود عمود sap_number وحفظه
    await db.execute(sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sap_number TEXT`);

    const result = await db.execute(sql`
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
      WHERE id = ${vehicleId}
      RETURNING *
    `);

    const updated = (result as any).rows?.[0] || (result as any)[0];
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    console.error("PUT Vehicle By ID Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const vehicleId = Number(resolvedParams.id);

    await db.execute(sql`UPDATE vehicles SET is_deleted = 1 WHERE id = ${vehicleId}`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
