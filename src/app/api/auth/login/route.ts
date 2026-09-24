export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    
    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    // التحقق المباشر لبيانات الأدمن المطلوبة
    if (username === "admin" && password === "123") {
      const adminUser = {
        id: 1,
        username: "admin",
        name: "Omar Abd Elhalim",
        role: "admin",
        permissions: ["all"]
      };

      const token = signToken({ 
        userId: adminUser.id, 
        username: adminUser.username, 
        role: adminUser.role, 
        permissions: adminUser.permissions 
      });

      const response = NextResponse.json({ 
        success: true, 
        user: adminUser 
      });
      
      response.cookies.set("fleet360_token", token, { 
        httpOnly: true, 
        maxAge: 86400, 
        path: "/" 
      });
      
      return response;
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
