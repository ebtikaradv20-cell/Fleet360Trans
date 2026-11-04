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
    const body = await req.json(); // قراءة واحدة فقط لمنع خطأ Stream consumed

    const currentKm = parseFloat(String(body.currentKm ?? body.current_km ?? body.odometer ?? body.odometerAtChange ?? 0)) || 0;
    const nextKm = parseFloat(String(body.nextKm ?? body.next_km ?? body.next_change_km ?? 0)) || 0;
    const cost = parseFloat(String(body.cost ?? body.total_cost ?? 0)) || 0;
    const oilType = String(body.oilType || body.oil_type || "تغيير زيت وفلاتر").trim();
    const brand = String(body.brand || body.oilBrand || body.oil_brand || "").trim();
    
    // تحويل التاريخ لصيغة YYYY-MM-DD المقبولة في PostgreSQL
    let changeDate = body.changeDate || body.change_date;
    if (changeDate) {
      if (changeDate.includes("/")) {
        const parts = changeDate.split("/");
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            changeDate = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
          }
        }
      } else if (changeDate.includes("T")) {
        changeDate = changeDate.split("T")[0];
      }
    } else {
      changeDate = new Date().toISOString().slice(0, 10);
    }

    const filterChanged = body.filterType ? (String(body.filterType).includes("مع") ? 1 : 0) : (body.filterChanged ? 1 : 0);
    const filterType = String(body.filterType || (filterChanged ? "مع فلتر" : "بدون فلتر"));

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
    console.error("PUT oil-changes error:", error);
    return NextResponse.json({ error: "Failed to update oil change", details: error?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await db.execute(sql`
      UPDATE oil_changes SET is_deleted = 1 WHERE id = ${Number(id)}
    `);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete oil change" }, { status: 500 });
  }
}
