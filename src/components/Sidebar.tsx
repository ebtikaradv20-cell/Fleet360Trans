"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
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
    <aside
      className={`
        ${collapsed ? "w-20" : "w-64"}
        bg-white dark:bg-gray-900 
        ${isRTL ? "border-l right-0" : "border-r left-0"} 
        border-gray-200 dark:border-gray-800 
        flex flex-col h-screen fixed top-0 z-40 
        transition-all duration-300 ease-in-out shadow-sm
      `}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* رأس الشريط الجانبي مع اللوجو المتكيف */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center min-h-[5rem]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white shadow-md flex-shrink-0">
          <span className="text-base font-black">F360</span>
        </div>
        {!collapsed && (
          <div className="mt-2 transition-all duration-300">
            <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-wider">
              FLEET<span className="text-orange-500">360</span>
            </h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">TRANSCAS / TAQA ARABIA</p>
          </div>
        )}
      </div>

      {/* قائمة التنقل */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={`
                flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all group
                ${collapsed ? "justify-center" : "justify-start"}
                ${
                  isActive
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-orange-500 dark:hover:text-orange-400"
                }
              `}
            >
              <span className={`text-xl flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-orange-500"}`}>
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* زر تسجيل الخروج */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
        <Link
          href="/login"
          title={collapsed ? "تسجيل الخروج" : undefined}
          className={`
            flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all
            ${collapsed ? "justify-center" : "justify-start"}
          `}
        >
          <span className="text-xl flex-shrink-0">🚪</span>
          {!collapsed && <span className="truncate">تسجيل الخروج</span>}
        </Link>
      </div>
    </aside>
  );
}
