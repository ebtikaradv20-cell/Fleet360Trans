import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyToken, hashPassword } from "@/lib/auth";

function auth(req: NextRequest) {
  const token = req.cookies.get("fleet360_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const user = auth(req);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select({ id: users.id, username: users.username, name: users.name, role: users.role, permissions: users.permissions, createdAt: users.createdAt }).from(users);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = auth(req);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const hashed = await hashPassword(body.password);
  const [row] = await db.insert(users).values({ ...body, password: hashed }).returning({ id: users.id, username: users.username, name: users.name, role: users.role, permissions: users.permissions });
  return NextResponse.json(row);
}
