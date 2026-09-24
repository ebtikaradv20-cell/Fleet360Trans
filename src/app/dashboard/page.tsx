import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicleParts } from "@/db/schema";
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
  const category = searchParams.get("category") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  let conditions = [];
  if (vehicleId) conditions.push(eq(vehicleParts.vehicleId, parseInt(vehicleId)));
  if (category) conditions.push(ilike(vehicleParts.partCategory, `%${category}%`));
  if (from) conditions.push(gte(vehicleParts.createdAt, new Date(from)));
  if (to) conditions.push(lte(vehicleParts.createdAt, new Date(to + "T23:59:59")));

  const rows = conditions.length > 0
    ? await db.select().from(vehicleParts).where(and(...conditions)).orderBy(vehicleParts.createdAt)
    : await db.select().from(vehicleParts).orderBy(vehicleParts.createdAt);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const [row] = await db.insert(vehicleParts).values(body).returning();
  return NextResponse.json(row);
}
