"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import FilterBar from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import {
  Truck,
  Wrench,
  Droplets,
  CircleDot,
  Fuel,
  ClipboardCheck,
  Layers,
  DollarSign,
  ChevronDown,
  CheckSquare,
  Square,
  ExternalLink
} from "lucide-react";

interface FleetRecord {
  id: string | number;
  rawId: number | string;
  sapNumber: string;
  plateNumber: string;
  date: string;
  section: "صيانة" | "زيوت" | "كاوتش" | "وقود" | "فحص";
  sectionKey: "work-orders" | "oil" | "tires" | "fuel" | "inspection";
  title: string;
  description: string;
  cost: number;
  status?: string;
  routeUrl: string;
}

interface Vehicle {
  id: number;
  plateNumber: string;
  driverName?: string;
  model?: string;
}

// 1. بيانات القالب النموذجي
const sampleTemplateData = [
  {
    "رقم اوردر الساب": "SAP-9012",
    "رقم العربية": "ل ن ط 7618",
    "التاريخ": "2026-10-01",
    "القسم": "صيانة",
    "وصف العملية": "صيانة ميكانيكا وعفشة",
    "التكلفة": 2500
  },
  {
    "رقم اوردر الساب": "SAP-9013",
    "رقم العربية": "ل ن ط 7618",
    "التاريخ": "2026-10-02",
    "القسم": "وقود",
    "وصف العملية": "تفويل سولار 60 لتر",
    "التكلفة": 850
  },
  {
    "رقم اوردر الساب": "SAP-9014",
    "رقم العربية": "ل ن ط 7618",
    "التاريخ": "2026-10-03",
    "القسم": "زيوت",
    "وصف العملية": "غيار زيت وفلتر 10000 كم",
    "التكلفة": 1200
  }
];

const safeNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
};

