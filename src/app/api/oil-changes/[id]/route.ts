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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const currentKm = parseFloat(String(body.currentKm ?? body.current_km ?? body.odometer ?? body.odometerAtChange ?? 0)) || 0;
    const nextKm = parseFloat(String(body.nextKm ?? body.next_km ?? body.next_change_km ?? 0)) || 0;
    const cost = parseFloat(String(body.cost ?? body.total_cost ?? 0)) || 0;
    const oilType = String(body.oilType || body.oil_type || "تغيير زيت وفلاتر").trim();
    const brand = String(body.brand || "").trim();
    const changeDate = body.changeDate || body.change_date || new Date().toISOString().slice(0, 10);
    const filterChanged = body.filterType ? (String(body.filterType).includes("مع") ? 1 : 0) : (body.filterChanged ? 1 : 0);

    // تحديث كافة الأعمدة المحتملة لضمان حفظ العداد والتكلفة 100%
    await db.execute(sql`
      UPDATE oil_changes
      SET 
        oil_type = ${oilType},
        brand = ${brand},
        cost = ${cost},
        change_date = ${changeDate}::date,
        current_km = ${currentKm},
        odometer_at_change = ${currentKm},
        next_km = ${nextKm},
        filter_changed = ${filterChanged}
      WHERE id = ${Number(id)}
    `);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT oil-changes error:", error);
    // محاولة ثانية في حال غياب أحد الأعمدة غير الضرورية
    try {
      const { id } = await params;
      const body = await req.json();
      const currentKm = parseFloat(String(body.currentKm ?? body.current_km ?? 0)) || 0;
      const nextKm = parseFloat(String(body.nextKm ?? body.next_km ?? 0)) || 0;
      const cost = parseFloat(String(body.cost ?? 0)) || 0;
      await db.execute(sql`
        UPDATE oil_changes
        SET 
          cost = ${cost},
          current_km = ${currentKm},
          next_km = ${nextKm}
        WHERE id = ${Number(id)}
      `);
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ error: "Failed to update oil change", details: error?.message }, { status: 500 });
    }
  }
}
