import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { verifyToken } from "@/lib/auth";

/**
 * دالة مركزية للتحقق من المصادقة واستخراج بيانات المستخدم من ملفات تعريف الارتباط
 */
function authenticateUser(req: NextRequest) {
  const token = req.cookies.get("fleet360_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * دالة لمعالجة وتحويل التواريخ بشكل آمن لتوافق قاعدة البيانات
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

export async function GET(req: NextRequest) {
  try {
    const user = authenticateUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allVehicles = await db.select().from(vehicles);
    return NextResponse.json(allVehicles, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Database Fetch Error (Vehicles):", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = authenticateUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // استخلاص ومعالجة البيانات بمرونة تامة (دعم camelCase و snake_case)
    const plateNumber = String(body.plate_number || body.plateNumber || "").trim();
    const brand = String(body.brand || "").trim();
    const model = String(body.model || "").trim();
    const year = body.year ? parseInt(body.year, 10) : null;
    const department = String(body.department || "").trim();
    const driverName = String(body.driver_name || body.driverName || "").trim();
    
    const rawStatus = body.status;
    const status = rawStatus === "نشطة" || rawStatus === "active" ? "active" : (rawStatus || "active");
    
    const rawKm = body.current_km !== undefined ? body.current_km : body.currentKm;
    const currentKm = rawKm !== undefined && rawKm !== null ? Number(rawKm) : 0;
    
    const licenseExpiry = parseDate(body.license_expiry || body.licenseExpiry);
    const insuranceExpiry = parseDate(body.insurance_expiry || body.insuranceExpiry);
    
    const color = body.color ? String(body.color).trim() : null;
    const vin = body.vin ? String(body.vin).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    // التحقق من الحقول الإجبارية الأساسية لمنع إدخال بيانات ناقصة
    if (!plateNumber || !brand || !model) {
      return NextResponse.json(
        { error: "Missing required fields: plateNumber, brand, and model are required." },
        { status: 400 }
      );
    }

    // إدخال البيانات المعتمد على Drizzle ORM
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to insert vehicle";
    console.error("Database Insert Error (Vehicles):", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
