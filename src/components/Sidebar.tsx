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
  ChevronRight,
  Menu
} from "lucide-react";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed: initialCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  // محرك حالة داخلي يضمن عمل زر الطي حتى في حال عدم تمرير دالة خارجية
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
      className={`fixed top-0 right-0 h-screen bg-[#0B1325] border-l border-blue-950/60 z-40 transition-all duration-300 flex flex-col justify-between ${
        isCollapsed ? "w-20" : "w-64"
      }`}
      dir="rtl"
    >
      {/* ── الجزء العلوي: اللوجو وزر طي القائمة المستمر ── */}
      <div className="flex flex-col">
        <div className="p-4 flex items-center justify-between border-b border-white/10 relative">
          <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? "justify-center w-full" : ""}`}>
            {/* أيقونة اللوجو الرئيسية */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-teal-300 flex items-center justify-center text-[#0B1325] font-black shadow-md shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20m0-20a8 8 0 018 8v4a8 8 0 01-8 8m0-20a8 8 0 00-8 8v4a8 8 0 008 8" />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-black text-white text-base tracking-wider">FLEET 360</span>
                <span className="text-[10px] text-teal-300 font-bold tracking-widest uppercase">TAQA GAS COMPANY</span>
              </div>
            )}
          </div>

          {/* زر طي/توسيع القائمة: يظهر دائماً في الحالتين المطوية والمفتوحة */}
          <button 
            type="button"
            onClick={handleToggle}
            title={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
            className={`p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-all border border-white/5 shadow-sm ${
              isCollapsed ? "mt-3 mx-auto" : ""
            }`}
          >
            {isCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* ── قائمة الروابط: منزلة لتحت قليلاً بمحاذاة مساحة المحتوى مع تصميم الاندماج الكامل ── */}
        <nav className="p-3 space-y-2 mt-6 pt-2 overflow-y-auto max-h-[calc(100vh-140px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            // فحص دقيق للرابط النشط لمنع التعارض بين الصفحات الرئيسية والفرعية
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative group flex items-center gap-3.5 px-4 py-3 transition-all duration-200 ${
                  isActive
                    ? "bg-gray-50 dark:bg-gray-900 text-teal-900 dark:text-teal-300 font-black -ml-3 pl-5 rounded-r-2xl rounded-l-none border-r-4 border-teal-500 shadow-md"
                    : "text-gray-300 hover:text-white hover:bg-white/5 font-medium rounded-xl ml-0"
                } ${isCollapsed ? "justify-center px-2 !ml-0 !rounded-xl" : ""}`}
              >
                {/* أيقونة العنصر */}
                <Icon 
                  size={20} 
                  className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-teal-600 dark:text-teal-400" : "text-gray-400 group-hover:text-white"
                  }`} 
                />

                {/* نص الرابط */}
                {!isCollapsed && (
                  <span className="text-sm tracking-wide truncate">
                    {item.label}
                  </span>
                )}

                {/* ── المؤشر الانسيابي المدمج كلياً في خلفية الصفحة في الوضعين النهاري والليلي ── */}
                {isActive && !isCollapsed && (
                  <span 
                    className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-0 h-0 
                               border-y-[10px] border-y-transparent 
                               border-r-[10px] border-r-gray-50 dark:border-r-gray-900 
                               z-30 pointer-events-none drop-shadow-[-3px_0_2px_rgba(0,0,0,0.06)]"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── الجزء السفلي: تفاصيل النظام والإصدار ── */}
      {!isCollapsed && (
        <div className="p-4 border-t border-white/10 text-center">
          <p className="text-[11px] text-gray-400 font-semibold">نظام إدارة الأسطول الشامل</p>
          <p className="text-[10px] text-teal-400 font-bold mt-0.5">Enterprise v3.2</p>
        </div>
      )}
    </aside>
  );
}
