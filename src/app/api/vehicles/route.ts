import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
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
  const status = searchParams.get("status") || "";
  const brand = searchParams.get("brand") || "";
  const department = searchParams.get("department") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  let conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(vehicles.plateNumber, `%${search}%`),
        ilike(vehicles.driverName, `%${search}%`),
        ilike(vehicles.brand, `%${search}%`)
      )
    );
  }
  if (status) conditions.push(eq(vehicles.status, status));
  if (brand) conditions.push(ilike(vehicles.brand, `%${brand}%`));
  if (department) conditions.push(ilike(vehicles.department, `%${department}%`));
  if (from) conditions.push(gte(vehicles.createdAt, new Date(from)));
  if (to) conditions.push(lte(vehicles.createdAt, new Date(to + "T23:59:59")));

  const rows = conditions.length > 0
    ? await db.select().from(vehicles).where(and(...conditions)).orderBy(vehicles.createdAt)
    : await db.select().from(vehicles).orderBy(vehicles.createdAt);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && !user.permissions.includes("vehicles:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const [row] = await db.insert(vehicles).values(body).returning();
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
