"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import {
  Car,
  Users,
  Plus,
  Save,
  X,
  Loader2,
  Briefcase,
  ChevronDown,
  CheckSquare,
  Square
} from "lucide-react";

interface Vehicle {
  id: number;
  plateNumber: string;
  sapNumber?: string;
  chassisNumber?: string;
  engineNumber?: string;
  company?: string;
  make?: string;
  model?: string;
  year?: string | number;
  governorate?: string;
  region?: string;
  department?: string;
  fuelType?: string;
  driverName?: string;
  licenseExpiry?: string;
  insuranceExpiry?: string;
  status?: string;
  notes?: string;
}

interface Personnel {
  id: number;
  name: string;
  role: "سائق" | "فني" | "مهندس";
  phone?: string;
  notes?: string;
  is_deleted?: number;
}

// 1. بيانات القالب النموذجي للتحميل
const vehicleTemplateData = [
  {
    "رقم اللوحة": "ل ن ط 7618",
    "رقم السيارة على الساب": "SAP-1045",
    "رقم الشاسيه": "123456",
    "الماركة والموديل": "بيك اب دوبل",
    "سنة الصنع": "2024",
    "الشركة المالكة": "ترانس جاس",
    "المحافظة": "كفر الشيخ",
    "المنطقة": "دسوق",
    "الإدارة": "تشغيل وصيانة",
    "نوع الوقود": "سولار و غاز طبيعى",
    "اسم السائق": "احمد صالح، هيثم عجاج",
    "تاريخ انتهاء الرخصة": "2027-04-07",
    "الحالة التشغيلية": "نشطة",
    "ملاحظات": "سيارة بحالة جيدة"
  }
];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50";

