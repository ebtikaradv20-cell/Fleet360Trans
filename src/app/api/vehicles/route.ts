import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verifyToken } from "@/lib/auth";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ⚡ السطر الذهبي: فلترة السيارات بناءً على فرع المستخدم فقط
    const raw = await db.execute(sql`SELECT * FROM vehicles WHERE tenant_id = ${user.tenantId} ORDER BY id DESC`);
    const rows = (raw as any).rows || raw || [];
    return NextResponse.json(rows);
  } catch (error) { return NextResponse.json([], { status: 200 }); }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const plateNumber = body.plate_number || body.plateNumber || "";
    if (!plateNumber) return NextResponse.json({ error: "رقم اللوحة مطلوب" }, { status: 400 });

    const result = await db.execute(sql`
      INSERT INTO vehicles (
        tenant_id, -- 👈 إجبار تسجيل الفرع
        plate_number, company, brand, model, year, governorate, region, department, 
        driver_name, status, current_km, license_expiry, fuel_type
      )
      VALUES (
        ${user.tenantId}, -- 👈 الفرع المسجل به اليوزر الحالي
        ${plateNumber}, ${body.company || ""}, ${body.brand || ""}, ${body.model || ""}, 
        ${Number(body.year) || null}, ${body.governorate || ""}, ${body.region || ""}, 
        ${body.department || ""}, ${body.driver_name || body.driverName || ""}, 
        ${body.status || "active"}, ${Number(body.current_km) || 0}, 
        ${body.license_expiry || null}, ${body.fuel_type || "بنزين"}
      ) RETURNING *
    `);

    return NextResponse.json({ success: true, data: (result as any).rows?.[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: `فشل الحفظ: ${error.message}` }, { status: 500 });
  }
}
