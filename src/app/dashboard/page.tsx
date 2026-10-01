"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Car, Wrench, Droplet, Package, AlertTriangle, ShieldAlert, Disc, 
  FileText, ArrowUpRight, CheckCircle2, Clock, AlertCircle, Loader2, BarChart2 
} from "lucide-react";
// استيراد المكونات بشكل صحيح ومحمي
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const sparklineData = [{ value: 12 }, { value: 28 }, { value: 18 }, { value: 45 }, { value: 32 }, { value: 55 }, { value: 48 }];

const safeNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : num;
};

async function safeFetchArray(url: string): Promise<any[]> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data?.vehicles || data?.data || [];
  } catch { return []; }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [fuelRecords, setFuelRecords] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [oilChanges, setOilChanges] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchAllDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [vehData, woData, fuelData, partsData, oilData, dashData] = await Promise.all([
        safeFetchArray("/api/vehicles"), safeFetchArray("/api/work-orders"), safeFetchArray("/api/fuel"),
        safeFetchArray("/api/spare-parts"), safeFetchArray("/api/oil-changes"),
        fetch("/api/dashboard").then(r => r.json()).catch(() => ({}))
      ]);

      setVehicles(vehData); setWorkOrders(woData); setFuelRecords(fuelData); setSpareParts(partsData); setOilChanges(oilData); setDashboardData(dashData);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (mounted) fetchAllDashboardData(); }, [mounted, fetchAllDashboardData]);

  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v?.status === "active").length;
  const maintenanceVehicles = vehicles.filter(v => v?.status === "maintenance").length;
  const stoppedVehicles = vehicles.filter(v => v?.status === "stopped").length;
  
  const activePct = totalVehicles ? Math.round((activeVehicles / totalVehicles) * 100) : 0;
  const maintPct = totalVehicles ? Math.round((maintenanceVehicles / totalVehicles) * 100) : 0;
  const stoppedPct = totalVehicles ? Math.round((stoppedVehicles / totalVehicles) * 100) : 0;

  const openWorkOrders = workOrders.filter(w => w?.status !== "completed").length;
  const totalFuelCost = fuelRecords.reduce((sum, r) => sum + safeNum(r?.totalCost ?? r?.total_cost), 0);
  const lowStockParts = spareParts.filter(p => safeNum(p?.quantity) <= safeNum(p?.minimumQuantity ?? p?.minimum_quantity)).length;

  const today = new Date(); const in30 = new Date(); in30.setDate(today.getDate() + 30);
  const expiringLicenses = vehicles.filter(v => {
    const exp = v?.license_expiry || v?.licenseExpiry; if (!exp) return false;
    const d = new Date(exp); return !isNaN(d.getTime()) && d <= in30;
  }).length;

  const lateOilChanges = oilChanges.filter(o => o?.kmAlert || o?.dayAlert).length;
  const tireAlerts = workOrders.filter(w => String(w?.maintenanceType || w?.maintenance_type || "").includes("كاوتش") && w?.status !== "completed").length;

  const chartData = (dashboardData?.monthlyAnalytics || []).map((m: any) => ({
    name: m.month, "تكلفة الوقود": Number(m.fuel_cost) || 0, "تكلفة الصيانة": Number(m.maintenance_cost) || 0,
  }));

  if (loading || !mounted) {
    return <div className="flex flex-col items-center justify-center min-h-[60vh] text-teal-600"><Loader2 size={48} className="animate-spin mb-4" /><h2 className="text-xl font-black">جاري مزامنة بيانات الأسطول...</h2></div>;
  }

  return (
    <div className="w-full space-y-8 fade-in" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-[#0B1325] to-[#1E3A8A] p-6 rounded-2xl shadow-lg border border-blue-900/50 pb-6">
        <div><h1 className="text-2xl font-black text-white">لوحة التحكم والأداء التشغيلي</h1><p className="text-blue-200 text-sm mt-1 font-medium">مرحباً بك في نظام إدارة الأسطول الشامل Fleet360 - Trans Gas / TAQA Arabia</p></div>
        <div className="flex items-center gap-2 text-xs font-bold bg-white/10 backdrop-blur-md text-teal-300 px-4 py-2 rounded-xl border border-white/10 shadow-sm"><span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]"></span><span>النظام متصل ومحدث مباشرة</span></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link href="/dashboard/vehicles" className="group bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white rounded-2xl p-5 shadow-md hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between h-44 border border-blue-800/40">
          <div className="flex justify-between items-start relative z-10"><div><div className="text-blue-200 text-xs font-bold mb-1">إجمالي السيارات</div><span className="text-3xl font-black">{totalVehicles}</span></div><div className="p-2.5 bg-white/10 rounded-xl group-hover:bg-teal-500 transition-colors"><Car size={22} className="text-white" /></div></div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40 group-hover:opacity-100 transition-opacity duration-500"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sparklineData}><Area type="monotone" dataKey="value" stroke="#2DD4BF" fill="#0D9488" fillOpacity={0.3} strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
        </Link>
        <Link href="/dashboard/work-orders" className="group bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white rounded-2xl p-5 shadow-md hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between h-44 border border-blue-700/40">
          <div className="flex justify-between items-start relative z-10"><div><div className="text-blue-100 text-xs font-bold mb-1">صيانات مفتوحة</div><span className="text-3xl font-black">{openWorkOrders}</span></div><div className="p-2.5 bg-white/10 rounded-xl group-hover:bg-teal-500 transition-colors"><Wrench size={22} className="text-white" /></div></div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40 group-hover:opacity-100 transition-opacity duration-500"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sparklineData}><Area type="monotone" dataKey="value" stroke="#93C5FD" fill="#60A5FA" fillOpacity={0.3} strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
        </Link>
        <Link href="/dashboard/fuel" className="group bg-gradient-to-br from-blue-800 via-blue-700 to-sky-600 text-white rounded-2xl p-5 shadow-md hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between h-44 border border-blue-600/40">
          <div className="flex justify-between items-start relative z-10"><div><div className="text-sky-100 text-xs font-bold mb-1">إجمالي تكلفة الوقود</div><span className="text-3xl font-black">{totalFuelCost.toLocaleString()} <span className="text-xs font-normal">ج.م</span></span></div><div className="p-2.5 bg-white/10 rounded-xl group-hover:bg-teal-500 transition-colors"><Droplet size={22} className="text-white" /></div></div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40 group-hover:opacity-100 transition-opacity duration-500"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sparklineData}><Area type="monotone" dataKey="value" stroke="#BAE6FD" fill="#93C5FD" fillOpacity={0.3} strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
        </Link>
        <Link href="/dashboard/spare-parts" className="group bg-gradient-to-br from-blue-700 via-sky-600 to-sky-500 text-white rounded-2xl p-5 shadow-md hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between h-44 border border-sky-500/40">
          <div className="flex justify-between items-start relative z-10"><div><div className="text-cyan-100 text-xs font-bold mb-1">نواقص المخزون</div><span className="text-3xl font-black">{lowStockParts}</span></div><div className="p-2.5 bg-white/10 rounded-xl group-hover:bg-teal-500 transition-colors"><Package size={22} className="text-white" /></div></div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40 group-hover:opacity-100 transition-opacity duration-500"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sparklineData}><Area type="monotone" dataKey="value" stroke="#E0F2FE" fill="#BAE6FD" fillOpacity={0.3} strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100"><div className="p-2.5 bg-red-100 text-red-600 rounded-xl"><AlertTriangle size={22} /></div><h2 className="text-lg font-black text-gray-900">التنبيهات العاجلة للأسطول</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link href="/dashboard/oil-changes" className="flex justify-between p-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 group"><div className="flex gap-3.5"><div className="p-3 bg-amber-500 text-white rounded-xl shadow-md"><Droplet size={20} /></div><div><p className="text-xs text-gray-600 font-bold">تغيير زيوت متأخر</p><p className="text-lg font-black text-amber-600">{lateOilChanges} سيارة</p></div></div><ArrowUpRight size={18} className="text-amber-500 opacity-60 group-hover:opacity-100" /></Link>
          <Link href="/dashboard/work-orders" className="flex justify-between p-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 group"><div className="flex gap-3.5"><div className="p-3 bg-red-500 text-white rounded-xl shadow-md"><Disc size={20} /></div><div><p className="text-xs text-gray-600 font-bold">أعطال كاوتش مفتوحة</p><p className="text-lg font-black text-red-600">{tireAlerts} أمر صيانة</p></div></div><ArrowUpRight size={18} className="text-red-500 opacity-60 group-hover:opacity-100" /></Link>
          <Link href="/dashboard/vehicles" className="flex justify-between p-4 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 group"><div className="flex gap-3.5"><div className="p-3 bg-purple-600 text-white rounded-xl shadow-md"><ShieldAlert size={20} /></div><div><p className="text-xs text-gray-600 font-bold">تراخيص منتهية</p><p className="text-lg font-black text-purple-600">{expiringLicenses} سيارة</p></div></div><ArrowUpRight size={18} className="text-purple-500 opacity-60 group-hover:opacity-100" /></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-5"><h2 className="font-bold text-gray-900 flex items-center gap-2"><Car size={18} className="text-teal-600" /><span>توزيع حالة الأسطول</span></h2></div>
          <div className="space-y-4">
            <div><div className="flex justify-between text-sm font-bold mb-1.5"><span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /><span>نشطة</span></span><span>{activeVehicles} ({activePct}%)</span></div><div className="w-full bg-gray-100 rounded-full h-2.5"><div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${activePct}%` }}></div></div></div>
            <div><div className="flex justify-between text-sm font-bold mb-1.5"><span className="flex items-center gap-1.5"><Clock size={16} className="text-amber-500" /><span>قيد الصيانة</span></span><span>{maintenanceVehicles} ({maintPct}%)</span></div><div className="w-full bg-gray-100 rounded-full h-2.5"><div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${maintPct}%` }}></div></div></div>
            <div><div className="flex justify-between text-sm font-bold mb-1.5"><span className="flex items-center gap-1.5"><AlertCircle size={16} className="text-red-500" /><span>متوقفة</span></span><span>{stoppedVehicles} ({stoppedPct}%)</span></div><div className="w-full bg-gray-100 rounded-full h-2.5"><div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${stoppedPct}%` }}></div></div></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><FileText size={18} className="text-teal-500" /> الإجراءات السريعة</h2>
          <div className="grid grid-cols-2 gap-3.5">
            <Link href="/dashboard/vehicles" className="p-3.5 border border-gray-200 rounded-xl hover:bg-teal-50 flex justify-between text-sm font-bold text-gray-700 group"><span className="group-hover:text-teal-600">إضافة سيارة</span><Car size={18} className="text-gray-400 group-hover:text-teal-500" /></Link>
            <Link href="/dashboard/fuel" className="p-3.5 border border-gray-200 rounded-xl hover:bg-teal-50 flex justify-between text-sm font-bold text-gray-700 group"><span className="group-hover:text-teal-600">تسجيل وقود</span><Droplet size={18} className="text-gray-400 group-hover:text-teal-500" /></Link>
            <Link href="/dashboard/work-orders" className="p-3.5 border border-gray-200 rounded-xl hover:bg-teal-50 flex justify-between text-sm font-bold text-gray-700 group"><span className="group-hover:text-teal-600">صيانة جديد</span><Wrench size={18} className="text-gray-400 group-hover:text-teal-500" /></Link>
            <Link href="/dashboard/oil-changes" className="p-3.5 border border-gray-200 rounded-xl hover:bg-teal-50 flex justify-between text-sm font-bold text-gray-700 group"><span className="group-hover:text-teal-600">تغيير زيت</span><Filter size={18} className="text-gray-400 group-hover:text-teal-500" /></Link>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-6"><BarChart2 className="text-teal-600" /><h2 className="text-lg font-black text-gray-900">التحليل المالي التشغيلي (آخر 6 شهور)</h2></div>
          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 'bold' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 'bold' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1F2937', borderRadius: '12px', border: 'none', color: '#fff', fontWeight: 'bold' }} itemStyle={{ color: '#fff' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', fontSize: '12px' }} />
                <Bar dataKey="تكلفة الوقود" fill="#0EA5E9" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="تكلفة الصيانة" fill="#F97316" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
