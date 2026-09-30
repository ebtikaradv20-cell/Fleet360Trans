import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
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

// ── GET: جلب استمارات الفحص المكتملة ──
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let raw;
    if (user.role === "super_admin") {
      raw = await db.execute(sql`SELECT * FROM vehicle_inspections ORDER BY id DESC`);
    } else {
      raw = await db.execute(sql`SELECT * FROM vehicle_inspections WHERE tenant_id = ${user.tenantId || 'master'} ORDER BY id DESC`);
    }

    const rows = (raw as any).rows || raw || [];

    const formatted = (Array.isArray(rows) ? rows : []).map((v: any) => ({
      id: v?.id ?? 0,
      vehicleId: v?.vehicle_id || v?.vehicleId,
      plateNumber: String(v?.plate_number || v?.plateNumber || ""),
      vin: String(v?.vin || ""),
      inspectionDate: v?.inspection_date || v?.inspectionDate || "",
      odometer: Number(v?.odometer || 0),
      branchName: String(v?.branch_name || v?.branchName || ""),
      driverName: String(v?.driver_name || v?.driverName || ""),
      inspectorName: String(v?.inspector_name || v?.inspectorName || "فاحص النظام"),
      checklist: typeof v?.checklist === "string" ? JSON.parse(v?.checklist || "{}") : (v?.checklist || {}),
      exteriorNotes: String(v?.exterior_notes || v?.exteriorNotes || ""),
      generalNotes: String(v?.general_notes || v?.generalNotes || ""),
      createdAt: v?.created_at || v?.createdAt || "",
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET Inspection Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST: حفظ استمارة فحص جديدة ──
export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    const plateNumber = String(body.plateNumber || body.plate_number || "").trim();
    if (!plateNumber) {
      return NextResponse.json({ error: "رقم اللوحة مطلوب" }, { status: 400 });
    }

    const vehicleId = body.vehicleId ? Number(body.vehicleId) : null;
    const vin = String(body.vin || "");
    const odometer = Number(body.odometer) || 0;
    const inspectionDate = body.inspectionDate && String(body.inspectionDate).trim() !== "" ? body.inspectionDate : null;
    const branchName = String(body.branchName || "");
    const driverName = String(body.driverName || "");
    const inspectorName = String(body.inspectorName || user.name || "فاحص النظام");
    const exteriorNotes = String(body.exteriorNotes || "");
    const generalNotes = String(body.generalNotes || "");
    const checklistJson = JSON.stringify(body.checklist || {});

    const result = await db.execute(sql`
      INSERT INTO vehicle_inspections (
        tenant_id, vehicle_id, plate_number, vin, inspection_date, odometer, 
        branch_name, driver_name, inspector_name, checklist, exterior_notes, general_notes
      ) VALUES (
        ${user.tenantId || 'master'}, ${vehicleId}, ${plateNumber}, ${vin}, ${inspectionDate}, ${odometer}, 
        ${branchName}, ${driverName}, ${inspectorName}, ${checklistJson}::jsonb, 
        ${exteriorNotes}, ${generalNotes}
      ) RETURNING *
    `);

    const newRow = (result as any).rows?.[0] || (result as any)[0];

    // ⚡ تحديث عداد السيارة تلقائياً
    if (vehicleId && odometer > 0) {
      try {
        await db.execute(sql`
          UPDATE vehicles 
          SET current_km = GREATEST(COALESCE(current_km, 0), ${odometer})
          WHERE id = ${vehicleId}
        `);
      } catch {}
    }

    return NextResponse.json({ success: true, data: newRow }, { status: 201 });
  } catch (error: any) {
    console.error("POST Inspection Error:", error);
    return NextResponse.json({ error: `فشل الحفظ: ${error?.message || String(error)}` }, { status: 500 });
  }
}
