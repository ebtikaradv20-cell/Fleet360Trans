import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, vehicles, fuelRecords, workOrders, spareParts, oilChanges, vehicleParts } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

export async function POST() {
  try {
    // Create admin user
    const adminPass = await hashPassword("admin123");
    const userPass = await hashPassword("user123");

    await db.insert(users).values([
      { username: "admin", password: adminPass, name: "مدير النظام", role: "admin", permissions: JSON.stringify(["all"]) },
      { username: "user1", password: userPass, name: "أحمد محمد", role: "user", permissions: JSON.stringify(["vehicles:read", "fuel:read", "fuel:write", "maintenance:read"]) },
    ]).onConflictDoNothing();

    // Create vehicles
    await db.insert(vehicles).values([
      { plateNumber: "أ ب ج 1234", brand: "تويوتا", model: "هايلكس", year: 2022, department: "المبيعات", driverName: "محمد علي", status: "active", currentKm: 45000, licenseExpiry: new Date("2025-06-30"), insuranceExpiry: new Date("2025-08-15"), color: "أبيض", vin: "1HGCM82633A123456" },
      { plateNumber: "د هـ و 5678", brand: "فورد", model: "رينجر", year: 2021, department: "اللوجستيات", driverName: "أحمد سالم", status: "maintenance", currentKm: 78000, licenseExpiry: new Date("2024-12-31"), insuranceExpiry: new Date("2025-03-20"), color: "أسود", vin: "1HGCM82633A234567" },
      { plateNumber: "ز ح ط 9012", brand: "نيسان", model: "باترول", year: 2023, department: "الإدارة", driverName: "خالد عمر", status: "active", currentKm: 22000, licenseExpiry: new Date("2025-09-30"), insuranceExpiry: new Date("2025-11-10"), color: "فضي", vin: "1HGCM82633A345678" },
      { plateNumber: "ي ك ل 3456", brand: "هيونداي", model: "H1", year: 2020, department: "المشاريع", driverName: "سعيد إبراهيم", status: "expired", currentKm: 95000, licenseExpiry: new Date("2024-05-31"), insuranceExpiry: new Date("2025-01-15"), color: "رمادي", vin: "1HGCM82633A456789" },
      { plateNumber: "م ن س 7890", brand: "ميتسوبيشي", model: "L200", year: 2022, department: "الصيانة", driverName: "عبدالله حسن", status: "active", currentKm: 31000, licenseExpiry: new Date("2025-12-31"), insuranceExpiry: new Date("2026-02-28"), color: "أزرق", vin: "1HGCM82633A567890" },
    ]).onConflictDoNothing();

    // Create fuel records
    await db.insert(fuelRecords).values([
      { vehicleId: 1, plateNumber: "أ ب ج 1234", driverName: "محمد علي", liters: 60, costPerLiter: 2.5, totalCost: 150, odometer: 44500, station: "محطة الشمال", fuelDate: new Date("2024-11-15") },
      { vehicleId: 2, plateNumber: "د هـ و 5678", driverName: "أحمد سالم", liters: 80, costPerLiter: 2.5, totalCost: 200, odometer: 77500, station: "محطة الجنوب", fuelDate: new Date("2024-11-16") },
      { vehicleId: 3, plateNumber: "ز ح ط 9012", driverName: "خالد عمر", liters: 100, costPerLiter: 2.5, totalCost: 250, odometer: 21500, station: "محطة الوسط", fuelDate: new Date("2024-11-17") },
      { vehicleId: 1, plateNumber: "أ ب ج 1234", driverName: "محمد علي", liters: 55, costPerLiter: 2.6, totalCost: 143, odometer: 45000, station: "محطة الشمال", fuelDate: new Date("2024-11-20") },
      { vehicleId: 5, plateNumber: "م ن س 7890", driverName: "عبدالله حسن", liters: 70, costPerLiter: 2.5, totalCost: 175, odometer: 30500, station: "محطة الشرق", fuelDate: new Date("2024-11-22") },
    ]).onConflictDoNothing();

    // Create work orders
    await db.insert(workOrders).values([
      { orderNumber: "WO-2024-001", vehicleId: 2, plateNumber: "د هـ و 5678", maintenanceType: "emergency", status: "in_progress", workshop: "ورشة الخليج", description: "إصلاح محرك", cost: 3500, startDate: new Date("2024-11-10"), technicianName: "فني أحمد" },
      { orderNumber: "WO-2024-002", vehicleId: 1, plateNumber: "أ ب ج 1234", maintenanceType: "preventive", status: "completed", workshop: "ورشة النور", description: "صيانة دورية 45000 كم", cost: 800, startDate: new Date("2024-11-05"), endDate: new Date("2024-11-06"), technicianName: "فني محمد" },
      { orderNumber: "WO-2024-003", vehicleId: 3, plateNumber: "ز ح ط 9012", maintenanceType: "preventive", status: "pending", workshop: "ورشة الأمل", description: "تغيير زيت وفلتر", cost: 500, startDate: new Date("2024-11-25"), technicianName: "فني خالد" },
    ]).onConflictDoNothing();

    // Create spare parts
    await db.insert(spareParts).values([
      { partName: "فلتر الهواء", partNumber: "AF-001", category: "فلاتر", quantity: 15, minimumQuantity: 5, unitPrice: 50, supplier: "مورد الخليج", location: "رف A1", status: "available" },
      { partName: "فلتر الزيت", partNumber: "OF-002", category: "فلاتر", quantity: 3, minimumQuantity: 5, unitPrice: 35, supplier: "مورد الخليج", location: "رف A2", status: "low" },
      { partName: "تيل الفرامل", partNumber: "BP-003", category: "الفرامل", quantity: 8, minimumQuantity: 4, unitPrice: 120, supplier: "مورد الأطراف", location: "رف B1", status: "available" },
      { partName: "بطارية 12V", partNumber: "BAT-004", category: "كهرباء", quantity: 0, minimumQuantity: 2, unitPrice: 400, supplier: "مورد الكهرباء", location: "رف C1", status: "out_of_stock" },
      { partName: "زيت المحرك 5W30", partNumber: "OIL-005", category: "زيوت", quantity: 25, minimumQuantity: 10, unitPrice: 45, supplier: "مورد الزيوت", location: "رف D1", status: "available" },
    ]).onConflictDoNothing();

    // Create oil changes
    await db.insert(oilChanges).values([
      { vehicleId: 1, plateNumber: "أ ب ج 1234", changeDate: new Date("2024-10-01"), kmAtChange: 40000, oilType: "5W30", oilBrand: "Shell", filterChanged: true, airFilterChanged: false, fuelFilterChanged: false, nextChangeKm: 45000, nextChangeDate: new Date("2025-04-01"), alertKmBefore: 500, alertDaysBefore: 7, cost: 350, technician: "فني أحمد" },
      { vehicleId: 3, plateNumber: "ز ح ط 9012", changeDate: new Date("2024-09-15"), kmAtChange: 20000, oilType: "10W40", oilBrand: "Castrol", filterChanged: true, airFilterChanged: true, fuelFilterChanged: false, nextChangeKm: 25000, nextChangeDate: new Date("2025-03-15"), alertKmBefore: 500, alertDaysBefore: 7, cost: 420, technician: "فني محمد" },
      { vehicleId: 5, plateNumber: "م ن س 7890", changeDate: new Date("2024-11-01"), kmAtChange: 30000, oilType: "5W30", oilBrand: "Mobil", filterChanged: true, airFilterChanged: false, fuelFilterChanged: true, nextChangeKm: 35000, nextChangeDate: new Date("2025-05-01"), alertKmBefore: 1000, alertDaysBefore: 14, cost: 380, technician: "فني خالد" },
    ]).onConflictDoNothing();

    // Create vehicle parts
    await db.insert(vehicleParts).values([
      { vehicleId: 1, plateNumber: "أ ب ج 1234", partName: "المحرك", partCategory: "المحرك", installDate: new Date("2022-01-15"), brand: "تويوتا", condition: "good", kmAtInstall: 0, cost: 0 },
      { vehicleId: 1, plateNumber: "أ ب ج 1234", partName: "الفرامل الأمامية", partCategory: "الفرامل", installDate: new Date("2024-06-10"), brand: "Brembo", condition: "good", kmAtInstall: 38000, cost: 850 },
      { vehicleId: 1, plateNumber: "أ ب ج 1234", partName: "بطارية", partCategory: "كهرباء", installDate: new Date("2023-11-20"), brand: "Exide", condition: "fair", kmAtInstall: 25000, cost: 400 },
      { vehicleId: 2, plateNumber: "د هـ و 5678", partName: "المحرك", partCategory: "المحرك", installDate: new Date("2021-03-10"), brand: "فورد", condition: "poor", kmAtInstall: 0, cost: 0 },
      { vehicleId: 3, plateNumber: "ز ح ط 9012", partName: "الإطارات", partCategory: "إطارات", installDate: new Date("2024-01-05"), brand: "Bridgestone", condition: "good", kmAtInstall: 15000, cost: 2200 },
    ]).onConflictDoNothing();

    return NextResponse.json({ success: true, message: "Seed data created successfully" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
