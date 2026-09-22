import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spareParts } from "@/db/schema";
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
  const category = searchParams.get("category") || "";

  let conditions = [];
  if (search) conditions.push(or(ilike(spareParts.partName, `%${search}%`), ilike(spareParts.partNumber, `%${search}%`)));
  if (status) conditions.push(eq(spareParts.status, status));
  if (category) conditions.push(ilike(spareParts.category, `%${category}%`));

  const rows = conditions.length > 0
    ? await db.select().from(spareParts).where(and(...conditions)).orderBy(spareParts.createdAt)
    : await db.select().from(spareParts).orderBy(spareParts.createdAt);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && !user.permissions.includes("inventory:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const [row] = await db.insert(spareParts).values(body).returning();
  return NextResponse.json(row);
}
