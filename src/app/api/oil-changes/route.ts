import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { oilChanges, vehicles } from "@/db/schema";
import { eq, ilike, and, gte, lte } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

function auth(req: NextRequest) {
  const token = req.cookies.get("fleet360_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get("vehicleId") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  let conditions = [];
  if (vehicleId) conditions.push(eq(oilChanges.vehicleId, parseInt(vehicleId)));
  if (from) conditions.push(gte(oilChanges.createdAt, new Date(from)));
  if (to) conditions.push(lte(oilChanges.createdAt, new Date(to + "T23:59:59")));

  const rows = conditions.length > 0
    ? await db.select().from(oilChanges).where(and(...conditions)).orderBy(oilChanges.createdAt)
    : await db.select().from(oilChanges).orderBy(oilChanges.createdAt);

  // Check alerts: flag if current vehicle km is within alertKmBefore of nextChangeKm
  const allVehicles = await db.select().from(vehicles);
  const enriched = rows.map(r => {
    const v = allVehicles.find(v => v.id === r.vehicleId);
    const currentKm = v?.currentKm || 0;
    const kmAlert = r.nextChangeKm && r.alertKmBefore
      ? (r.nextChangeKm - currentKm) <= r.alertKmBefore
      : false;
    const now = new Date();
    const nextDate = r.nextChangeDate ? new Date(r.nextChangeDate) : null;
    const dayAlert = nextDate && r.alertDaysBefore
      ? Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= r.alertDaysBefore
      : false;
    return { ...r, kmAlert, dayAlert, currentKm };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const [row] = await db.insert(oilChanges).values(body).returning();
  return NextResponse.json(row);
}
