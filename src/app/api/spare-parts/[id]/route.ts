import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spareParts } from "@/db/schema";
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
      partName: body.partName || "",
      partNumber: body.partNumber || "",
      category: body.category || "",
      quantity: Number(body.quantity) || 0,
      minimumQuantity: Number(body.minimumQuantity) || 0,
      unitPrice: Number(body.unitPrice) || 0,
      supplier: body.supplier || "",
      location: body.location || "",
      status: body.status || "available",
      notes: body.notes || "",
    };

    const [row] = await db.update(spareParts).set(payload).where(eq(spareParts.id, Number(params.id))).returning();
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
    await db.execute(sql`DELETE FROM spare_parts WHERE id = ${Number(params.id)}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
