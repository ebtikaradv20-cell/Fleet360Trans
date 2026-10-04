"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import {
  Truck,
  FileSpreadsheet,
  Download,
  ChevronDown,
  CheckSquare,
  Square,
  X
} from "lucide-react";

interface FleetVehicle {
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
  department?: string;
  fuelType?: string;
  driverName?: string;
  currentOdometer?: number | string;
  licenseExpiry?: string;
  insuranceExpiry?: string;
  status?: string;
  notes?: string;
}

const FLEET_FULL_COLUMNS = [
  "رقم اللوحة",
  "رقم SAP",
  "الموديل / المركبة",
  "سنة الصنع",
  "رقم الشاسيه",
  "رقم الماتور",
  "الشركة المالكة",
  "المحافظة",
  "القسم / الإدارة",
  "السائق المسند",
  "نوع الوقود",
  "العداد الحالي (كم)",
  "انتهاء الرخصة",
  "الحالة التشغيلية",
  "ملاحظات"
];

const safeNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
};

export default function FleetDataPage() {
  const { user } = useApp();
  const [data, setData] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // الفلاتر
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("الكل");
  const [govFilter, setGovFilter] = useState("الكل");
  const [deptFilter, setDeptFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");

  // تحديد سيارات متعددة (Multi-Select)
  const [selectedPlates, setSelectedPlates] = useState<string[]>([]);
  const [isVehicleMenuOpen, setIsVehicleMenuOpen] = useState(false);
  const vehicleMenuRef = useRef<HTMLDivElement>(null);

  const canWrite =
    user?.role === "owner" ||
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.permissions?.includes("fleet:write");

  // إغلاق قائمة اختيار السيارات عند النقر في الخارج
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (vehicleMenuRef.current && !vehicleMenuRef.current.contains(e.target as Node)) {
        setIsVehicleMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vehicles");
      const d = await res.json();
      const list = (Array.isArray(d) ? d : []).map((v: any) => ({
        ...v,
        plateNumber: v.plateNumber || v.plate_number || "",
        sapNumber: v.sapNumber || v.sap_number || "",
        chassisNumber: v.chassisNumber || v.chassis_number || "",
        engineNumber: v.engineNumber || v.engine_number || "",
        company: v.company || "ترانس جاس",
        model: v.model || v.make || "",
        year: v.year || "-",
        governorate: v.governorate || "كفر الشيخ",
        department: v.department || "تشغيل وصيانة",
        fuelType: v.fuelType || v.fuel_type || "سولار و غاز طبيعى",
        driverName: v.driverName || v.driver_name || "",
        currentOdometer: v.currentOdometer || v.current_odometer || 0,
        licenseExpiry: v.licenseExpiry || v.license_expiry || "",
        status: v.status || "نشطة",
        notes: v.notes || ""
      }));
      setData(list);
    } catch (err) {
      console.error("Failed to load fleet data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allPlates = Array.from(new Set(data.map((d) => d.plateNumber).filter(Boolean)));

  const togglePlate = (plate: string) => {
    setSelectedPlates((prev) =>
      prev.includes(plate) ? prev.filter((p) => p !== plate) : [...prev, plate]
    );
  };

  // الفلترة الشاملة
  const filteredData = data.filter((row) => {
    const matchesSearch =
      (row.plateNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (row.sapNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (row.driverName || "").toLowerCase().includes(search.toLowerCase()) ||
      (row.chassisNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (row.model || "").toLowerCase().includes(search.toLowerCase());

    const matchesCompany = companyFilter === "الكل" || row.company === companyFilter;
    const matchesGov = govFilter === "الكل" || row.governorate === govFilter;
    const matchesDept = deptFilter === "الكل" || row.department === deptFilter;
    const matchesStatus =
      statusFilter === "الكل" ||
      row.status === statusFilter ||
      (statusFilter === "نشط" && (row.status === "نشطة" || row.status === "active"));

    const matchesSelectedCars =
      selectedPlates.length === 0 || selectedPlates.includes(row.plateNumber);

    return (
      matchesSearch &&
      matchesCompany &&
      matchesGov &&
      matchesDept &&
      matchesStatus &&
      matchesSelectedCars
    );
  });

  // تجهيز شيت إكسل الكامل
  const excelData = filteredData.map((row) => ({
    "رقم اللوحة": row.plateNumber,
    "رقم SAP": row.sapNumber || "-",
    "الموديل / المركبة": row.model || "-",
    "سنة الصنع": row.year || "-",
    "رقم الشاسيه": row.chassisNumber || "-",
    "رقم الماتور": row.engineNumber || "-",
    "الشركة المالكة": row.company || "ترانس جاس",
    "المحافظة": row.governorate || "كفر الشيخ",
    "القسم / الإدارة": row.department || "تشغيل وصيانة",
    "السائق المسند": row.driverName || "-",
    "نوع الوقود": row.fuelType || "سولار و غاز طبيعى",
    "العداد الحالي (كم)": safeNum(row.currentOdometer),
    "انتهاء الرخصة": row.licenseExpiry || "-",
    "الحالة التشغيلية": row.status || "نشطة",
    "ملاحظات": row.notes || ""
  }));

  // قالب الإكسل الفارغ
  const templateData = allPlates.map((plate) => ({
    "رقم اللوحة": plate,
    "رقم SAP": "",
    "الموديل / المركبة": "",
    "سنة الصنع": "",
    "رقم الشاسيه": "",
    "رقم الماتور": "",
    "الشركة المالكة": "ترانس جاس",
    "المحافظة": "كفر الشيخ",
    "القسم / الإدارة": "تشغيل وصيانة",
    "السائق المسند": "",
    "نوع الوقود": "سولار و غاز طبيعى",
    "العداد الحالي (كم)": 0,
    "انتهاء الرخصة": "",
    "الحالة التشغيلية": "نشطة",
    "ملاحظات": ""
  }));

  // مزامنة الشيت مع النظام بالكامل
  const handleImport = async (importedRows: any[]) => {
    if (!importedRows || importedRows.length === 0) return;

    try {
      const res = await fetch("/api/vehicles/bulk-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: importedRows.map((r) => ({
            plateNumber: r["رقم اللوحة"] || r.plateNumber,
            sapNumber: r["رقم SAP"] || r["رقم الساب"] || r.sapNumber || "",
            model: r["الموديل / المركبة"] || r.model,
            year: r["سنة الصنع"] || r.year,
            chassisNumber: r["رقم الشاسيه"] || r.chassisNumber,
            engineNumber: r["رقم الماتور"] || r.engineNumber,
            company: r["الشركة المالكة"] || r.company,
            governorate: r["المحافظة"] || r.governorate,
            department: r["القسم / الإدارة"] || r.department,
            driverName: r["السائق المسند"] || r.driverName,
            fuelType: r["نوع الوقود"] || r.fuelType,
            currentOdometer: safeNum(r["العداد الحالي (كم)"] || r.currentOdometer),
            licenseExpiry: r["انتهاء الرخصة"] || r.licenseExpiry,
            status: r["الحالة التشغيلية"] || r.status || "نشطة",
            notes: r["ملاحظات"] || r.notes
          }))
        })
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.success !== false) {
        alert("تم استيراد الشيت ومزامنة كافة بيانات الأسطول بنجاح.");
        loadData();
      } else {
        alert(resData.error || "حدث خطأ أثناء مزامنة بيانات الشيت.");
      }
    } catch (err) {
      console.error("Bulk sync error:", err);
      alert("تعذر الاتصال بالخادم لمزامنة الشيت.");
    }
  };

  // جميع أعمدة داتا الأسطول الشاملة الكاملة
  const columns = [
    {
      key: "plateNumber",
      header: "رقم اللوحة",
      render: (r: FleetVehicle) => (
        <span className="font-black text-blue-900 dark:text-blue-400">{r.plateNumber}</span>
      )
    },
    {
      key: "sapNumber",
      header: "رقم SAP",
      render: (r: FleetVehicle) =>
        r.sapNumber ? (
          <span className="font-mono text-xs font-black text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-300 dark:border-gray-700">
            {r.sapNumber}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
    },
    { key: "model", header: "الموديل / المركبة", render: (r: FleetVehicle) => r.model || "-" },
    { key: "driverName", header: "السائق المسند", render: (r: FleetVehicle) => r.driverName || "-" },
    { key: "department", header: "القسم / الإدارة", render: (r: FleetVehicle) => r.department || "-" },
    {
      key: "currentOdometer",
      header: "العداد الحالي",
      render: (r: FleetVehicle) => (
        <span className="font-bold text-gray-800 dark:text-gray-200">
          {safeNum(r.currentOdometer).toLocaleString()} كم
        </span>
      )
    },
    {
      key: "chassisNumber",
      header: "رقم الشاسيه",
      render: (r: FleetVehicle) => (
        <span className="font-mono text-xs text-gray-500">{r.chassisNumber || "-"}</span>
      )
    },
    { key: "company", header: "الشركة", render: (r: FleetVehicle) => r.company || "ترانس جاس" },
    { key: "governorate", header: "المحافظة", render: (r: FleetVehicle) => r.governorate || "كفر الشيخ" },
    { key: "fuelType", header: "الوقود", render: (r: FleetVehicle) => r.fuelType || "-" },
    { key: "licenseExpiry", header: "انتهاء الرخصة", render: (r: FleetVehicle) => r.licenseExpiry || "-" },
    {
      key: "status",
      header: "الحالة",
      render: (r: FleetVehicle) => (
        <span
          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
            r.status === "نشطة" || r.status === "active" || r.status === "نشط"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          }`}
        >
          {r.status || "نشطة"}
        </span>
      )
    }
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* ── الرأس الأصلي مع الأزرار الثلاثة كاملة ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-300 rounded-xl">
            <Truck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">داتا الأسطول الشاملة</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              عرض {filteredData.length} من أصل {data.length} سيارة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* 1. تصدير Excel */}
          <ExportExcelButton data={excelData} fileName="داتا_الأسطول_الشاملة" />

          {/* 2. قالب Excel */}
          <ExportExcelButton
            data={templateData}
            fileName="قالب_داتا_الأسطول"
            buttonText="قالب Excel"
          />

          {/* 3. استيراد وتحديث الشيت */}
          {canWrite && (
            <ImportExcelButton
              templateColumns={FLEET_FULL_COLUMNS}
              onImport={handleImport}
              buttonText="استيراد وتحديث الشيت"
            />
          )}
        </div>
      </div>

      {/* ── شريط الفلاتر الأصلي متضمناً الفلترة المتعددة للسيارات ── */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400">بحث:</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باللوحة، SAP، السائق..."
            className="border dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs dark:bg-gray-800 dark:text-white outline-none w-48 focus:border-teal-500"
          />
        </div>

        {/* ── فلتر اختيار عدة سيارات مندمج بنفس تصميم باقي الفلاتر ── */}
        <div className="relative flex items-center gap-2" ref={vehicleMenuRef}>
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
            تحديد السيارات:
          </label>
          <button
            type="button"
            onClick={() => setIsVehicleMenuOpen(!isVehicleMenuOpen)}
            className="flex items-center justify-between gap-2 border dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 dark:text-white min-w-[140px] hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <span>
              {selectedPlates.length === 0
                ? "الكل"
                : `${selectedPlates.length} سيارة محددة`}
            </span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {isVehicleMenuOpen && (
            <div className="absolute z-50 top-full mt-1.5 right-0 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-3 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedPlates(allPlates)}
                  className="text-teal-600 font-bold hover:underline cursor-pointer"
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlates([])}
                  className="text-red-500 font-bold hover:underline cursor-pointer"
                >
                  مسح التحديد
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1">
                {allPlates.map((plate) => {
                  const isChecked = selectedPlates.includes(plate);
                  return (
                    <div
                      key={plate}
                      onClick={() => togglePlate(plate)}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-xs"
                    >
                      {isChecked ? (
                        <CheckSquare size={16} className="text-teal-600 shrink-0" />
                      ) : (
                        <Square size={16} className="text-gray-400 shrink-0" />
                      )}
                      <span className="font-bold text-gray-800 dark:text-gray-200">{plate}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

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

        <FilterSelect
          label="الحالة التشغيلية"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "الكل", label: "الكل" },
            { value: "نشط", label: "نشط" },
            { value: "تحت الصيانة", label: "تحت الصيانة" },
            { value: "معطل", label: "معطل" }
          ]}
        />
      </div>

      {/* ── جدول البيانات الشامل الكامل ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable columns={columns} data={filteredData} loading={loading} />
      </div>
    </div>
  );
}
