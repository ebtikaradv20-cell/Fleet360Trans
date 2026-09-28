import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders, vehicles } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try {
    const token = req.cookies.get("fleet360_token")?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

function toDateOrNull(val: any): string | null {
  if (!val || String(val).trim() === "") return null;
  const d = new Date(String(val).trim());
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db.select().from(workOrders).orderBy(desc(workOrders.id));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET Work Orders Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    // تأمين رقم اللوحة و vehicleId
    let plateNumber = String(body.plateNumber || body.plate_number || "").trim();
    let vehicleId: number | null = body.vehicleId ? Number(body.vehicleId) : null;

    // لو مفيش vehicleId لكن في لوحة → نبحث عن السيارة
    if ((!vehicleId || isNaN(vehicleId)) && plateNumber) {
      try {
        const found = await db
          .select()
          .from(vehicles)
          .where(eq(vehicles.plateNumber, plateNumber))
          .limit(1);
        if (found[0]?.id) vehicleId = found[0].id;
      } catch {
        // fallback SQL
        try {
          const raw = await db.execute(
            sql`SELECT id FROM vehicles WHERE plate_number = ${plateNumber} LIMIT 1`
          );
          const row = (raw as any).rows?.[0] || (raw as any)[0];
          if (row?.id) vehicleId = Number(row.id);
        } catch {}
      }
    }

    if (!plateNumber) {
      return NextResponse.json({ error: "رقم اللوحة مطلوب" }, { status: 400 });
    }

    // القيم بأسماء Drizzle Schema الصحيحة (camelCase في الكود)
    const insertData = {
      orderNumber: String(body.orderNumber || body.order_number || `WO-${Date.now()}`),
      vehicleId: vehicleId && !isNaN(vehicleId) ? vehicleId : null,
      plateNumber,
      maintenanceType: String(body.maintenanceType || body.maintenance_type || "صيانة ميكانيكا"),
      status: String(body.status || "pending"),
      workshop: String(body.workshop || ""),
      description: String(body.description || ""),
      cost: String(body.cost ?? 0), // decimal في schema غالباً text/decimal
      startDate: toDateOrNull(body.startDate || body.start_date),
      endDate: toDateOrNull(body.endDate || body.end_date),
      technicianName: String(body.technicianName || body.technician_name || ""),
    };

    // إدخال آمن بـ Drizzle (كل حقل باسمه — مفيش لخبطة ترتيب)
    const [row] = await db.insert(workOrders).values(insertData as any).returning();

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (error: any) {
    console.error("POST Work Orders Error:", error);
    return NextResponse.json(
      { error: `فشل الحفظ: ${error?.message || String(error)}` },
      { status: 500 }
    );
  }
}
