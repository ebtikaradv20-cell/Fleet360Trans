"use client";
import React from "react";
import { useApp } from "@/context/AppContext";

interface NavbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Navbar({ sidebarOpen, setSidebarOpen }: NavbarProps) {
  const { user, theme, setTheme, isRTL, setIsRTL } = useApp();

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("fleet_theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const toggleRTL = () => {
    const nextRTL = !isRTL;
    setIsRTL(nextRTL);
    if (typeof window !== "undefined") {
      localStorage.setItem("fleet_rtl", String(nextRTL));
      document.documentElement.setAttribute("dir", nextRTL ? "rtl" : "ltr");
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 sticky top-0 z-30 transition-colors shadow-sm" dir="rtl">
      {/* القسم الأيمن: زر التحكم بالـ Sidebar وا اسم المستخدم */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          title="إخفاء/إظهار القائمة الجانبية"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          مرحباً، {user?.name || user?.username || "مسؤول النظام"}
        </span>
      </div>

      {/* القسم الأيسر: الأزرار الثابتة للغة والثيم */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleRTL}
          className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold transition-all cursor-pointer select-none shadow-sm flex items-center justify-center min-w-[75px]"
        >
          {isRTL ? "English" : "العربية"}
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-base transition-all cursor-pointer select-none shadow-sm"
          title={theme === "dark" ? "الوضع المضيء" : "الوضع المظلم"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
