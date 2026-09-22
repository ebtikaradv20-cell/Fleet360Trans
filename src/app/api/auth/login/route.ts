import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { comparePassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    let perms: string[] = [];
    try { perms = JSON.parse(user.permissions || "[]"); } catch { perms = []; }
    const token = signToken({ userId: user.id, username: user.username, role: user.role, permissions: perms });
    const response = NextResponse.json({ success: true, user: { id: user.id, username: user.username, name: user.name, role: user.role, permissions: perms } });
    response.cookies.set("fleet360_token", token, { httpOnly: true, maxAge: 86400, path: "/" });
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
