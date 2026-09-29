import { pgTable, serial, text, timestamp, integer, decimal, date, jsonb } from "drizzle-orm/pg-core";

// ── 1. جدول المستخدمين
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").default("master"),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").default("user"),
  permissions: text("permissions"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── 2. جدول السيارات 
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").default("master"),
  plateNumber: text("plate_number").notNull(),
  company: text("company"),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year"),
  governorate: text("governorate"),
  region: text("region"),
  department: text("department"),
  driverName: text("driver_name"),
  status: text("status").default("active"),
  currentKm: integer("current_km").default(0),
  licenseExpiry: date("license_expiry"),
  insuranceExpiry: date("insurance_expiry"),
  fuelType: text("fuel_type").default("بنزين"),
  color: text("color"),
  vin: text("vin"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── 3. جدول الوقود 
export const fuelRecords = pgTable("fuel_records", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").default("master"),
  vehicleId: integer("vehicle_id"),
  plateNumber: text("plate_number"),
  driverName: text("driver_name"),
  liters: decimal("liters"),
  costPerLiter: decimal("cost_per_liter"),
  totalCost: decimal("total_cost"),
  odometer: integer("odometer"),
  station: text("station"),
  fuelDate: date("fuel_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── 4. جدول أوامر الشغل 
export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").default("master"),
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
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── 5. جدول قطع الغيار 
export const spareParts = pgTable("spare_parts", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").default("master"),
  partName: text("part_name").notNull(),
  partNumber: text("part_number"),
  category: text("category"),
  quantity: integer("quantity").default(0),
  minimumQuantity: integer("minimum_quantity").default(0),
  unitPrice: decimal("unit_price"),
  supplier: text("supplier"),
  location: text("location"),
  status: text("status").default("available"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── 6. جدول الزيوت 
export const oilChanges = pgTable("oil_changes", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").default("master"),
  vehicleId: integer("vehicle_id"),
  plateNumber: text("plate_number"),
  changeDate: date("change_date"),
  kmAtChange: integer("km_at_change"),
  oilType: text("oil_type"),
  oilBrand: text("oil_brand"),
  filterChanged: integer("filter_changed"),
  airFilterChanged: integer("air_filter_changed"),
  fuelFilterChanged: integer("fuel_filter_changed"),
  nextChangeKm: integer("next_change_km"),
  nextChangeDate: date("next_change_date"),
  alertKmBefore: integer("alert_km_before"),
  alertDaysBefore: integer("alert_days_before"),
  cost: decimal("cost"),
  technician: text("technician"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── 7. جدول استمارات فحص السيارات 
export const vehicleInspections = pgTable("vehicle_inspections", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").default("master"),
  vehicleId: integer("vehicle_id"),
  plateNumber: text("plate_number").notNull(),
  vin: text("vin"),
  inspectionDate: date("inspection_date"),
  odometer: integer("odometer").default(0),
  branchName: text("branch_name"),
  driverName: text("driver_name"),
  inspectorName: text("inspector_name"),
  checklist: jsonb("checklist").default('{}'),
  exteriorNotes: text("exterior_notes"),
  generalNotes: text("general_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── 8. جدول أجزاء المركبة
export const vehicleParts = pgTable("vehicle_parts", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").default("master"),
  vehicleId: integer("vehicle_id"),
  plateNumber: text("plate_number"),
  partName: text("part_name"),
  partCategory: text("part_category"),
  installDate: date("install_date"),
  brand: text("brand"),
  condition: text("condition"),
  kmAtInstall: integer("km_at_install"),
  cost: decimal("cost"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── 9. ✅ تصدير جدول سجل أجزاء المركبة (vehiclePartsHistory) صراحة لـ Next.js
export const vehiclePartsHistory = pgTable("vehicle_parts_history", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").default("master"),
  vehicleId: integer("vehicle_id"),
  vehiclePartId: integer("vehicle_part_id"),
  plateNumber: text("plate_number"),
  partName: text("part_name"),
  partCategory: text("part_category"),
  action: text("action"),
  actionDate: date("action_date"),
  kmAtAction: integer("km_at_action"),
  cost: decimal("cost"),
  technician: text("technician"),
  workshop: text("workshop"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── 10. ✅ تصدير جدول السجل التاريخي الشامل (historyLogs)
export const historyLogs = pgTable("history_logs", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").default("master"),
  plateNumber: text("plate_number"),
  moduleName: text("module_name"),
  actionType: text("action_type"),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  userName: text("user_name"),
  createdAt: timestamp("created_at").defaultNow(),
});
