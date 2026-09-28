import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spareParts } from "@/db/schema";
import { desc } from "drizzle-orm";
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

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db.select().from(spareParts).orderBy(desc(spareParts.id));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET Spare Parts Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    const partName = String(body.partName || body.part_name || "").trim();
    if (!partName) {
      return NextResponse.json({ error: "اسم القطعة مطلوب" }, { status: 400 });
    }

    // كل حقل باسمه الصحيح — بدون SQL يدوي بترتيب خاطئ
    const insertData = {
      partName,
      partNumber: String(body.partNumber || body.part_number || ""),
      category: String(body.category || ""),
      quantity: Number(body.quantity) || 0,
      minimumQuantity: Number(body.minimumQuantity ?? body.minimum_quantity) || 0,
      unitPrice: String(body.unitPrice ?? body.unit_price ?? 0),
      supplier: String(body.supplier || ""),
      location: String(body.location || ""),
      status: String(body.status || "available"),
    };

    const [row] = await db.insert(spareParts).values(insertData as any).returning();

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (error: any) {
    console.error("POST Spare Parts Error:", error);
    return NextResponse.json(
      { error: `فشل الحفظ: ${error?.message || String(error)}` },
      { status: 500 }
    );
  }
}
