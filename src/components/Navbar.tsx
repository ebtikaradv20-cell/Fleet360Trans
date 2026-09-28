"use client";
import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";
import { Search, Bell, Sun, Moon, Menu } from "lucide-react";

interface NavbarProps {
  onSearch?: (q: string) => void;
  onToggleSidebar?: () => void;
}

export default function Navbar({ onSearch, onToggleSidebar }: NavbarProps) {
  const { lang, setLang, darkMode, toggleDarkMode, user } = useApp();
  const t = translations[lang] || translations["ar"];
  const [search, setSearch] = useState("");
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) {
          setNotifCount(
            (d.licenseAlerts || 0) + (d.oilAlerts || 0) + (d.insuranceAlerts || 0)
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header className="h-16 flex items-center gap-4 px-4 sm:px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-30 transition-colors duration-300">
      
      {/* ── زر طي / توسيع القائمة الجانبية (Sidebar Toggle) ── */}
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600 transition-colors flex-shrink-0"
          title="تصغير / توسيع القائمة"
        >
          <Menu size={20} />
        </button>
      )}

      {/* ── البحث الشامل ── */}
      <div className="flex-1 max-w-lg">
        <div className="relative flex items-center">
          <span className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-gray-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder={t.globalSearch || "بحث شامل..."}
            className="w-full bg-gray-100 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/60 rounded-xl py-2 ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white dark:placeholder-gray-400 transition-all duration-200"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 ms-auto">
        
        {/* ── محول اللغة ── */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-100 dark:bg-gray-800">
          {(["ar", "en"] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all duration-200 ${
                lang === l
                  ? "bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ── زر الوضع الليلي/النهاري ── */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? t.lightMode : t.darkMode}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all duration-200 flex-shrink-0 border border-gray-200/80 dark:border-gray-700/80"
        >
          {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
        </button>

        {/* ── الإشعارات ── */}
        <div className="relative">
          <button 
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all border border-gray-200/80 dark:border-gray-700/80"
            title="الإشعارات"
          >
            <Bell size={18} />
          </button>
          {notifCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md bg-orange-500 ring-2 ring-white dark:ring-gray-900"
            >
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </div>

        {/* ── بيانات المستخدم ── */}
        <div className="flex items-center gap-2.5 border-s border-gray-200 dark:border-gray-800 ps-3 ms-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm bg-gradient-to-tr from-blue-900 to-blue-700 ring-2 ring-blue-900/20"
          >
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="hidden md:flex flex-col text-start">
            <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{user?.name || "مدير النظام"}</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Fleet Manager</span>
          </div>
        </div>

      </div>
    </header>
  );
}
