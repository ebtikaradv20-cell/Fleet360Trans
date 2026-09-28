"use client";
import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

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
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 transition-colors flex-shrink-0"
          title="تصغير / توسيع القائمة"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* ── البحث الشامل ── */}
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <span className="absolute top-1/2 -translate-y-1/2 text-gray-400 text-sm px-3 pointer-events-none">🔍</span>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder={t.globalSearch || "بحث شامل..."}
            className="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded-xl py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white dark:placeholder-gray-400 transition-colors duration-300"
            style={{ paddingInlineStart: "2.5rem", paddingInlineEnd: "1rem" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 ms-auto">
        
        {/* ── محول اللغة ── */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {(["ar", "en"] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 text-xs font-bold transition-all duration-200 ${
                lang === l
                  ? "text-white"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              style={lang === l ? { background: "linear-gradient(90deg,#1E3A8A,#1d4ed8)" } : {}}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ── زر الدارك مود واللايت مود (أيقونة تتغير مباشرة بدون سحب) ── */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? t.lightMode : t.darkMode}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-base transition-all duration-200 flex-shrink-0 border border-gray-200 dark:border-gray-700"
        >
          {darkMode ? "☀️" : "🌙"}
        </button>

        {/* ── الإشعارات ── */}
        <div className="relative">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-base border border-gray-200 dark:border-gray-700">
            🔔
          </button>
          {notifCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
              style={{ background: "#F97316" }}
            >
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </div>

        {/* ── بيانات المستخدم ── */}
        <div className="flex items-center gap-2 border-s border-gray-200 dark:border-gray-800 ps-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
            style={{ background: "#F97316" }}
          >
            {user?.name?.charAt(0) || "U"}
          </div>
          <span className="text-sm font-medium dark:text-white hidden md:block">{user?.name || "مدير النظام"}</span>
        </div>

      </div>
    </header>
  );
}
