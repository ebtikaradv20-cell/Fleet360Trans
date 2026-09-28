import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spareParts } from "@/db/schema";
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

    const raw = await db.execute(sql`SELECT * FROM spare_parts ORDER BY id DESC`);
    return NextResponse.json(raw.rows || raw);
  } catch (error) {
    console.error("GET Spare Parts Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const [row] = await db.insert(spareParts).values(payload).returning();
    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: `فشل الحفظ: ${error.message}` }, { status: 500 });
  }
}
