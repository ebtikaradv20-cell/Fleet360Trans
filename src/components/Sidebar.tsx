"use client";
import React from "react";
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
  const { lang, isRTL, user, sidebarCollapsed, setSidebarCollapsed } = useApp();
  const t = translations[lang];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // تحديد اتجاه السهم بناءً على اللغة (RTL/LTR) وحالة الطي
  const getCollapseIcon = () => {
    if (isRTL) {
      return sidebarCollapsed ? "◀" : "▶";
    } else {
      return sidebarCollapsed ? "▶" : "◀";
    }
  };

  return (
    <aside
      className={`${sidebarCollapsed ? "w-16" : "w-64"} transition-all duration-300 h-screen flex flex-col fixed top-0 ${isRTL ? "right-0" : "left-0"} z-40 shadow-xl`}
      style={{ background: "linear-gradient(180deg, #1E3A8A 0%, #1e40af 60%, #1d4ed8 100%)" }}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-blue-700">
        {!sidebarCollapsed && <Fleet360Logo size={36} showText={true} />}
        {sidebarCollapsed && <Fleet360Logo size={32} showText={false} />}
        <button
          onClick={() => setSidebarCollapsed(prev => !prev)}
          className="text-white/70 hover:text-white p-1 rounded"
        >
          {getCollapseIcon()}
        </button>
      </div>

      {/* User info */}
      {!sidebarCollapsed && user && (
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
            <Link key={item.key} href={item.path}>
              <div
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg mb-1 transition-all cursor-pointer
                  ${active
                    ? "text-white font-semibold shadow-lg"
                    : "text-blue-200 hover:text-white hover:bg-white/10"
                  }`}
                style={active ? { background: "linear-gradient(90deg, #F97316, #EA580C)" } : {}}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {!sidebarCollapsed && (
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
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 w-full rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-all"
        >
          <span>🚪</span>
          {!sidebarCollapsed && <span className="text-sm">{t.logout}</span>}
        </button>
      </div>
    </aside>
  );
}
