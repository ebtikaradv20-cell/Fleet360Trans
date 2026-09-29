"use client";
import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";
import { Search, Bell, Sun, Moon, Menu, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface NavbarProps {
  onSearch?: (q: string) => void;
  onToggleSidebar?: () => void;
}

export default function Navbar({ onSearch, onToggleSidebar }: NavbarProps) {
  const { lang, setLang, darkMode, toggleDarkMode, user } = useApp();
  const t = translations[lang] || translations["ar"];
  const [search, setSearch] = useState("");
  const [notifData, setNotifData] = useState<any>({ licenseAlerts: 0, oilAlerts: 0, insuranceAlerts: 0 });
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setNotifData(d);
      })
      .catch(() => {});
  }, []);

  const notifCount = (notifData.licenseAlerts || 0) + (notifData.oilAlerts || 0) + (notifData.insuranceAlerts || 0);

  // لإغلاق القائمة عند الضغط خارجها
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
        <button onClick={onToggleSidebar} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600 transition-colors flex-shrink-0">
          <Menu size={20} />
        </button>
      )}

      <div className="flex-1 max-w-lg">
        <div className="relative flex items-center">
          <span className="absolute inset-y-0 start-0 flex items-center ps-3.5 text-gray-400"><Search size={18} /></span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث شامل..." className="w-full bg-gray-100 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/60 rounded-xl py-2 ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white transition-all" />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 ms-auto">
        <button onClick={toggleDarkMode} className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200/80 dark:border-gray-700/80">
          {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
        </button>

        {/* ── الإشعارات والقائمة المنسدلة ── */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200/80 dark:border-gray-700/80"
          >
            <Bell size={18} className="text-gray-700 dark:text-gray-200" />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md bg-orange-500 ring-2 ring-white dark:ring-gray-900">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </button>

          {/* القائمة المنسدلة للإشعارات */}
          {isNotifOpen && (
            <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-black text-gray-900 dark:text-white">
                التنبيهات العاجلة
              </div>
              <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
                {notifCount === 0 ? (
                  <div className="text-center p-4 text-xs text-gray-500">لا توجد تنبيهات عاجلة حالياً</div>
                ) : (
                  <>
                    {notifData.oilAlerts > 0 && (
                      <Link href="/dashboard/oil-changes" onClick={() => setIsNotifOpen(false)} className="flex items-start gap-3 p-3 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-xl transition-colors">
                        <AlertTriangle size={18} className="text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">تغيير زيوت متأخر</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">يوجد {notifData.oilAlerts} سيارة تحتاج تغيير زيت فوراً</p>
                        </div>
                      </Link>
                    )}
                    {notifData.licenseAlerts > 0 && (
                      <Link href="/dashboard/vehicles" onClick={() => setIsNotifOpen(false)} className="flex items-start gap-3 p-3 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors">
                        <AlertTriangle size={18} className="text-red-500 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">تراخيص منتهية</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">يوجد {notifData.licenseAlerts} سيارة رخصتها منتهية أو قاربت</p>
                        </div>
                      </Link>
                    )}
                  </>
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
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Fleet Manager</span>
          </div>
        </div>
      </div>
    </header>
  );
}
