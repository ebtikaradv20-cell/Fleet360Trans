"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Database, Search, Car, Wrench, Droplet, SearchCheck, Fuel, Loader2, Disc, MapPin, Calendar, Clock, User, Activity } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import ExportExcelButton from "@/components/ExportExcelButton";

const safeNum = (val: any) => { const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

export default function FleetDataPage() {
  const searchParams = useSearchParams();
  const incomingSearch = searchParams.get("search");

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [vehicleData, setVehicleData] = useState<any>(null);
  
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [oilChanges, setOilChanges] = useState<any[]>([]);
  const [tires, setTires] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [fuelRecords, setFuelRecords] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]); // ⚡ سجل الحركات

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"wo" | "oil" | "tire" | "inspect" | "fuel" | "history">("wo");

  // جلب قائمة السيارات
  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => {
      const data = Array.isArray(d) ? d : [];
      setVehicles(data);
      // ⚡ السحب الذكي: لو جاي من الرابط، اختار السيارة فوراً
      if (incomingSearch) {
        const v = data.find(x => x.plateNumber === incomingSearch || x.plate_number === incomingSearch);
        if (v) setSelectedVehicleId(String(v.id));
      }
    });
  }, [incomingSearch]);

  const fetchVehicleProfile = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const v = vehicles.find(x => String(x.id) === id);
      setVehicleData(v || null);

      const params = new URLSearchParams();
      params.set("vehicleId", id);

      const [woRes, oilRes, tireRes, insRes, fuelRes, logsRes] = await Promise.all([
        fetch(`/api/work-orders?${params}`).catch(() => null),
        fetch(`/api/oil-changes?${params}`).catch(() => null),
        fetch(`/api/tires?${params}`).catch(() => null),
        fetch(`/api/vehicle-inspections?${params}`).then(r => r.ok ? r : fetch(`/api/vehicle-parts?${params}`)).catch(() => null),
        fetch(`/api/fuel`).catch(() => null),
        fetch(`/api/history-logs?plateNumber=${encodeURIComponent(v?.plateNumber || v?.plate_number || "")}`).catch(() => null),
      ]);

      const [woData, oilData, tireData, insData, fuelData, logsData] = await Promise.all([
        woRes?.json().catch(() => []), oilRes?.json().catch(() => []), tireRes?.json().catch(() => []),
        insRes?.json().catch(() => []), fuelRes?.json().catch(() => []), logsRes?.json().catch(() => []),
      ]);

      setWorkOrders((Array.isArray(woData) ? woData : []).filter(x => String(x.vehicleId || x.vehicle_id) === id));
      setOilChanges((Array.isArray(oilData) ? oilData : []).filter(x => String(x.vehicleId || x.vehicle_id) === id));
      setTires((Array.isArray(tireData) ? tireData : []).filter(x => String(x.vehicleId || x.vehicle_id) === id));
      setInspections((Array.isArray(insData) ? insData : []).filter(x => String(x.vehicleId || x.vehicle_id) === id));
      setFuelRecords((Array.isArray(fuelData) ? fuelData : []).filter(x => String(x.vehicleId || x.vehicle_id) === id));
      setHistoryLogs(Array.isArray(logsData) ? logsData : []);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [vehicles]);

  // تحديث الداتا إذا تغير الـ ID
  useEffect(() => {
    if (selectedVehicleId) fetchVehicleProfile(selectedVehicleId);
  }, [selectedVehicleId, fetchVehicleProfile]);

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-900 text-white rounded-xl shadow-md"><Database size={26} /></div>
          <div><h1 className="text-2xl font-black text-gray-900 dark:text-white">داتا الأسطول الشاملة</h1><p className="text-sm text-gray-500 mt-0.5">البحث المتقدم وعرض السجل التاريخي الكامل لكل سيارة</p></div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col xl:flex-row items-center gap-6">
        <div className="w-full xl:w-1/3 relative">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">اختر سيارة لاستعراض ملفها:</label>
          <div className="relative">
            <Search size={18} className="absolute start-3 top-3 text-gray-400" />
            <select className="w-full border border-gray-300 dark:border-gray-700 rounded-xl py-2.5 ps-10 pe-4 text-sm font-bold bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-inner"
              value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)}>
              <option value="">-- اضغط لاختيار سيارة --</option>
              {vehicles.map(v => <option key={v.id} value={String(v.id)}>{v.plateNumber || v.plate_number} | {v.brand} {v.model}</option>)}
            </select>
          </div>
        </div>

        {vehicleData && (
          <div className="flex-1 w-full bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 p-4 rounded-xl border border-blue-100 dark:border-gray-700 flex flex-wrap gap-x-8 gap-y-4 items-center shadow-sm">
            <div><p className="text-[10px] text-gray-500 font-bold mb-1"><Clock size={12} className="inline"/> العداد الحالي</p><p className="font-black text-blue-900 dark:text-white text-lg">{safeNum(vehicleData.currentKm || vehicleData.current_km).toLocaleString()} كم</p></div>
            <div><p className="text-[10px] text-gray-500 font-bold mb-1"><MapPin size={12} className="inline"/> الإدارة</p><p className="font-bold text-gray-800 dark:text-gray-200">{vehicleData.department || "-"}</p></div>
            <div><p className="text-[10px] text-gray-500 font-bold mb-1"><Calendar size={12} className="inline"/> الترخيص</p><p className="font-bold text-gray-800 dark:text-gray-200">{formatDate(vehicleData.licenseExpiry || vehicleData.license_expiry)}</p></div>
            <div><p className="text-[10px] text-gray-500 font-bold mb-1"><Car size={12} className="inline"/> الحالة</p><StatusBadge status={vehicleData.status} /></div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 flex flex-col justify-center items-center gap-4 text-blue-800 dark:text-blue-400 font-bold"><Loader2 className="animate-spin" size={32}/> <span>جاري تجميع الملف الشامل...</span></div>
      ) : selectedVehicleId && vehicleData ? (
        <div className="space-y-6 fade-in">
          
          <div className="flex flex-wrap gap-2 p-1.5 bg-white dark:bg-gray-900 rounded-2xl w-full xl:w-fit border border-gray-200 dark:border-gray-800 shadow-sm">
            <button onClick={() => setActiveTab("history")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "history" ? "bg-slate-800 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><Activity size={16} /> سجل التدقيق الزمني (Audit Log)</button>
            <button onClick={() => setActiveTab("wo")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "wo" ? "bg-blue-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><Wrench size={16} /> الصيانات ({workOrders.length})</button>
            <button onClick={() => setActiveTab("oil")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "oil" ? "bg-amber-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><Droplet size={16} /> الزيوت ({oilChanges.length})</button>
            <button onClick={() => setActiveTab("tire")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "tire" ? "bg-slate-700 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><Disc size={16} /> الكاوتش ({tires.length})</button>
            <button onClick={() => setActiveTab("inspect")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "inspect" ? "bg-emerald-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><SearchCheck size={16} /> الفحص ({inspections.length})</button>
            <button onClick={() => setActiveTab("fuel")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "fuel" ? "bg-purple-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><Fuel size={16} /> الوقود ({fuelRecords.length})</button>
          </div>

          {activeTab === "history" ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 p-6 sm:p-10 min-h-[400px]">
              <h3 className="font-black text-xl text-blue-900 dark:text-blue-400 mb-8 border-b pb-4">سجل الأحداث الزمني للسيارة</h3>
              {historyLogs.length === 0 ? (
                <div className="text-center text-gray-500 font-bold p-12">لا توجد حركات مسجلة لهذه السيارة حتى الآن.</div>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-blue-100 before:via-blue-300 before:to-transparent">
                  {historyLogs.map((log, i) => (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-blue-500 text-white shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <Activity size={20} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-black text-slate-900 dark:text-white text-base">{log.action_type || log.actionType}</div>
                          <time className="font-bold text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-md">{new Date(log.created_at || log.createdAt).toLocaleString("en-GB")}</time>
                        </div>
                        <div className="text-sm font-bold text-blue-800 dark:text-blue-400 mb-2">القسم: {log.module_name || log.moduleName}</div>
                        <div className="text-slate-500 dark:text-gray-400 text-xs font-semibold flex items-center gap-1"><User size={14}/> المُدخل: {log.user_name || log.userName}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
             <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border overflow-hidden">
               {activeTab === "wo" && <DataTable columns={[{ key: "orderNumber", header: "رقم الأمر", render: (r:any) => <span className="font-bold text-blue-900">{r.orderNumber}</span> }, { key: "maintenanceType", header: "الصيانة", render: (r:any) => <span className="font-bold">{r.maintenanceType}</span> }, { key: "status", header: "الحالة", render: (r:any) => <StatusBadge status={r.status} /> }, { key: "startDate", header: "التاريخ", render: (r:any) => formatDate(r.startDate) }]} data={workOrders} loading={false} />}
               {activeTab === "oil" && <DataTable columns={[{ key: "changeDate", header: "التاريخ", render: (r:any) => formatDate(r.changeDate) }, { key: "kmAtChange", header: "العداد وقتها", render: (r:any) => <span className="font-bold">{safeNum(r.kmAtChange).toLocaleString()} كم</span> }, { key: "oilType", header: "الزيت", render: (r:any) => r.oilType }]} data={oilChanges} loading={false} />}
               {activeTab === "fuel" && <DataTable columns={[{ key: "fuelDate", header: "التاريخ", render: (r:any) => formatDate(r.fuelDate || r.fuel_date) }, { key: "liters", header: "اللترات", render: (r:any) => <span className="font-bold text-sky-600">{safeNum(r.liters).toLocaleString()} L</span> }]} data={fuelRecords} loading={false} />}
             </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-300">
          <Car size={56} className="mb-4 opacity-50" />
          <p className="font-bold text-lg">اختر سيارة من الأعلى لعرض سجل الحركات الشامل.</p>
        </div>
      )}
    </div>
  );
}
