import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles, fuelRecords, workOrders, spareParts, oilChanges } from "@/db/schema";
import { eq, count, sum, lte, and } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

function auth(req: NextRequest) {
  const token = req.cookies.get("fleet360_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allVehicles = await db.select().from(vehicles);
  const totalVehicles = allVehicles.length;
  const activeVehicles = allVehicles.filter(v => v.status === "active").length;
  const maintenanceVehicles = allVehicles.filter(v => v.status === "maintenance").length;
  const expiredVehicles = allVehicles.filter(v => v.status === "expired").length;

  const allFuel = await db.select().from(fuelRecords);
  const totalFuelCost = allFuel.reduce((sum, r) => sum + (r.totalCost || 0), 0);

  const allWO = await db.select().from(workOrders);
  const openWorkOrders = allWO.filter(w => w.status !== "completed").length;
  const totalMaintenanceCost = allWO.reduce((sum, w) => sum + (w.cost || 0), 0);

  const allParts = await db.select().from(spareParts);
  const lowStockParts = allParts.filter(p => p.status === "low" || p.status === "out_of_stock").length;

  // License expiry alerts (next 30 days)
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const licenseAlerts = allVehicles.filter(v => {
    if (!v.licenseExpiry) return false;
    const exp = new Date(v.licenseExpiry);
    return exp <= in30Days;
  }).length;

  const insuranceAlerts = allVehicles.filter(v => {
    if (!v.insuranceExpiry) return false;
    const exp = new Date(v.insuranceExpiry);
    return exp <= in30Days;
  }).length;

  // Oil change alerts
  const allOil = await db.select().from(oilChanges);
  const oilAlerts = allOil.filter(o => {
    const v = allVehicles.find(v => v.id === o.vehicleId);
    const currentKm = v?.currentKm || 0;
    const kmAlert = o.nextChangeKm && o.alertKmBefore
      ? (o.nextChangeKm - currentKm) <= o.alertKmBefore
      : false;
    const nextDate = o.nextChangeDate ? new Date(o.nextChangeDate) : null;
    const dayAlert = nextDate && o.alertDaysBefore
      ? Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= o.alertDaysBefore
      : false;
    return kmAlert || dayAlert;
  }).length;

  return NextResponse.json({
    totalVehicles,
    activeVehicles,
    maintenanceVehicles,
    expiredVehicles,
    totalFuelCost,
    totalMaintenanceCost,
    openWorkOrders,
    lowStockParts,
    licenseAlerts,
    insuranceAlerts,
    oilAlerts,
    recentFuel: allFuel.slice(-5).reverse(),
    recentWorkOrders: allWO.slice(-5).reverse(),
  });
}
