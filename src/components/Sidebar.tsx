"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { isRTL } = useApp();

  const menuItems = [
    { name: "لوحة التحكم", href: "/dashboard", icon: "📊" },
    { name: "السيارات", href: "/dashboard/vehicles", icon: "🚗" },
    { name: "الوقود", href: "/dashboard/fuel", icon: "⛽" },
    { name: "أوامر الشغل", href: "/dashboard/work-orders", icon: "🔧" },
    { name: "قطع الغيار", href: "/dashboard/spare-parts", icon: "📦" },
    { name: "تغيير الزيوت", href: "/dashboard/oil-changes", icon: "🛢️" },
    { name: "فحص السيارات", href: "/dashboard/vehicle-inspection", icon: "🔍" },
    { name: "المستخدمون", href: "/dashboard/users", icon: "👥" },
  ];

  return (
    <aside className={`w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col h-screen fixed top-0 ${isRTL ? "right-0" : "left-0"} z-40 transition-all shadow-sm`} dir="rtl">
      {/* رأس الشريط الجانبي مع اللوجو المتكيف مع المود */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white shadow-md mb-2">
          <span className="text-xl font-black">F360</span>
        </div>
        <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-wider">
          FLEET<span className="text-orange-500">360</span>
        </h1>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">TRANSCAS / TAQA ARABIA</p>
      </div>

      {/* قائمة التنقل (فلات ارت - أبيض في برتقالي وواضح جداً عند الوقوف عليه) */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${
                isActive
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-orange-500 dark:hover:text-orange-400"
              }`}
            >
              <span className={`text-lg transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-orange-500"}`}>
                {item.icon}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* زر تسجيل الخروج في الأسفل */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <Link
          href="/login"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
        >
          <span className="text-lg">🚪</span>
          <span>تسجيل الخروج</span>
        </Link>
      </div>
    </aside>
  );
}
