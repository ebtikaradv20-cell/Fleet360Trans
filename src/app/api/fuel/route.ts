import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fuelRecords, vehicles } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

function auth(req: NextRequest) {
  try {
    const token = req.cookies.get("fleet360_token")?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

// تنظيف التواريخ ومنع القيمة المكسورة mm/dd/yyyy
function cleanDate(val: any): string | null {
  if (!val || String(val).trim() === "" || String(val).includes("mm/dd")) return null;
  const d = new Date(String(val).trim());
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// ── GET: جلب سجلات الوقود ──
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db.select().from(fuelRecords).orderBy(desc(fuelRecords.id));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET Fuel Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST: إضافة سجل وقود آمن بـ Drizzle ORM (مستحيل تلخبط الترتيب) ──
export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    let plateNumber = String(body.plateNumber || body.plate_number || "").trim();
    let vehicleId: number | null = body.vehicleId ? Number(body.vehicleId) : null;

    // بحث تلقائي عن ID السيارة لو مفيش ID مبعوث
    if ((!vehicleId || isNaN(vehicleId)) && plateNumber) {
      try {
        const found = await db.select().from(vehicles).where(eq(vehicles.plateNumber, plateNumber)).limit(1);
        if (found[0]?.id) vehicleId = found[0].id;
      } catch {}
    }

    if (!plateNumber) {
      return NextResponse.json({ error: "رقم اللوحة مطلوب" }, { status: 400 });
    }

    const litersNum = Number(body.liters) || 0;
    const costPerLiterNum = Number(body.costPerLiter ?? body.cost_per_liter) || 0;
    const totalCostNum = Number(body.totalCost ?? body.total_cost) || (litersNum * costPerLiterNum);
    const odometerNum = Number(body.odometer) || 0;

    // ربط الحقول بأسمائها في Schema الصريحة
    const insertData = {
      vehicleId: vehicleId && !isNaN(vehicleId) ? vehicleId : null,
      plateNumber,
      driverName: String(body.driverName || body.driver_name || ""),
      liters: String(litersNum),
      costPerLiter: String(costPerLiterNum),
      totalCost: String(totalCostNum),
      odometer: odometerNum,
      station: String(body.station || ""),
      fuelDate: cleanDate(body.fuelDate || body.fuel_date),
    };

    // 1. إضافة بـ Drizzle Native
    const [insertedRow] = await db.insert(fuelRecords).values(insertData as any).returning();

    // 2. ⚡ التزامن التلقائي: تحديث عداد السيارة في جدول السيارات
    if (insertData.vehicleId && insertData.odometer > 0) {
      try {
        await db.execute(sql`
          UPDATE vehicles 
          SET current_km = GREATEST(COALESCE(current_km, 0), ${insertData.odometer})
          WHERE id = ${insertData.vehicleId}
        `);
      } catch (syncErr) {
        console.error("Auto-sync Vehicle Km Error:", syncErr);
      }
    }

    return NextResponse.json({ success: true, data: insertedRow }, { status: 201 });
  } catch (error: any) {
    console.error("POST Fuel Error:", error);
    return NextResponse.json({ error: `فشل الحفظ: ${error?.message || String(error)}` }, { status: 500 });
  }
}
