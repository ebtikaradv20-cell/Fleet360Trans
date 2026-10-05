"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
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
  LogOut,
  MoreVertical,
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
  const router = useRouter();
  const { user } = useApp();

  // حالة انكماش / توسع الشريط الجانبي (على الديسكتوب)
  const [collapsed, setCollapsed] = useState(false);
  // حالة فتح / إغلاق الشريط الجانبي (على الموبايل)
  const [mobileOpen, setMobileOpen] = useState(false);

  // استرجاع حالة الانكماش المحفوظة
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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {}
    try {
      localStorage.removeItem("fleet360_token");
      document.cookie = "fleet360_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    } catch (e) {}
    router.push("/login");
  };

  return (
    <>
      {/* ── زر فتح القائمة الجانبية في الموبايل (يظهر أعلى يمين الشاشة في الهاتف) ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 right-3 z-40 p-2.5 rounded-xl bg-slate-900 text-white shadow-lg border border-slate-700 focus:outline-none cursor-pointer"
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

      {/* ── الشريط الجانبي الرئيسي ── */}
      <aside
        className={`fixed md:sticky top-0 right-0 h-screen z-50 bg-[#0B1A3B] text-white flex flex-col justify-between border-l border-slate-800 transition-all duration-300 ease-in-out select-none shadow-2xl ${
          collapsed ? "w-20" : "w-64"
        } ${
          mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        }`}
      >
        {/* ── الجزء العلوي: اللوجو وزر الـ 3 نُقط ── */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="TAQA Gas Logo" className="w-7 h-7 object-contain" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <h1 className="font-black text-sm tracking-wide text-white">FLEET 360</h1>
                <p className="text-[10px] text-teal-400 font-medium">TAQA GAS COMPANY</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* زر الـ 3 نُقط للتقليص والتوسيع على الديسكتوب */}
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? "توسيع القائمة" : "تقليص القائمة"}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <MoreVertical size={18} />
            </button>

            {/* زر إغلاق القائمة في شاشات الموبايل */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── القائمة والروابط (قابلة للتمرير الداخلي لمنع دفع زر الخروج) ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-2.5 py-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
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

        {/* ── الجزء السفلي: زر تسجيل الخروج (مُثبت دائماً وظاهر في التطبيق والموبايل) ── */}
        <div className="p-3 border-t border-slate-800 shrink-0 pb-8 md:pb-4 bg-[#091530]">
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "تسجيل الخروج" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-600/20 transition-all cursor-pointer ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
