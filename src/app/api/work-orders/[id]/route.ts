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
    const id = Number(resolvedParams.id);
    if (!id || isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await req.json();

    const plate = String(body.plateNumber || body.plate_number || "").trim();
    const sap = String(body.sapNumber || body.sap_number || body.sapNo || body.sap || body["رقم SAP"] || body["رقم ساب"] || "").trim();
    const maintType = String(body.maintenanceType || body.maintenance_type || "صيانة عامة").trim();
    const opType = String(body.operationType || body.operation_type || "صيانة جديدة").trim();
    const targetApproval = String(body.targetApproval || body.target_approval || "-").trim();
    const cost = parseFloat(String(body.cost || 0).replace(/[^0-9.-]/g, "")) || 0;
    const startDate = body.startDate || body.start_date || new Date().toISOString().slice(0, 10);
    const desc = String(body.description || "").trim();

    await db.execute(sql`
      UPDATE work_orders
      SET 
        plate_number = CASE WHEN ${plate} <> '' THEN ${plate} ELSE plate_number END,
        sap_number = ${sap},
        maintenance_type = ${maintType},
        operation_type = ${opType},
        target_approval = ${targetApproval},
        cost = ${cost},
        start_date = ${startDate}::date,
        description = ${desc}
      WHERE id = ${id}
    `);

    return NextResponse.json({ success: true, id, sap_number: sap });
  } catch (error: any) {
    console.error("PUT /api/work-orders/[id] error:", error);
    return NextResponse.json({ error: "Failed to update work order", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const id = Number(resolvedParams.id);

    await db.execute(sql`
      UPDATE work_orders SET is_deleted = 1, status = 'deleted' WHERE id = ${id}
    `);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete work order" }, { status: 500 });
  }
}
