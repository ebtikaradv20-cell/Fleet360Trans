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
      {/* رأس الشريط الجانبي واللوجو */}
      <div className="p-4 border-b border-white/10 flex flex-col items-center justify-center text-center min-h-[5rem]">
        <div className="w-10 h-10 rounded-xl bg-white text-orange-600 flex items-center justify-center font-black shadow-lg flex-shrink-0">
          <span className="text-base font-black">F360</span>
        </div>
        {!collapsed && (
          <div className="mt-2 transition-all duration-300">
            <h1 className="text-base font-bold text-white tracking-wider drop-shadow-md">
              FLEET<span className="text-orange-200">360</span>
            </h1>
            {/* ✅ تم تصحيح الاسم هنا */}
            <p className="text-[10px] text-gray-200 font-medium tracking-wide">Trans Gas / TAQA ARABIA</p>
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
                    ? "bg-white/20 text-white shadow-inner border-s-4 border-white backdrop-blur-sm" // لون هادئ وأنيق للمحدد
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
