"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Database, Search, Car, Wrench, Droplet, SearchCheck, Fuel, Loader2, Disc, MapPin, Calendar, Clock, Activity, ArrowUpLeft } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";

const safeNum = (val: any) => { const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

const MASTER_TEMPLATE_COLUMNS = [
  "رقم اللوحة", "نوع السجل", "التاريخ", "قراءة العداد", "التكلفة", "الجهة (محطة/ورشة)", "الفني أو السائق", "تفاصيل إضافية (نوع الزيت/الصيانة)", "ملاحظات"
];

export default function FleetDataPage() {
  const router = useRouter();
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
  
  // ⚡ التايم لاين الموحد
  const [combinedHistory, setCombinedHistory] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "wo" | "oil" | "tire" | "inspect" | "fuel">("history");
  
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => {
      const data = Array.isArray(d) ? d : [];
      setVehicles(data);
      if (incomingSearch) {
        const v = data.find(x => x.plateNumber === incomingSearch || x.plate_number === incomingSearch);
        if (v) setSelectedVehicleId(String(v.id));
      }
    });
  }, [incomingSearch]);

  const fetchVehicleProfile = useCallback(async (id: string) => {
    if (!id) { setVehicleData(null); return; }
    setLoading(true);
    try {
      const v = vehicles.find(x => String(x.id) === id);
      setVehicleData(v || null);

      const params = new URLSearchParams();
      params.set("vehicleId", id);

      const [woRes, oilRes, tireRes, insRes, fuelRes] = await Promise.all([
        fetch(`/api/work-orders?${params}`).catch(() => null),
        fetch(`/api/oil-changes?${params}`).catch(() => null),
        fetch(`/api/tires?${params}`).catch(() => null),
        fetch(`/api/vehicle-inspections?${params}`).then(r => r.ok ? r : fetch(`/api/vehicle-parts?${params}`)).catch(() => null),
        fetch(`/api/fuel`).catch(() => null),
      ]);

      const [woData, oilData, tireData, insData, fuelData] = await Promise.all([
        woRes?.json().catch(() => []), oilRes?.json().catch(() => []), tireRes?.json().catch(() => []),
        insRes?.json().catch(() => []), fuelRes?.json().catch(() => []),
      ]);

      const fW = (Array.isArray(woData) ? woData : []).filter(x => String(x.vehicleId || x.vehicle_id) === id);
      const fO = (Array.isArray(oilData) ? oilData : []).filter(x => String(x.vehicleId || x.vehicle_id) === id);
      const fT = (Array.isArray(tireData) ? tireData : []).filter(x => String(x.vehicleId || x.vehicle_id) === id);
      const fI = (Array.isArray(insData) ? insData : []).filter(x => String(x.vehicleId || x.vehicle_id) === id);
      const fF = (Array.isArray(fuelData) ? fuelData : []).filter(x => String(x.vehicleId || x.vehicle_id) === id);

      // فلترة التواريخ للتبويبات العادية
      const filterByDate = (arr: any[], dateField: string) => arr.filter(item => {
        if (!dateFrom && !dateTo) return true;
        const itemDate = new Date(item[dateField]).getTime();
        const start = dateFrom ? new Date(dateFrom).getTime() : 0;
        const end = dateTo ? new Date(dateTo).getTime() + 86399999 : Infinity;
        return itemDate >= start && itemDate <= end;
      });

      setWorkOrders(filterByDate(fW, "startDate"));
      setOilChanges(filterByDate(fO, "changeDate"));
      setTires(filterByDate(fT, "installDate"));
      setInspections(filterByDate(fI, "inspectionDate"));
      setFuelRecords(filterByDate(fF, "fuelDate"));

      // ── ⚡ بناء التايم لاين الذكي الموحد (Master Timeline) ──
      const timeline: any[] = [];
      
      fW.forEach(w => timeline.push({ type: "صيانة", date: w.startDate, title: w.maintenanceType, cost: w.cost, desc: w.description, status: w.status, icon: <Wrench size={18}/>, color: "bg-blue-600", link: `/dashboard/work-orders?search=${v.plateNumber}` }));
      fO.forEach(o => timeline.push({ type: "زيت وفلاتر", date: o.changeDate, title: o.oilType, cost: o.cost, desc: `تغيير عند: ${o.kmAtChange} كم`, status: "completed", icon: <Droplet size={18}/>, color: "bg-amber-500", link: `/dashboard/oil-changes?search=${v.plateNumber}` }));
      fT.forEach(t => timeline.push({ type: "كاوتش", date: t.installDate || t.install_date, title: t.tireSize || t.tire_size, cost: t.cost, desc: `تركيب عند: ${t.kmAtInstall || t.km_at_install} كم`, status: "completed", icon: <Disc size={18}/>, color: "bg-slate-700", link: `/dashboard/oil-changes` }));
      fI.forEach(i => timeline.push({ type: "فحص", date: i.inspectionDate || i.inspection_date, title: "تقرير فحص سيارة", cost: 0, desc: `بواسطة: ${i.inspectorName || i.inspector_name}`, status: "completed", icon: <SearchCheck size={18}/>, color: "bg-emerald-600", link: `/dashboard/vehicle-inspection?search=${v.plateNumber}` }));
      fF.forEach(f => timeline.push({ type: "وقود", date: f.fuelDate || f.fuel_date, title: "تزود بالوقود", cost: f.totalCost || f.total_cost, desc: `${f.liters} لتر | محطة: ${f.station}`, status: "completed", icon: <Fuel size={18}/>, color: "bg-purple-600", link: `/dashboard/fuel?search=${v.plateNumber}` }));

      // ترتيب زمني من الأحدث للأقدم
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setCombinedHistory(filterByDate(timeline, "date"));

    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [vehicles, dateFrom, dateTo]);

  useEffect(() => { if (selectedVehicleId) fetchVehicleProfile(selectedVehicleId); }, [selectedVehicleId, fetchVehicleProfile]);

  const mapMasterRow = (row: Record<string, any>) => {
    const plate = row["رقم اللوحة"] || "";
    const type = row["نوع السجل"] || "";
    if (!String(plate).trim() || !String(type).trim()) return null;
    const vId = vehicles.find(v => v.plateNumber === plate)?.id || null;
    const dateVal = row["التاريخ"] ? new Date(row["التاريخ"]) : null;
    return {
      plateNumber: plate, vehicleId: vId, recordType: type,
      date: dateVal && !isNaN(dateVal.getTime()) ? dateVal.toISOString().slice(0, 10) : null, 
      odometer: safeNum(row["قراءة العداد"]), cost: safeNum(row["التكلفة"]), 
      location: row["الجهة (محطة/ورشة)"] || "", person: row["الفني أو السائق"] || "", 
      details: row["تفاصيل إضافية (نوع الزيت/الصيانة)"] || "", notes: row["ملاحظات"] || ""
    };
  };

  const handleMasterImport = async (rows: any[]) => {
    let ok = 0; let failed = 0;
    for (const p of rows) {
      try {
        let endpoint = ""; let payload = {};
        if (p.recordType === "وقود") { endpoint = "/api/fuel"; payload = { plateNumber: p.plateNumber, vehicleId: p.vehicleId, fuelDate: p.date, odometer: p.odometer, totalCost: p.cost, station: p.location, driverName: p.person, liters: 0, costPerLiter: 0, notes: p.notes }; } 
        else if (p.recordType === "صيانة") { endpoint = "/api/work-orders"; payload = { plateNumber: p.plateNumber, vehicleId: p.vehicleId, startDate: p.date, cost: p.cost, workshop: p.location, technicianName: p.person, maintenanceType: p.details || "صيانة ميكانيكا", status: "completed", description: p.notes }; }
        else if (p.recordType === "زيت") { endpoint = "/api/oil-changes"; payload = { plateNumber: p.plateNumber, vehicleId: p.vehicleId, changeDate: p.date, kmAtChange: p.odometer, cost: p.cost, oilType: p.details || "5W30", technician: p.person, nextChangeKm: p.odometer + 5000, notes: p.notes }; }
        else if (p.recordType === "كاوتش") { endpoint = "/api/tires"; payload = { plateNumber: p.plateNumber, vehicleId: p.vehicleId, installDate: p.date, kmAtInstall: p.odometer, cost: p.cost, tireSize: p.details, notes: p.notes }; }
        else { failed++; continue; }
        const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) ok++; else failed++;
      } catch { failed++; }
    }
    if (selectedVehicleId) await fetchVehicleProfile(selectedVehicleId);
    return { ok, failed };
  };

  const getExportData = () => {
    switch (activeTab) {
      case "wo": return workOrders.map(r => ({"رقم الأمر": r.orderNumber, "الصيانة": r.maintenanceType, "الحالة": r.status === "completed"?"مكتمل":"معلق", "التكلفة (ج.م)": safeNum(r.cost), "تاريخ البدء": formatDate(r.startDate)}));
      case "oil": return oilChanges.map(r => ({"التاريخ": formatDate(r.changeDate), "العداد (كم)": safeNum(r.kmAtChange), "الزيت": r.oilType, "التكلفة (ج.م)": safeNum(r.cost)}));
      case "tire": return tires.map(r => ({"المقاس": r.tireSize || r.tire_size, "التركيب": formatDate(r.installDate || r.install_date), "التكلفة (ج.م)": safeNum(r.cost)}));
      case "inspect": return inspections.map(r => ({"تاريخ الفحص": formatDate(r.inspectionDate || r.inspection_date), "العداد (كم)": safeNum(r.odometer || r.kmAtInstall), "الفاحص": r.inspectorName || r.inspector_name}));
      case "fuel": return fuelRecords.map(r => ({"تاريخ التزود": formatDate(r.fuelDate || r.fuel_date), "اللترات": safeNum(r.liters), "التكلفة (ج.م)": safeNum(r.totalCost)}));
      case "history": return combinedHistory.map(r => ({"التاريخ": formatDate(r.date), "القسم": r.type, "العملية": r.title, "التفاصيل": r.desc, "التكلفة (ج.م)": safeNum(r.cost)}));
    }
    return [];
  };

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-900 text-white rounded-xl shadow-md"><Database size={26} /></div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">داتا الأسطول الشاملة</h1>
            <p className="text-sm text-gray-500 mt-0.5">البحث المتقدم وعرض السجل التاريخي الكامل لكل سيارة والاستيراد المجمع</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ImportExcelButton 
            templateColumns={MASTER_TEMPLATE_COLUMNS} templateFileName="السجل_الشامل_المجمع" 
            sampleRow={{ "رقم اللوحة": "ل ج أ 1234", "نوع السجل": "وقود", "التاريخ": "2025-10-15", "قراءة العداد": 55000, "التكلفة": 800, "الجهة (محطة/ورشة)": "طاقة عربية", "الفني أو السائق": "محمد علي", "تفاصيل إضافية (نوع الزيت/الصيانة)": "بنزين 92", "ملاحظات": "تفويلة كاملة" }} 
            mapRow={mapMasterRow} onImport={handleMasterImport} buttonText="استيراد داتا مجمعة (Master Excel)" 
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col xl:flex-row items-center gap-6">
        <div className="w-full xl:w-1/3 relative">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">ابحث أو اختر سيارة لاستعراض ملفها:</label>
          <div className="relative">
            <Search size={18} className="absolute start-3 top-3 text-gray-400" />
            <select className="w-full border border-gray-300 dark:border-gray-700 rounded-xl py-2.5 ps-10 pe-4 text-sm font-bold bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-inner"
              value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)}>
              <option value="">-- اضغط لاختيار سيارة --</option>
              {vehicles.map(v => <option key={v.id} value={String(v.id)}>{v.plateNumber || v.plate_number} | {v.brand} {v.model}</option>)}
            </select>
          </div>
        </div>

        {vehicleData && (
          <div className="flex-1 w-full bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 p-4 rounded-xl border border-blue-100 dark:border-gray-700 flex flex-wrap gap-x-8 gap-y-4 items-center shadow-sm fade-in">
            <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Clock size={12}/> العداد الحالي</p><p className="font-black text-blue-900 dark:text-teal-400 text-lg">{safeNum(vehicleData.currentKm || vehicleData.current_km).toLocaleString()} <span className="text-xs">كم</span></p></div>
            <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={12}/> المحافظة / الإدارة</p><p className="font-bold text-gray-800 dark:text-gray-200">{vehicleData.governorate} - {vehicleData.department}</p></div>
            <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={12}/> انتهاء الترخيص</p><p className="font-bold text-gray-800 dark:text-gray-200">{formatDate(vehicleData.licenseExpiry || vehicleData.license_expiry)}</p></div>
            <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Car size={12}/> الحالة</p><StatusBadge status={vehicleData.status} /></div>
          </div>
        )}
      </div>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange />

      {loading ? (
        <div className="p-12 flex flex-col justify-center items-center gap-4 text-blue-800 dark:text-blue-400 font-bold"><Loader2 className="animate-spin" size={32}/> <span>جاري تجميع الملف الشامل للسيارة...</span></div>
      ) : selectedVehicleId && vehicleData ? (
        <div className="space-y-6 fade-in">
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 p-1.5 bg-white dark:bg-gray-900 rounded-2xl w-full xl:w-fit border border-gray-200 dark:border-gray-800 shadow-sm">
              <button onClick={() => setActiveTab("history")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "history" ? "bg-slate-800 text-white shadow-md" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}><Activity size={16} /> سجل السيارة الشامل</button>
              <button onClick={() => setActiveTab("wo")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "wo" ? "bg-blue-900 text-white shadow-md" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}><Wrench size={16} /> الصيانات ({workOrders.length})</button>
              <button onClick={() => setActiveTab("oil")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "oil" ? "bg-amber-600 text-white shadow-md" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}><Droplet size={16} /> الزيوت ({oilChanges.length})</button>
              <button onClick={() => setActiveTab("tire")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "tire" ? "bg-slate-700 text-white shadow-md" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}><Disc size={16} /> الكاوتش ({tires.length})</button>
              <button onClick={() => setActiveTab("inspect")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "inspect" ? "bg-emerald-600 text-white shadow-md" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}><SearchCheck size={16} /> الفحص ({inspections.length})</button>
              <button onClick={() => setActiveTab("fuel")} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "fuel" ? "bg-purple-600 text-white shadow-md" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}><Fuel size={16} /> الوقود ({fuelRecords.length})</button>
            </div>

            <ExportExcelButton data={getExportData()} fileName={`سجل_${vehicleData.plateNumber || vehicleData.plate_number}_${activeTab}`} dateColumnName="التاريخ" />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border overflow-hidden min-h-[400px]">
            
            {/* ── التايم لاين الموحد والتفاعلي ── */}
            {activeTab === "history" && (
              <div className="p-6 sm:p-10">
                <h3 className="font-black text-xl text-blue-900 dark:text-blue-400 mb-8 border-b pb-4">السجل الزمني لكافة حركات السيارة</h3>
                {combinedHistory.length === 0 ? (
                  <div className="text-center text-gray-500 font-bold p-12">لا توجد حركات مسجلة لهذه السيارة حتى الآن.</div>
                ) : (
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-blue-100 before:via-blue-300 before:to-transparent">
                    {combinedHistory.map((log, i) => (
                      <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-white ${log.color} text-white shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10`}>
                          {log.icon}
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-black text-slate-900 dark:text-white text-base">{log.type}</div>
                            <time className="font-bold text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-md">{formatDate(log.date)}</time>
                          </div>
                          <div className="text-sm font-bold text-blue-800 dark:text-blue-400 mb-2">{log.title}</div>
                          <div className="text-slate-500 dark:text-gray-400 text-xs font-semibold mb-3 leading-relaxed">{log.desc}</div>
                          
                          {/* زر التوجيه الذكي الذي ينقلك لتفاصيل الإجراء فوراً */}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-gray-700">
                            <span className="font-black text-emerald-600 dark:text-emerald-400">{safeNum(log.cost).toLocaleString()} ج.م</span>
                            <button onClick={() => router.push(log.link)} className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-orange-600 transition-colors bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border shadow-sm">
                              <ArrowUpLeft size={14} /> عرض التفاصيل
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── جداول الأقسام العادية ── */}
            {activeTab === "wo" && <DataTable columns={[{ key: "orderNumber", header: "رقم الأمر", render: (r:any) => <span className="font-bold text-blue-900">{r.orderNumber}</span> }, { key: "maintenanceType", header: "الصيانة", render: (r:any) => <span className="font-bold">{r.maintenanceType}</span> }, { key: "status", header: "الحالة", render: (r:any) => <StatusBadge status={r.status} /> }, { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.cost).toLocaleString()} ج.م</span> }, { key: "startDate", header: "التاريخ", render: (r:any) => formatDate(r.startDate) }]} data={workOrders} loading={false} />}
            {activeTab === "oil" && <DataTable columns={[{ key: "changeDate", header: "التاريخ", render: (r:any) => formatDate(r.changeDate) }, { key: "kmAtChange", header: "العداد وقتها", render: (r:any) => <span className="font-bold">{safeNum(r.kmAtChange).toLocaleString()} كم</span> }, { key: "oilType", header: "الزيت", render: (r:any) => r.oilType }, { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.cost).toLocaleString()} ج.م</span> }]} data={oilChanges} loading={false} />}
            {activeTab === "tire" && <DataTable columns={[{ key: "installDate", header: "التاريخ", render: (r:any) => formatDate(r.installDate || r.install_date) }, { key: "kmAtInstall", header: "العداد وقتها", render: (r:any) => <span className="font-bold">{safeNum(r.kmAtInstall || r.km_at_install).toLocaleString()} كم</span> }, { key: "tireSize", header: "المقاس", render: (r:any) => r.tireSize || r.tire_size }, { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.cost).toLocaleString()} ج.م</span> }]} data={tires} loading={false} />}
            {activeTab === "inspect" && <DataTable columns={[{ key: "inspectionDate", header: "التاريخ", render: (r:any) => formatDate(r.inspectionDate || r.inspection_date) }, { key: "odometer", header: "العداد", render: (r:any) => <span className="font-bold">{safeNum(r.odometer || r.kmAtInstall).toLocaleString()} كم</span> }, { key: "inspectorName", header: "الفاحص", render: (r:any) => r.inspectorName || r.inspector_name }]} data={inspections} loading={false} />}
            {activeTab === "fuel" && <DataTable columns={[{ key: "fuelDate", header: "التاريخ", render: (r:any) => formatDate(r.fuelDate || r.fuel_date) }, { key: "liters", header: "اللترات", render: (r:any) => <span className="font-bold text-sky-600">{safeNum(r.liters).toLocaleString()} L</span> }, { key: "totalCost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.totalCost).toLocaleString()} ج.م</span> }]} data={fuelRecords} loading={false} />}
            
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <Car size={56} className="mb-4 opacity-50" />
          <p className="font-bold text-lg">اختر سيارة من الأعلى لعرض سجلها الشامل هنا.</p>
        </div>
      )}
    </div>
  );
}
