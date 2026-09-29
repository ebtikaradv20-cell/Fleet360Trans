import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spareParts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try {
    const t = req.cookies.get("fleet360_token")?.value;
    return t ? verifyToken(t) : null;
  } catch {
    return null;
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    const b = await req.json().catch(() => ({}));
    const partName = String(b.partName || b.part_name || "").trim();
    if (!partName) {
      return NextResponse.json({ error: "اسم القطعة مطلوب" }, { status: 400 });
    }

    const [row] = await db
      .update(spareParts)
      .set({
        partName,
        partNumber: String(b.partNumber || b.part_number || ""),
        category: String(b.category || ""),
        quantity: Number(b.quantity) || 0,
        minimumQuantity: Number(b.minimumQuantity ?? b.minimum_quantity) || 0,
        unitPrice: String(Number(b.unitPrice ?? b.unit_price) || 0),
        supplier: String(b.supplier || ""),
        location: String(b.location || ""),
        status: String(b.status || "available"),
      } as any)
      .where(eq(spareParts.id, id))
      .returning();

    return NextResponse.json({ success: true, data: row });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "فشل التعديل" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await ctx.params;
    await db.delete(spareParts).where(eq(spareParts.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "فشل الحذف" }, { status: 500 });
  }
}
