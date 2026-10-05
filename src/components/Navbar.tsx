"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  Search,
  Bell,
  Moon,
  Sun,
  LogOut
} from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const { user } = useApp() || {};
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState("ar");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    try {
      const isDark =
        localStorage.getItem("fleet360_dark") === "true" ||
        localStorage.getItem("fleet360_theme") === "dark" ||
        document.documentElement.classList.contains("dark");
      setDarkMode(isDark);

      const savedLang =
        localStorage.getItem("fleet360_lang") ||
        localStorage.getItem("lang") ||
        "ar";
      setLang(savedLang);
    } catch (e) {}
  }, []);

  const toggleDark = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("fleet360_dark", String(nextMode));
      localStorage.setItem("fleet360_theme", nextMode ? "dark" : "light");
    } catch (e) {}
  };

  const toggleLanguage = () => {
    const nextLang = lang === "ar" ? "en" : "ar";
    setLang(nextLang);
    document.documentElement.setAttribute("lang", nextLang);
    document.documentElement.setAttribute("dir", nextLang === "ar" ? "rtl" : "ltr");
    try {
      localStorage.setItem("fleet360_lang", nextLang);
    } catch (e) {}
  };

  // دالة تسجيل الخروج السريع ومسح بيانات الجلسة
  const handleLogout = async () => {
    if (!confirm("هل أنت متأكد من رغبتك في تسجيل الخروج؟")) return;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {}
    try {
      localStorage.removeItem("fleet360_token");
      document.cookie =
        "fleet360_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    } catch (e) {}
    router.push("/login");
  };

  const displayName = user?.name || "مدير النظام الرئيسي";
  const displayRole = user?.role || "owner";
  const firstLetter = displayName.trim().charAt(0) || "م";

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 py-3 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* ── شريط البحث الشامل ── */}
        <div className="flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search
              size={18}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث الشامل..."
              className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs rounded-xl pr-10 pl-4 py-2 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
            />
          </div>
        </div>

        {/* ── الإجراءات، بيانات المستخدم، وزر تسجيل الخروج ── */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* زر تبديل اللغة */}
          <button
            type="button"
            onClick={toggleLanguage}
            title="تغيير اللغة"
            className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {lang === "ar" ? "EN" : "عربي"}
          </button>

          {/* زر تبديل الوضع الليلي */}
          <button
            type="button"
            onClick={toggleDark}
            title={darkMode ? "الوضع النهاري" : "الوضع الليلي"}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
          </button>

          {/* زر الإشعارات */}
          <button
            type="button"
            title="الإشعارات والطلبات"
            onClick={() => router.push("/dashboard/approvals")}
            className="relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-500 rounded-full" />
          </button>

          <div className="h-6 w-px bg-gray-200 dark:border-gray-800 mx-1 hidden sm:block" />

          {/* شارة المستخدم الحالية */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
              {firstLetter}
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-xs font-black text-gray-900 dark:text-white leading-tight">
                {displayName}
              </div>
              <div className="text-[10px] text-teal-600 dark:text-teal-400 font-mono font-bold leading-tight">
                {displayRole}
              </div>
            </div>
          </div>

          {/* ── الإضافة رقم 2: زر تسجيل الخروج السريع في الهيدر العلوي ── */}
          <button
            type="button"
            onClick={handleLogout}
            title="تسجيل الخروج من الحساب"
            className="flex items-center gap-1.5 p-2 md:px-3 md:py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white transition-all cursor-pointer shadow-xs border border-rose-100 dark:border-rose-900/50"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </header>
  );
}
