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

    const raw = await db.execute(sql`SELECT * FROM vehicle_parts ORDER BY id DESC`);
    const rows = (raw as any).rows || raw || [];

    const formatted = (Array.isArray(rows) ? rows : []).map((v: any) => ({
      id: v?.id ?? 0,
      vehicleId: v?.vehicle_id || v?.vehicleId,
      plateNumber: String(v?.plate_number || v?.plateNumber || "غير محدد"),
      inspectionDate: v?.install_date || v?.installDate || v?.created_at || v?.createdAt || "",
      odometer: Number(v?.km_at_install ?? v?.kmAtInstall ?? 0),
      branchName: String(v?.supplier || v?.branchName || "الفرع الرئيسي"),
      driverName: String(v?.brand || v?.driverName || "غير محدد"),
      inspectorName: String(v?.part_name || v?.partName || "فاحص النظام"),
      generalNotes: String(v?.notes || ""),
      createdAt: v?.created_at || v?.createdAt || "",
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET Vehicle Parts Inspection Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST: حفظ استمارة فحص السيارة الجديدة ──
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
    const odometer = Number(body.odometer || body.kmAtInstall) || 0;
    const inspectionDate = body.inspectionDate && String(body.inspectionDate).trim() !== "" ? body.inspectionDate : null;
    const inspectorName = String(body.inspectorName || body.partName || "فاحص التقرير");
    const driverName = String(body.driverName || body.brand || "");
    const branchName = String(body.branchName || body.supplier || "");
    const notes = String(body.generalNotes || body.notes || "");

    const result = await db.execute(sql`
      INSERT INTO vehicle_parts (
        vehicle_id, plate_number, part_name, brand, supplier, 
        install_date, km_at_install, condition, notes
      ) VALUES (
        ${vehicleId}, ${plateNumber}, ${inspectorName}, ${driverName}, ${branchName},
        ${inspectionDate}, ${odometer}, 'good', ${notes}
      ) RETURNING *
    `);

    const newRow = (result as any).rows?.[0] || (result as any)[0];

    return NextResponse.json({ success: true, data: newRow }, { status: 201 });
  } catch (error: any) {
    console.error("POST Vehicle Parts Inspection Error:", error);
    return NextResponse.json({ error: `فشل الحفظ: ${error?.message || String(error)}` }, { status: 500 });
  }
}
