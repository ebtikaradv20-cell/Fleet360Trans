import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders } from "@/db/schema";
import { sql } from "drizzle-orm";
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

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const raw = await db.execute(sql`SELECT * FROM work_orders ORDER BY id DESC`);
    return NextResponse.json(raw.rows || raw);
  } catch (error) {
    console.error("GET Work Orders Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST: تأمين الحفظ والتريواريخ ──
export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // معالجة آمنة لضمان عدم توقف قاعدة البيانات
    const payload = {
      orderNumber: body.orderNumber || `WO-${Date.now()}`,
      vehicleId: Number(body.vehicleId) || null,
      plateNumber: body.plateNumber || "",
      maintenanceType: body.maintenanceType || "",
      status: body.status || "pending",
      workshop: body.workshop || "",
      description: body.description || "",
      cost: Number(body.cost) || 0,
      technicianName: body.technicianName || "",
      notes: body.notes || "",
      startDate: body.startDate && body.startDate.trim() !== "" ? body.startDate : null,
      endDate: body.endDate && body.endDate.trim() !== "" ? body.endDate : null,
    };

    const [row] = await db.insert(workOrders).values(payload).returning();
    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (error: any) {
    console.error("POST Work Orders Error:", error);
    return NextResponse.json({ error: `فشل الحفظ: ${error.message}` }, { status: 500 });
  }
}