export default function FleetDataPage() {
  const router = useRouter();
  const { user } = useApp();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allRecords, setAllRecords] = useState<FleetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedPlates, setSelectedPlates] = useState<string[]>([]);
  const [isVehicleMenuOpen, setIsVehicleMenuOpen] = useState(false);
  const vehicleMenuRef = useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = useState<
    "all" | "work-orders" | "oil" | "tires" | "fuel" | "inspection"
  >("all");

  const canWrite =
    user?.role === "owner" ||
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.permissions?.includes("fleet:write");

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (vehicleMenuRef.current && !vehicleMenuRef.current.contains(e.target as Node)) {
        setIsVehicleMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const loadFleetData = useCallback(async () => {
    setLoading(true);
    try {
      const [vehRes, woRes, oilRes, tireRes, fuelRes, inspRes] = await Promise.all([
        fetch("/api/vehicles").catch(() => null),
        fetch("/api/work-orders").catch(() => null),
        fetch("/api/oil-changes").catch(() => null),
        fetch("/api/tires").catch(() => null),
        fetch("/api/fuel").catch(() => null),
        fetch("/api/vehicle-inspections").catch(() => null)
      ]);

      const list: FleetRecord[] = [];

      if (vehRes && vehRes.ok) {
        const vd = await vehRes.json();
        setVehicles(Array.isArray(vd) ? vd : vd.data || []);
      }

      if (woRes && woRes.ok) {
        const wod = await woRes.json();
        const woList = Array.isArray(wod) ? wod : wod.data || [];
        woList
          .filter((w: any) => !w.is_deleted && w.status !== "deleted")
          .forEach((w: any) => {
            list.push({
              id: `wo-${w.id}`,
              rawId: w.id,
              sapNumber: w.sapNumber || w.sap_number || "-",
              plateNumber: w.plateNumber || w.plate_number || "",
              date: w.startDate || w.start_date || (w.createdAt ? w.createdAt.slice(0, 10) : "-"),
              section: "صيانة",
              sectionKey: "work-orders",
              title: w.maintenanceType || w.maintenance_type || "أمر صيانة",
              description: w.description || w.workshop || "صيانة مركبة",
              cost: safeNum(w.cost),
              status: w.status,
              routeUrl: `/dashboard/work-orders?search=${encodeURIComponent(w.plateNumber || "")}`
            });
          });
      }

      if (oilRes && oilRes.ok) {
        const oild = await oilRes.json();
        const oilList = Array.isArray(oild) ? oild : oild.data || [];
        oilList
          .filter((o: any) => !o.is_deleted)
          .forEach((o: any) => {
            list.push({
              id: `oil-${o.id}`,
              rawId: o.id,
              sapNumber: o.sapNumber || o.sap_number || "-",
              plateNumber: o.plateNumber || o.plate_number || "",
              date: o.changeDate || o.change_date || (o.createdAt ? o.createdAt.slice(0, 10) : "-"),
              section: "زيوت",
              sectionKey: "oil",
              title: o.oilType || o.oil_type || "غيار زيت",
              description: `${o.oilBrand || ""} - غيار عند ${safeNum(o.odometerAtChange)} كم`,
              cost: safeNum(o.cost),
              routeUrl: `/dashboard/oil-changes`
            });
          });
      }

      if (tireRes && tireRes.ok) {
        const tired = await tireRes.json();
        const tireList = Array.isArray(tired) ? tired : tired.data || [];
        tireList
          .filter((t: any) => !t.is_deleted)
          .forEach((t: any) => {
            list.push({
              id: `tire-${t.id}`,
              rawId: t.id,
              sapNumber: t.sapNumber || t.sap_number || "-",
              plateNumber: t.plateNumber || t.plate_number || "",
              date: t.installDate || t.install_date || (t.createdAt ? t.createdAt.slice(0, 10) : "-"),
              section: "كاوتش",
              sectionKey: "tires",
              title: `كاوتش ${t.brand || ""}`,
              description: `مقاس: ${t.size || ""} - عدد ${t.tireCount || 4} فرد كاوتش`,
              cost: safeNum(t.cost),
              routeUrl: `/dashboard/oil-changes`
            });
          });
      }

      if (fuelRes && fuelRes.ok) {
        const fueld = await fuelRes.json();
        const fuelList = Array.isArray(fueld) ? fueld : fueld.data || [];
        fuelList
          .filter((f: any) => !f.is_deleted)
          .forEach((f: any) => {
            list.push({
              id: `fuel-${f.id}`,
              rawId: f.id,
              sapNumber: f.sapNumber || f.sap_number || "-",
              plateNumber: f.plateNumber || f.plate_number || "",
              date: f.date || f.fillDate || (f.createdAt ? f.createdAt.slice(0, 10) : "-"),
              section: "وقود",
              sectionKey: "fuel",
              title: `تموين ${f.fuelType || "وقود"}`,
              description: `${safeNum(f.liters)} لتر - ${f.stationName || "محطة التموين"}`,
              cost: safeNum(f.cost || f.totalCost),
              routeUrl: `/dashboard/fuel`
            });
          });
      }

      if (inspRes && inspRes.ok) {
        const inspd = await inspRes.json();
        const inspList = Array.isArray(inspd) ? inspd : inspd.data || [];
        inspList
          .filter((i: any) => !i.is_deleted)
          .forEach((i: any) => {
            list.push({
              id: `insp-${i.id}`,
              rawId: i.id,
              sapNumber: "-",
              plateNumber: i.plateNumber || i.plate_number || "",
              date: i.inspectionDate || i.date || (i.createdAt ? i.createdAt.slice(0, 10) : "-"),
              section: "فحص",
              sectionKey: "inspection",
              title: `فحص دوري (${i.result || "معتمد"})`,
              description: i.notes || `فحص بواسطة: ${i.inspectorName || "مسؤول الفحص"}`,
              cost: safeNum(i.cost),
              routeUrl: `/dashboard/vehicle-inspection`
            });
          });
      }

      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllRecords(list);
    } catch (err) {
      console.error("Failed to load fleet data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFleetData();
  }, [loadFleetData]);

  const allPlates = useMemo(() => {
    return Array.from(
      new Set([...vehicles.map((v) => v.plateNumber), ...allRecords.map((r) => r.plateNumber)].filter(Boolean))
    );
  }, [vehicles, allRecords]);

  const togglePlate = (plate: string) => {
    setSelectedPlates((prev) =>
      prev.includes(plate) ? prev.filter((p) => p !== plate) : [...prev, plate]
    );
  };

  const filteredRecords = useMemo(() => {
    return allRecords.filter((row) => {
      const matchesSearch =
        (row.plateNumber || "").toLowerCase().includes(search.toLowerCase()) ||
        (row.sapNumber || "").toLowerCase().includes(search.toLowerCase()) ||
        (row.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (row.description || "").toLowerCase().includes(search.toLowerCase());

      const matchesVehicles =
        selectedPlates.length === 0 || selectedPlates.includes(row.plateNumber);

      const matchesSection =
        activeSection === "all" ||
        (activeSection === "work-orders" && row.sectionKey === "work-orders") ||
        (activeSection === "oil" && row.sectionKey === "oil") ||
        (activeSection === "tires" && row.sectionKey === "tires") ||
        (activeSection === "fuel" && row.sectionKey === "fuel") ||
        (activeSection === "inspection" && row.sectionKey === "inspection");

      return matchesSearch && matchesVehicles && matchesSection;
    });
  }, [allRecords, search, selectedPlates, activeSection]);

  const totalCost = filteredRecords.reduce((acc, r) => acc + safeNum(r.cost), 0);
  const maintenanceCount = filteredRecords.filter((r) => r.section === "صيانة").length;
  const fuelCount = filteredRecords.filter((r) => r.section === "وقود").length;
  const oilCount = filteredRecords.filter((r) => r.section === "زيوت").length;

  // 2. دالة استيراد وتحديث البيانات ومعالجة المعادلات الحسابية
  const handleImport = async (importedRows: any[]) => {
    if (!importedRows || importedRows.length === 0) return;

    try {
      let updatedCount = 0;
      let addedCount = 0;

      for (const row of importedRows) {
        const sap = String(row["رقم اوردر الساب"] || row["رقم الساب"] || "").trim();
        const plate = String(row["رقم العربية"] || row["رقم اللوحة"] || "").trim();
        const d = row["التاريخ"] || new Date().toISOString().slice(0, 10);
        const section = String(row["القسم"] || "").trim();
        const desc = String(row["وصف العملية"] || row["وصف الصيانه او العملية"] || "").trim();
        const costVal = safeNum(row["التكلفة"]);

        if (!plate) continue;

        const existingRecord = allRecords.find(
          (r) =>
            (sap && sap !== "-" && r.sapNumber === sap) ||
            (r.plateNumber === plate && r.date === d && r.description === desc)
        );

        if (
          section.includes("وقود") ||
          desc.includes("سولار") ||
          desc.includes("بنزين") ||
          desc.includes("تفويل")
        ) {
          const method = existingRecord && existingRecord.sectionKey === "fuel" ? "PUT" : "POST";
          const url = method === "PUT" ? `/api/fuel/${existingRecord.rawId}` : "/api/fuel";

          await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: existingRecord?.rawId,
              sapNumber: sap,
              plateNumber: plate,
              date: d,
              notes: desc,
              cost: costVal,
              fuelType: desc.includes("بنزين") ? "بنزين" : "سولار",
              liters: 0
            })
          });
          if (method === "PUT") updatedCount++; else addedCount++;
        } else if (
          section.includes("زيت") ||
          desc.includes("زيت") ||
          desc.includes("فلتر")
        ) {
          const method = existingRecord && existingRecord.sectionKey === "oil" ? "PUT" : "POST";
          const url = method === "PUT" ? `/api/oil-changes/${existingRecord.rawId}` : "/api/oil-changes";

          await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: existingRecord?.rawId,
              plateNumber: plate,
              oilType: desc || "غيار زيت",
              changeDate: d,
              cost: costVal,
              filterChanged: desc.includes("فلتر"),
              notes: `رقم SAP: ${sap}`
            })
          });
          if (method === "PUT") updatedCount++; else addedCount++;
        } else if (
          section.includes("كاوتش") ||
          section.includes("إطار") ||
          desc.includes("كاوتش") ||
          desc.includes("إطار")
        ) {
          const method = existingRecord && existingRecord.sectionKey === "tires" ? "PUT" : "POST";
          const url = method === "PUT" ? `/api/tires/${existingRecord.rawId}` : "/api/tires";

          await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: existingRecord?.rawId,
              plateNumber: plate,
              brand: desc || "إطارات جديدة",
              size: "-",
              cost: costVal,
              installDate: d,
              notes: `رقم SAP: ${sap}`
            })
          });
          if (method === "PUT") updatedCount++; else addedCount++;
        } else {
          const method = existingRecord && existingRecord.sectionKey === "work-orders" ? "PUT" : "POST";
          const url = method === "PUT" ? `/api/work-orders/${existingRecord.rawId}` : "/api/work-orders";

          await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: existingRecord?.rawId,
              sapNumber: sap,
              plateNumber: plate,
              startDate: d,
              maintenanceType: desc.length < 30 ? desc : "صيانة ميكانيكا",
              description: desc,
              cost: costVal,
              status: "completed",
              operationType: "صيانة دورية"
            })
          });
          if (method === "PUT") updatedCount++; else addedCount++;
        }
      }

      alert(`تمت مزامنة الشيت بنجاح:\n- تم تحديث: ${updatedCount} معاملة\n- تم تسجيل: ${addedCount} معاملة جديدة`);
      loadFleetData();
    } catch (err) {
      console.error("Sync error:", err);
      alert("حدث خطأ أثناء مزامنة بيانات الشيت.");
    }
  };

  // 3. شيت الملخص المحسوب شاملاً المعادلات والإجماليات
  const excelSummaryData = [
    ...filteredRecords.map((row) => ({
      "رقم اوردر الساب": row.sapNumber,
      "رقم العربية": row.plateNumber,
      "التاريخ": row.date,
      "القسم": row.section,
      "وصف العملية": `${row.title} - ${row.description}`,
      "التكلفة (ج.م)": safeNum(row.cost)
    })),
    // سطر الإجمالي المحسوب في نهاية الشيت
    {
      "رقم اوردر الساب": "المجموع الكلي",
      "رقم العربية": `إجمالي العمليات: ${filteredRecords.length}`,
      "التاريخ": `صيانة: ${maintenanceCount}`,
      "القسم": `وقود: ${fuelCount} | زيوت: ${oilCount}`,
      "وصف العملية": "إجمالي مبالغ المعاملات المنفذة",
      "التكلفة (ج.م)": totalCost
    }
  ];

  const columns = [
    {
      key: "sapNumber",
      header: "رقم اوردر الساب",
      render: (r: FleetRecord) =>
        r.sapNumber && r.sapNumber !== "-" ? (
          <span className="font-mono text-xs font-black text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
            {r.sapNumber}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
    },
    {
      key: "plateNumber",
      header: "رقم العربية",
      render: (r: FleetRecord) => (
        <span className="font-black text-gray-900 dark:text-white">{r.plateNumber}</span>
      )
    },
    {
      key: "date",
      header: "التاريخ",
      render: (r: FleetRecord) => (
        <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
          {r.date ? new Date(r.date).toLocaleDateString("en-GB") : "-"}
        </span>
      )
    },
    {
      key: "section",
      header: "القسم / المعاملة",
      render: (r: FleetRecord) => {
        let badgeColor = "bg-gray-100 text-gray-700";
        if (r.section === "صيانة") badgeColor = "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300";
        if (r.section === "زيوت") badgeColor = "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300";
        if (r.section === "كاوتش") badgeColor = "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
        if (r.section === "وقود") badgeColor = "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
        if (r.section === "فحص") badgeColor = "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300";

        return (
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${badgeColor}`}>
            {r.section}
          </span>
        );
      }
    },
    {
      key: "details",
      header: "وصف العملية والتفاصيل",
      render: (r: FleetRecord) => (
        <div>
          <div className="font-bold text-gray-900 dark:text-white text-xs">{r.title}</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{r.description}</div>
        </div>
      )
    },
    {
      key: "cost",
      header: "التكلفة",
      render: (r: FleetRecord) => (
        <span className="font-black text-emerald-600 dark:text-emerald-400">
          {safeNum(r.cost).toLocaleString()} ج.م
        </span>
      )
    },
    {
      key: "action",
      header: "عرض",
      render: (r: FleetRecord) => (
        <button
          onClick={() => router.push(r.routeUrl)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-teal-700 hover:text-white bg-teal-50 hover:bg-teal-600 dark:bg-teal-950/50 dark:text-teal-300 dark:hover:bg-teal-600 rounded-lg transition-colors cursor-pointer"
        >
          <span>عرض</span>
          <ExternalLink size={12} />
        </button>
      )
    }
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* ── 1. البطاقات الإحصائية ── */}
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

      {/* ── 2. الهيدر: 3 أزرار إكسيل رئيسية فقط ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">داتا الأسطول الشاملة</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              عرض {filteredRecords.length} عملية مسجلة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* 1. زر تحميل القالب */}
          <ExportExcelButton
            data={sampleTemplateData}
            fileName="قالب_داتا_الأسطول"
            buttonText="تحميل قالب"
          />

          {/* 2. زر استيراد وتحديث البيانات */}
          {canWrite && (
            <ImportExcelButton
              onImport={handleImport}
              buttonText="استيراد وتحديث"
            />
          )}

          {/* 3. زر تحميل شيت ملخص بالمعادلات */}
          <ExportExcelButton
            data={excelSummaryData}
            fileName="ملخص_معاملات_الأسطول"
            buttonText="تحميل شيت ملخص"
          />
        </div>
      </div>

      {/* ── 3. شريط الفلاتر ── */}
      <FilterBar>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">بحث:</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالساب، اللوحة، الوصف..."
            className="border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs dark:bg-gray-800 dark:text-white outline-none w-52 focus:border-teal-500"
          />
        </div>

        <div className="relative flex items-center gap-2" ref={vehicleMenuRef}>
          <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            السيارة:
          </label>
          <button
            type="button"
            onClick={() => setIsVehicleMenuOpen(!isVehicleMenuOpen)}
            className="border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 dark:text-white outline-none flex items-center justify-between gap-2 min-w-[130px] hover:border-teal-500 transition-colors cursor-pointer"
          >
            <span className="truncate">
              {selectedPlates.length === 0
                ? "الكل"
                : selectedPlates.length === 1
                ? selectedPlates[0]
                : `${selectedPlates.length} سيارات محددة`}
            </span>
            <ChevronDown size={12} className="text-gray-400 shrink-0" />
          </button>

          {isVehicleMenuOpen && (
            <div className="absolute z-50 top-full mt-1.5 right-0 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-2.5 space-y-2">
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
      </FilterBar>

      {/* ── 4. بار السكاشن ── */}
      <div className="flex gap-2 p-1.5 bg-white dark:bg-gray-900 rounded-xl w-fit border border-gray-200 dark:border-gray-800 shadow-sm overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveSection("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSection === "all"
              ? "bg-teal-600 text-white shadow-md"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Layers size={14} />
          <span>سجل مجمع شامل ({allRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveSection("work-orders")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSection === "work-orders"
              ? "bg-purple-700 text-white shadow-md"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Wrench size={14} />
          <span>أوامر الصيانة ({allRecords.filter((r) => r.sectionKey === "work-orders").length})</span>
        </button>

        <button
          onClick={() => setActiveSection("oil")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSection === "oil"
              ? "bg-teal-700 text-white shadow-md"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Droplets size={14} />
          <span>الزيوت والفلاتر ({allRecords.filter((r) => r.sectionKey === "oil").length})</span>
        </button>

        <button
          onClick={() => setActiveSection("tires")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSection === "tires"
              ? "bg-slate-800 text-white shadow-md"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <CircleDot size={14} />
          <span>الكاوتش والإطارات ({allRecords.filter((r) => r.sectionKey === "tires").length})</span>
        </button>

        <button
          onClick={() => setActiveSection("fuel")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSection === "fuel"
              ? "bg-amber-600 text-white shadow-md"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Fuel size={14} />
          <span>سجلات الوقود ({allRecords.filter((r) => r.sectionKey === "fuel").length})</span>
        </button>

        <button
          onClick={() => setActiveSection("inspection")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSection === "inspection"
              ? "bg-blue-700 text-white shadow-md"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <ClipboardCheck size={14} />
          <span>فحص السيارات ({allRecords.filter((r) => r.sectionKey === "inspection").length})</span>
        </button>
      </div>

      {/* ── 5. جدول البيانات ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredRecords}
          loading={loading}
          onRowClick={(row: FleetRecord) => router.push(row.routeUrl)}
        />
      </div>
    </div>
  );
}
