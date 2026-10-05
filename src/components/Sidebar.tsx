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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
      {/* ── زر القائمة للموبايل ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 right-3 z-40 p-2.5 rounded-xl bg-[#0B1A3B] text-white shadow-lg border border-slate-700 cursor-pointer"
        aria-label="فتح القائمة"
      >
        <Menu size={22} />
      </button>

      {/* ── خلفية معتمة عند الفتح في الموبايل ── */}
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
        {/* ── ترويسة السايدبار: اللوجو كبير في المنتصف وتحته الاسم والشركة ── */}
        <div className="relative border-b border-slate-800/80 p-5 flex flex-col items-center justify-center text-center shrink-0">
          {/* زر السهم لتقليص / توسيع البار في الزاوية */}
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
            className="hidden md:flex absolute top-3 left-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>

          {/* زر إغلاق القائمة في الموبايل */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden absolute top-3 left-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 cursor-pointer"
          >
            <X size={20} />
          </button>

          {/* اللوجو بحجم كبير وفي المنتصف */}
          <div
            className={`transition-all duration-300 flex items-center justify-center ${
              collapsed ? "w-12 h-12 mb-1" : "w-20 h-20 mb-3"
            } rounded-2xl bg-teal-500/10 border border-teal-500/20 shadow-md shadow-teal-950/20`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="TAQA Gas Logo"
              className={`${collapsed ? "w-8 h-8" : "w-14 h-14"} object-contain transition-all duration-300`}
            />
          </div>

          {!collapsed && (
            <div className="flex flex-col items-center">
              <h1 className="font-black text-lg tracking-wider text-white">FLEET 360</h1>
              <p className="text-[11px] font-bold text-teal-400 tracking-wide mt-0.5">
                TAQA GAS COMPANY
              </p>
            </div>
          )}
        </div>

        {/* ── قائمة الروابط: أيقونات بحجم أكبر ومريح (size 22) وتجاوب عالي للهاتف ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.name : undefined}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-bold transition-all ${
                  isActive
                    ? "bg-teal-600 text-white shadow-md shadow-teal-900/30"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                } ${collapsed ? "justify-center px-0 py-3" : "text-sm"}`}
              >
                <Icon size={22} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
