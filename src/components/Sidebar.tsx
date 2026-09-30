"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  LayoutDashboard, Car, Fuel, Wrench, Droplet, 
  ClipboardCheck, Database, Users, LogOut, ShieldCheck
} from "lucide-react";

interface SidebarProps { collapsed?: boolean; }

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { isRTL, user } = useApp();

  const menuItems = [
    { name: "لوحة التحكم", href: "/dashboard", icon: <LayoutDashboard size={22} /> },
    { name: "السيارات", href: "/dashboard/vehicles", icon: <Car size={22} /> },
    { name: "الوقود", href: "/dashboard/fuel", icon: <Fuel size={22} /> },
    { name: "الصيانات", href: "/dashboard/work-orders", icon: <Wrench size={22} /> },
    { name: "الزيوت وقطع الغيار", href: "/dashboard/oil-changes", icon: <Droplet size={22} /> },
    { name: "فحص السيارات", href: "/dashboard/vehicle-inspection", icon: <ClipboardCheck size={22} /> },
    { name: "داتا الأسطول الشاملة", href: "/dashboard/fleet-data", icon: <Database size={22} /> },
    // 🌟 الشاشة الجديدة لإدارة طلبات الحذف والموافقات
    { name: "الطلبات والموافقات", href: "/dashboard/approvals", icon: <ShieldCheck size={22} /> },
    { name: "المستخدمون", href: "/dashboard/users", icon: <Users size={22} /> },
  ];

  // إخفاء الموافقات والمستخدمين عن المستوى الثالث (user)
  const filteredMenu = menuItems.filter(item => {
    if (user?.role === "user" && (item.href.includes("users") || item.href.includes("approvals"))) return false;
    return true;
  });

  return (
    <aside
      className={`
        ${collapsed ? "w-20" : "w-64"}
        bg-gradient-to-b from-orange-600/95 via-orange-800/80 to-blue-950 text-white
        ${isRTL ? "right-0 border-l" : "left-0 border-r"} 
        border-white/10 flex flex-col h-screen fixed top-0 z-40 transition-all duration-300 shadow-2xl
      `}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="pt-4 pb-3 px-2 border-b border-white/15 flex flex-col items-center justify-center text-center transition-all duration-300">
        <img 
          src="/logo.png" alt="Fleet360 Logo" 
          className={`${collapsed ? "w-11 h-11" : "w-24 h-24"} object-contain filter drop-shadow-xl transition-all duration-300 -mb-1 brightness-0 invert`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {!collapsed && (
          <div className="transition-all duration-300 flex flex-col items-center leading-none">
            <h1 className="text-xl font-black text-white tracking-wide drop-shadow-lg" dir="ltr">
              FLEET <span className="text-orange-200">360</span>
            </h1>
            <p className="text-[10px] text-orange-100 font-extrabold tracking-wider mt-0.5 drop-shadow-sm uppercase">Trans Gas / TAQA ARABIA</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {filteredMenu.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} title={collapsed ? item.name : undefined}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all group ${collapsed ? "justify-center" : "justify-start"} ${isActive ? "bg-[#1E3A8A] text-white shadow-lg border-s-4 border-orange-400" : "text-gray-100 hover:bg-white/10 hover:text-white"}`}>
              <span className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-white drop-shadow-md" : "text-gray-200"}`}>{item.icon}</span>
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <Link href="/login" title={collapsed ? "تسجيل الخروج" : undefined} className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold text-white hover:bg-red-500/80 transition-all ${collapsed ? "justify-center" : "justify-start"}`}>
          <span className="flex-shrink-0"><LogOut size={20} /></span>
          {!collapsed && <span className="truncate">تسجيل الخروج</span>}
        </Link>
      </div>
    </aside>
  );
}
