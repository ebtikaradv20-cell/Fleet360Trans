"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Car, 
  Wrench, 
  Droplet, 
  Package, 
  AlertTriangle, 
  ShieldAlert, 
  Disc,
  FileText,
  Filter,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Database
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const sparklineData = [
  { value: 12 }, { value: 28 }, { value: 18 }, { value: 45 }, 
  { value: 32 }, { value: 55 }, { value: 48 }
];

const safeNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : num;
};

// دالة جلب آمنة تضمن عدم انكسار الصفحة
async function safeFetchArray(url: string): Promise<any[]> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.vehicles)) return data.vehicles;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  } catch {
    return [];
  }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // ── 1. الحالات الحية ──
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [fuelRecords, setFuelRecords] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [oilChanges, setOilChanges] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── 2. محرك جلب البيانات المحصن ──
  const fetchAllDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [vehData, woData, fuelData, partsData, oilData] = await Promise.all([
        safeFetchArray("/api/vehicles"),
        safeFetchArray("/api/work-orders"),
        safeFetchArray("/api/fuel"),
        safeFetchArray("/api/spare-parts"),
        safeFetchArray("/api/oil-changes")
      ]);

      setVehicles(vehData);
      setWorkOrders(woData);
      setFuelRecords(fuelData);
      setSpareParts(partsData);
      setOilChanges(oilData);
    } catch (error) {
      console.error("Dashboard Data Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchAllDashboardData();
    }
  }, [mounted, fetchAllDashboardData]);

  // ── 3. الحسابات ──
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const safeWorkOrders = Array.isArray(workOrders) ? workOrders : [];
  const safeFuelRecords = Array.isArray(fuelRecords) ? fuelRecords : [];
  const safeOilChanges = Array.isArray(oilChanges) ? oilChanges : [];

  const totalVehicles = safeVehicles.length;
  const activeVehicles = safeVehicles.filter(v => v && v.status === "active").length;
  const maintenanceVehicles = safeVehicles.filter(v => v && v.status === "maintenance").length;
  const stoppedVehicles = safeVehicles.filter(v => v && v.status === "stopped").length;
  
  const activePct = totalVehicles ? Math.round((activeVehicles / totalVehicles) * 100) : 0;
  const maintPct = totalVehicles ? Math.round((maintenanceVehicles / totalVehicles) * 100) : 0;
  const stoppedPct = totalVehicles ? Math.round((stoppedVehicles / totalVehicles) * 100) : 0;

  const openWorkOrders = safeWorkOrders.filter(w => w && w.status !== "completed").length;
  const totalFuelCost = safeFuelRecords.reduce((sum, r) => sum + safeNum(r?.totalCost ?? r?.total_cost), 0);

  // ── 4. التنبيهات ──
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  
  const expiringLicenses = safeVehicles.filter(v => {
    if (!v) return false;
    const exp = v.license_expiry || v.licenseExpiry;
    if (!exp) return false;
    const expiryDate = new Date(exp);
    return !isNaN(expiryDate.getTime()) && expiryDate <= thirtyDaysFromNow;
  }).length;

  const lateOilChanges = safeOilChanges.filter(o => o && (o.kmAlert || o.dayAlert)).length;
  const tireAlerts = safeWorkOrders.filter(w => w && String(w.maintenanceType || w.maintenance_type || "").includes("كاوتش") && w.status !== "completed").length;

  if (loading || !mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-blue-900 dark:text-blue-400" dir="rtl">
        <Loader2 size={48} className="animate-spin mb-4" />
        <h2 className="text-xl font-black">جاري تحميل لوحة التحكم...</h2>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 fade-in" dir="rtl">
      
      {/* ── رأس الصفحة (أزرق مدرج متطور) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-[#0B1325] to-[#1E3A8A] p-6 rounded-2xl shadow-lg border border-blue-900/50 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white">لوحة التحكم والأداء التشغيلي</h1>
          <p className="text-blue-200 text-sm mt-1 font-medium">مرحباً بك في نظام إدارة الأسطول الشامل Fleet360 - Trans Gas / TAQA Arabia</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold bg-white/10 backdrop-blur-md text-teal-300 px-4 py-2 rounded-xl border border-white/10 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]"></span>
          <span>النظام متصل ومحدث مباشرة</span>
        </div>
      </div>

      {/* ── الكروت الأربعة الزرقاء ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* الكارت 1: السيارات */}
        <Link href="/dashboard/vehicles" className="group bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white rounded-2xl p-5 shadow-md hover:shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between h-44 border border-blue-800/40">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-blue-200 text-xs font-bold mb-1">إجمالي السيارات</div>
              <span className="text-3xl font-black">{totalVehicles}</span>
              <span className="text-[11px] text-emerald-400 font-semibold ms-2">{activeVehicles} سيارة نشطة</span>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md group-hover:bg-teal-500 transition-colors">
              <Car size={22} className="text-white" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40 group-hover:opacity-100 transition-opacity duration-500">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <Area type="monotone" dataKey="value" stroke="#60A5FA" fill="#3B82F6" fillOpacity={0.3} strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Link>

        {/* الكارت 2: الصيانات */}
        <Link href="/dashboard/work-orders" className="group bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white rounded-2xl p-5 shadow-md hover:shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between h-44 border border-blue-700/40">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-blue-100 text-xs font-bold mb-1">صيانات مفتوحة</div>
              <span className="text-3xl font-black">{openWorkOrders}</span>
              <span className="text-[11px] text-orange-300 font-semibold ms-2">قيد التنفيذ / معلق</span>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md group-hover:bg-teal-500 transition-colors">
              <Wrench size={22} className="text-white" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40 group-hover:opacity-100 transition-opacity duration-500">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <Area type="monotone" dataKey="value" stroke="#93C5FD" fill="#60A5FA" fillOpacity={0.3} strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Link>

        {/* الكارت 3: الوقود */}
        <Link href="/dashboard/fuel" className="group bg-gradient-to-br from-blue-800 via-blue-700 to-sky-600 text-white rounded-2xl p-5 shadow-md hover:shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between h-44 border border-blue-600/40">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-sky-100 text-xs font-bold mb-1">إجمالي تكلفة الوقود</div>
              <span className="text-3xl font-black">{totalFuelCost.toLocaleString()} <span className="text-xs font-normal">ج.م</span></span>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md group-hover:bg-teal-500 transition-colors">
              <Droplet size={22} className="text-white" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40 group-hover:opacity-100 transition-opacity duration-500">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <Area type="monotone" dataKey="value" stroke="#BAE6FD" fill="#93C5FD" fillOpacity={0.3} strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Link>

        {/* ✅ الكارت 4 المحدث: داتا الأسطول الشاملة */}
        <Link href="/dashboard/fleet-data" className="group bg-gradient-to-br from-blue-700 via-sky-600 to-sky-500 text-white rounded-2xl p-5 shadow-md hover:shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between h-44 border border-sky-500/40">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-cyan-100 text-xs font-bold mb-1">داتا الأسطول الشاملة</div>
              <span className="text-2xl font-black block mt-1">البحث المتقدم</span>
              <span className="text-[11px] text-amber-200 font-semibold inline-block mt-1">سجل الصيانة والوقود الكامل</span>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md group-hover:bg-teal-500 transition-colors">
              <Database size={22} className="text-white" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40 group-hover:opacity-100 transition-opacity duration-500">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <Area type="monotone" dataKey="value" stroke="#E0F2FE" fill="#BAE6FD" fillOpacity={0.3} strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Link>

      </div>

      {/* ── لوحة التنبيهات العاجلة ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="p-2.5 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-xl">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white">التنبيهات العاجلة للأسطول</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">تتطلب اتخاذ إجراء فوري للحفاظ على سلامة التشغيل</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link href="/dashboard/oil-changes" className="flex items-center justify-between p-4 rounded-xl border border-amber-200/80 bg-amber-50/40 hover:bg-amber-100/60 transition-all group">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-amber-500 text-white rounded-xl shadow-md group-hover:scale-105 transition-transform"><Droplet size={20} /></div>
              <div><p className="text-xs text-gray-600 dark:text-gray-400 font-bold">تغيير زيوت متأخر</p><p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">{lateOilChanges} سيارة</p></div>
            </div>
            <ArrowUpRight size={18} className="text-amber-500 opacity-60 group-hover:opacity-100 transition-all" />
          </Link>

          <Link href="/dashboard/work-orders" className="flex items-center justify-between p-4 rounded-xl border border-red-200/80 bg-red-50/40 hover:bg-red-100/60 transition-all group">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-red-500 text-white rounded-xl shadow-md group-hover:scale-105 transition-transform"><Disc size={20} /></div>
              <div><p className="text-xs text-gray-600 dark:text-gray-400 font-bold">أعطال كاوتش مفتوحة</p><p className="text-lg font-black text-red-600 dark:text-red-400 mt-0.5">{tireAlerts} أمر صيانة</p></div>
            </div>
            <ArrowUpRight size={18} className="text-red-500 opacity-60 group-hover:opacity-100 transition-all" />
          </Link>

          <Link href="/dashboard/vehicles" className="flex items-center justify-between p-4 rounded-xl border border-purple-200/80 bg-purple-50/40 hover:bg-purple-100/60 transition-all group">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-purple-600 text-white rounded-xl shadow-md group-hover:scale-105 transition-transform"><ShieldAlert size={20} /></div>
              <div><p className="text-xs text-gray-600 dark:text-gray-400 font-bold">تراخيص منتهية/مقتربة</p><p className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5">{expiringLicenses} سيارة</p></div>
            </div>
            <ArrowUpRight size={18} className="text-purple-500 opacity-60 group-hover:opacity-100 transition-all" />
          </Link>
        </div>
      </div>

      {/* ── توزيع حالة الأسطول + الإجراءات السريعة ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Car size={18} className="text-teal-600 dark:text-teal-400" /><span>توزيع حالة الأسطول التشغيلي</span></h2>
            <span className="text-xs text-gray-400 font-bold">إجمالي {totalVehicles} سيارة</span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-bold mb-1.5">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300"><CheckCircle2 size={16} className="text-emerald-500" /><span>نشطة وفي الخدمة</span></span>
                <span className="text-gray-900 dark:text-white">{activeVehicles} ({activePct}%)</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${activePct}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-bold mb-1.5">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300"><Clock size={16} className="text-amber-500" /><span>قيد الصيانة والتأهيل</span></span>
                <span className="text-gray-900 dark:text-white">{maintenanceVehicles} ({maintPct}%)</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <div className="bg-amber-500 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${maintPct}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-bold mb-1.5">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300"><AlertCircle size={16} className="text-red-500" /><span>متوقفة عن العمل</span></span>
                <span className="text-gray-900 dark:text-white">{stoppedVehicles} ({stoppedPct}%)</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <div className="bg-red-500 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${stoppedPct}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><FileText size={18} className="text-teal-500" /><span>الإجراءات السريعة للنظام</span></h2>
            <div className="grid grid-cols-2 gap-3.5">
              <Link href="/dashboard/vehicles" className="p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-teal-500/50 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 flex items-center justify-between text-sm font-bold text-gray-700 dark:text-gray-200 transition-all group">
                <span className="group-hover:text-teal-600 transition-colors">إضافة سيارة</span><Car size={18} className="text-gray-400 group-hover:text-teal-500 transition-colors" />
              </Link>
              <Link href="/dashboard/fuel" className="p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-teal-500/50 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 flex items-center justify-between text-sm font-bold text-gray-700 dark:text-gray-200 transition-all group">
                <span className="group-hover:text-teal-600 transition-colors">تسجيل وقود</span><Droplet size={18} className="text-gray-400 group-hover:text-teal-500 transition-colors" />
              </Link>
              <Link href="/dashboard/work-orders" className="p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-teal-500/50 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 flex items-center justify-between text-sm font-bold text-gray-700 dark:text-gray-200 transition-all group">
                <span className="group-hover:text-teal-600 transition-colors">أمر صيانة جديد</span><Wrench size={18} className="text-gray-400 group-hover:text-teal-500 transition-colors" />
              </Link>
              <Link href="/dashboard/oil-changes" className="p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-teal-500/50 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 flex items-center justify-between text-sm font-bold text-gray-700 dark:text-gray-200 transition-all group">
                <span className="group-hover:text-teal-600 transition-colors">جدولة تغيير زيت</span><Filter size={18} className="text-gray-400 group-hover:text-teal-500 transition-colors" />
              </Link>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs text-gray-400">
            <span>نظام إدارة أسطول Trans Gas / TAQA Arabia</span><span className="font-bold text-teal-600">Enterprise Edition</span>
          </div>
        </div>

      </div>
    </div>
  );
}
