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
  ClipboardCheck,
  Layers,
  CheckSquare,
  Users,
  ChevronRight,
  ChevronLeft,
  Menu,
  X
} from "lucide-react";

const navigationItems = [
  { name: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
  { name: "السيارات", href: "/dashboard/vehicles", icon: Car },
  { name: "الوقود", href: "/dashboard/fuel", icon: Fuel },
  { name: "الصيانة", href: "/dashboard/work-orders", icon: Wrench },
  { name: "الزيوت وقطع الغيار", href: "/dashboard/oil-changes", icon: Droplets },
  { name: "فحص السيارات", href: "/dashboard/vehicle-inspection", icon: ClipboardCheck },
  { name: "داتا الأسطول الشاملة", href: "/dashboard/fleet-data", icon: Layers },
  { name: "الطلبات والموافقات", href: "/dashboard/approvals", icon: CheckSquare },
  { name: "المستخدمون", href: "/dashboard/users", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();

  // حالة تقليص / توسيع البار على الديسكتوب
  const [collapsed, setCollapsed] = useState(false);
  // حالة فتح البار كـ Drawer على الموبايل
  const [mobileOpen, setMobileOpen] = useState(false);

  // استرجاع حالة الانكماش المحفوظة في المتصفح
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fleet360_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch (e) {}
  }, []);

  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    try {
      localStorage.setItem("fleet360_sidebar_collapsed", String(newState));
    } catch (e) {}
  };

  return (
    <>
      {/* ── زر القائمة للشاشات الصغيرة (الموبايل فقط) ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 right-3 z-40 p-2 rounded-xl bg-[#0B1A3B] text-white shadow-lg border border-slate-700 cursor-pointer"
        aria-label="فتح القائمة"
      >
        <Menu size={20} />
      </button>

      {/* ── خلفية معتمة عند فتح القائمة على الموبايل ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* ── الشريط الجانبي الأساسي ── */}
      <aside
        className={`fixed md:sticky top-0 right-0 h-screen z-50 bg-[#0B1A3B] text-white flex flex-col border-l border-slate-800 transition-all duration-300 ease-in-out select-none shadow-xl shrink-0 ${
          collapsed ? "w-20" : "w-64"
        } ${
          mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        }`}
      >
        {/* ── الترويسة: اللوجو + زر السهم التفاعلي ── */}
        <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="TAQA Logo" className="w-7 h-7 object-contain" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <h1 className="font-black text-sm tracking-wide text-white leading-tight">FLEET 360</h1>
                <p className="text-[10px] text-teal-400 font-medium leading-tight">TAQA GAS COMPANY</p>
              </div>
            )}
          </div>

          <div className="flex items-center">
            {/* زر السهم التفاعلي لتقليص وتوسيع البار */}
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>

            {/* زر إغلاق القائمة في الموبايل */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── قائمة الروابط والصفحات ── */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  isActive
                    ? "bg-teal-600 text-white shadow-md shadow-teal-900/30"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
