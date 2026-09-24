import { pgTable, serial, text, timestamp, integer, decimal, date } from "drizzle-orm/pg-core";

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  plateNumber: text("plate_number").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year"),
  department: text("department"),
  driverName: text("driver_name"),
  status: text("status").default("active"),
  currentKm: integer("current_km").default(0),
  licenseExpiry: date("license_expiry"),
  insuranceExpiry: date("insurance_expiry"),
  color: text("color"),
  vin: text("vin"),
  notes: text("notes"),
  createdAt: timestamp("created_zone").defaultNow(),
});

// قم بإضافة باقي الجداول الخاصة بك هنا (مثل users, workOrders, إلخ) وبدون أي دوال API.
