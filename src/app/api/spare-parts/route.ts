import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spareParts } from "@/db/schema";
import { desc } from "drizzle-orm";
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

export async function GET() {
  try {
    const rows = await db.select().from(spareParts).orderBy(desc(spareParts.id));
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const b = await req.json().catch(() => ({}));
    const partName = String(b.partName || b.part_name || "").trim();
    if (!partName) {
      return NextResponse.json({ error: "اسم القطعة مطلوب" }, { status: 400 });
    }

    const [row] = await db
      .insert(spareParts)
      .values({
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
      .returning();

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (e: any) {
    console.error("POST spare-parts:", e);
    return NextResponse.json({ error: `فشل الحفظ: ${e?.message || e}` }, { status: 500 });
  }
}import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spareParts } from "@/db/schema";
import { desc } from "drizzle-orm";
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

export async function GET() {
  try {
    const rows = await db.select().from(spareParts).orderBy(desc(spareParts.id));
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const b = await req.json().catch(() => ({}));
    const partName = String(b.partName || b.part_name || "").trim();
    if (!partName) {
      return NextResponse.json({ error: "اسم القطعة مطلوب" }, { status: 400 });
    }

    const [row] = await db
      .insert(spareParts)
      .values({
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
      .returning();

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (e: any) {
    console.error("POST spare-parts:", e);
    return NextResponse.json({ error: `فشل الحفظ: ${e?.message || e}` }, { status: 500 });
  }
}
