"use client";
import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import { Search, Bell, Sun, Moon, Menu, AlertTriangle, Droplet } from "lucide-react";
import Link from "next/link";

interface NavbarProps {
  onSearch?: (q: string) => void;
  onToggleSidebar?: () => void;
}

export default function Navbar({ onSearch, onToggleSidebar }: NavbarProps) {
  const { lang, setLang, darkMode, toggleDarkMode, user } = useApp();
  const t = translations[lang] || translations["ar"];
  const [search, setSearch] = useState("");
  const [notifData, setNotifData] = useState<{ totalAlerts: number; detailedAlerts: any[] }>({ totalAlerts: 0, detailedAlerts: [] });
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.detailedAlerts) setNotifData(d);
      })
      .catch(() => {});
  }, []);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 flex items-center gap-4 px-4 sm:px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-30 transition-colors duration-300">
      
      {onToggleSidebar && (
        <button onClick={onToggleSidebar} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-orange-50 hover:text-orange-600 transition-colors flex-shrink-0">
          <Menu size={20} />
        </button>
      )}

      <div className="flex-1 max-w-lg">
        <div className="relative flex items-center">
          <span className="absolute inset-y-0 start-0 flex items-center ps-3.5 text-gray-400"><Search size={18} /></span>
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); onSearch?.(e.target.value); }} placeholder="بحث شامل..." className="w-full bg-gray-100 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/60 rounded-xl py-2 ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white transition-all" />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 ms-auto">
        
        {/* ── زر تغيير اللغة (Toggle) ── */}
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-black text-xs text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700/80 shadow-sm"
          title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
        >
          {lang === "ar" ? "EN" : "ع"}
        </button>

        {/* ── زر الدارك مود ── */}
        <button onClick={toggleDarkMode} className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
          {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
        </button>

        {/* ── الإشعارات والقائمة المنسدلة التفصيلية ── */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200/80 dark:border-gray-700/80 shadow-sm"
          >
            <Bell size={18} className="text-gray-700 dark:text-gray-200" />
            {notifData.totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md bg-orange-500 ring-2 ring-white dark:ring-gray-900">
                {notifData.totalAlerts > 9 ? "9+" : notifData.totalAlerts}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute left-0 sm:left-auto sm:right-0 mt-3 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="font-black text-gray-900 dark:text-white">التنبيهات العاجلة</span>
                <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-md">{notifData.totalAlerts}</span>
              </div>
              <div className="p-2 max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {notifData.detailedAlerts.length === 0 ? (
                  <div className="text-center p-6 text-sm text-gray-500 font-medium">✅ لا توجد أي تنبيهات عاجلة حالياً</div>
                ) : (
                  notifData.detailedAlerts.map((alert, idx) => (
                    <Link key={idx} href={alert.link} onClick={() => setIsNotifOpen(false)} className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${alert.type === 'license' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                        {alert.type === 'license' ? <AlertTriangle size={16} /> : <Droplet size={16} />}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${alert.type === 'license' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>{alert.title}</p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed font-medium group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">{alert.message}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── بيانات المستخدم ── */}
        <div className="flex items-center gap-2.5 border-s border-gray-200 dark:border-gray-800 ps-3 ms-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm bg-gradient-to-tr from-blue-900 to-blue-700 ring-2 ring-blue-900/20">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="hidden md:flex flex-col text-start">
            <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{user?.name || "مدير النظام"}</span>
            <span className="text-[10px] text-gray-500 font-medium">Fleet Manager</span>
          </div>
        </div>
      </div>
    </header>
  );
}
