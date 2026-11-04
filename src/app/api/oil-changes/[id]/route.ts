import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try {
    return verifyToken(req.cookies.get("fleet360_token")?.value || "");
  } catch {
    return null;
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    const body = await req.json();

    const currentKm = parseFloat(String(body.currentKm ?? body.current_km ?? 0)) || 0;
    const nextKm = parseFloat(String(body.nextKm ?? body.next_km ?? 0)) || 0;
    const cost = parseFloat(String(body.cost ?? body.total_cost ?? 0)) || 0;
    const oilType = String(body.oilType || body.oil_type || "تغيير زيت وفلاتر").trim();
    const brand = String(body.brand || "").trim();
    const changeDate = body.changeDate || body.change_date || new Date().toISOString().slice(0, 10);
    const filterType = String(body.filterType || "مع فلتر");
    const filterChanged = filterType.includes("مع") ? 1 : 0;

    await db.execute(sql`
      UPDATE oil_changes
      SET
        oil_type = ${oilType},
        brand = ${brand},
        oil_brand = ${brand},
        cost = ${cost},
        change_date = ${changeDate}::date,
        current_km = ${currentKm},
        odometer_at_change = ${currentKm},
        next_km = ${nextKm},
        next_change_km = ${nextKm},
        filter_changed = ${filterChanged},
        filter_type = ${filterType}
      WHERE id = ${Number(id)}
    `);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT oil-changes/[id] error:", error);
    return NextResponse.json({ error: "Failed to update", details: error?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;

    await db.execute(sql`
      UPDATE oil_changes SET is_deleted = 1 WHERE id = ${Number(id)}
    `);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
