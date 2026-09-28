"use client";
import React from "react";
import { useApp } from "@/context/AppContext";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, isRTL, setLanguage } = useApp();

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        {/* زر إخفاء/إظهار القائمة الجانبية من اللوجو والبار العلوي */}
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 transition-colors"
          title="تصغير / توسيع القائمة"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 hidden sm:block">
          نظام إدارة الأسطول الشامل (Fleet360)
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* معلومات المستخدم */}
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold text-gray-900 dark:text-white">
            {user?.name || "مدير النظام"}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">
            {user?.email || "admin@fleet360.com"}
          </div>
        </div>

        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shadow-md shadow-blue-500/20">
          {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
        </div>
      </div>
    </header>
  );
}
