import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicleParts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const params = await context.params;
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

    const [row] = await db.update(vehicleParts).set(payload).where(eq(vehicleParts.id, Number(params.id))).returning();
    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const params = await context.params;
    await db.execute(sql`DELETE FROM vehicle_parts WHERE id = ${Number(params.id)}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
