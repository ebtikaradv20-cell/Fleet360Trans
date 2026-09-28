import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicleParts } from "@/db/schema";
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
    const raw = await db.execute(sql`SELECT * FROM vehicle_parts ORDER BY id DESC`);
    return NextResponse.json(raw.rows || raw);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const payload = {
      vehicleId: Number(body.vehicleId) || null,
      plateNumber: body.plateNumber || "",
      partName: body.partName || "",
      partCategory: body.partCategory || "",
      brand: body.brand || "",
      condition: body.condition || "good",
      kmAtInstall: Number(body.kmAtInstall) || 0,
      cost: Number(body.cost) || 0,
      installDate: body.installDate && body.installDate.trim() !== "" ? body.installDate : null,
    };

    const [row] = await db.insert(vehicleParts).values(payload).returning();
    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: `فشل الحفظ: ${error.message}` }, { status: 500 });
  }
}
