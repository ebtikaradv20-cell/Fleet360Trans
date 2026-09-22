import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fuelRecords } from "@/db/schema";
import { eq, ilike, or, and, gte, lte } from "drizzle-orm";
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
  const search = searchParams.get("search") || "";
  const driver = searchParams.get("driver") || "";
  const station = searchParams.get("station") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  let conditions = [];
  if (search) conditions.push(or(ilike(fuelRecords.plateNumber, `%${search}%`), ilike(fuelRecords.driverName, `%${search}%`)));
  if (driver) conditions.push(ilike(fuelRecords.driverName, `%${driver}%`));
  if (station) conditions.push(ilike(fuelRecords.station, `%${station}%`));
  if (from) conditions.push(gte(fuelRecords.createdAt, new Date(from)));
  if (to) conditions.push(lte(fuelRecords.createdAt, new Date(to + "T23:59:59")));

  const rows = conditions.length > 0
    ? await db.select().from(fuelRecords).where(and(...conditions)).orderBy(fuelRecords.createdAt)
    : await db.select().from(fuelRecords).orderBy(fuelRecords.createdAt);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && !user.permissions.includes("fuel:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const [row] = await db.insert(fuelRecords).values(body).returning();
  return NextResponse.json(row);
}
