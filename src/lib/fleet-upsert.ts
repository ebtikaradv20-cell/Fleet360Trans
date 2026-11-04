import { db } from "@/db";
import { sql } from "drizzle-orm";
import { fuelRecords, workOrders, oilChanges, vehicles } from "@/db/schema";

// دالة تحويل آمن لتاريخ الإكسيل سواء كان رقماً تسلسلياً (Excel Serial) أو نصاً عربياً/إنجليزياً
export function parseExcelDate(val: any): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  
  // في حال كان التاريخ رقماً تسلسلياً من إكسيل (مثل 45531)
  if (typeof val === "number" || (!isNaN(Number(val)) && !String(val).includes("-") && !String(val).includes("/"))) {
    const serial = Number(val);
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    return !isNaN(dateInfo.getTime()) ? dateInfo.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  }

  // في حال كان نص تاريخ بتنسيق DD/MM/YYYY
  const str = String(val).trim();
  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 3) {
      if (parts[2].length === 4) { // DD/MM/YYYY
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      } else if (parts[0].length === 4) { // YYYY/MM/DD
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      }
    }
  }

  const d = new Date(str);
  return !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

export function cleanNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  const cleaned = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(cleaned) ? 0 : cleaned;
}

// ── ⛽ 1. الإدراج الذكي ومنع تكرار الوقود (Smart Upsert Fuel) ──
export async function upsertFuelRecord(row: any, tenantId: string = "master") {
  const plate = String(row["رقم اللوحة"] || row["اللوحة"] || row.plateNumber || row.plate_number || "").trim();
  if (!plate) return null;

  const fuelDate = parseExcelDate(row["تاريخ التموين"] || row["التاريخ"] || row.fuelDate || row.fuel_date);
  const liters = cleanNumber(row["اللترات"] || row["كمية الوقود"] || row.liters || row.litres);
  const costPerLiter = cleanNumber(row["سعر اللتر"] || row.costPerLiter || row.cost_per_liter);
  let totalCost = cleanNumber(row["الإجمالي"] || row["المبلغ"] || row["القيمة"] || row.totalCost || row.total_cost);
  if (!totalCost && liters > 0 && costPerLiter > 0) totalCost = liters * costPerLiter;
  const odometer = cleanNumber(row["العداد"] || row["قراءة العداد"] || row.odometer);
  const station = String(row["المحطة"] || row.station || "").trim();

  // فحص وجود سجل مطابق (نفس اللوحة ونفس تاريخ التموين)
  const existing = await db.execute(sql`
    SELECT id, liters, total_cost, odometer FROM fuel_records 
    WHERE plate_number = ${plate} AND fuel_date = ${fuelDate}::date AND is_deleted = 0
    LIMIT 1
  `);

  const existingRow = (existing as any).rows?.[0];

  if (existingRow) {
    // تحديث البيانات الناقصة فقط دون تكرار الصف
    await db.execute(sql`
      UPDATE fuel_records 
      SET 
        liters = CASE WHEN (${liters} > 0) THEN ${liters} ELSE liters END,
        total_cost = CASE WHEN (${totalCost} > 0) THEN ${totalCost} ELSE total_cost END,
        odometer = CASE WHEN (${odometer} > 0) THEN ${odometer} ELSE odometer END,
        station = CASE WHEN (${station} <> '') THEN ${station} ELSE station END
      WHERE id = ${existingRow.id}
    `);
    return { action: "updated", id: existingRow.id };
  } else {
    // إضافة سجل جديد
    const inserted = await db.execute(sql`
      INSERT INTO fuel_records (tenant_id, plate_number, liters, cost_per_liter, total_cost, odometer, station, fuel_date, is_deleted)
      VALUES (${tenantId}, ${plate}, ${liters}, ${costPerLiter}, ${totalCost}, ${odometer}, ${station}, ${fuelDate}::date, 0)
      RETURNING id
    `);
    return { action: "inserted", id: (inserted as any).rows?.[0]?.id };
  }
}

// ── 🔧 2. الإدراج الذكي ومنع تكرار الصيانة وأرقام SAP ──
export async function upsertWorkOrder(row: any, tenantId: string = "master") {
  const plate = String(row["رقم اللوحة"] || row["اللوحة"] || row.plateNumber || "").trim();
  const rawOrder = String(row["رقم الأمر"] || row.orderNumber || row.order_number || "").trim();
  const sap = String(row["رقم SAP"] || row["رقم ساب"] || row.sapNumber || row.sap_number || row.sapNo || "").trim();
  const maintType = String(row["نوع الصيانة"] || row.maintenanceType || "صيانة عامة").trim();
  const cost = cleanNumber(row["التكلفة"] || row["المبلغ"] || row.cost);
  const startDate = parseExcelDate(row["تاريخ البداية"] || row["التاريخ"] || row.startDate);

  // التحقق من التكرار برقم الأمر أو (اللوحة + التاريخ + نوع الصيانة)
  const existing = await db.execute(sql`
    SELECT id, sap_number, cost FROM work_orders 
    WHERE (order_number = ${rawOrder} AND ${rawOrder} <> '') 
       OR (plate_number = ${plate} AND start_date = ${startDate}::date AND maintenance_type = ${maintType})
    LIMIT 1
  `);

  const existingRow = (existing as any).rows?.[0];

  if (existingRow) {
    // تحديث السجل برقم SAP والتكلفة إذا كانت ناقصة
    await db.execute(sql`
      UPDATE work_orders 
      SET 
        sap_number = CASE WHEN (${sap} <> '') THEN ${sap} ELSE sap_number END,
        cost = CASE WHEN (${cost} > 0) THEN ${cost} ELSE cost END
      WHERE id = ${existingRow.id}
    `);
    return { action: "updated", id: existingRow.id };
  } else {
    const inserted = await db.execute(sql`
      INSERT INTO work_orders (tenant_id, plate_number, order_number, sap_number, maintenance_type, cost, start_date, is_deleted)
      VALUES (${tenantId}, ${plate}, ${rawOrder}, ${sap}, ${maintType}, ${cost}, ${startDate}::date, 0)
      RETURNING id
    `);
    return { action: "inserted", id: (inserted as any).rows?.[0]?.id };
  }
}
