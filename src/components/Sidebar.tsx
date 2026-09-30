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
    { name: "الطلبات والموافقات", href: "/dashboard/approvals", icon: <ShieldCheck size={22} /> },
    { name: "المستخدمون", href: "/dashboard/users", icon: <Users size={22} /> },
  ];

  const filteredMenu = menuItems.filter(item => {
    if (user?.role === "user" && (item.href.includes("users") || item.href.includes("approvals"))) return false;
    return true;
  });

  return (
    <aside
      className={`
        ${collapsed ? "w-20" : "w-64"}
        bg-[#0B1325] text-white
        ${isRTL ? "right-0 border-l" : "left-0 border-r"} 
        border-white/5 flex flex-col h-screen fixed top-0 z-40 transition-all duration-300 shadow-2xl
      `}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* ── رأس القائمة: اللوجو العملاق وبدون فلاتر بيضاء ── */}
      <div className={`pt-8 pb-6 px-2 border-b border-white/10 flex flex-col items-center justify-center text-center transition-all duration-300`}>
        <img 
          src="/logo.png" alt="TAQA Gas Logo" 
          // تم إزالة فلتر invert ليظهر اللوجو بألوانه الحقيقية الجميلة، مع تكبير حجمه
          className={`${collapsed ? "w-14 h-14" : "w-36 h-36"} object-contain filter drop-shadow-2xl transition-all duration-300 mb-2 transform hover:scale-105`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {!collapsed && (
          <div className="transition-all duration-300 flex flex-col items-center leading-none mt-1">
            <h1 className="text-2xl font-black text-white tracking-wide drop-shadow-lg" dir="ltr">
              FLEET <span className="text-emerald-500">360</span>
            </h1>
            <p className="text-[10px] text-emerald-200/80 font-extrabold tracking-widest mt-1.5 uppercase">
              TAQA Gas Company
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
        {filteredMenu.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} title={collapsed ? item.name : undefined}
              className={`
                flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all group 
                ${collapsed ? "justify-center" : "justify-start"} 
                ${isActive 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 border-s-4 border-emerald-300" // 👈 لون طاقة الأخضر للعنصر النشط
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
                }
              `}>
              <span className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-gray-500 group-hover:text-emerald-400"}`}>{item.icon}</span>
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <Link href="/login" title={collapsed ? "تسجيل الخروج" : undefined} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-red-500/80 transition-all ${collapsed ? "justify-center" : "justify-start"}`}>
          <span className="flex-shrink-0"><LogOut size={20} /></span>
          {!collapsed && <span className="truncate">تسجيل الخروج</span>}
        </Link>
      </div>
    </aside>
  );
}
