"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  LayoutDashboard,
  Car,
  Fuel,
  Wrench,
  Package,
  Droplet,
  ClipboardCheck,
  Users,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { isRTL } = useApp();

  const menuItems = [
    { name: "لوحة التحكم", href: "/dashboard", icon: <LayoutDashboard size={22} /> },
    { name: "السيارات", href: "/dashboard/vehicles", icon: <Car size={22} /> },
    { name: "الوقود", href: "/dashboard/fuel", icon: <Fuel size={22} /> },
    { name: "أوامر الشغل", href: "/dashboard/work-orders", icon: <Wrench size={22} /> },
    { name: "قطع الغيار", href: "/dashboard/spare-parts", icon: <Package size={22} /> },
    { name: "تغيير الزيوت", href: "/dashboard/oil-changes", icon: <Droplet size={22} /> },
    { name: "فحص السيارات", href: "/dashboard/vehicle-inspection", icon: <ClipboardCheck size={22} /> },
    { name: "المستخدمون", href: "/dashboard/users", icon: <Users size={22} /> },
  ];

  return (
    <aside
      className={`
        ${collapsed ? "w-20" : "w-64"}
        bg-gradient-to-b from-orange-600/95 via-orange-800/80 to-blue-950 text-white
        ${isRTL ? "right-0 border-l" : "left-0 border-r"} 
        border-white/10 
        flex flex-col h-screen fixed top-0 z-40 
        transition-all duration-300 ease-in-out shadow-2xl
      `}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* ── رأس الشريط الجانبي واللوجو البارز ── */}
      <div className={`p-4 border-b border-white/15 flex flex-col items-center justify-center text-center transition-all duration-300 ${collapsed ? "py-4" : "py-6"}`}>
        <img 
          src="/logo.png" 
          alt="Fleet360 Logo" 
          className={`${collapsed ? "w-11 h-11" : "w-24 h-24 sm:w-28 sm:h-28"} object-contain filter drop-shadow-xl transition-all duration-300 transform hover:scale-105`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            const fallback = document.getElementById('sidebar-logo-fallback');
            if (fallback) fallback.style.display = 'flex';
          }}
        />

        <div 
          id="sidebar-logo-fallback" 
          className="hidden w-12 h-12 rounded-xl bg-white text-orange-600 items-center justify-center font-black shadow-lg flex-shrink-0"
        >
          <span className="text-xl font-black">F360</span>
        </div>

        {!collapsed && (
          <div className="mt-3 transition-all duration-300 flex flex-col items-center">
            <h1 className="text-2xl font-black text-white tracking-wide drop-shadow-lg leading-tight" dir="ltr">
              FLEET <span className="text-orange-200">360</span>
            </h1>
            <p className="text-xs text-orange-100 font-extrabold tracking-wider mt-1 drop-shadow-sm uppercase">
              Trans Gas / TAQA ARABIA
            </p>
          </div>
        )}
      </div>

      {/* ── قائمة التنقل بتصميم صلب وأنيق ── */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={`
                flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all group
                ${collapsed ? "justify-center" : "justify-start"}
                ${
                  isActive
                    ? "bg-[#1E3A8A] text-white shadow-lg border-s-4 border-orange-400" // أزرق كحلي صلب ومميز بدلاً من الأبيض الباهت
                    : "text-gray-100 hover:bg-white/10 hover:text-white font-medium"
                }
              `}
            >
              <span className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-white drop-shadow-md" : "text-gray-200"}`}>
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* زر تسجيل الخروج */}
      <div className="p-3 border-t border-white/10">
        <Link
          href="/login"
          title={collapsed ? "تسجيل الخروج" : undefined}
          className={`
            flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold text-white hover:bg-red-500/80 transition-all
            ${collapsed ? "justify-center" : "justify-start"}
          `}
        >
          <span className="flex-shrink-0">
            <LogOut size={20} />
          </span>
          {!collapsed && <span className="truncate">تسجيل الخروج</span>}
        </Link>
      </div>
    </aside>
  );
}
