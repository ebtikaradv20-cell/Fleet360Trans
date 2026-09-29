import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

function auth(req: NextRequest) {
  try {
    const token = req.cookies.get("fleet360_token")?.value;
    return token ? verifyToken(token) : null;
  } catch {
    return null;
  }
}

// ── GET: جلب استمارات الفحص المكتملة ──
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // نحاول الجلب من جدول الاستمارات أو جدول الأجزاء
    let raw: any;
    try {
      raw = await db.execute(sql`SELECT * FROM vehicle_inspections ORDER BY id DESC`);
    } catch {
      raw = await db.execute(sql`SELECT * FROM vehicle_parts ORDER BY id DESC`);
    }

    const rows = (raw as any).rows || raw || [];

    const formatted = (Array.isArray(rows) ? rows : []).map((v: any) => ({
      id: v?.id ?? 0,
      vehicleId: v?.vehicle_id || v?.vehicleId,
      plateNumber: String(v?.plate_number || v?.plateNumber || ""),
      inspectionDate: v?.inspection_date || v?.inspectionDate || v?.install_date || v?.created_at || "",
      odometer: Number(v?.odometer || v?.km_at_install || 0),
      branchName: String(v?.branch_name || v?.branchName || v?.supplier || ""),
      driverName: String(v?.driver_name || v?.driverName || v?.brand || ""),
      inspectorName: String(v?.inspector_name || v?.inspectorName || v?.part_name || "فاحص النظام"),
      checklist: typeof v?.checklist === "string" ? JSON.parse(v?.checklist || "{}") : (v?.checklist || {}),
      exteriorNotes: String(v?.exterior_notes || v?.exteriorNotes || ""),
      generalNotes: String(v?.general_notes || v?.generalNotes || v?.notes || ""),
      createdAt: v?.created_at || v?.createdAt || "",
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET Inspection Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST: حفظ استمارة الفحص الشاملة ──
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
    const odometer = Number(body.odometer) || 0;
    const inspectionDate = body.inspectionDate && String(body.inspectionDate).trim() !== "" ? body.inspectionDate : null;
    const branchName = String(body.branchName || "");
    const driverName = String(body.driverName || "");
    const inspectorName = String(body.inspectorName || user.name || "فاحص النظام");
    const exteriorNotes = String(body.exteriorNotes || "");
    const generalNotes = String(body.generalNotes || body.notes || "");
    const checklistJson = JSON.stringify(body.checklist || {});

    let newRow: any;

    // نحاول الحفظ في جدول vehicle_inspections أو vehicle_parts المتاح
    try {
      const result = await db.execute(sql`
        INSERT INTO vehicle_inspections (
          vehicle_id, plate_number, inspection_date, odometer, branch_name, 
          driver_name, inspector_name, checklist, exterior_notes, general_notes
        ) VALUES (
          ${vehicleId}, ${plateNumber}, ${inspectionDate}, ${odometer}, 
          ${branchName}, ${driverName}, ${inspectorName}, ${checklistJson}::jsonb, 
          ${exteriorNotes}, ${generalNotes}
        ) RETURNING *
      `);
      newRow = (result as any).rows?.[0] || (result as any)[0];
    } catch (dbErr) {
      // Fallback لجدول vehicle_parts إذا لم ينشأ الجدول الآخر
      const result = await db.execute(sql`
        INSERT INTO vehicle_parts (
          vehicle_id, plate_number, part_name, brand, supplier, 
          install_date, km_at_install, condition, notes
        ) VALUES (
          ${vehicleId}, ${plateNumber}, ${inspectorName}, ${driverName}, ${branchName},
          ${inspectionDate}, ${odometer}, 'good', ${generalNotes}
        ) RETURNING *
      `);
      newRow = (result as any).rows?.[0] || (result as any)[0];
    }

    // ⚡ تحديث العداد الكلي للسيارة تلقائياً في جدول السيارات
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
