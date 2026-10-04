"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { Search, Moon, Sun, Bell, Menu } from "lucide-react";

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const {
    user,
    theme,
    toggleTheme,
    lang,
    language,
    setLang,
    setLanguage,
    toggleLanguage,
    toggleSidebar,
  } = useApp() as any;

  const currentLang = lang || language || "ar";

  // دالة تبديل اللغة بأمان مع مختلف طرق تعريفها في Context
  const handleToggleLanguage = () => {
    if (typeof toggleLanguage === "function") {
      toggleLanguage();
    } else if (typeof setLang === "function") {
      setLang(currentLang === "ar" ? "en" : "ar");
    } else if (typeof setLanguage === "function") {
      setLanguage(currentLang === "ar" ? "en" : "ar");
    }
  };

  const handleToggleTheme = () => {
    if (typeof toggleTheme === "function") {
      toggleTheme();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors">
      {/* ── الجانب الأيمن: القائمة والبحث الشامل ── */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <button
          type="button"
          onClick={onMenuClick || toggleSidebar}
          className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
          aria-label="Toggle Menu"
        >
          <Menu size={20} />
        </button>

        <div className="relative w-full max-w-xs">
          <input
            type="text"
            placeholder="البحث الشامل..."
            className="w-full pl-4 pr-10 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:text-white"
          />
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
      </div>

      {/* ── الجانب الأيسر: زر اللغة، الوضع الليلي، الإشعارات، وبيانات المستخدم ── */}
      <div className="flex items-center gap-3">
        {/* ✅ زر تبديل اللغة: تم عكس النص الخارجي لعرض AR على العربي و EN على الإنجليزي */}
        <button
          type="button"
          onClick={handleToggleLanguage}
          className="px-3 py-1.5 text-xs font-black tracking-wider uppercase border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          title="تغيير اللغة / Change Language"
        >
          {currentLang === "ar" ? "AR" : "EN"}
        </button>

        {/* زر الوضع الليلي / النهاري */}
        <button
          type="button"
          onClick={handleToggleTheme}
          className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* زر الإشعارات */}
        <button
          type="button"
          className="relative p-2 text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>

        {/* بيانات المستخدم الحالي */}
        <div className="flex items-center gap-2.5 pr-2 border-r border-gray-200 dark:border-gray-800">
          <div className="flex flex-col text-left rtl:text-right">
            <span className="text-xs font-bold text-gray-800 dark:text-white leading-tight">
              {user?.name || "مدير النظام الرئيسي"}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {user?.roleName || user?.role || "Fleet Manager"}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            {user?.name ? user.name.trim().charAt(0) : "م"}
          </div>
        </div>
      </div>
    </header>
  );
}
