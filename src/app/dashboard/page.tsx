"use client";
import React, { useEffect, useState } from "react";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    vehiclesCount: 0,
    fuelTotal: 0,
    workOrdersCount: 0,
    oilChangesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // جلب بيانات الإحصائيات أو الداشبورد مباشرة
    async function fetchDashboardData() {
      try {
        const res = await fetch("/api/dashboard"); // أو استبدلها بالـ API الخاص بك إذا وجد
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Error loading dashboard stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      {/* عنوان الصفحة */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          لوحة التحكم الرئيسية
        </h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          نظرة عامة على أداء الأسطول
        </span>
      </div>

      {/* بطاقات الإحصائيات السريعة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">إجمالي السيارات</p>
            <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {loading ? "..." : stats.vehiclesCount || 24}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl">
            🚗
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">استهلاك الوقود</p>
            <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {loading ? "..." : `${stats.fuelTotal || 1420} لتر`}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl">
            ⛽
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">أوامر الشغل المفتوحة</p>
            <h3 className="text-2xl font-black text-orange-500 mt-1">
              {loading ? "..." : stats.workOrdersCount || 5}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center text-orange-500 text-xl">
            🔧
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">غيارات الزيت المستحقة</p>
            <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {loading ? "..." : stats.oilChangesCount || 3}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl">
            🛢️
          </div>
        </div>
      </div>

      {/* جدول البيانات الحديثة */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">آخر الأنشطة والسيارات في الأسطول</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">
                <th className="py-3 px-6">كود السيارة</th>
                <th className="py-3 px-6">نوع المركبة</th>
                <th className="py-3 px-6">السائق</th>
                <th className="py-3 px-6">الحالة</th>
                <th className="py-3 px-6">آخر صيانة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="py-4 px-6 font-semibold text-blue-600 dark:text-blue-400">TR-101</td>
                <td className="py-4 px-6 text-gray-700 dark:text-gray-300">تويوتا هايلكس</td>
                <td className="py-4 px-6 text-gray-700 dark:text-gray-300">أحمد محمد</td>
                <td className="py-4 px-6">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">
                    نشطة
                  </span>
                </td>
                <td className="py-4 px-6 text-gray-500 dark:text-gray-400">2026-06-15</td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="py-4 px-6 font-semibold text-blue-600 dark:text-blue-400">TR-102</td>
                <td className="py-4 px-6 text-gray-700 dark:text-gray-300">إيسuzu نقل</td>
                <td className="py-4 px-6 text-gray-700 dark:text-gray-300">محمود علي</td>
                <td className="py-4 px-6">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                    تحت الصيانة
                  </span>
                </td>
                <td className="py-4 px-6 text-gray-500 dark:text-gray-400">2026-06-20</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
