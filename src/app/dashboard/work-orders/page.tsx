import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workOrders } from "@/db/schema"; // افتراض أن الجدول هو workOrders
import { eq, ilike, and, gte, lte, or } from "drizzle-orm";
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
  const maintenanceType = searchParams.get("maintenanceType") || "";
  const status = searchParams.get("status") || "";
  const workshop = searchParams.get("workshop") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  let conditions = [];
  
  if (search) {
    conditions.push(
      or(
        ilike(workOrders.orderNumber, `%${search}%`),
        ilike(workOrders.plateNumber, `%${search}%`),
        ilike(workOrders.technicianName, `%${search}%`)
      )
    );
  }
  if (maintenanceType) conditions.push(eq(workOrders.maintenanceType, maintenanceType));
  if (status) conditions.push(eq(workOrders.status, status));
  if (workshop) conditions.push(ilike(workOrders.workshop, `%${workshop}%`));
  if (from) conditions.push(gte(workOrders.createdAt, new Date(from)));
  if (to) conditions.push(lte(workOrders.createdAt, new Date(to + "T23:59:59")));

  const rows = conditions.length > 0
    ? await db.select().from(workOrders).where(and(...conditions)).orderBy(workOrders.createdAt)
    : await db.select().from(workOrders).orderBy(workOrders.createdAt);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const [row] = await db.insert(workOrders).values(body).returning();
  return NextResponse.json(row);
}
