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
    setCollapsed((prev) => {
      const nextState = !prev;
      try {
        localStorage.setItem("fleet360_sidebar_collapsed", String(nextState));
      } catch (e) {}
      return nextState;
    });
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

      {/* ── خلفية معتمة للهواتف ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* ── الشريط الجانبي الثابت ── */}
      <aside
        className={`fixed md:sticky top-0 right-0 h-screen z-50 bg-[#0B1A3B] text-white flex flex-col border-l border-slate-800 transition-all duration-300 ease-in-out select-none shadow-2xl shrink-0 overflow-hidden ${
          collapsed ? "w-20" : "w-72"
        } ${
          mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        }`}
      >
        {/* ── 1. شريط التحكم العلوي وزر السهم المستقل تماماً (يفتح ويغلق دائماً) ── */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800/80 shrink-0 bg-[#091530]">
          {!collapsed && (
            <span className="text-[11px] font-bold text-slate-400">القائمة الرئيسية</span>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
            className={`p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer ${
              collapsed ? "mx-auto" : ""
            }`}
          >
            {collapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {/* ── 2. ترويسة اللوجو: كبير وبدون إطار وباللون الأبيض بالكامل ── */}
        <div className="p-4 flex flex-col items-center justify-center text-center shrink-0 border-b border-slate-800/60">
          <div className="flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="TAQA Gas Logo"
              className={`${
                collapsed ? "w-10 h-10" : "w-24 h-24"
              } object-contain transition-all duration-300 brightness-0 invert drop-shadow-md`}
            />
          </div>

          {!collapsed && (
            <div className="flex flex-col items-center mt-2.5">
              <h1 className="font-black text-lg tracking-wider text-white">FLEET 360</h1>
              <p className="text-[11px] font-bold text-slate-300 tracking-wide mt-0.5">
                TAQA GAS COMPANY
              </p>
            </div>
          )}
        </div>

        {/* ── 3. قائمة الصفحات: متقاربة من بعضها في الأعلى ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.name : undefined}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-bold transition-all ${
                  isActive
                    ? "bg-teal-600 text-white shadow-md shadow-teal-900/30"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                } ${collapsed ? "justify-center px-0 py-2.5" : "text-xs"}`}
              >
                <Icon size={19} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
