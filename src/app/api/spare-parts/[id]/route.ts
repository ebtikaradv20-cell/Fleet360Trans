import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spareParts } from "@/db/schema";
import { eq } from "drizzle-orm";
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

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "معرف غير صحيح" }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    const updateData = {
      partName: String(body.partName || body.part_name || "").trim(),
      partNumber: String(body.partNumber || body.part_number || ""),
      category: String(body.category || ""),
      quantity: Number(body.quantity) || 0,
      minimumQuantity: Number(body.minimumQuantity ?? body.minimum_quantity) || 0,
      unitPrice: String(body.unitPrice ?? body.unit_price ?? 0),
      supplier: String(body.supplier || ""),
      location: String(body.location || ""),
      status: String(body.status || "available"),
    };

    if (!updateData.partName) {
      return NextResponse.json({ error: "اسم القطعة مطلوب" }, { status: 400 });
    }

    const [row] = await db
      .update(spareParts)
      .set(updateData as any)
      .where(eq(spareParts.id, id))
      .returning();

    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    console.error("PUT Spare Parts Error:", error);
    return NextResponse.json(
      { error: `فشل التعديل: ${error?.message || String(error)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const id = Number(params.id);

    await db.delete(spareParts).where(eq(spareParts.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "فشل الحذف" },
      { status: 500 }
    );
  }
}
