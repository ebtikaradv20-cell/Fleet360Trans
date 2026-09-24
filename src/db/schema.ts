import { pgTable, serial, text, timestamp, integer, decimal, date } from "drizzle-orm/pg-core";

// 1. جدول المركبات
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

// 2. جدول المستخدمين
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").default("user"),
  permissions: text("permissions"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 3. جدول سجلات الوقود
export const fuelRecords = pgTable("fuel_records", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id"),
  plateNumber: text("plate_number"),
  driverName: text("driver_name"),
  liters: decimal("liters"),
  costPerLiter: decimal("cost_per_liter"),
  totalCost: decimal("total_cost"),
  odometer: integer("odometer"),
  station: text("station"),
  fuelDate: date("fuel_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 4. جدول أوامر العمل والصيانة
export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull(),
  vehicleId: integer("vehicle_id"),
  plateNumber: text("plate_number"),
  maintenanceType: text("maintenance_type"),
  status: text("status").default("pending"),
  workshop: text("workshop"),
  description: text("description"),
  cost: decimal("cost"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  technicianName: text("technician_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. جدول قطع الغيار والمخزون
export const spareParts = pgTable("spare_parts", {
  id: serial("id").primaryKey(),
  partName: text("part_name").notNull(),
  partNumber: text("part_number"),
  category: text("category"),
  quantity: integer("quantity").default(0),
  minimumQuantity: integer("minimum_quantity").default(0),
  unitPrice: decimal("unit_price"),
  supplier: text("supplier"),
  location: text("location"),
  status: text("status").default("available"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 6. جدول تغييرات الزيوت
export const oilChanges = pgTable("oil_changes", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id"),
  plateNumber: text("plate_number"),
  changeDate: date("change_date"),
  kmAtChange: integer("km_at_change"),
  oilType: text("oil_type"),
  oilBrand: text("oil_brand"),
  filterChanged: integer("filter_changed"), // 0 أو 1
  airFilterChanged: integer("air_filter_changed"),
  fuelFilterChanged: integer("fuel_filter_changed"),
  nextChangeKm: integer("next_change_km"),
  nextChangeDate: date("next_change_date"),
  alertKmBefore: integer("alert_km_before"),
  alertDaysBefore: integer("alert_days_before"),
  cost: decimal("cost"),
  technician: text("technician"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 7. جدول أجزاء المركبة
export const vehicleParts = pgTable("vehicle_parts", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id"),
  plateNumber: text("plate_number"),
  partName: text("part_name"),
  partCategory: text("part_category"),
  installDate: date("install_date"),
  brand: text("brand"),
  condition: text("condition"),
  kmAtInstall: integer("km_at_install"),
  cost: decimal("cost"),
  createdAt: timestamp("created_at").defaultNow(),
});
