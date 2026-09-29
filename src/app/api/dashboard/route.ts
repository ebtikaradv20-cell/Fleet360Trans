import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. جلب إشعارات التراخيص المفصلة (تنتهي خلال 30 يوم أو انتهت)
    const licenseAlertsRaw = await db.execute(sql`
      SELECT id, plate_number, license_expiry 
      FROM vehicles 
      WHERE license_expiry IS NOT NULL 
      AND license_expiry <= (CURRENT_DATE + INTERVAL '30 days')
      ORDER BY license_expiry ASC
    `);
    const licenseList = ((licenseAlertsRaw as any).rows || licenseAlertsRaw || []).map((v: any) => ({
      id: v.id,
      type: "license",
      title: "تنبيه ترخيص",
      message: `السيارة (${v.plate_number}) رخصتها منتهية أو تقارب على الانتهاء.`,
      link: "/dashboard/vehicles"
    }));

    // 2. جلب إشعارات الزيوت المفصلة (متأخرة أو متبقي 7 أيام)
    const oilAlertsRaw = await db.execute(sql`
      SELECT id, plate_number, next_change_date 
      FROM oil_changes 
      WHERE next_change_date IS NOT NULL 
      AND next_change_date <= (CURRENT_DATE + INTERVAL '7 days')
      ORDER BY next_change_date ASC
    `);
    const oilList = ((oilAlertsRaw as any).rows || oilAlertsRaw || []).map((o: any) => ({
      id: o.id,
      type: "oil",
      title: "تغيير زيت",
      message: `السيارة (${o.plate_number}) تجاوزت أو اقتربت من موعد تغيير الزيت.`,
      link: "/dashboard/oil-changes"
    }));

    // دمج الإشعارات
    const detailedAlerts = [...licenseList, ...oilList];

    return NextResponse.json({
      totalAlerts: detailedAlerts.length,
      detailedAlerts: detailedAlerts,
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ totalAlerts: 0, detailedAlerts: [] });
  }
}
