"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  Briefcase
} from "lucide-react";

interface Vehicle {
  id: number;
  plateNumber: string;
  chassisNumber?: string;
  engineNumber?: string;
  company?: string;
  make?: string;
  model?: string;
  year?: string | number;
  governorate?: string;
  department?: string;
  fuelType?: string;
  driverName?: string;
  licenseExpiry?: string;
  insuranceExpiry?: string;
  status?: string;
  sapNumber?: string;
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

const VEHICLE_TEMPLATE_COLUMNS = [
  "رقم اللوحة",
  "رقم الشاسيه",
  "الماركة / الموديل",
  "الشركة المالكة",
  "المحافظة",
  "القسم / الإدارة",
  "نوع الوقود",
  "اسم السائق",
  "تاريخ انتهاء الرخصة",
  "الحالة التشغيلية",
  "ملاحظات"
];

// قالب الفورم النموذجي للتحميل والتعبئة
const sampleTemplateData = [
  {
    "رقم اللوحة": "ل ن ط 7618",
    "رقم الشاسيه": "123456",
    "الماركة / الموديل": "بيك اب دوبل",
    "الشركة المالكة": "ترانس جاس",
    "المحافظة": "كفر الشيخ",
    "القسم / الإدارة": "تشغيل وصيانة",
    "نوع الوقود": "سولار و غاز طبيعى",
    "اسم السائق": "احمد صالح",
    "تاريخ انتهاء الرخصة": "2027-04-07",
    "الحالة التشغيلية": "نشطة",
    "ملاحظات": ""
  }
];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50";

export default function VehiclesManagementPage() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<"vehicles" | "personnel">("vehicles");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── بيانات السيارات ──
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [isEditVehicle, setIsEditVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle>>({
    plateNumber: "",
    chassisNumber: "",
    company: "ترانس جاس",
    model: "",
    governorate: "كفر الشيخ",
    department: "تشغيل وصيانة",
    fuelType: "سولار و غاز طبيعى",
    driverName: "",
    status: "نشطة",
    licenseExpiry: ""
  });

  // ── بيانات الفنيين والسائقين ──
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [personnelModalOpen, setPersonnelModalOpen] = useState(false);
  const [isEditPersonnel, setIsEditPersonnel] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Partial<Personnel>>({
    name: "",
    role: "سائق",
    phone: "",
    notes: ""
  });

  // ── الفلاتر ──
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

  // ── جلب البيانات ──
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
          chassisNumber: v.chassisNumber || v.chassis_number || "",
          company: v.company || "ترانس جاس",
          model: v.model || v.make || "",
          governorate: v.governorate || "كفر الشيخ",
          department: v.department || "تشغيل وصيانة",
          fuelType: v.fuelType || v.fuel_type || "سولار و غاز طبيعى",
          driverName: v.driverName || v.driver_name || "",
          licenseExpiry: v.licenseExpiry || v.license_expiry || "",
          status: v.status === "active" || v.status === "نشط" ? "نشطة" : v.status || "نشطة"
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

  // ── تصفية السيارات ──
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      (v.plateNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.chassisNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.driverName || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.model || "").toLowerCase().includes(search.toLowerCase());

    const matchesComp = companyFilter === "الكل" || v.company === companyFilter;
    const matchesGov = govFilter === "الكل" || v.governorate === govFilter;
    const matchesDept = deptFilter === "الكل" || v.department === deptFilter;
    const matchesFuel = fuelFilter === "الكل" || v.fuelType === fuelFilter;

    return matchesSearch && matchesComp && matchesGov && matchesDept && matchesFuel;
  });

  // ── تصفية الكوادر ──
  const filteredPersonnel = personnelList.filter((p) => {
    const matchesSearch =
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.phone || "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = personnelRoleFilter === "الكل" || p.role === personnelRoleFilter;
    return matchesSearch && matchesRole;
  });

  // ── استيراد شيت السيارات ورفعها تلقائياً ──
  const handleImportVehicles = async (importedRows: any[]) => {
    if (!importedRows || importedRows.length === 0) return;

    try {
      let count = 0;
      for (const r of importedRows) {
        const payload = {
          plateNumber: r["رقم اللوحة"] || r.plateNumber,
          chassisNumber: r["رقم الشاسيه"] || r.chassisNumber || "",
          model: r["الماركة / الموديل"] || r["الموديل"] || r.model || "",
          company: r["الشركة المالكة"] || r.company || "ترانس جاس",
          governorate: r["المحافظة"] || r.governorate || "كفر الشيخ",
          department: r["القسم / الإدارة"] || r.department || "تشغيل وصيانة",
          fuelType: r["نوع الوقود"] || r.fuelType || "سولار و غاز طبيعى",
          driverName: r["اسم السائق"] || r.driverName || "",
          licenseExpiry: r["تاريخ انتهاء الرخصة"] || r["تاريخ الترخيص"] || r.licenseExpiry || "",
          status: "نشطة",
          notes: r["ملاحظات"] || r.notes || ""
        };

        if (payload.plateNumber) {
          await fetch("/api/vehicles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }).catch(() => {});
          count++;
        }
      }

      alert(`تم استيراد ${count} سيارة وتحديث الأسطول بنجاح.`);
      loadData();
    } catch (err) {
      console.error("Import error:", err);
      alert("حدث خطأ أثناء معالجة شيت السيارات.");
    }
  };

  // ── حفظ / تعديل السيارة ──
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

  // ── حفظ / تعديل فرد ──
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

  // ── حذف فرد ──
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

  // ── حذف سيارة ──
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

  // ── إكسل السيارات ──
  const excelVehicleData = filteredVehicles.map((v) => ({
    "اللوحة": v.plateNumber,
    "الشاسيه": v.chassisNumber || "-",
    "الشركة المالكة": v.company || "ترانس جاس",
    "الماركة / الموديل": v.model || "-",
    "المحافظة": v.governorate || "-",
    "نوع الوقود": v.fuelType || "-",
    "اسم السائق": v.driverName || "-",
    "تاريخ الترخيص": v.licenseExpiry || "-",
    "الحالة": v.status || "نشطة"
  }));

  // ── إكسل الكوادر ──
  const excelPersonnelData = filteredPersonnel.map((p) => ({
    "الاسم": p.name,
    "الوظيفة / التصنيف": p.role,
    "رقم الهاتف": p.phone || "-",
    "ملاحظات": p.notes || ""
  }));

  // ── أعمدة جدول السيارات ──
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
    { key: "company", header: "الشركة المالكة", render: (r: Vehicle) => r.company || "ترانس جاس" },
    { key: "model", header: "الماركة / الموديل", render: (r: Vehicle) => r.model || "-" },
    { key: "governorate", header: "المحافظة", render: (r: Vehicle) => r.governorate || "كفر الشيخ" },
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
      header: "اسم السائق",
      render: (r: Vehicle) => (
        <span className="font-bold text-gray-800 dark:text-gray-200">
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
          {r.status === "active" || r.status === "نشط" ? "نشطة" : r.status || "نشطة"}
        </span>
      )
    }
  ];

  // ── أعمدة جدول الفنيين والسائقين ──
  const personnelColumns = [
    {
      key: "name",
      header: "الاسم",
      render: (r: Personnel) => <span className="font-black text-gray-900 dark:text-white">{r.name}</span>
    },
    {
      key: "role",
      header: "التصنيف / الوظيفة",
      render: (r: Personnel) => (
        <span
          className={`px-3 py-1 rounded-lg text-xs font-bold ${
            r.role === "مهندس"
              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
              : r.role === "فني"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
              : "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
          }`}
        >
          {r.role}
        </span>
      )
    },
    {
      key: "assignedVehicles",
      header: "السيارات المسندة إليه",
      render: (r: Personnel) => {
        const assigned = vehicles.filter((v) => v.driverName === r.name);
        return assigned.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {assigned.map((v) => (
              <span
                key={v.id}
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 rounded text-xs font-mono font-bold"
              >
                {v.plateNumber}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">لا توجد سيارة مسندة</span>
        );
      }
    },
    { key: "phone", header: "رقم الهاتف", render: (r: Personnel) => r.phone || "-" },
    { key: "notes", header: "ملاحظات", render: (r: Personnel) => r.notes || "-" }
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* ── الرأس الأصلي الكامل مع أزرار الشيت والقالب والإضافة ── */}
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

        <div className="flex items-center gap-3 flex-wrap">
          {/* 1. تصدير Excel */}
          <ExportExcelButton
            data={activeTab === "vehicles" ? excelVehicleData : excelPersonnelData}
            fileName={activeTab === "vehicles" ? "أسطول_السيارات" : "الفنيين_والسائقين"}
          />

          {/* 2. زر قالب Excel (شيت فورم التحميل) */}
          {activeTab === "vehicles" && (
            <ExportExcelButton
              data={sampleTemplateData}
              fileName="قالب_شيت_السيارات"
              buttonText="قالب Excel"
            />
          )}

          {/* 3. زر استيراد وتحديث الشيت (رفع الشيت) */}
          {canWrite && activeTab === "vehicles" && (
            <ImportExcelButton
              templateColumns={VEHICLE_TEMPLATE_COLUMNS}
              onImport={handleImportVehicles}
              buttonText="استيراد وتحديث الشيت"
            />
          )}

          {/* 4. زر إضافة سيارة البرتقالي اليدوي */}
          {canWrite && activeTab === "vehicles" && (
            <button
              onClick={() => {
                setEditingVehicle({
                  plateNumber: "",
                  chassisNumber: "",
                  company: "ترانس جاس",
                  model: "",
                  governorate: "كفر الشيخ",
                  department: "تشغيل وصيانة",
                  fuelType: "سولار و غاز طبيعى",
                  driverName: "",
                  status: "نشطة",
                  licenseExpiry: ""
                });
                setIsEditVehicle(false);
                setVehicleModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus size={18} />
              <span>إضافة سيارة</span>
            </button>
          )}

          {/* زر إضافة فرد */}
          {canWrite && activeTab === "personnel" && (
            <button
              onClick={() => {
                setEditingPerson({ name: "", role: "سائق", phone: "", notes: "" });
                setIsEditPersonnel(false);
                setPersonnelModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus size={18} />
              <span>إضافة فرد (سائق / فني / مهندس)</span>
            </button>
          )}
        </div>
      </div>

      {/* ── التبويبات الرئيسية ── */}
      <div className="flex gap-2 p-1.5 bg-white dark:bg-gray-900 rounded-xl w-fit border border-gray-200 dark:border-gray-800 shadow-sm">
        <button
          onClick={() => setActiveTab("vehicles")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
            activeTab === "vehicles"
              ? "bg-teal-600 text-white shadow-md"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Car size={16} />
          <span>أسطول السيارات ({vehicles.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("personnel")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
            activeTab === "personnel"
              ? "bg-slate-800 text-white shadow-md"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Users size={16} />
          <span>الفنيين والسائقين ({personnelList.length})</span>
        </button>
      </div>

      {/* ── شريط الفلاتر ── */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400">البحث الشامل:</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باللوحة، الشاسيه، السائق..."
            className="border dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs dark:bg-gray-800 dark:text-white outline-none w-56 focus:border-teal-500"
          />
        </div>

        {activeTab === "vehicles" ? (
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
                { value: "مشروع قلين", label: "مشروع قلين" },
                { value: "طوارئ", label: "طوارئ" },
                { value: "خدمة العملاء", label: "خدمة العملاء" }
              ]}
            />
            <FilterSelect
              label="الوقود"
              value={fuelFilter}
              onChange={setFuelFilter}
              options={[
                { value: "الكل", label: "الكل" },
                { value: "سولار و غاز طبيعى", label: "سولار و غاز طبيعى" },
                { value: "بنزين فقط", label: "بنزين فقط" },
                { value: "سولار فقط", label: "سولار فقط" }
              ]}
            />
          </>
        ) : (
          <FilterSelect
            label="الوظيفة / التصنيف"
            value={personnelRoleFilter}
            onChange={setPersonnelRoleFilter}
            options={[
              { value: "الكل", label: "الكل" },
              { value: "سائق", label: "سائق" },
              { value: "فني", label: "فني" },
              { value: "مهندس", label: "مهندس" }
            ]}
          />
        )}
      </div>

      {/* ── جدول العرض ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        {activeTab === "vehicles" ? (
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
        ) : (
          <DataTable
            columns={personnelColumns}
            data={filteredPersonnel}
            loading={loading}
            onEdit={
              canWrite
                ? (r: Personnel) => {
                    setEditingPerson(r);
                    setIsEditPersonnel(true);
                    setPersonnelModalOpen(true);
                  }
                : undefined
            }
            onDelete={canWrite ? (r: Personnel) => handleDeletePersonnel(r.id) : undefined}
          />
        )}
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

                <Field label="اسم السائق (اختيار من القائمة)">
                  <select
                    className={`${inputClass} font-bold text-teal-800 dark:text-teal-300`}
                    value={editingVehicle.driverName || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, driverName: e.target.value })}
                  >
                    <option value="">-- اختر السائق من المسجلين --</option>
                    {personnelList.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.role})
                      </option>
                    ))}
                    {editingVehicle.driverName &&
                      !personnelList.some((p) => p.name === editingVehicle.driverName) && (
                        <option value={editingVehicle.driverName}>
                          {editingVehicle.driverName} (محدد يدوياً)
                        </option>
                      )}
                  </select>
                </Field>

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

              <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setVehicleModalOpen(false)}
                  className="flex-1 py-2.5 bg-white border text-gray-700 font-bold rounded-xl hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl flex justify-center items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  <span>{isEditVehicle ? "حفظ التعديلات" : "إضافة السيارة"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── نافذة إضافة / تعديل الفنيين والسائقين ── */}
      {personnelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center bg-teal-700 text-white p-4 rounded-t-2xl shrink-0">
              <h2 className="text-lg font-black flex items-center gap-2">
                <Briefcase size={20} />
                {isEditPersonnel ? "تعديل بيانات الفرد" : "إضافة فرد جديد (سائق / فني / مهندس)"}
              </h2>
              <button onClick={() => setPersonnelModalOpen(false)} className="hover:text-red-300">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSavePersonnel} className="p-6 space-y-4">
              <Field label="الاسم بالكامل *">
                <input
                  required
                  className={inputClass}
                  value={editingPerson.name || ""}
                  onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })}
                  placeholder="مثال: أحمد صالح"
                />
              </Field>

              <Field label="التصنيف الوظيفي *">
                <select
                  required
                  className={inputClass}
                  value={editingPerson.role || "سائق"}
                  onChange={(e) =>
                    setEditingPerson({
                      ...editingPerson,
                      role: e.target.value as "سائق" | "فني" | "مهندس"
                    })
                  }
                >
                  <option value="سائق">سائق</option>
                  <option value="فني">فني</option>
                  <option value="مهندس">مهندس</option>
                </select>
              </Field>

              <Field label="رقم الهاتف">
                <input
                  type="tel"
                  className={inputClass}
                  value={editingPerson.phone || ""}
                  onChange={(e) => setEditingPerson({ ...editingPerson, phone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                />
              </Field>

              <Field label="ملاحظات">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={editingPerson.notes || ""}
                  onChange={(e) => setEditingPerson({ ...editingPerson, notes: e.target.value })}
                  placeholder="أي ملاحظات إضافية..."
                />
              </Field>

              <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setPersonnelModalOpen(false)}
                  className="flex-1 py-2.5 bg-white border text-gray-700 font-bold rounded-xl hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl flex justify-center items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  <span>{isEditPersonnel ? "تحديث البيانات" : "حفظ الفرد"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
