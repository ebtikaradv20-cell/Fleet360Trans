import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const raw = await db.execute(sql`SELECT * FROM tires ORDER BY id DESC`);
    return NextResponse.json((raw as any).rows || raw);
  } catch (e) { return NextResponse.json([], { status: 200 }); }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();

    const result = await db.execute(sql`
      INSERT INTO tires (vehicle_id, plate_number, tire_size, tire_brand, install_date, km_at_install, lifespan_km, next_change_km, next_change_date, cost, notes) 
      VALUES (
        ${Number(body.vehicleId) || null}, ${body.plateNumber || ""}, ${body.tireSize || ""}, ${body.tireBrand || ""}, 
        ${body.installDate || null}, ${Number(body.kmAtInstall) || 0}, ${Number(body.lifespanKm) || 40000}, 
        ${Number(body.nextChangeKm) || 0}, ${body.nextChangeDate || null}, ${Number(body.cost) || 0}, ${body.notes || ""}
      ) RETURNING *
    `);
    return NextResponse.json({ success: true, data: (result as any).rows?.[0] }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: `فشل الحفظ: ${e.message}` }, { status: 500 });
  }
}
