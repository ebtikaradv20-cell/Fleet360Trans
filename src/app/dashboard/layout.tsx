"use client";
import React, { useState } from "react";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    vehiclesCount: 24,
    fuelTotal: 1420,
    workOrdersCount: 5,
    oilChangesCount: 3,
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* بطاقات الإحصائيات (بتدرجات الأزرق وفلات آرت) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* إجمالي السيارات */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-2xl shadow-lg shadow-blue-500/20 relative overflow-hidden flex items-center justify-between">
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <p className="text-xs font-medium text-blue-100">إجمالي السيارات</p>
            <h3 className="text-3xl font-black tracking-tight mt-1">
              {stats.vehiclesCount}
            </h3>
            <span className="inline-block mt-2 text-[11px] bg-blue-500/50 px-2 py-0.5 rounded-lg text-blue-50">
              +2 هذا الشهر
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner">
            🚗
          </div>
        </div>

        {/* استهلاك الوقود */}
        <div className="bg-gradient-to-br from-sky-600 to-blue-600 text-white p-6 rounded-2xl shadow-lg shadow-sky-500/20 relative overflow-hidden flex items-center justify-between">
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <p className="text-xs font-medium text-sky-100">استهلاك الوقود</p>
            <h3 className="text-3xl font-black tracking-tight mt-1">
              {stats.fuelTotal} <span className="text-sm font-normal">لتر</span>
            </h3>
            <span className="inline-block mt-2 text-[11px] bg-sky-500/50 px-2 py-0.5 rounded-lg text-sky-50">
              معدل استهلاك طبيعي
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner">
            ⛽
          </div>
        </div>

        {/* أوامر الشغل */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-800 text-white p-6 rounded-2xl shadow-lg shadow-indigo-500/20 relative overflow-hidden flex items-center justify-between">
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <p className="text-xs font-medium text-indigo-100">أوامر الشغل المفتوحة</p>
            <h3 className="text-3xl font-black tracking-tight mt-1">
              {stats.workOrdersCount}
            </h3>
            <span className="inline-block mt-2 text-[11px] bg-indigo-500/50 px-2 py-0.5 rounded-lg text-indigo-50">
              قيد التنفيذ
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner">
            🔧
          </div>
        </div>

        {/* غيارات الزيت */}
        <div className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white p-6 rounded-2xl shadow-lg shadow-cyan-500/20 relative overflow-hidden flex items-center justify-between">
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <p className="text-xs font-medium text-cyan-100">غيارات الزيت المستحقة</p>
            <h3 className="text-3xl font-black tracking-tight mt-1">
              {stats.oilChangesCount}
            </h3>
            <span className="inline-block mt-2 text-[11px] bg-cyan-500/50 px-2 py-0.5 rounded-lg text-cyan-50">
              تتطلب صيانة قريباً
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner">
            🛢️
          </div>
        </div>
      </div>

      {/* قسم الرسم البياني التوضيحي لتحليل السيارات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              تحليل حركة الأسطول والنشاط الأسبوعي
            </h3>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-lg">
              تحديث مباشر
            </span>
          </div>
          
          {/* محاكاة رسم بياني احترافي بالأعمدة وتدرجات الأزرق */}
          <div className="h-64 flex items-end justify-between gap-3 pt-8 px-4 border-b border-gray-100 dark:border-gray-800">
            {[
              { day: "السبت", val: 65, label: "18 سيارة" },
              { day: "الأحد", val: 85, label: "22 سيارة" },
              { day: "الإثنين", val: 95, label: "24 سيارة" },
              { day: "الثلاثاء", val: 75, label: "19 سيارة" },
              { day: "الأربعاء", val: 90, label: "23 سيارة" },
              { day: "الخميس", val: 60, label: "15 سيارة" },
              { day: "الجمعة", val: 40, label: "10 سيارات" },
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                  {item.label}
                </div>
                <div 
                  style={{ height: `${item.val}%` }}
                  className="w-full bg-gradient-to-t from-blue-600 to-sky-400 rounded-t-xl transition-all duration-500 group-hover:from-blue-700 group-hover:to-sky-300 shadow-sm"
                ></div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-1">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* توزيع حالات السيارات */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            حالة سيارات الأسطول
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                <span>سيارات نشطة (جاهزة للعمل)</span>
                <span className="text-blue-600 dark:text-blue-400">75%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full w-3/4"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                <span>تحت الصيانة والإصلاح</span>
                <span className="text-orange-500">20%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full w-1/5"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                <span>متوقفة / احتياطية</span>
                <span className="text-gray-400">5%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-gray-400 h-full rounded-full w-[5%]"></div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            💡 **ملاحظة إدارية:** معظم السيارات تعمل بكفاءة عالية في قطاع إدارة الحركة، مع وجود جدول صيانة دورية منتظم خلال الأسبوع الحالي.
          </div>
        </div>
      </div>

      {/* جدول الأنشطة الحديثة */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            آخر الأنشطة والسيارات المسجلة
          </h3>
          <span className="text-xs text-gray-500">عرض الكل</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">
                <th className="py-3.5 px-6">كود السيارة</th>
                <th className="py-3.5 px-6">نوع المركبة</th>
                <th className="py-3.5 px-6">السائق المسؤول</th>
                <th className="py-3.5 px-6">الحالة التشغيلية</th>
                <th className="py-3.5 px-6">موعد آخر صيانة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              <tr className="hover:bg-blue-50/30 dark:hover:bg-gray-800/30 transition-colors">
                <td className="py-4 px-6 font-bold text-blue-600 dark:text-blue-400">TR-101</td>
                <td className="py-4 px-6 text-gray-800 dark:text-gray-200 font-medium">تويوتا هايلكس</td>
                <td className="py-4 px-6 text-gray-600 dark:text-gray-300">أحمد محمد</td>
                <td className="py-4 px-6">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">
                    نشطة
                  </span>
                </td>
                <td className="py-4 px-6 text-gray-500 dark:text-gray-400">2026-06-15</td>
              </tr>
              <tr className="hover:bg-blue-50/30 dark:hover:bg-gray-800/30 transition-colors">
                <td className="py-4 px-6 font-bold text-blue-600 dark:text-blue-400">TR-102</td>
                <td className="py-4 px-6 text-gray-800 dark:text-gray-200 font-medium">إيسوزو نقل</td>
                <td className="py-4 px-6 text-gray-600 dark:text-gray-300">محمود علي</td>
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
