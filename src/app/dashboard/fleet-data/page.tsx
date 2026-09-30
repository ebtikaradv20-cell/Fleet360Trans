"use client";
import React, { useEffect, useState, useCallback } from "react";
import { 
  Database, Search, Car, Wrench, Droplet, SearchCheck, Fuel, Loader2, Disc, MapPin, Calendar, Clock, Plus 
} from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";

const safeNum = (val: any) => { const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

// ── قالب الإكسيل السحري الشامل للمركز الرئيسي ──
const MASTER_TEMPLATE_COLUMNS = [
  "رقم اللوحة", 
  "نوع السجل",       // (وقود، صيانة، زيت، كاوتش، فحص، سيارة جديدة)
  "التاريخ", 
  "قراءة العداد", 
  "التكلفة", 
  "الجهة (محطة/ورشة)", 
  "الفني أو السائق", 
  "تفاصيل إضافية (نوع الزيت/الصيانة)", 
  "ملاحظات"
];

export default function FleetDataPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState<string>("الكل");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [vehicleData, setVehicleData] = useState<any>(null);
  
  // داتا الأقسام
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [oilChanges, setOilChanges] = useState<any[]>([]);
  const [tires, setTires] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [fuelRecords, setFuelRecords] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"wo" | "oil" | "tire" | "inspect" | "fuel">("wo");

  // جلب قائمة السيارات
  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
  }, []);

  // ⚡ المحرك الرئيسي لجلب البيانات الشاملة ⚡
  const fetchMasterData = useCallback(async () => {
    setLoading(true);
    try {
      if (vehicleFilter && vehicleFilter !== "الكل") {
        setVehicleData(vehicles.find(x => String(x.id) === vehicleFilter) || null);
      } else {
        setVehicleData(null);
      }

      const params = new URLSearchParams();
      if (vehicleFilter && vehicleFilter !== "الكل") params.set("vehicleId", vehicleFilter);

      const [woRes, oilRes, tireRes, insRes, fuelRes] = await Promise.all([
        fetch(`/api/work-orders?${params}`).catch(() => null),
        fetch(`/api/oil-changes?${params}`).catch(() => null),
        fetch(`/api/tires?${params}`).catch(() => null),
        fetch(`/api/vehicle-inspections?${params}`).then(r => r.ok ? r : fetch(`/api/vehicle-parts?${params}`)).catch(() => null),
        fetch(`/api/fuel`).catch(() => null), // الوقود لا يدعم فلتر ID من السيرفر، فنفلتره يدوياً
      ]);

      const [woData, oilData, tireData, insData, fuelData] = await Promise.all([
        woRes?.json().catch(() => []), oilRes?.json().catch(() => []),
        tireRes?.json().catch(() => []), insRes?.json().catch(() => []), fuelRes?.json().catch(() => []),
      ]);

      let finalFuel = Array.isArray(fuelData) ? fuelData : [];
      if (vehicleFilter && vehicleFilter !== "الكل") {
        finalFuel = finalFuel.filter(f => String(f.vehicleId || f.vehicle_id) === vehicleFilter);
      }

      // فلترة التواريخ محلياً للسرعة القصوى
      const filterByDate = (arr: any[], dateField: string) => arr.filter(item => {
        if (!dateFrom && !dateTo) return true;
        const itemDate = new Date(item[dateField]).getTime();
        const start = dateFrom ? new Date(dateFrom).getTime() : 0;
        const end = dateTo ? new Date(dateTo).getTime() + 86399999 : Infinity;
        return itemDate >= start && itemDate <= end;
      });

      setWorkOrders(filterByDate(Array.isArray(woData) ? woData : [], "startDate"));
      setOilChanges(filterByDate(Array.isArray(oilData) ? oilData : [], "changeDate"));
      setTires(filterByDate(Array.isArray(tireData) ? tireData : [], "installDate"));
      setInspections(filterByDate(Array.isArray(insData) ? insData : [], "inspectionDate"));
      setFuelRecords(filterByDate(finalFuel, "fuelDate"));

    } catch (e) {
      console.error("Master Sync Error:", e);
    } finally {
      setLoading(false);
    }
  }, [vehicles, vehicleFilter, dateFrom, dateTo]);

  useEffect(() => { fetchMasterData(); }, [fetchMasterData]);

  // ── 🧠 الموزع الذكي لاستيراد الإكسيل وتوزيعه على كل القوائم (The Master Importer) ──
  const mapMasterRow = (row: Record<string, any>) => {
    const plate = row["رقم اللوحة"] || "";
    const type = row["نوع السجل"] || "";
    if (!String(plate).trim() || !String(type).trim()) return null;

    let vId = vehicles.find(v => v.plateNumber === plate)?.id || null;

    const dateVal = row["التاريخ"] ? new Date(row["التاريخ"]) : null;
    const isoDate = dateVal && !isNaN(dateVal.getTime()) ? dateVal.toISOString().slice(0, 10) : null;

    return {
      plateNumber: plate, vehicleId: vId, recordType: type,
      date: isoDate, odometer: safeNum(row["قراءة العداد"]),
      cost: safeNum(row["التكلفة"]), location: row["الجهة (محطة/ورشة)"] || "",
      person: row["الفني أو السائق"] || "", details: row["تفاصيل إضافية (نوع الزيت/الصيانة)"] || "",
      notes: row["ملاحظات"] || ""
    };
  };

  const handleMasterImport = async (rows: any[]) => {
    let ok = 0; let failed = 0;
    
    for (const p of rows) {
      try {
        let endpoint = "";
        let payload = {};

        if (p.recordType === "وقود") {
          endpoint = "/api/fuel";
          payload = { plateNumber: p.plateNumber, vehicleId: p.vehicleId, fuelDate: p.date, odometer: p.odometer, totalCost: p.cost, station: p.location, driverName: p.person, liters: 0, costPerLiter: 0, notes: p.notes };
        } 
        else if (p.recordType === "صيانة") {
          endpoint = "/api/work-orders";
          payload = { plateNumber: p.plateNumber, vehicleId: p.vehicleId, startDate: p.date, cost: p.cost, workshop: p.location, technicianName: p.person, maintenanceType: p.details || "صيانة ميكانيكا", status: "completed", description: p.notes };
        }
        else if (p.recordType === "زيت") {
          endpoint = "/api/oil-changes";
          payload = { plateNumber: p.plateNumber, vehicleId: p.vehicleId, changeDate: p.date, kmAtChange: p.odometer, cost: p.cost, oilType: p.details || "5W30", technician: p.person, nextChangeKm: p.odometer + 5000, notes: p.notes };
        }
        else if (p.recordType === "كاوتش") {
          endpoint = "/api/tires";
          payload = { plateNumber: p.plateNumber, vehicleId: p.vehicleId, installDate: p.date, kmAtInstall: p.odometer, cost: p.cost, tireSize: p.details, notes: p.notes };
        }
        else if (p.recordType === "سيارة") {
          endpoint = "/api/vehicles";
          payload = { plate_number: p.plateNumber, current_km: p.odometer, driver_name: p.person, department: p.location, brand: p.details, status: "active", notes: p.notes };
        }
        else {
          failed++; continue;
        }

        const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) ok++; else failed++;
      } catch { failed++; }
    }
    
    await fetchMasterData(); // تحديث الداتا بعد الإدخال
    return { ok, failed };
  };

  // تجهيز إكسيل التصدير
  const getExportData = () => {
    switch (activeTab) {
      case "wo": return workOrders.map(r => ({"اللوحة": r.plateNumber, "رقم الأمر": r.orderNumber, "الصيانة": r.maintenanceType, "التكلفة": safeNum(r.cost), "التاريخ": formatDate(r.startDate)}));
      case "oil": return oilChanges.map(r => ({"اللوحة": r.plateNumber, "التاريخ": formatDate(r.changeDate), "العداد": safeNum(r.kmAtChange), "الزيت": r.oilType, "التكلفة": safeNum(r.cost)}));
      case "tire": return tires.map(r => ({"اللوحة": r.plateNumber, "المقاس": r.tireSize || r.tire_size, "التركيب": formatDate(r.installDate || r.install_date), "التكلفة": safeNum(r.cost)}));
      case "inspect": return inspections.map(r => ({"اللوحة": r.plateNumber, "التاريخ": formatDate(r.inspectionDate || r.inspection_date), "العداد": safeNum(r.odometer || r.kmAtInstall), "الفاحص": r.inspectorName || r.inspector_name}));
      case "fuel": return fuelRecords.map(r => ({"اللوحة": r.plateNumber, "التاريخ": formatDate(r.fuelDate || r.fuel_date), "اللترات": safeNum(r.liters), "التكلفة": safeNum(r.totalCost)}));
    }
    return [];
  };

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      {/* ── رأس الصفحة ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-900 text-white rounded-xl shadow-md"><Database size={26} /></div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">داتا الأسطول الشاملة (المركز الرئيسي)</h1>
            <p className="text-sm text-gray-500 mt-0.5">لوحة التحكم المركزية لاستيراد وعرض وتحليل سجلات الأسطول</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* ✅ الزر السحري للإكسيل المجمع */}
          <ImportExcelButton 
            templateColumns={MASTER_TEMPLATE_COLUMNS} 
            templateFileName="السجل_الشامل_المجمع" 
            sampleRow={{ "رقم اللوحة": "ل ج أ 1234", "نوع السجل": "وقود", "التاريخ": "2025-10-15", "قراءة العداد": 55000, "التكلفة": 800, "الجهة (محطة/ورشة)": "طاقة عربية", "الفني أو السائق": "محمد علي", "تفاصيل إضافية (نوع الزيت/الصيانة)": "بنزين 92", "ملاحظات": "تفويلة كاملة" }} 
            mapRow={mapMasterRow} 
            onImport={handleMasterImport} 
            buttonText="استيراد داتا مجمعة (Master Excel)" 
          />
        </div>
      </div>

      {/* ── الفلاتر الشاملة (تاريخ + سيارة) ── */}
      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">تصفية السجلات لسيارة:</label>
          <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)} className="w-64 border dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-bold bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="الكل">جميع سيارات الأسطول</option>
            {vehicles.map(v => <option key={v.id} value={String(v.id)}>{v.plateNumber} | {v.brand} {v.model}</option>)}
          </select>
        </div>
      </FilterBar>

      {/* بطاقة تعريف السيارة الذكية (تظهر فقط عند اختيار سيارة) */}
      {vehicleFilter !== "الكل" && vehicleData && (
        <div className="w-full bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 p-5 rounded-2xl border border-blue-200 dark:border-gray-700 flex flex-wrap gap-x-12 gap-y-4 items-center shadow-sm fade-in">
          <div><p className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1"><Clock size={14} className="inline mr-1"/> العداد الحالي</p><p className="font-black text-blue-900 dark:text-white text-2xl">{safeNum(vehicleData.currentKm || vehicleData.current_km).toLocaleString()} <span className="text-sm">كم</span></p></div>
          <div><p className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1"><MapPin size={14} className="inline mr-1"/> الإدارة</p><p className="font-bold text-gray-800 dark:text-gray-200 text-lg">{vehicleData.department || "غير محدد"}</p></div>
          <div><p className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1"><Calendar size={14} className="inline mr-1"/> الترخيص</p><p className="font-bold text-gray-800 dark:text-gray-200 text-lg">{formatDate(vehicleData.licenseExpiry || vehicleData.license_expiry)}</p></div>
          <div><p className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1"><Car size={14} className="inline mr-1"/> الحالة</p><StatusBadge status={vehicleData.status} /></div>
        </div>
      )}

      {loading ? (
        <div className="p-12 flex flex-col justify-center items-center gap-4 text-blue-800 dark:text-blue-400 font-bold"><Loader2 className="animate-spin" size={32}/> <span>جاري تجميع البيانات الشاملة...</span></div>
      ) : (
        <div className="space-y-4 fade-in">
          
          {/* التبويبات للتنقل داخل السجل */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 p-1.5 bg-white dark:bg-gray-900 rounded-xl w-full xl:w-fit border border-gray-200 dark:border-gray-800 shadow-sm">
              <button onClick={() => setActiveTab("wo")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "wo" ? "bg-blue-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><Wrench size={16} /> الصيانات ({workOrders.length})</button>
              <button onClick={() => setActiveTab("oil")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "oil" ? "bg-amber-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><Droplet size={16} /> الزيوت ({oilChanges.length})</button>
              <button onClick={() => setActiveTab("tire")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "tire" ? "bg-slate-700 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><Disc size={16} /> الكاوتش ({tires.length})</button>
              <button onClick={() => setActiveTab("inspect")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "inspect" ? "bg-emerald-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><SearchCheck size={16} /> الفحص ({inspections.length})</button>
              <button onClick={() => setActiveTab("fuel")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "fuel" ? "bg-purple-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><Fuel size={16} /> الوقود ({fuelRecords.length})</button>
            </div>

            <ExportExcelButton data={getExportData()} fileName={`سجل_البيانات_${activeTab}`} dateColumnName="التاريخ" />
          </div>

          {/* الجداول الديناميكية */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border overflow-hidden">
            {activeTab === "wo" && (
              <DataTable columns={[
                { key: "plateNumber", header: "اللوحة", render: (r:any) => <span className="font-bold">{r.plateNumber}</span> },
                { key: "orderNumber", header: "رقم الأمر", render: (r:any) => <span className="font-bold text-blue-900">{r.orderNumber}</span> },
                { key: "maintenanceType", header: "الصيانة", render: (r:any) => <span className="font-bold">{r.maintenanceType}</span> },
                { key: "status", header: "الحالة", render: (r:any) => <StatusBadge status={r.status} /> },
                { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.cost).toLocaleString()} ج.م</span> },
                { key: "startDate", header: "التاريخ", render: (r:any) => formatDate(r.startDate) },
              ]} data={workOrders} loading={false} />
            )}

            {activeTab === "oil" && (
              <DataTable columns={[
                { key: "plateNumber", header: "اللوحة", render: (r:any) => <span className="font-bold">{r.plateNumber}</span> },
                { key: "changeDate", header: "التاريخ", render: (r:any) => formatDate(r.changeDate) },
                { key: "kmAtChange", header: "العداد وقتها", render: (r:any) => <span className="font-bold">{safeNum(r.kmAtChange).toLocaleString()} كم</span> },
                { key: "oilType", header: "الزيت", render: (r:any) => <span className="font-bold text-amber-700">{r.oilType}</span> },
                { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.cost).toLocaleString()} ج.م</span> },
              ]} data={oilChanges} loading={false} />
            )}

            {activeTab === "tire" && (
              <DataTable columns={[
                { key: "plateNumber", header: "اللوحة", render: (r:any) => <span className="font-bold">{r.plateNumber || r.plate_number}</span> },
                { key: "installDate", header: "التاريخ", render: (r:any) => formatDate(r.installDate || r.install_date) },
                { key: "kmAtInstall", header: "العداد وقتها", render: (r:any) => <span className="font-bold">{safeNum(r.kmAtInstall || r.km_at_install).toLocaleString()} كم</span> },
                { key: "tireSize", header: "المقاس", render: (r:any) => r.tireSize || r.tire_size },
                { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.cost).toLocaleString()} ج.م</span> },
              ]} data={tires} loading={false} />
            )}

            {activeTab === "inspect" && (
              <DataTable columns={[
                { key: "plateNumber", header: "اللوحة", render: (r:any) => <span className="font-bold">{r.plateNumber || r.plate_number}</span> },
                { key: "inspectionDate", header: "التاريخ", render: (r:any) => formatDate(r.inspectionDate || r.inspection_date) },
                { key: "odometer", header: "العداد", render: (r:any) => <span className="font-bold">{safeNum(r.odometer || r.kmAtInstall).toLocaleString()} كم</span> },
                { key: "inspectorName", header: "الفاحص", render: (r:any) => r.inspectorName || r.inspector_name },
              ]} data={inspections} loading={false} />
            )}

            {activeTab === "fuel" && (
              <DataTable columns={[
                { key: "plateNumber", header: "اللوحة", render: (r:any) => <span className="font-bold">{r.plateNumber}</span> },
                { key: "fuelDate", header: "التاريخ", render: (r:any) => formatDate(r.fuelDate || r.fuel_date) },
                { key: "liters", header: "اللترات", render: (r:any) => <span className="font-bold text-sky-600">{safeNum(r.liters).toLocaleString()} L</span> },
                { key: "totalCost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.totalCost).toLocaleString()} ج.م</span> },
              ]} data={fuelRecords} loading={false} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
