import { pgTable, serial, text, timestamp, integer, decimal, date, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").default("master"),
  username: text("username").notNull().unique(), password: text("password").notNull(),
  name: text("name").notNull(), email: text("email"), phone: text("phone"),
  role: text("role").default("user"), permissions: text("permissions"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").default("master"),
  plateNumber: text("plate_number").notNull(), vin: text("vin"), company: text("company"),
  brand: text("brand").notNull(), model: text("model").notNull(), year: integer("year"),
  governorate: text("governorate"), region: text("region"), department: text("department"),
  driverName: text("driver_name"), assignedDrivers: jsonb("assigned_drivers").default('[]'),
  status: text("status").default("active"), currentKm: integer("current_km").default(0),
  licenseExpiry: date("license_expiry"), insuranceExpiry: date("insurance_expiry"),
  fuelType: text("fuel_type").default("بنزين"), color: text("color"), notes: text("notes"),
  isDeleted: integer("is_deleted").default(0), deletedBy: text("deleted_by"), deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").default("master"),
  name: text("name").notNull(), phone: text("phone"), role: text("role").default("driver"),
  nationalId: text("national_id"), licenseNumber: text("license_number"), notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fuelRecords = pgTable("fuel_records", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").default("master"),
  vehicleId: integer("vehicle_id"), plateNumber: text("plate_number"), driverName: text("driver_name"),
  liters: decimal("liters"), costPerLiter: decimal("cost_per_liter"), totalCost: decimal("total_cost"),
  odometer: integer("odometer"), station: text("station"), fuelDate: date("fuel_date"), notes: text("notes"),
  isDeleted: integer("is_deleted").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").default("master"),
  orderNumber: text("order_number").notNull(), vehicleId: integer("vehicle_id"),
  plateNumber: text("plate_number"), maintenanceType: text("maintenance_type"),
  status: text("status").default("pending"), workshop: text("workshop"), description: text("description"),
  cost: decimal("cost"), startDate: date("start_date"), endDate: date("end_date"),
  technicianName: text("technician_name"), receivedBy: text("received_by"),
  lifespanKm: decimal("lifespan_km"), lastMaintenanceDate: date("last_maintenance_date"),
  nextMaintenanceDate: date("next_maintenance_date"), invoiceUrl: text("invoice_url"),
  notes: text("notes"), isDeleted: integer("is_deleted").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const oilChanges = pgTable("oil_changes", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").default("master"),
  vehicleId: integer("vehicle_id"), plateNumber: text("plate_number"),
  changeDate: date("change_date"), kmAtChange: integer("km_at_change"),
  oilType: text("oil_type"), oilBrand: text("oil_brand"),
  filterChanged: integer("filter_changed"), airFilterChanged: integer("air_filter_changed"),
  fuelFilterChanged: integer("fuel_filter_changed"), nextChangeKm: integer("next_change_km"),
  nextChangeDate: date("next_change_date"), alertKmBefore: integer("alert_km_before"),
  alertDaysBefore: integer("alert_days_before"), cost: decimal("cost"), technician: text("technician"),
  notes: text("notes"), isDeleted: integer("is_deleted").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const spareParts = pgTable("spare_parts", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").default("master"),
  partName: text("part_name").notNull(), partNumber: text("part_number"), category: text("category"),
  quantity: integer("quantity").default(0), minimumQuantity: integer("minimum_quantity").default(0),
  unitPrice: decimal("unit_price"), supplier: text("supplier"), location: text("location"),
  status: text("status").default("available"), notes: text("notes"),
  isDeleted: integer("is_deleted").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tires = pgTable("tires", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").default("master"),
  vehicleId: integer("vehicle_id"), plateNumber: text("plate_number"),
  tireSize: text("tire_size"), tireBrand: text("tire_brand"), installDate: date("install_date"),
  kmAtInstall: decimal("km_at_install"), lifespanKm: decimal("lifespan_km"),
  nextChangeKm: decimal("next_change_km"), nextChangeDate: date("next_change_date"),
  cost: decimal("cost"), notes: text("notes"),
  isDeleted: integer("is_deleted").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicleInspections = pgTable("vehicle_inspections", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").default("master"),
  vehicleId: integer("vehicle_id"), plateNumber: text("plate_number").notNull(),
  vin: text("vin"), inspectionDate: date("inspection_date"), odometer: integer("odometer").default(0),
  branchName: text("branch_name"), driverName: text("driver_name"), inspectorName: text("inspector_name"),
  checklist: jsonb("checklist").default('{}'), exteriorNotes: text("exterior_notes"),
  generalNotes: text("general_notes"), invoiceUrl: text("invoice_url"),
  isDeleted: integer("is_deleted").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicleParts = pgTable("vehicle_parts", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").default("master"),
  vehicleId: integer("vehicle_id"), plateNumber: text("plate_number"),
  partName: text("part_name"), partCategory: text("part_category"),
  installDate: date("install_date"), brand: text("brand"), condition: text("condition"),
  kmAtInstall: integer("km_at_install"), cost: decimal("cost"), notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehiclePartsHistory = pgTable("vehicle_parts_history", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").default("master"),
  vehicleId: integer("vehicle_id"), vehiclePartId: integer("vehicle_part_id"),
  plateNumber: text("plate_number"), partName: text("part_name"), partCategory: text("part_category"),
  action: text("action"), actionDate: date("action_date"), kmAtAction: integer("km_at_action"),
  cost: decimal("cost"), technician: text("technician"), workshop: text("workshop"), notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const historyLogs = pgTable("history_logs", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").default("master"),
  plateNumber: text("plate_number"), moduleName: text("module_name"), actionType: text("action_type"),
  oldData: jsonb("old_data"), newData: jsonb("new_data"), userName: text("user_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const approvals = pgTable("approvals", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").default("master"),
  moduleName: text("module_name"), recordId: integer("record_id"),
  requestType: text("request_type"), status: text("status").default("pending"),
  fileUrl: text("file_url"), notes: text("notes"), requestedBy: text("requested_by"),
  approvedBy: text("approved_by"), approverEmail: text("approver_email"),
  createdAt: timestamp("created_at").defaultNow(), approvedAt: timestamp("approved_at"),
});
