"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Fleet360Logo from "./Fleet360Logo";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";

const navItems = [
  { key: "dashboard", icon: "🏠", path: "/dashboard" },
  { key: "vehicles", icon: "🚗", path: "/dashboard/vehicles" },
  { key: "fuel", icon: "⛽", path: "/dashboard/fuel" },
  { key: "workOrders", icon: "🔧", path: "/dashboard/work-orders" },
  { key: "spareParts", icon: "📦", path: "/dashboard/spare-parts" },
  { key: "oilChange", icon: "🛢️", path: "/dashboard/oil-changes" },
  { key: "vehicleInspection", icon: "🔍", path: "/dashboard/vehicle-inspection" },
  { key: "users", icon: "👥", path: "/dashboard/users", adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, isRTL, user } = useApp();
  const t = translations[lang];
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false); // حالة القائمة في الموبايل

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <>
      {/* شريط علوي للهواتف فقط للتحكم في فتح وإغلاق القائمة دون المساس بالتصميم الأصلي */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <Fleet360Logo size={28} showText={true} />
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
          aria-label="Toggle Menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* طبقة عتمة خلف القائمة عند فتحها على الموبايل */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
        />
      )}

      {/* الـ Sidebar الأصلي تماماً مع إضافة خاصية الانزلاق والتجاوب مع الشاشات */}
      <aside
        className={`fixed top-0 bottom-0 z-50 ${collapsed ? "w-16" : "w-64"} transition-all duration-300 h-screen flex flex-col lg:static ${
          isRTL
            ? mobileOpen ? "right-0" : "-right-64 lg:right-auto"
            : mobileOpen ? "left-0" : "-left-64 lg:left-auto"
        } shadow-xl`}
        style={{ background: "linear-gradient(180deg, #1E3A8A 0%, #1e40af 60%, #1d4ed8 100%)" }}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-blue-700">
          {!collapsed && <Fleet360Logo size={36} showText={true} />}
          {collapsed && <Fleet360Logo size={32} showText={false} />}
          <div className="flex items-center gap-1">
            {/* زر التصغير للشاشات الكبيرة */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:block text-white/70 hover:text-white p-1 rounded"
            >
              {collapsed ? "▶" : "◀"}
            </button>
            {/* زر الإغلاق السريع للموبايل */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-white/70 hover:text-white p-1 rounded"
            >
              ✕
            </button>
          </div>
        </div>

        {/* User info */}
        {!collapsed && user && (
          <div className="px-4 py-3 border-b border-blue-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
                {user.name?.charAt(0) || "U"}
              </div>
              <div>
                <div className="text-white text-sm font-semibold">{user.name}</div>
                <div className="text-blue-300 text-xs">{user.role === "admin" ? t.admin : t.user}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(item => {
            if (item.adminOnly && user?.role !== "admin") return null;
            const active = pathname === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path));
            return (
              <Link key={item.key} href={item.path} onClick={() => setMobileOpen(false)}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg mb-1 transition-all cursor-pointer
                    ${active
                      ? "text-white font-semibold shadow-lg"
                      : "text-blue-200 hover:text-white hover:bg-white/10"
                    }`}
                  style={active ? { background: "linear-gradient(90deg, #F97316, #EA580C)" } : {}}
                >
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <span className="text-sm">{t[item.key as keyof typeof t] || item.key}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-blue-700">
          <button
            onClick={() => {
              setMobileOpen(false);
              handleLogout();
            }}
            className="flex items-center gap-3 px-4 py-2 w-full rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-all"
          >
            <span>🚪</span>
            {!collapsed && <span className="text-sm">{t.logout}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
