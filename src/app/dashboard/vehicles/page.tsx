"use client";
import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Pencil, Trash2, Car, X, Loader2, Hash 
} from "lucide-react";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";

interface Vehicle {
  id: number;
  plate_number: string;
  vin: string;
  company: string;
  brand: string;
  model: string;
  year: number;
  governorate: string;
  region: string;
  department: string;
  driver_name: string;
  status: string;
  current_km: number;
  license_expiry?: string;
  fuel_type?: string;
  createdAt?: string;
}

const VEHICLE_TEMPLATE_COLUMNS = [
  "رقم اللوحة", "رقم الشاسيه", "الشركة المالكة", "الماركة", "الموديل", "سنة الصنع",
  "المحافظة", "المنطقة", "الإدارة", "اسم السائق", "نوع الوقود",
  "تاريخ الترخيص", "الحالة", "الكيلومتر الحالي"
];

const FUEL_TYPES = [
  "بنزين", "سولار", "بنزين و غاز", "سولار وغاز", "غاز"
];

const safeNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : num;
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [selectedStatus, setSelectedStatus] = useState("الكل");
  const [selectedCompany, setSelectedCompany] = useState("الكل");
  const [selectedGovernorate, setSelectedGovernorate] = useState("الكل");
  const [selectedFuel, setSelectedFuel] = useState("الكل");
  const [selectedDept, setSelectedDept] = useState("الكل");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    plate_number: "", vin: "", company: "", brand: "", model: "", year: new Date().getFullYear(),
    governorate: "", region: "", department: "", driver_name: "", status: "active",
    current_km: 0, license_expiry: "", fuel_type: "بنزين",
  });

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vehicles");
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : (data.vehicles || []));
    } catch (err) {
      console.error("خطأ في جلب السيارات:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const uniqueStatuses = ["الكل", ...Array.from(new Set(vehicles.map(v => v.status || "active")))];
  const uniqueCompanies = ["الكل", ...Array.from(new Set(vehicles.map(v => v.company || "غير محدد")))];
  const uniqueGovs = ["الكل", ...Array.from(new Set(vehicles.map(v => v.governorate || "غير محدد")))];
  const uniqueFuels = ["الكل", ...Array.from(new Set(vehicles.map(v => v.fuel_type || "بنزين")))];
  const uniqueDepts = ["الكل", ...Array.from(new Set(vehicles.map(v => v.department || "غير محدد")))];

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = 
      (v.plate_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.vin || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.driver_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.model || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.brand || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.company || "").toLowerCase().includes(search.toLowerCase());

    return matchesSearch &&
      (selectedStatus === "الكل" || v.status === selectedStatus) &&
      (selectedCompany === "الكل" || v.company === selectedCompany) &&
      (selectedGovernorate === "الكل" || v.governorate === selectedGovernorate) &&
      (selectedDept === "الكل" || v.department === selectedDept) &&
      (selectedFuel === "الكل" || (v.fuel_type || "بنزين") === selectedFuel);
  });

  const mapVehicleRow = (row: Record<string, any>) => {
    const plate = row["رقم اللوحة"] || row["plate_number"] || "";
    if (!String(plate).trim()) return null;

    let licenseDate = null;
    if (row["تاريخ الترخيص"]) {
      const d = new Date(row["تاريخ الترخيص"]);
      if (!isNaN(d.getTime())) licenseDate = d.toISOString().slice(0, 10);
    }

    let status = "active";
    if (row["الحالة"] === "صيانة" || row["الحالة"] === "maintenance") status = "maintenance";
    if (row["الحالة"] === "متوقفة" || row["الحالة"] === "stopped") status = "stopped";

    return {
      plate_number: String(plate).trim(),
      vin: row["رقم الشاسيه"] || row["vin"] || "",
      company: row["الشركة المالكة"] || "",
      brand: row["الماركة"] || "",
      model: row["الموديل"] || "",
      year: safeNum(row["سنة الصنع"]) || new Date().getFullYear(),
      governorate: row["المحافظة"] || "",
      region: row["المنطقة"] || "",
      department: row["الإدارة"] || "",
      driver_name: row["اسم السائق"] || "",
      fuel_type: row["نوع الوقود"] || "بنزين",
      license_expiry: licenseDate,
      status: status,
      current_km: safeNum(row["الكيلومتر الحالي"]),
    };
  };

  const handleVehiclesImport = async (rows: any[], mode: "append" | "upsert") => {
    let ok = 0; let failed = 0;
    for (const payload of rows) {
      try {
        if (mode === "upsert") {
          const existing = vehicles.find(v => (v.plate_number || "").trim() === payload.plate_number);
          if (existing) {
            const res = await fetch(`/api/vehicles/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (res.ok) ok++; else failed++; continue;
          }
        }
        const res = await fetch("/api/vehicles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) ok++; else failed++;
      } catch { failed++; 
