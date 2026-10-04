"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import {
  Truck,
  Search,
  CheckSquare,
  Square,
  ChevronDown,
  X,
  Loader2,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface FleetVehicle {
  id: number;
  plateNumber: string;
  sapNumber?: string;
  model?: string;
  make?: string;
  year?: string | number;
  type?: string;
  status?: string;
  currentOdometer?: number | string;
  driverName?: string;
  department?: string;
  branch?: string;
  chassisNumber?: string;
  engineNumber?: string;
  licenseExpiry?: string;
  insuranceExpiry?: string;
  notes?: string;
}

const FLEET_TEMPLATE_COLUMNS = [
  "رقم اللوحة",
  "رقم SAP",
  "الموديل / النوع",
  "سنة الصنع",
  "الحالة التشغيلية",
  "قراءة العداد (كم)",
  "اسم السائق",
  "القسم / الإدارة",
  "الفرع / الموقع",
  "رقم الشاسيه",
  "رقم الماتور",
  "انتهاء الرخصة",
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [typeFilter, setTypeFilter] = useState("الكل");

  // ── منطق الفلترة المتعددة للسيارات (Multi-Select) ──
  const [selectedPlates, setSelectedPlates] = useState<string[]>([]);
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canWrite =
    user?.role === "owner" ||
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.permissions?.includes("fleet:write");

  // إغلاق القائمة المنسدلة عند النقر في الخارج
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsVehicleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        currentOdometer: v.currentOdometer || v.current_odometer || 0,
        driverName: v.driverName || v.driver_name || "",
        chassisNumber: v.chassisNumber || v.chassis_number || "",
        engineNumber: v.engineNumber || v.engine_number || "",
        licenseExpiry: v.licenseExpiry || v.license_expiry || ""
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

  // قائمة جميع اللوحات المتاحة دون تكرار
  const allPlates = Array.from(new Set(data.map((d) => d.plateNumber).filter(Boolean)));

  const toggleSelectPlate = (plate: string) => {
    setSelectedPlates((prev) =>
      prev.includes(plate) ? prev.filter((p) => p !== plate) : [...prev, plate]
    );
  };

  const selectAllPlates = () => {
    setSelectedPlates(allPlates);
  };

  const clearSelectedPlates = () => {
    setSelectedPlates([]);
  };

  // ── الفلترة الشاملة ──
  const filteredData = data.filter((row) => {
    const matchesSearch =
      (row.plateNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (row.sapNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (row.driverName || "").toLowerCase().includes(search.toLowerCase()) ||
      (row.model || "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "الكل" || row.status === statusFilter;
    const matchesType = typeFilter === "الكل" || row.type === typeFilter;

    // شرط الفلتر المتعدد للسيارات
    const matchesSelectedVehicles =
      selectedPlates.length === 0 || selectedPlates.includes(row.plateNumber);

    return matchesSearch && matchesStatus && matchesType && matchesSelectedVehicles;
  });

  // ── بيانات تصدير الإكسل الموحدة (تشمل رقم SAP) ──
  const excelData = filteredData.map((row) => ({
    "رقم اللوحة": row.plateNumber,
    "رقم SAP": row.sapNumber || "-",
    "الموديل / النوع": row.model || row.make || "-",
    "سنة الصنع": row.year || "-",
    "الحالة التشغيلية": row.status || "نشط",
    "قراءة العداد (كم)": safeNum(row.currentOdometer),
    "اسم السائق": row.driverName || "-",
    "القسم / الإدارة": row.department || "-",
    "الفرع / الموقع": row.branch || "-",
    "رقم الشاسيه": row.chassisNumber || "-",
    "رقم الماتور": row.engineNumber || "-",
    "انتهاء الرخصة": row.licenseExpiry || "-",
    "ملاحظات": row.notes || ""
  }));

  // ── معالجة استيراد الشيت وربط البيانات بكافة القوائم ──
  const handleImport = async (importedRows: any[]) => {
    if (!importedRows || importedRows.length === 0) return;

    try {
      // إرسال البيانات للـ API ليتم توزيعها وتحديثها في كل الجداول تلقائياً
      const res = await fetch("/api/vehicles/bulk-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: importedRows.map((r) => ({
            plateNumber: r["رقم اللوحة"] || r.plateNumber,
            sapNumber: r["رقم SAP"] || r["رقم الساب"] || r.sapNumber || "",
            model: r["الموديل / النوع"] || r.model,
            year: r["سنة الصنع"] || r.year,
            status: r["الحالة التشغيلية"] || r.status || "نشط",
            currentOdometer: safeNum(r["قراءة العداد (كم)"] || r.currentOdometer),
            driverName: r["اسم السائق"] || r.driverName,
            department: r["القسم / الإدارة"] || r.department,
            branch: r["الفرع / الموقع"] || r.branch,
            chassisNumber: r["رقم الشاسيه"] || r.chassisNumber,
            engineNumber: r["رقم الماتور"] || r.engineNumber,
            licenseExpiry: r["انتهاء الرخصة"] || r.licenseExpiry,
            notes: r["ملاحظات"] || r.notes
          }))
        })
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.success !== false) {
        alert("تم استيراد الشيت بنجاح ومزامنة بيانات الأسطول مع كافة القوائم المرتبطة.");
        loadData();
      } else {
        alert(resData.error || "حدث خطأ أثناء مزامنة بيانات الشيت.");
      }
    } catch (err) {
      console.error("Bulk sync error:", err);
      alert("تعذر الاتصال بالخادم لمزامنة الشيت.");
    }
  };

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
    { key: "model", header: "الموديل / المركبة", render: (r: FleetVehicle) => r.model || r.make || "-" },
    { key: "driverName", header: "السائق المسند", render: (r: FleetVehicle) => r.driverName || "-" },
    { key: "department", header: "القسم / الإدارة", render: (r: FleetVehicle) => r.department || "-" },
    {
      key: "currentOdometer",
      header: "العداد الحالي",
      render: (r: FleetVehicle) => (
        <span className="font-bold text-gray-700 dark:text-gray-300">
          {safeNum(r.currentOdometer).toLocaleString()} كم
        </span>
      )
    },
    {
      key: "status",
      header: "الحالة",
      render: (r: FleetVehicle) => (
        <span
          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
            r.status === "نشط" || r.status === "active"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {r.status || "نشط"}
        </span>
      )
    }
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* ── الرأس والإجراءات ── */}
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
          <ExportExcelButton data={excelData} fileName="داتا_الأسطول_الشاملة" />
          {canWrite && (
            <ImportExcelButton
              templateColumns={FLEET_TEMPLATE_COLUMNS}
              onImport={handleImport}
              buttonText="استيراد وتحديث الشيت"
            />
          )}
        </div>
      </div>

      {/* ── شريط الفلاتر متضمناً الفلترة المتعددة للسيارات ── */}
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

        {/* ── الفلتر المتعدد للسيارات (Multi-Select Dropdown) ── */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
            تحديد السيارات:
          </label>
          <button
            type="button"
            onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
            className="flex items-center justify-between gap-2 border dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 dark:text-white min-w-[170px] hover:bg-gray-100 transition-colors"
          >
            <span>
              {selectedPlates.length === 0
                ? "جميع السيارات (الكل)"
                : `${selectedPlates.length} سيارة محددة`}
            </span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {isVehicleDropdownOpen && (
            <div className="absolute z-30 top-full mt-1.5 right-0 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800 text-xs">
                <button
                  type="button"
                  onClick={selectAllPlates}
                  className="text-teal-600 font-bold hover:underline"
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={clearSelectedPlates}
                  className="text-red-500 font-bold hover:underline"
                >
                  مسح التحديد
                </button>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1">
                {allPlates.map((plate) => {
                  const isChecked = selectedPlates.includes(plate);
                  return (
                    <div
                      key={plate}
                      onClick={() => toggleSelectPlate(plate)}
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

      {/* ── جدول البيانات ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable columns={columns} data={filteredData} loading={loading} />
      </div>
    </div>
  );
}