export default function VehiclesManagementPage() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<"vehicles" | "personnel">("vehicles");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [isEditVehicle, setIsEditVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle>>({
    plateNumber: "",
    sapNumber: "",
    chassisNumber: "",
    company: "ترانس جاس",
    model: "",
    year: "",
    governorate: "كفر الشيخ",
    region: "",
    department: "تشغيل وصيانة",
    fuelType: "سولار و غاز طبيعى",
    driverName: "",
    status: "نشطة",
    licenseExpiry: "",
    notes: ""
  });

  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);
  const driverDropdownRef = useRef<HTMLDivElement>(null);

  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [personnelModalOpen, setPersonnelModalOpen] = useState(false);
  const [isEditPersonnel, setIsEditPersonnel] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Partial<Personnel>>({
    name: "",
    role: "سائق",
    phone: "",
    notes: ""
  });

  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("الكل");
  const [govFilter, setGovFilter] = useState("الكل");
  const [deptFilter, setDeptFilter] = useState("الكل");
  const [fuelFilter, setFuelFilter] = useState("الكل");
  const [personnelRoleFilter, setPersonnelRoleFilter] = useState("الكل");

  const canWrite =
    user?.role === "owner" ||
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.permissions?.includes("fleet:write");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (driverDropdownRef.current && !driverDropdownRef.current.contains(e.target as Node)) {
        setIsDriverDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vehRes, staffRes] = await Promise.all([
        fetch("/api/vehicles").catch(() => null),
        fetch("/api/drivers").catch(() => null)
      ]);

      if (vehRes && vehRes.ok) {
        const d = await vehRes.json();
        const list = (Array.isArray(d) ? d : d.data || []).map((v: any) => ({
          ...v,
          plateNumber: v.plateNumber || v.plate_number || "",
          sapNumber: v.sapNumber || v.sap_number || "",
          chassisNumber: v.chassisNumber || v.chassis_number || "",
          company: v.company || "ترانس جاس",
          model: v.model || v.make || "",
          year: v.year || "",
          governorate: v.governorate || "كفر الشيخ",
          region: v.region || "",
          department: v.department || "تشغيل وصيانة",
          fuelType: v.fuelType || v.fuel_type || "سولار و غاز طبيعى",
          driverName: v.driverName || v.driver_name || "",
          licenseExpiry: v.licenseExpiry || v.license_expiry || "",
          status: v.status === "active" || v.status === "نشط" ? "نشطة" : v.status || "نشطة",
          notes: v.notes || ""
        }));
        setVehicles(list);
      }

      if (staffRes && staffRes.ok) {
        const sd = await staffRes.json();
        setPersonnelList(Array.isArray(sd) ? sd : sd.data || []);
      }
    } catch (err) {
      console.error("Error loading vehicles/drivers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedDriversList = (editingVehicle.driverName || "")
    .split("،")
    .map((s) => s.trim())
    .filter(Boolean);

  const toggleDriverSelection = (driverName: string) => {
    let updated: string[];
    if (selectedDriversList.includes(driverName)) {
      updated = selectedDriversList.filter((name) => name !== driverName);
    } else {
      updated = [...selectedDriversList, driverName];
    }
    setEditingVehicle({
      ...editingVehicle,
      driverName: updated.join("، ")
    });
  };

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      (v.plateNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.sapNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.chassisNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.driverName || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.region || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.model || "").toLowerCase().includes(search.toLowerCase()) ||
      String(v.year || "").includes(search);

    const matchesComp = companyFilter === "الكل" || v.company === companyFilter;
    const matchesGov = govFilter === "الكل" || v.governorate === govFilter;
    const matchesDept = deptFilter === "الكل" || v.department === deptFilter;
    const matchesFuel = fuelFilter === "الكل" || v.fuelType === fuelFilter;

    return matchesSearch && matchesComp && matchesGov && matchesDept && matchesFuel;
  });

  const filteredPersonnel = personnelList.filter((p) => {
    const matchesSearch =
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.phone || "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = personnelRoleFilter === "الكل" || p.role === personnelRoleFilter;
    return matchesSearch && matchesRole;
  });

  // 2. دالة استيراد البيانات وتحديثها (تفحص وتحدث القائم وتدرج الجديد)
  const handleImportVehicles = async (importedRows: any[]) => {
    if (!importedRows || importedRows.length === 0) return;

    try {
      let updatedCount = 0;
      let addedCount = 0;

      for (const r of importedRows) {
        const plate = String(r["رقم اللوحة"] || r["اللوحة"] || r.plateNumber || "").trim();
        if (!plate) continue;

        const payload = {
          plateNumber: plate,
          sapNumber: String(r["رقم السيارة على الساب"] || r["رقم الساب"] || r["رقم SAP"] || r.sapNumber || "").trim(),
          chassisNumber: String(r["رقم الشاسيه"] || r["الشاسيه"] || r.chassisNumber || "").trim(),
          model: String(r["الماركة والموديل"] || r["الماركة / الموديل"] || r["الموديل"] || r.model || "").trim(),
          year: String(r["سنة الصنع"] || r.year || "").trim(),
          company: String(r["الشركة المالكة"] || r["الشركة"] || r.company || "ترانس جاس").trim(),
          governorate: String(r["المحافظة"] || r.governorate || "كفر الشيخ").trim(),
          region: String(r["المنطقة"] || r.region || "").trim(),
          department: String(r["الإدارة"] || r["القسم / الإدارة"] || r.department || "تشغيل وصيانة").trim(),
          fuelType: String(r["نوع الوقود"] || r["الوقود"] || r.fuelType || "سولار و غاز طبيعى").trim(),
          driverName: String(r["اسم السائق"] || r["السائق"] || r.driverName || "").trim(),
          licenseExpiry: String(r["تاريخ انتهاء الرخصة"] || r["تاريخ الترخيص"] || r.licenseExpiry || "").trim(),
          status: String(r["الحالة التشغيلية"] || r["الحالة"] || r.status || "نشطة").trim(),
          notes: String(r["ملاحظات"] || r.notes || "").trim()
        };

        const existing = vehicles.find((v) => v.plateNumber === plate);
        if (existing) {
          await fetch(`/api/vehicles/${existing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          updatedCount++;
        } else {
          await fetch("/api/vehicles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          addedCount++;
        }
      }

      alert(`تمت معالجة الشيت بنجاح:\n- تم تحديث: ${updatedCount} سيارة مسجلة\n- تم إضافة: ${addedCount} سيارة جديدة`);
      loadData();
    } catch (err) {
      console.error("Import error:", err);
      alert("حدث خطأ أثناء معالجة شيت السيارات.");
    }
  };

  // 3. تجهيز شيت الملخص المحسوب للتصدير
  const excelSummaryData = [
    ...filteredVehicles.map((v) => ({
      "رقم اللوحة": v.plateNumber,
      "رقم SAP": v.sapNumber || "-",
      "الماركة والموديل": v.model || "-",
      "سنة الصنع": v.year || "-",
      "رقم الشاسيه": v.chassisNumber || "-",
      "الشركة": v.company || "ترانس جاس",
      "المحافظة": v.governorate || "-",
      "المنطقة": v.region || "-",
      "الإدارة": v.department || "-",
      "نوع الوقود": v.fuelType || "-",
      "السائق المسند": v.driverName || "-",
      "انتهاء الرخصة": v.licenseExpiry || "-",
      "الحالة": v.status || "نشطة",
      "ملاحظات": v.notes || ""
    })),
    // سطر ملخص الحسابات في نهاية الشيت
    {
      "رقم اللوحة": `الإجمالي: ${filteredVehicles.length} سيارة`,
      "رقم SAP": `نشطة: ${filteredVehicles.filter(v => v.status === "نشطة").length}`,
      "الماركة والموديل": `تحت الصيانة: ${filteredVehicles.filter(v => v.status === "تحت الصيانة").length}`,
      "سنة الصنع": "",
      "رقم الشاسيه": "",
      "الشركة": "",
      "المحافظة": "",
      "المنطقة": "",
      "الإدارة": "",
      "نوع الوقود": "",
      "السائق المسند": "",
      "انتهاء الرخصة": "",
      "الحالة": "",
      "ملاحظات": "ملخص شامل ومحدث"
    }
  ];

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(isEditVehicle ? `/api/vehicles/${editingVehicle.id}` : "/api/vehicles", {
        method: isEditVehicle ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingVehicle)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        alert(isEditVehicle ? "تم تحديث بيانات السيارة بنجاح" : "تمت إضافة السيارة بنجاح");
        setVehicleModalOpen(false);
        loadData();
      } else {
        alert(data.error || "حدث خطأ أثناء حفظ السيارة");
      }
    } catch {
      alert("تعذر الاتصال بالخادم.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!editingPerson.name?.trim()) {
      alert("يرجى إدخال الاسم");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/drivers", {
        method: isEditPersonnel ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPerson)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        alert(isEditPersonnel ? "تم تحديث بيانات الفرد بنجاح" : "تمت إضافة الفرد بنجاح");
        setPersonnelModalOpen(false);
        loadData();
      } else {
        alert(data.error || "حدث خطأ أثناء الحفظ");
      }
    } catch {
      alert("تعذر الاتصال بالخادم.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePersonnel = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الفرد من القائمة؟")) return;
    try {
      const res = await fetch(`/api/drivers?id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setPersonnelList((prev) => prev.filter((p) => p.id !== id));
        alert("تم الحذف بنجاح");
      } else {
        alert(data.error || "فشل الحذف");
      }
    } catch {
      alert("تعذر الاتصال بالخادم");
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه السيارة؟")) return;
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      if (res.ok) {
        setVehicles((prev) => prev.filter((v) => v.id !== id));
        alert("تم حذف السيارة بنجاح");
      } else {
        alert("فشل حذف السيارة");
      }
    } catch {
      alert("تعذر الاتصال بالخادم");
    }
  };

  const vehicleColumns = [
    {
      key: "plateNumber",
      header: "اللوحة / الشاسيه",
      render: (r: Vehicle) => (
        <div>
          <div className="font-black text-blue-900 dark:text-blue-400">{r.plateNumber}</div>
          {r.chassisNumber && <div className="text-[10px] text-gray-400 font-mono">{r.chassisNumber}</div>}
        </div>
      )
    },
    {
      key: "sapNumber",
      header: "رقم SAP",
      render: (r: Vehicle) =>
        r.sapNumber ? (
          <span className="font-mono text-xs font-black text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
            {r.sapNumber}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
    },
    { key: "company", header: "الشركة المالكة", render: (r: Vehicle) => r.company || "ترانس جاس" },
    {
      key: "model",
      header: "الماركة / الموديل",
      render: (r: Vehicle) => (
        <div>
          <span className="font-bold">{r.model || "-"}</span>
          {r.year && <span className="text-xs text-gray-400 block font-mono">موديل: {r.year}</span>}
        </div>
      )
    },
    {
      key: "location",
      header: "المحافظة / المنطقة",
      render: (r: Vehicle) => (
        <div>
          <span className="font-bold">{r.governorate || "كفر الشيخ"}</span>
          {r.region && <span className="text-xs text-gray-500 block">({r.region})</span>}
        </div>
      )
    },
    {
      key: "fuelType",
      header: "نوع الوقود",
      render: (r: Vehicle) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-bold ${
            r.fuelType?.includes("غاز")
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
              : r.fuelType?.includes("بنزين")
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
          }`}
        >
          {r.fuelType || "سولار"}
        </span>
      )
    },
    {
      key: "driverName",
      header: "السائقين المسندين",
      render: (r: Vehicle) => (
        <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
          {r.driverName || <span className="text-gray-400 text-xs">غير محدد</span>}
        </span>
      )
    },
    { key: "licenseExpiry", header: "تاريخ الترخيص", render: (r: Vehicle) => r.licenseExpiry || "-" },
    {
      key: "status",
      header: "الحالة",
      render: (r: Vehicle) => (
        <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          {r.status || "نشطة"}
        </span>
      )
    }
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* ── الرأس: 3 أزرار إكسيل فقط + إضافة سيارة ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            {activeTab === "vehicles" ? <Car size={24} /> : <Users size={24} />}
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">
              {activeTab === "vehicles" ? "إدارة الأسطول والسيارات" : "قائمة الفنيين والسائقين"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {activeTab === "vehicles"
                ? `إجمالي ${vehicles.length} سيارة مسجلة بالأسطول`
                : `إجمالي ${personnelList.length} فرد مسجل بالمنظومة`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* 1. زر تحميل القالب */}
          {activeTab === "vehicles" && (
            <ExportExcelButton
              data={vehicleTemplateData}
              fileName="قالب_شيت_السيارات"
              buttonText="تحميل قالب"
            />
          )}

          {/* 2. زر استيراد وتحديث البيانات */}
          {canWrite && activeTab === "vehicles" && (
            <ImportExcelButton
              onImport={handleImportVehicles}
              buttonText="استيراد وتحديث"
            />
          )}

          {/* 3. زر تحميل شيت الإكسيل بالملخص */}
          <ExportExcelButton
            data={excelSummaryData}
            fileName="ملخص_أسطول_السيارات"
            buttonText="تحميل شيت ملخص"
          />

          {/* زر إضافة سيارة اليدوي */}
          {canWrite && activeTab === "vehicles" && (
            <button
              onClick={() => {
                setEditingVehicle({
                  plateNumber: "",
                  sapNumber: "",
                  chassisNumber: "",
                  company: "ترانس جاس",
                  model: "",
                  year: "",
                  governorate: "كفر الشيخ",
                  region: "",
                  department: "تشغيل وصيانة",
                  fuelType: "سولار و غاز طبيعى",
                  driverName: "",
                  status: "نشطة",
                  licenseExpiry: "",
                  notes: ""
                });
                setIsEditVehicle(false);
                setVehicleModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>إضافة سيارة</span>
            </button>
          )}

          {canWrite && activeTab === "personnel" && (
            <button
              onClick={() => {
                setEditingPerson({ name: "", role: "سائق", phone: "", notes: "" });
                setIsEditPersonnel(false);
                setPersonnelModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>إضافة فرد</span>
            </button>
          )}
        </div>
      </div>

      {/* ── تبويبات التبديل ── */}
      <div className="flex gap-2 p-1.5 bg-white dark:bg-gray-900 rounded-xl w-fit border border-gray-200 dark:border-gray-800 shadow-sm">
        <button
          onClick={() => setActiveTab("vehicles")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "vehicles"
              ? "bg-teal-600 text-white shadow-md"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Car size={15} />
          <span>أسطول السيارات ({vehicles.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("personnel")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "personnel"
              ? "bg-slate-800 text-white shadow-md"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Users size={15} />
          <span>الفنيين والسائقين ({personnelList.length})</span>
        </button>
      </div>

      {/* ── شريط الفلاتر ── */}
      <FilterBar>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400">البحث الشامل:</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باللوحة، SAP، المنطقة..."
            className="border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs dark:bg-gray-800 dark:text-white outline-none w-48 focus:border-teal-500"
          />
        </div>

        {activeTab === "vehicles" && (
          <>
            <FilterSelect
              label="الشركة"
              value={companyFilter}
              onChange={setCompanyFilter}
              options={[{ value: "الكل", label: "الكل" }, { value: "ترانس جاس", label: "ترانس جاس" }]}
            />
            <FilterSelect
              label="المحافظة"
              value={govFilter}
              onChange={setGovFilter}
              options={[{ value: "الكل", label: "الكل" }, { value: "كفر الشيخ", label: "كفر الشيخ" }]}
            />
            <FilterSelect
              label="الإدارة"
              value={deptFilter}
              onChange={setDeptFilter}
              options={[
                { value: "الكل", label: "الكل" },
                { value: "تشغيل وصيانة", label: "تشغيل وصيانة" },
                { value: "مشروع قلين", label: "مشروع قلين" }
              ]}
            />
          </>
        )}
      </FilterBar>

      {/* ── جدول البيانات ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable
          columns={vehicleColumns}
          data={filteredVehicles}
          loading={loading}
          onEdit={
            canWrite
              ? (r: Vehicle) => {
                  setEditingVehicle(r);
                  setIsEditVehicle(true);
                  setVehicleModalOpen(true);
                }
              : undefined
          }
          onDelete={canWrite ? (r: Vehicle) => handleDeleteVehicle(r.id) : undefined}
        />
      </div>

      {/* ── نافذة إضافة / تعديل السيارة ── */}
      {vehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center bg-blue-900 text-white p-4 rounded-t-2xl shrink-0">
              <h2 className="text-lg font-black flex items-center gap-2">
                <Car size={20} />
                {isEditVehicle ? "تعديل بيانات السيارة" : "إضافة سيارة جديدة إلى الأسطول"}
              </h2>
              <button onClick={() => setVehicleModalOpen(false)} className="hover:text-red-300">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="رقم اللوحة *">
                  <input
                    required
                    className={inputClass}
                    value={editingVehicle.plateNumber || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, plateNumber: e.target.value })}
                    placeholder="مثال: ل ن ط 7618"
                  />
                </Field>

                <Field label="رقم السيارة على الساب (SAP)">
                  <input
                    className={`${inputClass} font-mono font-bold text-blue-900 dark:text-blue-300`}
                    value={editingVehicle.sapNumber || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, sapNumber: e.target.value })}
                    placeholder="مثال: SAP-1045"
                  />
                </Field>

                <Field label="رقم الشاسيه">
                  <input
                    className={inputClass}
                    value={editingVehicle.chassisNumber || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, chassisNumber: e.target.value })}
                  />
                </Field>

                <Field label="الماركة والموديل *">
                  <input
                    required
                    className={inputClass}
                    value={editingVehicle.model || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, model: e.target.value })}
                    placeholder="مثال: بيك اب دوبل"
                  />
                </Field>

                <Field label="سنة الصنع">
                  <input
                    type="text"
                    className={inputClass}
                    value={editingVehicle.year || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, year: e.target.value })}
                    placeholder="مثال: 2024"
                  />
                </Field>

                <div className="relative" ref={driverDropdownRef}>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    السائقين المسندين (اختيار متعدد)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDriverDropdownOpen(!isDriverDropdownOpen)}
                    className={`${inputClass} text-right flex items-center justify-between cursor-pointer`}
                  >
                    <span className="truncate">
                      {selectedDriversList.length === 0
                        ? "-- اختر السائقين --"
                        : `${selectedDriversList.length} سائقين محددين: (${selectedDriversList.join("، ")})`}
                    </span>
                    <ChevronDown size={14} className="text-gray-400 shrink-0" />
                  </button>

                  {isDriverDropdownOpen && (
                    <div className="absolute z-50 top-full mt-1.5 right-0 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-2.5 max-h-48 overflow-y-auto space-y-1">
                      {personnelList.map((p) => {
                        const isChecked = selectedDriversList.includes(p.name);
                        return (
                          <div
                            key={p.id}
                            onClick={() => toggleDriverSelection(p.name)}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-xs"
                          >
                            {isChecked ? (
                              <CheckSquare size={16} className="text-teal-600 shrink-0" />
                            ) : (
                              <Square size={16} className="text-gray-400 shrink-0" />
                            )}
                            <span className="font-bold text-gray-800 dark:text-gray-200">
                              {p.name} ({p.role})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedDriversList.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {selectedDriversList.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 text-[11px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800"
                        >
                          {name}
                          <X
                            size={12}
                            className="cursor-pointer hover:text-red-500"
                            onClick={() => toggleDriverSelection(name)}
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Field label="الشركة المالكة">
                  <input
                    className={inputClass}
                    value={editingVehicle.company || "ترانس جاس"}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, company: e.target.value })}
                  />
                </Field>

                <Field label="المحافظة">
                  <input
                    className={inputClass}
                    value={editingVehicle.governorate || "كفر الشيخ"}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, governorate: e.target.value })}
                  />
                </Field>

                <Field label="المنطقة">
                  <input
                    className={inputClass}
                    value={editingVehicle.region || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, region: e.target.value })}
                    placeholder="مثال: دسوق / قلين / الحامول"
                  />
                </Field>

                <Field label="الإدارة">
                  <input
                    className={inputClass}
                    value={editingVehicle.department || "تشغيل وصيانة"}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, department: e.target.value })}
                  />
                </Field>

                <Field label="نوع الوقود">
                  <select
                    className={inputClass}
                    value={editingVehicle.fuelType || "سولار و غاز طبيعى"}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, fuelType: e.target.value })}
                  >
                    <option value="سولار و غاز طبيعى">سولار و غاز طبيعى</option>
                    <option value="بنزين فقط">بنزين فقط</option>
                    <option value="سولار فقط">سولار فقط</option>
                  </select>
                </Field>

                <Field label="تاريخ انتهاء الرخصة">
                  <input
                    type="date"
                    className={inputClass}
                    value={editingVehicle.licenseExpiry || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, licenseExpiry: e.target.value })}
                  />
                </Field>

                <Field label="الحالة التشغيلية">
                  <select
                    className={inputClass}
                    value={editingVehicle.status || "نشطة"}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, status: e.target.value })}
                  >
                    <option value="نشطة">نشطة</option>
                    <option value="تحت الصيانة">تحت الصيانة</option>
                    <option value="معطلة">معطلة</option>
                  </select>
                </Field>
              </div>

              <div className="pt-2">
                <Field label="ملاحظات">
                  <textarea
                    rows={2}
                    className={inputClass}
                    value={editingVehicle.notes || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, notes: e.target.value })}
                    placeholder="أي ملاحظات أو بيانات إضافية عن المركبة..."
                  />
                </Field>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setVehicleModalOpen(false)}
                  className="flex-1 py-2.5 bg-white border text-gray-700 font-bold rounded-xl hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl flex justify-center items-center gap-2 cursor-pointer"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  <span>{isEditVehicle ? "حفظ التعديلات" : "إضافة السيارة"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
