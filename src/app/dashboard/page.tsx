"use client";
import React from "react";
// ❌ أزل أي import لـ Navbar أو Sidebar من هنا!

export default function DashboardPage() {
  return (
    // ✅ استخدم w-full وتجنب وضع max-w ضيق هنا
    <div className="w-full space-y-6">
      {/* عنوان الصفحة */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">لوحة التحكم</h1>
        <p className="text-gray-500 text-sm mt-1">مرحباً بك في نظام إدارة الأسطول الشامل Fleet360</p>
      </div>

      {/* الكروت الأربعة (Stats Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* كارت 1 */}
        <div className="bg-blue-900 text-white rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="text-3xl font-black">0</span>
            <span className="text-2xl">🚗</span>
          </div>
          <div className="font-bold">إجمالي السيارات</div>
          <div className="text-xs text-blue-200 mt-1">0 السيارات النشطة</div>
        </div>

        {/* كارت 2 */}
        <div className="bg-orange-500 text-white rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="text-3xl font-black">0</span>
            <span className="text-2xl">🔧</span>
          </div>
          <div className="font-bold">أوامر شغل مفتوحة</div>
          <div className="text-xs text-orange-100 mt-1">أوامر شغل مفتوحة</div>
        </div>

        {/* كارت 3 */}
        <div className="bg-sky-600 text-white rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="text-3xl font-black">0 <span className="text-sm">ر.س</span></span>
            <span className="text-2xl">⛽</span>
          </div>
          <div className="font-bold">إجمالي تكلفة الوقود</div>
          <div className="text-xs text-sky-100 mt-1">إجمالي تكاليف الوقود</div>
        </div>

        {/* كارت 4 */}
        <div className="bg-purple-600 text-white rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="text-3xl font-black">0</span>
            <span className="text-2xl">📦</span>
          </div>
          <div className="font-bold">قطع منخفضة المخزون</div>
          <div className="text-xs text-purple-100 mt-1">قطع منخفضة أو منتهية</div>
        </div>
      </div>

      {/* باقي عناصر اللوحة (الجداول والإجراءات السريعة) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* توزيع حالة الأسطول */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h2 className="font-bold text-gray-800 dark:text-white mb-4">🚛 توزيع حالة الأسطول</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm py-2 border-b border-gray-50 dark:border-gray-800">
              <span className="text-gray-500">نشطة</span>
              <span className="font-bold">0</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-gray-50 dark:border-gray-800">
              <span className="text-gray-500">قيد الصيانة</span>
              <span className="font-bold">0</span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-gray-500">منتهية الرخصة</span>
              <span className="font-bold">0</span>
            </div>
          </div>
        </div>

        {/* الإجراءات السريعة */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h2 className="font-bold text-gray-800 dark:text-white mb-4">⚡ الإجراءات السريعة</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-3 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between text-sm font-medium">
              <span>إضافة سيارة</span>
              <span>🚗</span>
            </button>
            <button className="p-3 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between text-sm font-medium">
              <span>إضافة وقود</span>
              <span>⛽</span>
            </button>
            <button className="p-3 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between text-sm font-medium">
              <span>أمر شغل جديد</span>
              <span>🔧</span>
            </button>
            <button className="p-3 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between text-sm font-medium">
              <span>تغيير زيوت</span>
              <span>🛢️</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
