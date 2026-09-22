import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  timestamp,
  varchar,
  date,
} from "drizzle-orm/pg-core";

// ─── Users & Auth ──────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("user"), // admin | user
  permissions: text("permissions").default("[]"), // JSON array of permission keys
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Vehicles ──────────────────────────────────────────────────
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  plateNumber: varchar("plate_number", { length: 50 }).notNull().unique(),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  year: integer("year"),
  department: varchar("department", { length: 100 }),
  driverName: varchar("driver_name", { length: 150 }),
  status: varchar("status", { length: 50 }).default("active"), // active | maintenance | expired
  currentKm: integer("current_km").default(0),
  licenseExpiry: date("license_expiry"),
  insuranceExpiry: date("insurance_expiry"),
  color: varchar("color", { length: 50 }),
  vin: varchar("vin", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Fuel Records ──────────────────────────────────────────────
export const fuelRecords = pgTable("fuel_records", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  plateNumber: varchar("plate_number", { length: 50 }),
  driverName: varchar("driver_name", { length: 150 }),
  liters: real("liters"),
  costPerLiter: real("cost_per_liter"),
  totalCost: real("total_cost"),
  odometer: integer("odometer"),
  station: varchar("station", { length: 150 }),
  fuelDate: date("fuel_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Maintenance / Work Orders ─────────────────────────────────
export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  plateNumber: varchar("plate_number", { length: 50 }),
  maintenanceType: varchar("maintenance_type", { length: 50 }), // preventive | emergency
  status: varchar("status", { length: 50 }).default("pending"), // pending | in_progress | completed
  workshop: varchar("workshop", { length: 150 }),
  description: text("description"),
  cost: real("cost"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  technicianName: varchar("technician_name", { length: 150 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Spare Parts / Inventory ───────────────────────────────────
export const spareParts = pgTable("spare_parts", {
  id: serial("id").primaryKey(),
  partName: varchar("part_name", { length: 150 }).notNull(),
  partNumber: varchar("part_number", { length: 100 }),
  category: varchar("category", { length: 100 }),
  quantity: integer("quantity").default(0),
  minimumQuantity: integer("minimum_quantity").default(5),
  unitPrice: real("unit_price"),
  supplier: varchar("supplier", { length: 150 }),
  location: varchar("location", { length: 100 }),
  status: varchar("status", { length: 50 }).default("available"), // available | low | out_of_stock
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Vehicle Parts Inspection ──────────────────────────────────
export const vehicleParts = pgTable("vehicle_parts", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  plateNumber: varchar("plate_number", { length: 50 }),
  partName: varchar("part_name", { length: 150 }).notNull(),
  partCategory: varchar("part_category", { length: 100 }),
  installDate: date("install_date"),
  partNumber: varchar("part_number", { length: 100 }),
  brand: varchar("brand", { length: 100 }),
  supplier: varchar("supplier", { length: 150 }),
  cost: real("cost"),
  condition: varchar("condition", { length: 50 }).default("good"), // good | fair | poor | replaced
  kmAtInstall: integer("km_at_install"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Vehicle Parts History ─────────────────────────────────────
export const vehiclePartsHistory = pgTable("vehicle_parts_history", {
  id: serial("id").primaryKey(),
  vehiclePartId: integer("vehicle_part_id").references(() => vehicleParts.id),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  plateNumber: varchar("plate_number", { length: 50 }),
  partName: varchar("part_name", { length: 150 }),
  action: varchar("action", { length: 50 }), // installed | replaced | repaired | inspected
  actionDate: date("action_date"),
  kmAtAction: integer("km_at_action"),
  cost: real("cost"),
  technician: varchar("technician", { length: 150 }),
  workshop: varchar("workshop", { length: 150 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Oil Change Records ────────────────────────────────────────
export const oilChanges = pgTable("oil_changes", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  plateNumber: varchar("plate_number", { length: 50 }),
  changeDate: date("change_date").notNull(),
  kmAtChange: integer("km_at_change"),
  oilType: varchar("oil_type", { length: 100 }),
  oilBrand: varchar("oil_brand", { length: 100 }),
  filterChanged: boolean("filter_changed").default(false),
  airFilterChanged: boolean("air_filter_changed").default(false),
  fuelFilterChanged: boolean("fuel_filter_changed").default(false),
  nextChangeKm: integer("next_change_km"),
  nextChangeDate: date("next_change_date"),
  alertKmBefore: integer("alert_km_before").default(500),
  alertDaysBefore: integer("alert_days_before").default(7),
  cost: real("cost"),
  technician: varchar("technician", { length: 150 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Notifications / Alerts ────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }), // oil | license | insurance | maintenance
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  plateNumber: varchar("plate_number", { length: 50 }),
  message: text("message"),
  messageAr: text("message_ar"),
  severity: varchar("severity", { length: 20 }).default("info"), // info | warning | danger
  isRead: boolean("is_read").default(false),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
