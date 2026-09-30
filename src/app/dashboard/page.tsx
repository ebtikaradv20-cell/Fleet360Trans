"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Car, Wrench, Droplet, Database, AlertTriangle, ShieldAlert, Disc, FileText, ArrowUpRight, CheckCircle2, Clock, AlertCircle, Loader2, Filter } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const sparklineData = [{ value: 12 }, { value: 28 }, { value: 18 }, { value: 45 }, { value: 32 }, { value: 55 }, { value: 48 }];
const safeNum = (val: any) => { const num = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(num) ? 0 : num; };

async function safeFetchArray(url: string) {
  try { const res = await fetch(url, { cache: "no-store" }); if (!res.ok) return []; const data = await res.json(); return Array.isArray(data) ? data : data.data || data.vehicles || []; } catch { return []; }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [fuelRecords, setFuelRecords] = useState<any[]>([]);
  const [oilChanges, setOilChanges] = useState<any[]>([]);

  useEffect(() => { setMounted(true); }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [v, w, f, o] = await Promise.all([safeFetchArray("/api/vehicles"), safeFetchArray("/api/work-orders"), safeFetchArray("/api/fuel"), safeFetchArray("/api/oil-changes")]);
      setVehicles(v); setWorkOrders(w); setFuelRecords(f); setOilChanges(o);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { if (mounted) fetchAll(); }, [mounted, fetchAll]);

  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.status === "active").length;
  const maintenanceVehicles = vehicles.filter(v => v.status === "maintenance").length;
  const stoppedVehicles = vehicles.filter(v => v.status === "stopped").length;
  const activePct = totalVehicles ? Math.round((activeVehicles / totalVehicles) * 100) : 0;
  const maintPct = totalVehicles ? Math.round((maintenanceVehicles / totalVehicles) * 100) : 0;
  const stoppedPct = totalVehicles ? Math.round((stoppedVehicles / totalVehicles) * 100) : 0;

  const openWorkOrders = workOrders.filter(w => w.status !== "completed").length;
  const totalFuelCost = fuelRecords.reduce((s, r) => s + safeNum(r.totalCost || r.total_cost), 0);

  const today = new Date(); const in30 = new Date(); in30.setDate(today.getDate() + 30);
  const expiringLicenses = vehicles.filter(v => { const d = new Date(v.licenseExpiry || v.license_expiry); return !isNaN(d.getTime()) && d <= in30; }).length;
  const lateOilChanges = oilChanges.filter(o => o.kmAlert || o.dayAlert).length;
  const tireAlerts = workOrders.filter(w => String(w.maintenanceType).includes("كاوتش") && w.status !== "completed").length;

  if (!mounted || loading) return <div className="flex flex-col items-center justify-center min-h-[60vh] text-teal-600"><Loader2 size={48} className="animate-spin mb-4" /><h2 className="text-xl font-black">جاري مزامنة بيانات الأسطول...</h2></div>;

  return (
    <div className="w-full space-y-8 fade-in" dir="rtl">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-[#0B1325] to-[#1E3A8A] p-6 rounded-2xl shadow-lg border border-blue-900/50 pb-6">
        <div><h1 className="text-2xl font-black text-white">لوحة التحكم والأداء التشغيلي</h1><p className="text-blue-200 text-sm mt-1">مرحباً بك في نظام Fleet360 - Trans Gas / TAQA Arabia</p></div>
        <div className="flex items-center gap-2 text-xs font-bold bg-white/10 text-teal-300 px-4 py-2 rounded-xl border border-white/10 shadow-sm"><span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]"></span><span>النظام متصل ومحدث مباشرة</span></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link href="/dashboard/vehicles" className="group bg-gradient-to-br from-blue-950 to-blue-800 text-white rounded-2xl p-5 shadow-md hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between h-44 border border-blue-800/40">
          <div className="flex justify-between items-start relative z-10"><div><div className="text-blue-200 text-xs font-bold mb-1">إجمالي السيارات</div><span className="text-3xl font-black">{totalVehicles}</span><span className="text-[11px] text-emerald-400 font-semibold ms-2">{activeVehicles} سيارة نشطة</span></div><div className="p-2.5 bg-white/10 rounded-xl group-hover:bg-teal-500 transition-colors"><Car size={22} /></div></div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40 group-hover:opacity-100 transition-opacity duration-500"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sparklineData}><Area type="monotone" dataKey="value" stroke="#60A5FA" fill="#3B82F6" fillOpacity={0.3} strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
        </Link>
        <Link href="/dashboard/work-orders" className="group bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-md hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between h-44 border border-blue-700/40">
          <div className="flex justify-between items-start relative z-10"><div><div className="text-blue-100 text-xs font-bold mb-1">صيانات مفتوحة</div><span className="text-3xl font-black">{openWorkOrders}</span><span className="text-[11px] text-orange-300 font-semibold ms-2">قيد التنفيذ / معلق</span></div><div className="p-2.5 bg-white/10 rounded-xl group-hover:bg-teal-500 transition-colors"><Wrench size={22} /></div></div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40 group-hover:opacity-100 transition-opacity duration-500"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sparklineData}><Area type="monotone" dataKey="value" stroke="#93C5FD" fill="#60A5FA" fillOpacity={0.3} strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
        </Link>
        <Link href="/dashboard/fuel" className="group bg-gradient-to-br from-blue-800 to-sky-600 text-white rounded-2xl p-5 shadow-md hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between h-44 border border-blue-600/40">
          <div className="flex justify-between items-start relative z-10"><div><div className="text-sky-100 text-xs font-bold mb-1">إجمالي تكلفة الوقود</div><span className="text-3xl font-black">{totalFuelCost.toLocaleString()} <span className="text-xs">ج.م</span></span></div><div className="p-2.5 bg-white/10 rounded-xl group-hover:bg-teal-500 transition-colors"><Droplet size={22} /></div></div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40 group-hover:opacity-100 transition-opacity duration-500"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sparklineData}><Area type="monotone" dataKey="value" stroke="#BAE6FD" fill="#93C5FD" fillOpacity={0.3} strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
        </Link>
        {/* ✅ الكارت الرابع تم تعديله لينقلك لصفحة דاتا الأسطول الشاملة */}
        <Link href="/dashboard/fleet-data" className="group bg-gradient-to-br from-blue-700 to-sky-500 text-white rounded-2xl p-5 shadow-md hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between h-44 border border-sky-500/40">
          <div className="flex justify-between items-start relative z-10"><div><div className="text-cyan-100 text-xs font-bold mb-1">داتا الأسطول الشاملة</div><span className="text-2xl font-black block mt-2">البحث المتقدم</span><span className="text-[11px] text-amber-200 font-semibold inline-block mt-1">سجل السيارات بالكامل</span></div><div className="p-2.5 bg-white/10 rounded-xl group-hover:bg-teal-500 transition-colors"><Database size={22} /></div></div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40 group-hover:opacity-100 transition-opacity duration-500"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sparklineData}><Area type="monotone" dataKey="value" stroke="#E0F2FE" fill="#BAE6FD" fillOpacity={0.3} strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
        </Link>
      </div>

      {/* التنبيهات وإجراءات سريعة (كما هي بدون تغيير) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800"><div className="p-2.5 bg-red-100 text-red-600 rounded-xl"><AlertTriangle size={22} /></div><div><h2 className="text-lg font-black text-gray-900 dark:text-white">التنبيهات العاجلة للأسطول</h2><p className="text-xs text-gray-500 mt-0.5">تتطلب اتخاذ إجراء فوري</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link href="/dashboard/oil-changes" className="flex items-center justify-between p-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-all group"><div className="flex items-center gap-3.5"><div className="p-3 bg-amber-500 text-white rounded-xl shadow-md group-hover:scale-105"><Droplet size={20} /></div><div><p className="text-xs text-gray-600 font-bold">تغيير زيوت متأخر</p><p className="text-lg font-black text-amber-600 mt-0.5">{lateOilChanges} سيارة</p></div></div><ArrowUpRight size={18} className="text-amber-500 opacity-60 group-hover:opacity-100" /></Link>
          <Link href="/dashboard/work-orders" className="flex items-center justify-between p-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-all group"><div className="flex items-center gap-3.5"><div className="p-3 bg-red-500 text-white rounded-xl shadow-md group-hover:scale-105"><Disc size={20} /></div><div><p className="text-xs text-gray-600 font-bold">أعطال كاوتش مفتوحة</p><p className="text-lg font-black text-red-600 mt-0.5">{tireAlerts} أمر صيانة</p></div></div><ArrowUpRight size={18} className="text-red-500 opacity-60 group-hover:opacity-100" /></Link>
          <Link href="/dashboard/vehicles" className="flex items-center justify-between p-4 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-all group"><div className="flex items-center gap-3.5"><div className="p-3 bg-purple-600 text-white rounded-xl shadow-md group-hover:scale-105"><ShieldAlert size={20} /></div><div><p className="text-xs text-gray-600 font-bold">تراخيص منتهية/مقتربة</p><p className="text-lg font-black text-purple-600 mt-0.5">{expiringLicenses} سيارة</p></div></div><ArrowUpRight size={18} className="text-purple-500 opacity-60 group-hover:opacity-100" /></Link>
        </div>
      </div>
    </div>
  );
}
