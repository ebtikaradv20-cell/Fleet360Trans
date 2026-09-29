import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const raw = await db.execute(sql`SELECT * FROM vehicle_inspections ORDER BY id DESC`);
    return NextResponse.json((raw as any).rows || raw);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    
    // تحويل الكائن إلى نص JSON لحفظه في PostgreSQL
    const checklistJson = JSON.stringify(body.checklist || {});

    const result = await db.execute(sql`
      INSERT INTO vehicle_inspections (
        vehicle_id, plate_number, inspection_date, odometer, branch_name, 
        driver_name, inspector_name, checklist, exterior_notes, general_notes
      ) VALUES (
        ${Number(body.vehicleId) || null}, ${body.plateNumber || ""}, 
        ${body.inspectionDate || null}, ${Number(body.odometer) || 0}, 
        ${body.branchName || ""}, ${body.driverName || ""}, ${body.inspectorName || ""},
        ${checklistJson}::jsonb, ${body.exteriorNotes || ""}, ${body.generalNotes || ""}
      ) RETURNING *
    `);

    return NextResponse.json({ success: true, data: (result as any).rows?.[0] }, { status: 201 });
  } catch (error: any) {
    console.error("POST Inspection Error:", error);
    return NextResponse.json({ error: `فشل الحفظ: ${error.message}` }, { status: 500 });
  }
}
