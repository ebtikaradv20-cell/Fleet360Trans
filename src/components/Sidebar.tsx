"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { LayoutDashboard, Car, Fuel, Wrench, Droplet, ClipboardCheck, Database, Users, LogOut, ShieldCheck } from "lucide-react";

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
        bg-[#09101E] text-white
        ${isRTL ? "right-0 border-l" : "left-0 border-r"} 
        border-white/5 flex flex-col h-screen fixed top-0 z-40 transition-all duration-300 shadow-2xl
      `}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* ── اللوجو العملاق ── */}
      <div className={`pt-6 pb-4 px-2 border-b border-white/5 flex flex-col items-center justify-center text-center transition-all duration-300`}>
        <img 
          src="/logo.png" alt="TAQA Gas Logo" 
          className={`${collapsed ? "w-12 h-12" : "w-36 h-36"} object-contain filter drop-shadow-2xl transition-all duration-300 -mb-5`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {!collapsed && (
          <div className="transition-all duration-300 flex flex-col items-center leading-none z-10">
            <h1 className="text-[26px] font-black text-white tracking-tight drop-shadow-lg" dir="ltr">
              FLEET <span className="text-teal-400">360</span>
            </h1>
            <p className="text-[10px] text-orange-400 font-black tracking-widest mt-1.5 uppercase drop-shadow-sm">Trans Gas / TAQA ARABIA</p>
          </div>
        )}
      </div>

      {/* ── القائمة ── */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {filteredMenu.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} title={collapsed ? item.name : undefined}
              // ⚡ الميكس الاحترافي (لون كحلي مدرج مع بوردر برتقالي ونصوص تيل) ⚡
              className={`
                flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all group 
                ${collapsed ? "justify-center" : "justify-start"} 
                ${isActive 
                  ? "bg-gradient-to-l from-[#0f172a] to-[#1e293b] shadow-lg border-s-4 border-orange-500 text-teal-400" 
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
                }
              `}>
              <span className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-teal-400 drop-shadow-md" : "text-gray-500 group-hover:text-white"}`}>{item.icon}</span>
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <Link href="/login" title={collapsed ? "تسجيل الخروج" : undefined} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:text-white hover:bg-red-500/80 transition-all ${collapsed ? "justify-center" : "justify-start"}`}>
          <span className="flex-shrink-0"><LogOut size={20} /></span>
          {!collapsed && <span className="truncate">تسجيل الخروج</span>}
        </Link>
      </div>
    </aside>
  );
}
