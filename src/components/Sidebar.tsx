"use client";

import React, { useState, useEffect } from "react";
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

export default function Sidebar({ collapsed: initialCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  useEffect(() => {
    setIsCollapsed(initialCollapsed);
  }, [initialCollapsed]);

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

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
        isCollapsed ? "w-20" : "w-64"
      }`}
      dir="rtl"
    >
      <div className="flex flex-col">
        {/* ── 1. بار لوجو TAQA Gas المميز بالحجم الكبير ── */}
        <div className="p-3 border-b border-white/5 relative">
          <div className={`bg-[#0F1B33] border border-blue-900/40 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden ${
            isCollapsed ? "py-2 px-1" : ""
          }`}>
            {/* اللوجو الرسمي بألوانه الأصلية بحجم كبير يملأ المساحة */}
            <div className="flex flex-col items-center justify-center">
              <svg 
                viewBox="0 0 100 45" 
                className={`${isCollapsed ? "w-12 h-8" : "w-28 h-14"} transition-all`}
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* قوس طاقة المميز */}
                <path d="M12 28C24 10 76 10 88 28" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
                {/* أيقونة شعلة/قطرة طاقة */}
                <circle cx="75" cy="18" r="6.5" fill="#FFFFFF" />
                <path d="M75 14C75 14 78 18 78 19.5C78 21.2 76.7 22.5 75 22.5C73.3 22.5 72 21.2 72 19.5C72 18 75 14 75 14Z" fill="#0EA5E9" />
                {/* كلمة TAQA */}
                <text x="50" y="38" textAnchor="middle" fill="#FFFFFF" fontSize="18" fontWeight="900" fontFamily="sans-serif" letterSpacing="1.5">
                  TAQA
                </text>
                {/* كلمة Gas */}
                <text x="50" y="44" textAnchor="middle" fill="#38BDF8" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" letterSpacing="1">
                  GAS
                </text>
              </svg>

              {!isCollapsed && (
                <div className="mt-1">
                  <span className="text-[12px] font-black text-white tracking-widest block">FLEET 360</span>
                  <span className="text-[9px] text-sky-400 font-bold uppercase tracking-wider block">TAQA GAS COMPANY</span>
                </div>
              )}
            </div>

            {/* زر طي وتوسيع القائمة */}
            <button 
              type="button"
              onClick={handleToggle}
              title={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
              className="absolute top-2 left-2 p-1 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-all border border-white/5 cursor-pointer"
            >
              {isCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>

        {/* ── 2. قائمة الروابط مع تمييز القسم النشط باللون الأصفر ── */}
        <nav className="p-3 space-y-1.5 mt-2 overflow-y-auto max-h-[calc(100vh-170px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative group flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-amber-400 text-gray-950 font-black shadow-lg shadow-amber-400/25 scale-[1.01]"
                    : "text-gray-300 hover:text-white hover:bg-white/5 font-medium"
                } ${isCollapsed ? "justify-center px-2" : ""}`}
              >
                {/* أيقونة العنصر */}
                <Icon 
                  size={20} 
                  className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-gray-950" : "text-gray-400 group-hover:text-white"
                  }`} 
                />

                {/* نص الرابط */}
                {!isCollapsed && (
                  <span className="text-sm tracking-wide truncate">
                    {item.label}
                  </span>
                )}

                {/* المؤشر الجانبي للقسم النشط */}
                {isActive && !isCollapsed && (
                  <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_#F59E0B]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── أسفل القائمة ── */}
      {!isCollapsed && (
        <div className="p-4 border-t border-white/5 text-center">
          <p className="text-[11px] text-gray-500 font-semibold">نظام إدارة الأسطول الشامل</p>
          <p className="text-[10px] text-amber-400 font-bold mt-0.5">Enterprise Edition</p>
        </div>
      )}
    </aside>
  );
}
