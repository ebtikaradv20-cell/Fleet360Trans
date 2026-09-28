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
    { name: "لوحة التحكم", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "السيارات", href: "/dashboard/vehicles", icon: <Car size={20} /> },
    { name: "الوقود", href: "/dashboard/fuel", icon: <Fuel size={20} /> },
    { name: "أوامر الشغل", href: "/dashboard/work-orders", icon: <Wrench size={20} /> },
    { name: "قطع الغيار", href: "/dashboard/spare-parts", icon: <Package size={20} /> },
    { name: "تغيير الزيوت", href: "/dashboard/oil-changes", icon: <Droplet size={20} /> },
    { name: "فحص السيارات", href: "/dashboard/vehicle-inspection", icon: <ClipboardCheck size={20} /> },
    { name: "المستخدمون", href: "/dashboard/users", icon: <Users size={20} /> },
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
      {/* رأس الشريط الجانبي واللوجو المحدث */}
      <div className="p-4 border-b border-white/10 flex flex-col items-center justify-center text-center min-h-[5.5rem]">
        {/* صورة اللوجو الحقيقية */}
        <img 
          src="/logo.png" 
          alt="Fleet360 Logo" 
          className={`${collapsed ? "w-10 h-10" : "w-14 h-14"} object-contain drop-shadow-md transition-all duration-300`}
          onError={(e) => {
            // في حالة عدم توفر الصورة يظهر المكون البديل تلقائياً
            (e.target as HTMLImageElement).style.display = 'none';
            const fallback = document.getElementById('sidebar-logo-fallback');
            if (fallback) fallback.style.display = 'flex';
          }}
        />

        {/* كارت بديل بحرف F360 إذا لم تُحمل الصورة */}
        <div 
          id="sidebar-logo-fallback" 
          className="hidden w-10 h-10 rounded-xl bg-white text-orange-600 items-center justify-center font-black shadow-lg flex-shrink-0"
        >
          <span className="text-base font-black">F360</span>
        </div>

        {!collapsed && (
          <div className="mt-1.5 transition-all duration-300">
            <h1 className="text-base font-bold text-white tracking-wider drop-shadow-md" dir="ltr">
              FLEET<span className="text-orange-200">360</span>
            </h1>
            <p className="text-[10px] text-gray-200 font-medium tracking-wide">
              Trans Gas / TAQA ARABIA
            </p>
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
                flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all group
                ${collapsed ? "justify-center" : "justify-start"}
                ${
                  isActive
                    ? "bg-white/20 text-white shadow-inner border-s-4 border-white backdrop-blur-sm"
                    : "text-gray-100 hover:bg-white/10 hover:text-white"
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
