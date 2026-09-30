import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
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

// ── PUT: تعديل تقرير الفحص ──
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "معرف التقرير غير صحيح" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const checklistJson = JSON.stringify(body.checklist || {});

    await db.execute(sql`
      UPDATE vehicle_inspections
      SET 
        plate_number = ${body.plateNumber || body.plate_number || ""},
        vin = ${body.vin || ""},
        inspection_date = ${body.inspectionDate || null},
        odometer = ${Number(body.odometer) || 0},
        branch_name = ${body.branchName || ""},
        driver_name = ${body.driverName || ""},
        inspector_name = ${body.inspectorName || ""},
        checklist = ${checklistJson}::jsonb,
        exterior_notes = ${body.exteriorNotes || ""},
        general_notes = ${body.generalNotes || ""}
      WHERE id = ${id}
    `);

    return NextResponse.json({ success: true, message: "تم تعديل تقرير الفحص بنجاح" });
  } catch (error: any) {
    console.error("PUT Inspection Error:", error);
    return NextResponse.json({ error: error?.message || "فشل التعديل" }, { status: 500 });
  }
}

// ── DELETE: حذف تقرير الفحص ──
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const id = Number(params.id);

    await db.execute(sql`DELETE FROM vehicle_inspections WHERE id = ${id}`);

    return NextResponse.json({ success: true, message: "تم حذف تقرير الفحص بنجاح" });
  } catch (error: any) {
    console.error("DELETE Inspection Error:", error);
    return NextResponse.json({ error: error?.message || "فشل الحذف" }, { status: 500 });
  }
}
