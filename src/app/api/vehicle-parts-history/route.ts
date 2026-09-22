import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehiclePartsHistory } from "@/db/schema";
import { eq, and, gte, lte, ilike } from "drizzle-orm";
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
  const partId = searchParams.get("partId") || "";
  const partName = searchParams.get("partName") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  let conditions = [];
  if (vehicleId) conditions.push(eq(vehiclePartsHistory.vehicleId, parseInt(vehicleId)));
  if (partId) conditions.push(eq(vehiclePartsHistory.vehiclePartId, parseInt(partId)));
  if (partName) conditions.push(ilike(vehiclePartsHistory.partName, `%${partName}%`));
  if (from) conditions.push(gte(vehiclePartsHistory.createdAt, new Date(from)));
  if (to) conditions.push(lte(vehiclePartsHistory.createdAt, new Date(to + "T23:59:59")));

  const rows = conditions.length > 0
    ? await db.select().from(vehiclePartsHistory).where(and(...conditions)).orderBy(vehiclePartsHistory.createdAt)
    : await db.select().from(vehiclePartsHistory).orderBy(vehiclePartsHistory.createdAt);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const [row] = await db.insert(vehiclePartsHistory).values(body).returning();
  return NextResponse.json(row);
}
