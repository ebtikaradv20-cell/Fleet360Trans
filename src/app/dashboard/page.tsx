"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Car, Wrench, Droplet, AlertTriangle, ShieldAlert, Disc, FileText, ArrowUpRight, CheckCircle2, Loader2, BarChart2 } from "lucide-react";
// ⚡ استخدام المخططات الحقيقية من Recharts
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      setDashboardData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (mounted) fetchDashboard(); }, [mounted, fetchDashboard]);

  if (loading || !mounted || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-teal-600">
        <Loader2 size={48} className="animate-spin mb-4" />
        <h2 className="text-xl font-black">جاري تحليل بيانات الأسطول...</h2>
      </div>
    );
  }

  // ترجمة وتنسيق داتا الرسم البياني
  const chartData = (dashboardData.monthlyAnalytics || []).map((m: any) => ({
    name: m.month,
    "تكلفة الوقود": Number(m.fuel_cost) || 0,
    "تكلفة الصيانة": Number(m.maintenance_cost) || 0,
  }));

  return (
    <div className="w-full space-y-8 fade-in" dir="rtl">
      
      {/* ── رأس الصفحة المؤسسي ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-[#0B1A3B] to-[#040A18] p-6 sm:p-8 rounded-2xl shadow-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px]" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-tight">لوحة القيادة التشغيلية</h1>
          <p className="text-emerald-400 text-sm mt-1.5 font-bold tracking-wider uppercase">Trans Gas / TAQA Arabia Enterprise</p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-xs font-bold bg-white/10 backdrop-blur-md text-teal-300 px-4 py-2.5 rounded-xl border border-white/10 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]"></span>
          <span>النظام متصل (Live Sync)</span>
        </div>
      </div>

      {/* ── الكروت العلوية ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link href="/dashboard/vehicles" className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all group flex items-center justify-between">
          <div><p className="text-sm font-bold text-gray-500 mb-1">السيارات المسجلة</p><h3 className="text-3xl font-black text-gray-900 dark:text-white group-hover:text-teal-600 transition-colors">{dashboardData.totalVehicles}</h3></div>
          <div className="p-4 bg-teal-50 dark:bg-teal-950/30 text-teal-600 rounded-xl"><Car size={28}/></div>
        </Link>
        <Link href="/dashboard/work-orders" className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all group flex items-center justify-between">
          <div><p className="text-sm font-bold text-gray-500 mb-1">أوامر شغل مفتوحة</p><h3 className="text-3xl font-black text-gray-900 dark:text-white group-hover:text-amber-600 transition-colors">{dashboardData.openWorkOrders}</h3></div>
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 text-amber-600 rounded-xl"><Wrench size={28}/></div>
        </Link>
        <Link href="/dashboard/fuel" className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all group flex items-center justify-between">
          <div><p className="text-sm font-bold text-gray-500 mb-1">استهلاك الوقود</p><h3 className="text-2xl font-black text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{dashboardData.totalFuelCost.toLocaleString()} <span className="text-xs">ج.م</span></h3></div>
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-xl"><Droplet size={28}/></div>
        </Link>
        <Link href="/dashboard/spare-parts" className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all group flex items-center justify-between">
          <div><p className="text-sm font-bold text-gray-500 mb-1">نواقص المخزون</p><h3 className="text-3xl font-black text-gray-900 dark:text-white group-hover:text-red-600 transition-colors">{dashboardData.lowStockParts}</h3></div>
          <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-xl"><AlertTriangle size={28}/></div>
        </Link>
      </div>

      {/* ── 📊 التحليلات المالية (الرسم البياني الحقيقي) ── */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-6">
          <BarChart2 className="text-teal-600" />
          <h2 className="text-lg font-black text-gray-900 dark:text-white">التحليل المالي التشغيلي (آخر 6 شهور)</h2>
        </div>
        
        {chartData.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-gray-400 font-bold bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-300">لا توجد بيانات مالية كافية لرسم المنحنى.</div>
        ) : (
          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 'bold' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 'bold' }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: '#1F2937', borderRadius: '12px', border: 'none', color: '#fff', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', fontSize: '12px' }} />
                <Bar dataKey="تكلفة الوقود" fill="#0EA5E9" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="تكلفة الصيانة" fill="#F97316" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
}
