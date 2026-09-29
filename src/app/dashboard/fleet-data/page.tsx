"use client";
import React, { useEffect, useState, useCallback } from "react";
import { 
  Database, Search, Car, Wrench, Droplet, SearchCheck, Fuel, Loader2, Calendar 
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
  const [inspections, setInspections] = useState<any[]>([]);
  const [fuelRecords, setFuelRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"wo" | "oil" | "inspect" | "fuel">("wo");

  // جلب قائمة السيارات للدروب داون
  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
  }, []);

  // دالة البحث والسحب المركزي بمجرد اختيار سيارة
  const fetchVehicleProfile = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const v = vehicles.find(x => String(x.id) === id);
      setVehicleData(v || null);

      // جلب موازي لكل الداتا المرتبطة بهذه السيارة
      const [woRes, oilRes, insRes, fuelRes] = await Promise.all([
        fetch(`/api/work-orders?vehicleId=${id}`).catch(() => null),
        fetch(`/api/oil-changes?vehicleId=${id}`).catch(() => null),
        fetch(`/api/vehicle-inspections?vehicleId=${id}`).then(r => r.ok ? r : fetch(`/api/vehicle-parts?vehicleId=${id}`)).catch(() => null),
        fetch(`/api/fuel?vehicleId=${id}`).catch(() => null), // 👈 ملاحظة: إذا كان الـ API لا يدعم الفلترة بـ ID، سيتم فلترتها في الفرونت
      ]);

      const [woData, oilData, insData, fuelData] = await Promise.all([
        woRes?.json().catch(() => []),
        oilRes?.json().catch(() => []),
        insRes?.json().catch(() => []),
        fuelRes?.json().catch(() => []),
      ]);

      setWorkOrders(Array.isArray(woData) ? woData : []);
      setOilChanges(Array.isArray(oilData) ? oilData : []);
      setInspections(Array.isArray(insData) ? insData : []);
      
      // إذا كان API الوقود لا يفلتر بالـ ID، نفلتره هنا يدوياً كأمان
      const rawFuel = Array.isArray(fuelData) ? fuelData : [];
      setFuelRecords(rawFuel.filter(f => String(f.vehicleId || f.vehicle_id) === id));

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [vehicles]);

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedVehicleId(val);
    if (val) fetchVehicleProfile(val);
  };

  // ── تجهيز الإكسيل الشامل ──
  const getExcelData = () => {
    switch (activeTab) {
      case "wo": return workOrders.map(r => ({"رقم الأمر": r.orderNumber, "الصيانة": r.maintenanceType, "الحالة": r.status === "completed"?"مكتمل":"معلق", "التكلفة": safeNum(r.cost), "التاريخ": formatDate(r.startDate)}));
      case "oil": return oilChanges.map(r => ({"التاريخ": formatDate(r.changeDate), "العداد": safeNum(r.kmAtChange), "الزيت": r.oilType, "التكلفة": safeNum(r.cost)}));
      case "inspect": return inspections.map(r => ({"التاريخ": formatDate(r.inspectionDate || r.inspection_date), "العداد": safeNum(r.odometer || r.kmAtInstall), "الفاحص": r.inspectorName || r.inspector_name}));
      case "fuel": return fuelRecords.map(r => ({"التاريخ": formatDate(r.fuelDate || r.fuel_date), "اللترات": safeNum(r.liters), "التكلفة": safeNum(r.totalCost)}));
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
            <p className="text-sm text-gray-500 mt-0.5">البحث المتقدم وعرض السجل الكامل لكل سيارة</p>
          </div>
        </div>
      </div>

      {/* ── محرك البحث واختيار السيارة ── */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full max-w-md relative">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">ابحث واختر السيارة لاستعراض ملفها الكامل:</label>
          <div className="relative">
            <Search size={16} className="absolute start-3 top-2.5 text-gray-400" />
            <select 
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl py-2 ps-9 pe-3 text-sm font-bold bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500"
              value={selectedVehicleId}
              onChange={handleVehicleChange}
            >
              <option value="">-- اختر سيارة من الأسطول --</option>
              {vehicles.map(v => <option key={v.id} value={String(v.id)}>{v.plateNumber} | {v.brand} {v.model}</option>)}
            </select>
          </div>
        </div>

        {vehicleData && (
          <div className="flex-1 w-full bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 flex flex-wrap gap-6 items-center">
            <div><p className="text-xs text-blue-600 dark:text-blue-400 font-bold">العداد الحالي</p><p className="font-black text-blue-900 dark:text-white text-lg">{safeNum(vehicleData.currentKm).toLocaleString()} كم</p></div>
            <div><p className="text-xs text-blue-600 dark:text-blue-400 font-bold">المحافظة / الإدارة</p><p className="font-bold text-blue-900 dark:text-white">{vehicleData.governorate} - {vehicleData.department}</p></div>
            <div><p className="text-xs text-blue-600 dark:text-blue-400 font-bold">انتهاء الترخيص</p><p className="font-bold text-blue-900 dark:text-white">{formatDate(vehicleData.licenseExpiry)}</p></div>
            <div><p className="text-xs text-blue-600 dark:text-blue-400 font-bold">الحالة</p><StatusBadge status={vehicleData.status} /></div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 flex flex-col justify-center items-center gap-3 text-blue-800"><Loader2 className="animate-spin" size={32}/> <span>جاري تجميع الملف الشامل...</span></div>
      ) : selectedVehicleId && vehicleData ? (
        <div className="space-y-4 fade-in">
          
          {/* التبويبات للتنقل داخل السجل */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-white dark:bg-gray-900 rounded-2xl w-full sm:w-fit border border-gray-200 dark:border-gray-800 shadow-sm">
            <button onClick={() => setActiveTab("wo")} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "wo" ? "bg-blue-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><Wrench size={16} /> أوامر الشغل ({workOrders.length})</button>
            <button onClick={() => setActiveTab("oil")} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "oil" ? "bg-orange-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><Droplet size={16} /> تغيير الزيوت ({oilChanges.length})</button>
            <button onClick={() => setActiveTab("inspect")} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "inspect" ? "bg-emerald-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><SearchCheck size={16} /> الفحص ({inspections.length})</button>
            <button onClick={() => setActiveTab("fuel")} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "fuel" ? "bg-purple-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><Fuel size={16} /> الوقود ({fuelRecords.length})</button>
          </div>

          <div className="flex justify-end">
            <ExportExcelButton data={getExcelData()} fileName={`سجل_${vehicleData.plateNumber}_${activeTab}`} />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border overflow-hidden">
            {activeTab === "wo" && (
              <DataTable columns={[
                { key: "orderNumber", header: "رقم الأمر", render: (r:any) => <span className="font-bold text-blue-900">{r.orderNumber}</span> },
                { key: "maintenanceType", header: "الصيانة" },
                { key: "status", header: "الحالة", render: (r:any) => <StatusBadge status={r.status} /> },
                { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.cost)} ج.م</span> },
                { key: "startDate", header: "تاريخ البدء", render: (r:any) => formatDate(r.startDate) },
              ]} data={workOrders} loading={false} />
            )}

            {activeTab === "oil" && (
              <DataTable columns={[
                { key: "changeDate", header: "التاريخ", render: (r:any) => formatDate(r.changeDate) },
                { key: "kmAtChange", header: "العداد", render: (r:any) => `${safeNum(r.kmAtChange)} كم` },
                { key: "oilType", header: "الزيت" },
                { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.cost)} ج.م</span> },
              ]} data={oilChanges} loading={false} />
            )}

            {activeTab === "inspect" && (
              <DataTable columns={[
                { key: "inspectionDate", header: "التاريخ", render: (r:any) => formatDate(r.inspectionDate || r.inspection_date) },
                { key: "odometer", header: "العداد", render: (r:any) => `${safeNum(r.odometer || r.kmAtInstall)} كم` },
                { key: "inspectorName", header: "الفاحص", render: (r:any) => r.inspectorName || r.inspector_name },
              ]} data={inspections} loading={false} />
            )}

            {activeTab === "fuel" && (
              <DataTable columns={[
                { key: "fuelDate", header: "التاريخ", render: (r:any) => formatDate(r.fuelDate || r.fuel_date) },
                { key: "liters", header: "اللترات", render: (r:any) => `${safeNum(r.liters)} L` },
                { key: "totalCost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.totalCost)} ج.م</span> },
              ]} data={fuelRecords} loading={false} />
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <Car size={48} className="mb-3 opacity-50" />
          <p className="font-bold">اختر سيارة من الأعلى لعرض ملفها الشامل هنا.</p>
        </div>
      )}
    </div>
  );
}
