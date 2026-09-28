"use client";
import React from "react";
import { useApp } from "@/context/AppContext";

export default function Navbar() {
  const { user, theme, setTheme, isRTL, setIsRTL } = useApp();

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 sticky top-0 z-30 transition-colors">
      {/* القسم الأيمن: الترحيب أو اسم المستخدم */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          مرحباً، {user?.name || user?.username || "مسؤول النظام"}
        </span>
      </div>

      {/* القسم الأيسر: الأدوات (اللغة، الثيم، تسجيل الخروج) */}
      <div className="flex items-center gap-3">
        {/* زر تبديل اللغة */}
        <button
          onClick={() => setIsRTL(!isRTL)}
          className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-semibold transition-colors"
        >
          {isRTL ? "English" : "العربية"}
        </button>

        {/* زر تبديل الثيم (أيقونة شمس / قمر ثابتة بدون حركة) */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-lg transition-colors cursor-pointer"
          title={theme === "dark" ? "الوضع المضيء" : "الوضع المظلم"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
