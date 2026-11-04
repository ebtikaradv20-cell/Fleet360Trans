"use client";

import React from "react";
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
  ChevronRight
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
      className={`fixed top-0 right-0 h-screen bg-[#070D1A] border-l border-blue-950/60 z-40 transition-all duration-300 flex flex-col justify-between ${
        collapsed ? "w-20" : "w-64"
      }`}
      dir="rtl"
    >
      <div className="flex flex-col">
        {/* ── 1. رأس القائمة: زر طي/توسيع السايد بار المتناسق مع حركة الصفحة ── */}
        <div className="p-3.5 border-b border-white/5 flex items-center justify-between">
          <button
            type="button"
            onClick={onToggle}
            className={`flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer ${
              collapsed ? "mx-auto justify-center" : ""
            }`}
            title={collapsed ? "توسيع القائمة" : "طي القائمة"}
          >
            <ChevronRight
              size={18}
              className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
            {!collapsed && <span>القائمة الرئيسية</span>}
          </button>
        </div>

        {/* ── 2. اللوجو الرسمي الأصلي لطاقة غاز بدون أي صناديق أو إطارات ── */}
        <div className={`py-5 px-3 flex flex-col items-center justify-center text-center transition-all ${
          collapsed ? "py-3 px-1" : ""
        }`}>
          <div className="flex flex-col items-center justify-center">
            {/* الشعار الأصلي TAQA Gas */}
            <svg
              viewBox="0 0 100 45"
              className={`${collapsed ? "w-12 h-7" : "w-28 h-13"} transition-all`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 28C24 10 76 10 88 28" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
              <circle cx="75" cy="18" r="6.5" fill="#FFFFFF" />
              <path d="M75 14C75 14 78 18 78 19.5C78 21.2 76.7 22.5 75 22.5C73.3 22.5 72 21.2 72 19.5C72 18 75 14 75 14Z" fill="#0EA5E9" />
              <text x="50" y="38" textAnchor="middle" fill="#FFFFFF" fontSize="18" fontWeight="900" fontFamily="sans-serif" letterSpacing="1.5">
                TAQA
              </text>
              <text x="50" y="44" textAnchor="middle" fill="#38BDF8" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" letterSpacing="1">
                GAS
              </text>
            </svg>

            {!collapsed && (
              <div className="mt-2 text-center">
                <span className="text-[13px] font-black text-white tracking-widest block leading-tight">
                  FLEET 360
                </span>
                <span className="text-[9px] text-gray-300 font-bold uppercase tracking-wider block mt-0.5">
                  TAQA GAS COMPANY
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. قائمة الروابط مع التدرج الأصفر الذائب تماماً في خلفية السايد بار ── */}
        <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-170px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative group flex items-center gap-3.5 px-4 py-3 transition-all duration-300 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-l from-amber-400 via-amber-400/40 to-transparent text-gray-950 font-black border-r-4 border-amber-400 rounded-r-xl rounded-l-none"
                    : "text-gray-300 hover:text-white hover:bg-white/5 font-medium rounded-xl"
                } ${collapsed ? "justify-center px-2 !rounded-xl !border-r-0" : ""}`}
              >
                {/* أيقونة العنصر */}
                <Icon 
                  size={20} 
                  className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-gray-950" : "text-gray-400 group-hover:text-white"
                  }`} 
                />

                {/* نص الرابط */}
                {!collapsed && (
                  <span className="text-sm tracking-wide truncate">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── أسفل القائمة ── */}
      {!collapsed && (
        <div className="p-4 border-t border-white/5 text-center">
          <p className="text-[11px] text-gray-500 font-semibold">نظام إدارة الأسطول الشامل</p>
          <p className="text-[10px] text-amber-400 font-bold mt-0.5">Enterprise Edition</p>
        </div>
      )}
    </aside>
  );
}
