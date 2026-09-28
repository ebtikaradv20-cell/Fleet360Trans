"use client";
import React from "react";
import { useApp } from "@/context/AppContext";

export default function Navbar() {
  const { user, theme, setTheme, isRTL, setIsRTL } = useApp();

  // معالجة تبديل الثيم بشكل مباشر وثابت
  const handleThemeToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  // معالجة تبديل اللغة واتجاه الشاشة بشكل مباشر وثابت
  const handleLangToggle = () => {
    const nextRTL = !isRTL;
    setIsRTL(nextRTL);
    if (typeof window !== "undefined") {
      localStorage.setItem("isRTL", String(nextRTL));
      document.documentElement.setAttribute("dir", nextRTL ? "rtl" : "ltr");
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 sticky top-0 z-30 transition-colors">
      {/* القسم الأيمن: اسم المستخدم */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          مرحباً، {user?.name || user?.username || "مسؤول النظام"}
        </span>
      </div>

      {/* القسم الأيسر: الأزرار الفلات الثابتة في مكانها وبدقة تامة */}
      <div className="flex items-center gap-3">
        {/* زر تبديل اللغة (يعمل بفاعلية تامة الآن) */}
        <button
          type="button"
          onClick={handleLangToggle}
          className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold transition-all cursor-pointer select-none shadow-sm flex items-center justify-center min-w-[75px]"
        >
          {isRTL ? "English" : "العربية"}
        </button>

        {/* زر تبديل الثيم (شمس وقمة فلات وثابت في مكانه وبدون أي حركة مزعجة) */}
        <button
          type="button"
          onClick={handleThemeToggle}
          className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-base transition-all cursor-pointer select-none shadow-sm"
          title={theme === "dark" ? "الوضع المضيء" : "الوضع المظلم"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
