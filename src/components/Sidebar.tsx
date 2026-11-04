"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Car, 
  Fuel, 
  Wrench, 
  Droplets, 
  ShieldCheck, 
  Database, 
  CheckSquare, 
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
    { label: "السيارات", href: "/dashboard/vehicles", icon: Car },
    { label: "الوقود", href: "/dashboard/fuel", icon: Fuel },
    { label: "الصيانة", href: "/dashboard/work-orders", icon: Wrench },
    { label: "الزيوت وقطع الغيار", href: "/dashboard/oil-changes", icon: Droplets },
    { label: "فحص السيارات", href: "/dashboard/vehicle-inspection", icon: ShieldCheck },
    { label: "داتا الأسطول الشاملة", href: "/dashboard/fleet-data", icon: Database },
    { label: "الطلبات والموافقات", href: "/dashboard/approvals", icon: CheckSquare },
    { label: "المستخدمون", href: "/dashboard/users", icon: Users },
  ];

  return (
    <aside 
      className={`fixed top-0 right-0 h-screen bg-[#0B1325] border-l border-blue-950/60 z-40 transition-all duration-300 flex flex-col justify-between ${
        collapsed ? "w-20" : "w-64"
      }`}
      dir="rtl"
    >
      {/* ── الجزء العلوي: اللوجو والهوية ── */}
      <div>
        <div className="p-5 flex items-center justify-between border-b border-white/5 relative">
          <div className={`flex items-center gap-3 overflow-hidden transition-all ${collapsed ? "justify-center w-full" : ""}`}>
            {/* أيقونة / لوجو TAQA Gas */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-teal-300 flex items-center justify-center text-[#0B1325] font-black shadow-md shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20m0-20a8 8 0 018 8v4a8 8 0 01-8 8m0-20a8 8 0 00-8 8v4a8 8 0 008 8" />
              </svg>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-black text-white text-base tracking-wider">FLEET 360</span>
                <span className="text-[10px] text-teal-300 font-bold tracking-widest uppercase">TAQA GAS COMPANY</span>
              </div>
            )}
          </div>

          {onToggle && !collapsed && (
            <button 
              onClick={onToggle}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* ── قائمة الروابط مع تصميم السهم الانسيابي المتداخل ── */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            // فحص الرابط النشط بدقة
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative group flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-white dark:bg-[#0B1325] text-teal-700 dark:text-teal-400 font-black shadow-lg shadow-black/10"
                    : "text-gray-300 hover:text-white hover:bg-white/5 font-medium"
                } ${collapsed ? "justify-center px-2" : ""}`}
              >
                {/* أيقونة العنصر */}
                <Icon 
                  size={20} 
                  className={`shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                    isActive ? "text-teal-600 dark:text-teal-400" : "text-gray-400 group-hover:text-white"
                  }`} 
                />

                {/* نص الرابط */}
                {!collapsed && (
                  <span className="text-sm tracking-wide">
                    {item.label}
                  </span>
                )}

                {/* ── سهم متداخل فخم يتجه لليسار داخل مساحة صفحة السكشن ── */}
                {isActive && (
                  <div 
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 
                               border-y-[9px] border-y-transparent 
                               border-r-[11px] border-r-white dark:border-r-[#0B1325] 
                               drop-shadow-[-3px_0_3px_rgba(0,0,0,0.06)] 
                               transition-all duration-300 pointer-events-none" 
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── أسفل القائمة: معلومات الإصدار ── */}
      {!collapsed && (
        <div className="p-4 border-t border-white/5 text-center">
          <p className="text-[11px] text-gray-500 font-semibold">نظام إدارة الأسطول الشامل</p>
          <p className="text-[10px] text-teal-400/80 font-bold mt-0.5">Enterprise v3.2</p>
        </div>
      )}
    </aside>
  );
}
