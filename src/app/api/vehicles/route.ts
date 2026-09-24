import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { verifyToken } from "@/lib/auth";

/**
 * دالة آمنة لمعالجة وتحويل التواريخ لتتوافق مع قاعدة البيانات
 */
function parseDate(dateValue: unknown): string | null {
  if (!dateValue) return null;
  try {
    const parsed = new Date(dateValue as string);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

function auth(req: NextRequest) {
  const token = req.cookies.get("fleet360_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const allVehicles = await db.select().from(vehicles);
    return NextResponse.json(allVehicles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // استقبال البيانات بغض النظر عن ما إذا كانت مرسلة camelCase أو snake_case
    const plateNumber = body.plate_number || body.plateNumber || "";
    const brand = body.brand || "";
    const model = body.model || "";
    const year = body.year ? parseInt(body.year, 10) : null;
    const department = body.department || "";
    const driverName = body.driver_name || body.driverName || "";
    const status = body.status === "نشطة" || body.status === "active" ? "active" : (body.status || "active");
    const currentKm = body.current_km !== undefined ? parseFloat(body.current_km) : (body.currentKm !== undefined ? parseFloat(body.currentKm) : 0);
    
    // معالجة آمنة للتواريخ لتجنب أخطاء صيغة الإدخال
    const licenseExpiry = parseDate(body.license_expiry || body.licenseExpiry);
    const insuranceExpiry = parseDate(body.insurance_expiry || body.insuranceExpiry);
    
    const color = body.color || null;
    const vin = body.vin || null;
    const notes = body.notes || null;

    // الإدخال المباشر باستخدام Drizzle ORM (مضمون ومتطابق مع Schema)
    const newVehicle = await db.insert(vehicles).values({
      plateNumber,
      brand,
      model,
      year,
      department,
      driverName,
      status,
      currentKm,
      licenseExpiry,
      insuranceExpiry,
      color,
      vin,
      notes,
    }).returning();

    return NextResponse.json({ success: true, data: newVehicle[0] }, { status: 201 });
  } catch (error: any) {
    console.error("Database Insert Error:", error);
    return NextResponse.json({ error: error.message || "Failed to insert vehicle" }, { status: 500 });
  }
}
