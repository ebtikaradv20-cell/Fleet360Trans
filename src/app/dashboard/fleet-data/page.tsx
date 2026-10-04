"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import {
  Truck,
  Wrench,
  Fuel,
  DollarSign,
  ChevronDown,
  CheckSquare,
  Square,
  Layers
} from "lucide-react";

interface FleetTransaction {
  id: string | number;
  sapOrderNumber: string;
  plateNumber: string;
  date: string;
  type: "صيانة" | "وقود";
  description: string;
  cost: number;
}

interface Vehicle {
  id: number;
  plateNumber: string;
}

const FLEET_EXCEL_COLUMNS = [
  "رقم اوردر الساب",
  "رقم العربية",
  "التاريخ",
  "النوع",
  "وصف الصيانه او العملية",
  "التكلفة"
];

const safeNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
};

export default function FleetDataPage() {
  const { user } = useApp();
  const [transactions, setTransactions] = useState<FleetTransaction[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // ── الفلاتر ──
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // فلتر تحديد سيارات متعددة
  const [selectedPlates, setSelectedPlates] = useState<string[]>([]);
  const [isVehicleMenuOpen, setIsVehicleMenuOpen] = useState(false);
  const vehicleMenuRef = useRef<HTMLDivElement>(null);

  const canWrite =
    user?.role === "owner" ||
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.permissions?.includes("fleet:write");

  // إغلاق قائمة اختيار السيارات عند النقر بالخارج
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (vehicleMenuRef.current && !vehicleMenuRef.current.contains(e.target as Node)) {
        setIsVehicleMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // ── جلب ودمج معاملات الأسطول من الصيانة والوقود ──
  const loadFleetTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const [woRes, fuelRes, vehRes] = await Promise.all([
        fetch("/api/work-orders").catch(() => null),
        fetch("/api/fuel").catch(() => null),
        fetch("/api/vehicles").catch(() => null)
      ]);

      const list: FleetTransaction[] = [];

      // 1. تحويل سجلات الصيانة
      if (woRes && woRes.ok) {
        const woData = await woRes.json();
        const woList = Array.isArray(woData) ? woData : woData.data || [];
        woList
          .filter((w: any) => !w.is_deleted && w.status !== "deleted")
          .forEach((w: any) => {
            list.push({
              id: `wo-${w.id}`,
              sapOrderNumber: w.sapNumber || w.sap_number || w.orderNumber || "-",
              plateNumber: w.plateNumber || w.plate_number || "",
              date: w.startDate || w.start_date || (w.createdAt ? w.createdAt.slice(0, 10) : "-"),
              type: "صيانة",
              description: w.description || w.maintenanceType || w.maintenance_type || "صيانة مركبة",
              cost: safeNum(w.cost)
            });
          });
      }

      // 2. تحويل سجلات الوقود
      if (fuelRes && fuelRes.ok) {
        const fuelData = await fuelRes.json();
        const fuelList = Array.isArray(fuelData) ? fuelData : fuelData.data || [];
        fuelList
          .filter((f: any) => !f.is_deleted)
          .forEach((f: any) => {
            list.push({
              id: `fuel-${f.id}`,
              sapOrderNumber: f.sapNumber || f.sap_number || f.receiptNumber || "-",
              plateNumber: f.plateNumber || f.plate_number || "",
              date: f.date || f.fillDate || (f.createdAt ? f.createdAt.slice(0, 10) : "-"),
              type: "وقود",
              description:
                f.notes ||
                `تفويل ${f.fuelType || "وقود"} (${safeNum(f.liters)} لتر) - ${f.stationName || "محطة"}`,
              cost: safeNum(f.cost || f.totalCost)
            });
          });
      }

      // 3. جلب قائمة السيارات للفلترة
      if (vehRes && vehRes.ok) {
        const vehData = await vehRes.json();
        setVehicles(Array.isArray(vehData) ? vehData : vehData.data || []);
      }

      // الترتيب من الأحدث للأقدم
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(list);
    } catch (err) {
      console.error("Failed to load fleet transactions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFleetTransactions();
  }, [loadFleetTransactions]);

  const allPlates = Array.from(
    new Set([
      ...vehicles.map((v) => v.plateNumber),
      ...transactions.map((t) => t.plateNumber)
    ].filter(Boolean))
  );

  const togglePlate = (plate: string) => {
    setSelectedPlates((prev) =>
      prev.includes(plate) ? prev.filter((p) => p !== plate) : [...prev, plate]
    );
  };

  // ── تصفية المعاملات ──
  const filteredData = transactions.filter((row) => {
    const matchesSearch =
      (row.sapOrderNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (row.plateNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (row.description || "").toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === "الكل" || row.type === typeFilter;

    const matchesDateFrom = !dateFrom || row.date >= dateFrom;
    const matchesDateTo = !dateTo || row.date <= dateTo;

    const matchesSelectedCars =
      selectedPlates.length === 0 || selectedPlates.includes(row.plateNumber);

    return matchesSearch && matchesType && matchesDateFrom && matchesDateTo && matchesSelectedCars;
  });

  // ── الحسابات الإجمالية ──
  const totalCost = filteredData.reduce((acc, r) => acc + safeNum(r.cost), 0);
  const maintenanceCount = filteredData.filter((r) => r.type === "صيانة").length;
  const fuelCount = filteredData.filter((r) => r.type === "وقود").length;

  // ── شيت الإكسل المطابق بنسبة 100% للمطلوب ──
  const excelData = filteredData.map((row) => ({
    "رقم اوردر الساب": row.sapOrderNumber,
    "رقم العربية": row.plateNumber,
    "التاريخ": row.date,
    "النوع": row.type,
    "وصف الصيانه او العملية": row.description,
    "التكلفة": safeNum(row.cost)
  }));

  // ── استيراد وتوزيع الشيت تلقائياً ──
  const handleImport = async (importedRows: any[]) => {
    if (!importedRows || importedRows.length === 0) return;

    try {
      let maintenanceAdded = 0;
      let fuelAdded = 0;

      for (const row of importedRows) {
        const sap = String(row["رقم اوردر الساب"] || row["رقم الساب"] || row["sapOrderNumber"] || "").trim();
        const plate = String(row["رقم العربية"] || row["رقم اللوحة"] || row["plateNumber"] || "").trim();
        const d = row["التاريخ"] || row["date"] || new Date().toISOString().slice(0, 10);
        const type = String(row["النوع"] || row["type"] || "").trim();
        const desc = String(row["وصف الصيانه او العملية"] || row["وصف العملية"] || row["description"] || "").trim();
        const costVal = safeNum(row["التكلفة"] || row["cost"]);

        if (type.includes("صيان") || type.toLowerCase().includes("maint")) {
          // حفظ كأمر صيانة
          await fetch("/api/work-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sapNumber: sap,
              plateNumber: plate,
              startDate: d,
              maintenanceType: desc.length < 30 ? desc : "صيانة ميكانيكا",
              description: desc,
              cost: costVal,
              status: "completed"
            })
          });
          maintenanceAdded++;
        } else {
          // حفظ كمعاملة وقود
          await fetch("/api/fuel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sapNumber: sap,
              plateNumber: plate,
              date: d,
              notes: desc,
              cost: costVal,
              fuelType: "سولار",
              liters: 0
            })
          }).catch(() => {});
          fuelAdded++;
        }
      }

      alert(`تم استيراد الشيت بنجاح:\n- ${maintenanceAdded} عملية صيانة\n- ${fuelAdded} معاملة وقود`);
      loadFleetTransactions();
    } catch (err) {
      console.error("Bulk sync error:", err);
      alert("حدث خطأ أثناء معالجة بيانات الشيت.");
    }
  };

  // ── أعمدة الجدول الـ 6 المطلوبة ──
  const columns = [
    {
      key: "sapOrderNumber",
      header: "رقم اوردر الساب",
      render: (r: FleetTransaction) =>
        r.sapOrderNumber && r.sapOrderNumber !== "-" ? (
          <span className="font-mono text-xs font-black text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">
            {r.sapOrderNumber}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
    },
    {
      key: "plateNumber",
      header: "رقم العربية",
      render: (r: FleetTransaction) => (
        <span className="font-black text-gray-900 dark:text-white">{r.plateNumber}</span>
      )
    },
    {
      key: "date",
      header: "التاريخ",
      render: (r: FleetTransaction) => (
        <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
          {r.date ? new Date(r.date).toLocaleDateString("en-GB") : "-"}
        </span>
      )
    },
    {
      key: "type",
      header: "النوع",
      render: (r: FleetTransaction) => (
        <span
          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit ${
            r.type === "صيانة"
              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
          }`}
        >
          {r.type === "صيانة" ? <Wrench size={13} /> : <Fuel size={13} />}
          <span>{r.type}</span>
        </span>
      )
    },
    {
      key: "description",
      header: "وصف الصيانه او العملية",
      render: (r: FleetTransaction) => (
        <span className="text-xs text-gray-700 dark:text-gray-200 font-medium">
          {r.description || "-"}
        </span>
      )
    },
    {
      key: "cost",
      header: "التكلفة",
      render: (r: FleetTransaction) => (
        <span className="font-black text-emerald-600 dark:text-emerald-400">
          {safeNum(r.cost).toLocaleString()} ج.م
        </span>
      )
    }
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* ── كروت إحصائيات المعاملات ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-blue-200 text-xs font-bold mb-1">إجمالي تكلفة العمليات المعروضة</div>
              <div className="text-3xl font-black">
                {totalCost.toLocaleString()} <span className="text-sm font-normal">ج.م</span>
              </div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl">
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-800 to-purple-600 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-purple-200 text-xs font-bold mb-1">عمليات الصيانة</div>
              <div className="text-3xl font-black">{maintenanceCount}</div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Wrench size={22} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-amber-100 text-xs font-bold mb-1">معاملات الوقود</div>
              <div className="text-3xl font-black">{fuelCount}</div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Fuel size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* ── الهيدر وأزرار الشيت ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">داتا الأسطول الشاملة</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              إجمالي {filteredData.length} عملية مسجلة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ExportExcelButton data={excelData} fileName="داتا_معاملات_الأسطول" />
          {canWrite && (
            <ImportExcelButton
              templateColumns={FLEET_EXCEL_COLUMNS}
              onImport={handleImport}
              buttonText="استيراد وتحديث الشيت"
            />
          )}
        </div>
      </div>

      {/* ── شريط الفلاتر ── */}
      <FilterBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        showDateRange
      >
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">بحث:</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالساب، اللوحة، الوصف..."
            className="border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs dark:bg-gray-800 dark:text-white outline-none w-44 focus:border-teal-500"
          />
        </div>

        {/* فلتر تحديد السيارات المتعدد */}
        <div className="relative flex items-center gap-2" ref={vehicleMenuRef}>
          <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            السيارة:
          </label>
          <button
            type="button"
            onClick={() => setIsVehicleMenuOpen(!isVehicleMenuOpen)}
            className="border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 dark:text-white outline-none flex items-center justify-between gap-2 min-w-[120px] hover:border-teal-500 transition-colors cursor-pointer"
          >
            <span className="truncate">
              {selectedPlates.length === 0
                ? "الكل"
                : selectedPlates.length === 1
                ? selectedPlates[0]
                : `${selectedPlates.length} سيارات`}
            </span>
            <ChevronDown size={12} className="text-gray-400 shrink-0" />
          </button>

          {isVehicleMenuOpen && (
            <div className="absolute z-50 top-full mt-1.5 right-0 w-60 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-2.5 space-y-2">
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
                  إلغاء التحديد
                </button>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1">
                {allPlates.map((plate) => {
                  const isChecked = selectedPlates.includes(plate);
                  return (
                    <div
                      key={plate}
                      onClick={() => togglePlate(plate)}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-xs"
                    >
                      {isChecked ? (
                        <CheckSquare size={15} className="text-teal-600 shrink-0" />
                      ) : (
                        <Square size={15} className="text-gray-400 shrink-0" />
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
          label="النوع"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "الكل", label: "الكل" },
            { value: "صيانة", label: "صيانة" },
            { value: "وقود", label: "وقود" }
          ]}
        />
      </FilterBar>

      {/* ── جدول البيانات الشامل بالأعمدة الـ 6 ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable columns={columns} data={filteredData} loading={loading} />
      </div>
    </div>
  );
}
