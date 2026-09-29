"use client";
import React, { useEffect, useState, useCallback } from "react";
import { 
  Database, Search, Car, Wrench, Droplet, SearchCheck, Fuel, Loader2, Disc, MapPin, Calendar, Clock
} from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import ExportExcelButton from "@/components/ExportExcelButton";

const safeNum = (val: any) => { const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

export default function FleetDataPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [vehicleData, setVehicleData] = useState<any>(null);
  
  // داتا الأقسام الخاصة بالسيارة المحددة
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [oilChanges, setOilChanges] = useState<any[]>([]);
  const [tires, setTires] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [fuelRecords, setFuelRecords] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"wo" | "oil" | "tire" | "inspect" | "fuel">("wo");

  // جلب قائمة السيارات للبحث
  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
  }, []);

  // ⚡ الدالة السحرية: جلب كل تاريخ السيارة بضغطة واحدة ⚡
  const fetchVehicleProfile = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const v = vehicles.find(x => String(x.id) === id);
      setVehicleData(v || null);

      // جلب متوازي (Parallel Fetching) لأقصى سرعة
      const [woRes, oilRes, tireRes, insRes, fuelRes] = await Promise.all([
        fetch(`/api/work-orders`).catch(() => null),
        fetch(`/api/oil-changes`).catch(() => null),
        fetch(`/api/tires`).catch(() => null),
        fetch(`/api/vehicle-inspections`).then(r => r.ok ? r : fetch(`/api/vehicle-parts`)).catch(() => null),
        fetch(`/api/fuel`).catch(() => null), 
      ]);

      const [woData, oilData, tireData, insData, fuelData] = await Promise.all([
        woRes?.json().catch(() => []),
        oilRes?.json().catch(() => []),
        tireRes?.json().catch(() => []),
        insRes?.json().catch(() => []),
        fuelRes?.json().catch(() => []),
      ]);

      // فلترة البيانات للسيارة المحددة فقط
      setWorkOrders((Array.isArray(woData) ? woData : []).filter(x => String(x.vehicleId || x.vehicle_id) === id));
      setOilChanges((Array.isArray(oilData) ? oilData : []).filter(x => String(x.vehicleId || x.vehicle_id) === id));
      setTires((Array.isArray(tireData) ? tireData : []).filter(x => String(x.vehicleId || x.vehicle_id) === id));
      setInspections((Array.isArray(insData) ? insData : []).filter(x => String(x.vehicleId || x.vehicle_id) === id));
      setFuelRecords((Array.isArray(fuelData) ? fuelData : []).filter(x => String(x.vehicleId || x.vehicle_id) === id));

    } catch (e) {
      console.error("Profile Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  }, [vehicles]);

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedVehicleId(val);
    if (val) fetchVehicleProfile(val);
  };

  // ── تجهيز الإكسيل الديناميكي بناءً على التبويب النشط ──
  const getExcelData = () => {
    switch (activeTab) {
      case "wo": return workOrders.map(r => ({"رقم الأمر": r.orderNumber, "الصيانة": r.maintenanceType, "الحالة": r.status === "completed"?"مكتمل":"معلق", "التكلفة (ج.م)": safeNum(r.cost), "تاريخ البدء": formatDate(r.startDate)}));
      case "oil": return oilChanges.map(r => ({"التاريخ": formatDate(r.changeDate), "العداد (كم)": safeNum(r.kmAtChange), "الزيت": r.oilType, "التكلفة (ج.م)": safeNum(r.cost)}));
      case "tire": return tires.map(r => ({"المقاس": r.tireSize || r.tire_size, "الماركة": r.tireBrand || r.tire_brand, "التركيب": formatDate(r.installDate || r.install_date), "التكلفة (ج.م)": safeNum(r.cost)}));
      case "inspect": return inspections.map(r => ({"تاريخ الفحص": formatDate(r.inspectionDate || r.inspection_date), "العداد (كم)": safeNum(r.odometer || r.kmAtInstall), "الفاحص": r.inspectorName || r.inspector_name}));
      case "fuel": return fuelRecords.map(r => ({"تاريخ التزود": formatDate(r.fuelDate || r.fuel_date), "اللترات": safeNum(r.liters), "التكلفة (ج.م)": safeNum(r.totalCost)}));
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
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">داتا الأسطول الشاملة</h1>
            <p className="text-sm text-gray-500 mt-0.5">البحث المتقدم وعرض السجل التاريخي الكامل لكل سيارة</p>
          </div>
        </div>
      </div>

      {/* ── محرك البحث واختيار السيارة ── */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col xl:flex-row items-center gap-6">
        
        <div className="w-full xl:w-1/3 relative">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">ابحث أو اختر سيارة لاستعراض ملفها:</label>
          <div className="relative">
            <Search size={18} className="absolute start-3 top-3 text-gray-400" />
            <select 
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl py-2.5 ps-10 pe-4 text-sm font-bold bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-inner"
              value={selectedVehicleId}
              onChange={handleVehicleChange}
            >
              <option value="">-- اضغط لاختيار سيارة --</option>
              {vehicles.map(v => <option key={v.id} value={String(v.id)}>{v.plateNumber || v.plate_number} | {v.brand} {v.model}</option>)}
            </select>
          </div>
        </div>

        {/* بطاقة تعريف السيارة الذكية */}
        {vehicleData && (
          <div className="flex-1 w-full bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 p-4 rounded-xl border border-blue-100 dark:border-gray-700 flex flex-wrap gap-x-8 gap-y-4 items-center shadow-sm">
            <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Clock size={12}/> العداد الحالي</p><p className="font-black text-blue-900 dark:text-blue-400 text-lg">{safeNum(vehicleData.currentKm || vehicleData.current_km).toLocaleString()} <span className="text-xs">كم</span></p></div>
            <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={12}/> المحافظة / الإدارة</p><p className="font-bold text-gray-800 dark:text-gray-200">{vehicleData.governorate} - {vehicleData.department}</p></div>
            <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={12}/> انتهاء الترخيص</p><p className="font-bold text-gray-800 dark:text-gray-200">{formatDate(vehicleData.licenseExpiry || vehicleData.license_expiry)}</p></div>
            <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Car size={12}/> الحالة</p><StatusBadge status={vehicleData.status} /></div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 flex flex-col justify-center items-center gap-4 text-blue-800 dark:text-blue-400 font-bold"><Loader2 className="animate-spin" size={32}/> <span>جاري تجميع الملف الشامل للسيارة...</span></div>
      ) : selectedVehicleId && vehicleData ? (
        <div className="space-y-6 fade-in">
          
          {/* ── التبويبات للتنقل داخل السجل ── */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-white dark:bg-gray-900 rounded-2xl w-full xl:w-fit border border-gray-200 dark:border-gray-800 shadow-sm">
            <button onClick={() => setActiveTab("wo")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "wo" ? "bg-blue-900 text-white shadow-md" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}><Wrench size={16} /> الصيانات ({workOrders.length})</button>
            <button onClick={() => setActiveTab("oil")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "oil" ? "bg-amber-600 text-white shadow-md" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}><Droplet size={16} /> الزيوت ({oilChanges.length})</button>
            <button onClick={() => setActiveTab("tire")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "tire" ? "bg-slate-700 text-white shadow-md" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}><Disc size={16} /> الكاوتش ({tires.length})</button>
            <button onClick={() => setActiveTab("inspect")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "inspect" ? "bg-emerald-600 text-white shadow-md" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}><SearchCheck size={16} /> الفحص ({inspections.length})</button>
            <button onClick={() => setActiveTab("fuel")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "fuel" ? "bg-purple-600 text-white shadow-md" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}><Fuel size={16} /> الوقود ({fuelRecords.length})</button>
          </div>

          <div className="flex justify-end">
            <ExportExcelButton data={getExcelData()} fileName={`سجل_${vehicleData.plateNumber || vehicleData.plate_number}_${activeTab}`} />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
            {activeTab === "wo" && (
              <DataTable columns={[
                { key: "orderNumber", header: "رقم الأمر", render: (r:any) => <span className="font-bold text-blue-900 dark:text-blue-400">{r.orderNumber}</span> },
                { key: "maintenanceType", header: "الصيانة", render: (r:any) => <span className="font-bold text-gray-800 dark:text-gray-200">{r.maintenanceType}</span> },
                { key: "status", header: "الحالة", render: (r:any) => <StatusBadge status={r.status} /> },
                { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{safeNum(r.cost).toLocaleString()} ج.م</span> },
                { key: "startDate", header: "التاريخ", render: (r:any) => formatDate(r.startDate) },
              ]} data={workOrders} loading={false} />
            )}

            {activeTab === "oil" && (
              <DataTable columns={[
                { key: "changeDate", header: "التاريخ", render: (r:any) => formatDate(r.changeDate) },
                { key: "kmAtChange", header: "العداد وقتها", render: (r:any) => <span className="font-bold">{safeNum(r.kmAtChange).toLocaleString()} كم</span> },
                { key: "oilType", header: "الزيت", render: (r:any) => r.oilType },
                { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{safeNum(r.cost).toLocaleString()} ج.م</span> },
              ]} data={oilChanges} loading={false} />
            )}

            {activeTab === "tire" && (
              <DataTable columns={[
                { key: "installDate", header: "التاريخ", render: (r:any) => formatDate(r.installDate || r.install_date) },
                { key: "kmAtInstall", header: "العداد وقتها", render: (r:any) => <span className="font-bold">{safeNum(r.kmAtInstall || r.km_at_install).toLocaleString()} كم</span> },
                { key: "tireSize", header: "المقاس", render: (r:any) => r.tireSize || r.tire_size },
                { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{safeNum(r.cost).toLocaleString()} ج.م</span> },
              ]} data={tires} loading={false} />
            )}

            {activeTab === "inspect" && (
              <DataTable columns={[
                { key: "inspectionDate", header: "التاريخ", render: (r:any) => formatDate(r.inspectionDate || r.inspection_date) },
                { key: "odometer", header: "العداد", render: (r:any) => <span className="font-bold">{safeNum(r.odometer || r.kmAtInstall).toLocaleString()} كم</span> },
                { key: "inspectorName", header: "الفاحص", render: (r:any) => r.inspectorName || r.inspector_name },
              ]} data={inspections} loading={false} />
            )}

            {activeTab === "fuel" && (
              <DataTable columns={[
                { key: "fuelDate", header: "التاريخ", render: (r:any) => formatDate(r.fuelDate || r.fuel_date) },
                { key: "liters", header: "اللترات", render: (r:any) => <span className="font-bold text-sky-600">{safeNum(r.liters).toLocaleString()} L</span> },
                { key: "totalCost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{safeNum(r.totalCost).toLocaleString()} ج.م</span> },
              ]} data={fuelRecords} loading={false} />
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <Car size={56} className="mb-4 opacity-50" />
          <p className="font-bold text-lg">اختر سيارة من القائمة بالأعلى لعرض ملفها الشامل هنا.</p>
        </div>
      )}
    </div>
  );
}
