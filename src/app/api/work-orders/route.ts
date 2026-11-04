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

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantFilter =
      user.role === "super_admin" || user.role === "owner" || !user.tenantId
        ? sql`1=1`
        : sql`(tenant_id = ${user.tenantId} OR tenant_id IS NULL OR tenant_id = 'master')`;

    const orders = await db.execute(sql`
      SELECT 
        id,
        tenant_id,
        vehicle_id,
        COALESCE(plate_number, '') as plate_number,
        COALESCE(plate_number, '') as "plateNumber",
        COALESCE(order_number, id::text) as order_number,
        COALESCE(order_number, id::text) as "orderNumber",
        COALESCE(sap_number, '') as sap_number,
        COALESCE(sap_number, '') as "sapNumber",
        COALESCE(maintenance_type, 'صيانة عامة') as maintenance_type,
        COALESCE(maintenance_type, 'صيانة عامة') as "maintenanceType",
        COALESCE(operation_type, 'صيانة جديدة') as operation_type,
        COALESCE(operation_type, 'صيانة جديدة') as "operationType",
        COALESCE(target_approval, '-') as target_approval,
        COALESCE(target_approval, '-') as "targetApproval",
        COALESCE(cost, 0)::numeric as cost,
        COALESCE(start_date::text, created_at::date::text, '') as start_date,
        COALESCE(start_date::text, created_at::date::text, '') as "startDate",
        COALESCE(status, 'completed') as status,
        COALESCE(description, '') as description,
        COALESCE(is_deleted, 0) as is_deleted,
        created_at
      FROM work_orders
      WHERE (is_deleted = 0 OR is_deleted IS NULL) AND ${tenantFilter}
      ORDER BY id DESC
    `);

    const rows = (orders as any).rows || orders || [];
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET work-orders error:", error);
    return NextResponse.json({ error: "API Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const plate = String(body.plateNumber || body.plate_number || "").trim();
    const sap = String(body.sapNumber || body.sap_number || body.sapNo || body.sap || body["رقم SAP"] || body["رقم ساب"] || "").trim();
    const maintType = String(body.maintenanceType || body.maintenance_type || "صيانة عامة").trim();
    const opType = String(body.operationType || body.operation_type || "صيانة جديدة").trim();
    const targetApproval = String(body.targetApproval || body.target_approval || "-").trim();
    const cost = parseFloat(String(body.cost || 0).replace(/[^0-9.-]/g, "")) || 0;
    const startDate = body.startDate || body.start_date || new Date().toISOString().slice(0, 10);
    const desc = String(body.description || "").trim();
    const orderNo = String(body.orderNumber || body.order_number || (sap ? `WO-${sap}` : `WO-${Date.now()}`)).trim();
    const tenantId = user.tenantId || "master";

    const result = await db.execute(sql`
      INSERT INTO work_orders (
        tenant_id, plate_number, order_number, sap_number, 
        maintenance_type, operation_type, target_approval, 
        cost, start_date, description, status, is_deleted
      )
      VALUES (
        ${tenantId}, ${plate}, ${orderNo}, ${sap}, 
        ${maintType}, ${opType}, ${targetApproval}, 
        ${cost}, ${startDate}::date, ${desc}, 'completed', 0
      )
      RETURNING id, sap_number, order_number
    `);

    return NextResponse.json({ success: true, data: (result as any).rows?.[0] });
  } catch (error: any) {
    console.error("POST work-orders error:", error);
    return NextResponse.json({ error: "Failed to create work order", details: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

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
      WHERE id = ${Number(id)}
    `);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT work-orders error:", error);
    return NextResponse.json({ error: "Failed to update work order" }, { status: 500 });
  }
}
