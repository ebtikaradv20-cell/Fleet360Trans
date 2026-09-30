import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0; // لضمان جلب الداتا الحية دائماً

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantFilter = user.role === "super_admin" ? sql`1=1` : sql`tenant_id = ${user.tenantId}`;

    // 1️⃣ إشعارات التراخيص (منتهية أو باقي 30 يوم)
    const licenseAlertsRaw = await db.execute(sql`
      SELECT id, plate_number, license_expiry 
      FROM vehicles 
      WHERE license_expiry IS NOT NULL 
      AND license_expiry <= (CURRENT_DATE + INTERVAL '30 days')
      AND is_deleted = 0
      AND ${tenantFilter}
      ORDER BY license_expiry ASC
    `);
    const licenseList = ((licenseAlertsRaw as any).rows || licenseAlertsRaw || []).map((v: any) => {
      const isExpired = new Date(v.license_expiry) < new Date();
      return {
        id: v.id,
        type: "license",
        title: isExpired ? "ترخيص منتهي!" : "تنبيه اقتراب انتهاء ترخيص",
        message: `السيارة (${v.plate_number}) ${isExpired ? 'رخصتها منتهية بالفعل' : 'رخصتها تنتهي قريباً'} بتاريخ ${new Date(v.license_expiry).toLocaleDateString('en-GB')}.`,
        link: "/dashboard/vehicles"
      };
    });

    // 2️⃣ إشعارات الزيوت (تجاوزت الكيلومترات أو الأيام)
    // نربط جدول الزيوت بجدول السيارات لمعرفة العداد الحالي للسيارة
    const oilAlertsRaw = await db.execute(sql`
      SELECT o.id, o.plate_number, o.next_change_date, o.next_change_km, v.current_km 
      FROM oil_changes o
      JOIN vehicles v ON o.vehicle_id = v.id
      WHERE o.is_deleted = 0
      AND v.is_deleted = 0
      AND o.${tenantFilter}
      AND (
        (o.next_change_date IS NOT NULL AND o.next_change_date <= (CURRENT_DATE + INTERVAL '7 days'))
        OR 
        (o.next_change_km > 0 AND (o.next_change_km - v.current_km) <= o.alert_km_before)
      )
      ORDER BY o.id DESC
    `);
    const oilList = ((oilAlertsRaw as any).rows || oilAlertsRaw || []).map((o: any) => {
      const kmDiff = o.next_change_km - o.current_km;
      const isOverdue = kmDiff < 0;
      return {
        id: o.id,
        type: "oil",
        title: isOverdue ? "تغيير زيت متأخر!" : "اقتراب موعد تغيير الزيت",
        message: `السيارة (${o.plate_number}) ${isOverdue ? `تجاوزت موعد التغيير بـ ${Math.abs(kmDiff)} كم` : `باقي ${kmDiff} كم على موعد التغيير`}.`,
        link: "/dashboard/oil-changes"
      };
    });

    // 3️⃣ إشعارات الكاوتش (من أوامر الشغل - اختياري إذا أردت تفعيله)
    const tireAlertsRaw = await db.execute(sql`
      SELECT w.id, w.plate_number, w.next_maintenance_date 
      FROM work_orders w
      WHERE w.maintenance_type LIKE '%كاوتش%' 
      AND w.status = 'completed'
      AND w.next_maintenance_date IS NOT NULL 
      AND w.next_maintenance_date <= (CURRENT_DATE + INTERVAL '15 days')
      AND w.is_deleted = 0
      AND w.${tenantFilter}
    `);
    const tireList = ((tireAlertsRaw as any).rows || tireAlertsRaw || []).map((t: any) => ({
      id: t.id,
      type: "tire",
      title: "تنبيه تغيير إطارات",
      message: `السيارة (${t.plate_number}) اقترب موعد فحص/تغيير الإطارات.`,
      link: "/dashboard/work-orders"
    }));

    // دمج الإشعارات
    const detailedAlerts = [...licenseList, ...oilList, ...tireList];

    // إرسال الإحصائيات السريعة لصفحة لوحة التحكم أيضاً
    const vCount = await db.execute(sql`SELECT COUNT(*) as count FROM vehicles WHERE is_deleted = 0 AND ${tenantFilter}`);
    const woCount = await db.execute(sql`SELECT COUNT(*) as count FROM work_orders WHERE status != 'completed' AND is_deleted = 0 AND ${tenantFilter}`);
    const fuelCost = await db.execute(sql`SELECT COALESCE(SUM(total_cost::numeric), 0) as total FROM fuel_records WHERE is_deleted = 0 AND ${tenantFilter}`);
    const lowStock = await db.execute(sql`SELECT COUNT(*) as count FROM spare_parts WHERE quantity <= minimum_quantity AND is_deleted = 0 AND ${tenantFilter}`);

    return NextResponse.json({
      totalAlerts: detailedAlerts.length,
      detailedAlerts: detailedAlerts, // المصفوفة التي سيقرأها الجرس
      totalVehicles: Number((vCount as any).rows?.[0]?.count || 0),
      openWorkOrders: Number((woCount as any).rows?.[0]?.count || 0),
      totalFuelCost: Number((fuelCost as any).rows?.[0]?.total || 0),
      lowStockParts: Number((lowStock as any).rows?.[0]?.count || 0),
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ totalAlerts: 0, detailedAlerts: [] });
  }
}
