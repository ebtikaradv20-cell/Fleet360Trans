"use client";
import React, { useState } from "react";

export default function DashboardPage() {
  const [stats] = useState({
    vehiclesCount: 24,
    fuelTotal: 1420,
    workOrdersCount: 5,
    oilChangesCount: 3,
  });

  return (
    <div className="space-y-8 w-full">
      {/* بطاقات الإحصائيات المتناسقة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-100">إجمالي السيارات</p>
            <h3 className="text-3xl font-black mt-1">{stats.vehiclesCount}</h3>
            <span className="inline-block mt-2 text-[11px] bg-blue-500/50 px-2 py-0.5 rounded-lg text-blue-50">+2 هذا الشهر</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl">🚗</div>
        </div>

        <div className="bg-gradient-to-br from-sky-600 to-blue-600 text-white p-6 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-sky-100">استهلاك الوقود</p>
            <h3 className="text-3xl font-black mt-1">{stats.fuelTotal} <span className="text-sm font-normal">لتر</span></h3>
            <span className="inline-block mt-2 text-[11px] bg-sky-500/50 px-2 py-0.5 rounded-lg text-sky-50">معدل طبيعي</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl">⛽</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-blue-800 text-white p-6 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-indigo-100">أوامر الشغل المفتوحة</p>
            <h3 className="text-3xl font-black mt-1">{stats.workOrdersCount}</h3>
            <span className="inline-block mt-2 text-[11px] bg-indigo-500/50 px-2 py-0.5 rounded-lg text-indigo-50">قيد التنفيذ</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl">🔧</div>
        </div>

        <div className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white p-6 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-cyan-100">غيارات الزيت المستحقة</p>
            <h3 className="text-3xl font-black mt-1">{stats.oilChangesCount}</h3>
            <span className="inline-block mt-2 text-[11px] bg-cyan-500/50 px-2 py-0.5 rounded-lg text-cyan-50">تتطلب صيانة قريباً</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl">🛢️</div>
        </div>
      </div>

      {/* قسم الرسومات البيانية والتحليلات بحجم كامل ومتناسب */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">تحليل حركة الأسطول والنشاط الأسبوعي</h3>
            <span className="text-xs text-blue-600 font-semibold bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-lg">تحديث مباشر</span>
          </div>
          
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
                <div className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 font-bold">{item.label}</div>
                <div style={{ height: `${item.val}%` }} className="w-full bg-gradient-to-t from-blue-600 to-sky-400 rounded-t-xl transition-all duration-500 shadow-sm"></div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-1">{item.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">حالة سيارات الأسطول</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                <span>سيارات نشطة</span>
                <span className="text-blue-600">75%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full w-3/4"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                <span>تحت الصيانة</span>
                <span className="text-orange-500">20%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full w-1/5"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                <span>متوقفة</span>
                <span className="text-gray-400">5%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-gray-400 h-full rounded-full w-[5%]"></div>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            💡 **ملحوظة إدارية:** الأسطول يعمل بكفاءة عالية وفق جدول الصيانة المجدولة.
          </div>
        </div>
      </div>
    </div>
  );
}
