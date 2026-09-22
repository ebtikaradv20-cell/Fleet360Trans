"use client";
import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

export default function Navbar({ onSearch }: { onSearch?: (q: string) => void }) {
  const { lang, setLang, darkMode, toggleDarkMode, user } = useApp();
  const t = translations[lang];
  const [search, setSearch]       = useState("");
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => {
        if (d && !d.error) {
          setNotifCount(
            (d.licenseAlerts || 0) + (d.oilAlerts || 0) + (d.insuranceAlerts || 0),
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
    <header className="h-16 flex items-center gap-4 px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-30 transition-colors duration-300">

      {/* ── Search ── */}
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <span className="absolute top-1/2 -translate-y-1/2 text-gray-400 text-sm px-3 pointer-events-none">🔍</span>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder={t.globalSearch}
            className="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded-xl py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white dark:placeholder-gray-400 transition-colors duration-300"
            style={{ paddingInlineStart: "2.5rem", paddingInlineEnd: "1rem" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 ms-auto">

        {/* ── Language switcher ── */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {(["ar", "en"] as Language[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
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

        {/* ── Dark / Light toggle ── */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? t.lightMode : t.darkMode}
          className={`
            relative w-14 h-7 rounded-full transition-all duration-300 flex-shrink-0
            ${darkMode ? "bg-blue-600" : "bg-gray-300"}
          `}
        >
          {/* sliding knob */}
          <span
            className={`
              absolute top-0.5 w-6 h-6 rounded-full shadow-md flex items-center justify-center text-sm
              transition-all duration-300
              ${darkMode ? "bg-gray-900 translate-x-7" : "bg-white translate-x-0.5"}
            `}
            style={{ lineHeight: 1 }}
          >
            {darkMode ? "🌙" : "☀️"}
          </span>
        </button>

        {/* ── Notifications ── */}
        <div className="relative">
          <button className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-base">
            🔔
          </button>
          {notifCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "#F97316" }}
            >
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </div>

        {/* ── User avatar ── */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: "#F97316" }}
          >
            {user?.name?.charAt(0) || "U"}
          </div>
          <span className="text-sm font-medium dark:text-white hidden md:block">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
