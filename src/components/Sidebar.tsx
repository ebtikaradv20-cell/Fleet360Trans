"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  AlertTriangle,
  FileCheck,
  Droplets,
  Calendar,
  X
} from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const appContext = useApp() as any;
  const { user, isRTL } = appContext || {};

  const [darkMode, setDarkMode] = useState(false);
  const [currentLang, setCurrentLang] = useState("ar");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // قائمة الإشعارات التفاعلية
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "تراخيص منتهية / قاربت على الانتهاء",
      desc: "سيارات تتطلب تجديد الرخصة فوراً",
      icon: AlertTriangle,
      color: "text-rose-500 bg-rose-50 dark:bg-rose-950/40",
      link: "/dashboard/vehicles",
      time: "اليوم"
    },
    {
      id: 2,
      title: "طلبات وموافقات معلقة",
      desc: "يوجد أوامر صيانة بانتظار الاعتماد",
      icon: FileCheck,
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40",
      link: "/dashboard/approvals",
      time: "منذ ساعتين"
    },
    {
      id: 3,
      title: "غيار زيوت وفلاتر مستحق",
      desc: "سيارات بلغت موعد الصيانة الدورية",
      icon: Droplets,
      color: "text-teal-500 bg-teal-50 dark:bg-teal-950/40",
      link: "/dashboard/oil-changes",
      time: "أمس"
    }
  ]);

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
        (isRTL === false ? "en" : "ar");
      setCurrentLang(savedLang);
    } catch (e) {}
  }, [isRTL]);

  // إغلاق قائمة الإشعارات عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  // تبديل اللغة مع مزامنة Context والـ DOM
  const handleToggleLanguage = () => {
    const nextLang = currentLang === "ar" ? "en" : "ar";
    setCurrentLang(nextLang);
    const nextDir = nextLang === "ar" ? "rtl" : "ltr";

    document.documentElement.setAttribute("lang", nextLang);
    document.documentElement.setAttribute("dir", nextDir);

    try {
      localStorage.setItem("fleet360_lang", nextLang);
      localStorage.setItem("lang", nextLang);
      localStorage.setItem("fleet360_is_rtl", String(nextLang === "ar"));
    } catch (e) {}

    // استدعاء دوال الـ Context إن وُجدت
    if (typeof appContext?.toggleLanguage === "function") {
      appContext.toggleLanguage();
    } else if (typeof appContext?.setLang === "function") {
      appContext.setLang(nextLang);
    } else if (typeof appContext?.setIsRTL === "function") {
      appContext.setIsRTL(nextLang === "ar");
    }
  };

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

  const handleNotificationClick = (link: string) => {
    setIsNotifOpen(false);
    router.push(link);
  };

  const displayName = user?.name || "مدير النظام الرئيسي";
  const displayRole = user?.role || "owner";
  const firstLetter = displayName.trim().charAt(0) || "م";

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 py-2.5 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* شريط البحث */}
        <div className="flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث الشامل..."
              className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs rounded-xl pr-9 pl-3 py-2 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
            />
          </div>
        </div>

        {/* الإجراءات وبيانات المستخدم */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* زر تبديل اللغة */}
          <button
            type="button"
            onClick={handleToggleLanguage}
            title="تغيير اللغة"
            className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {currentLang === "ar" ? "EN" : "عربي"}
          </button>

          {/* الوضع الليلي */}
          <button
            type="button"
            onClick={toggleDark}
            title={darkMode ? "الوضع النهاري" : "الوضع الليلي"}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
          </button>

          {/* قائمة الإشعارات المنفصلة (Dropdown Popover) */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              title="الإشعارات والتنبيهات"
              className="relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <Bell size={17} />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-88 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="p-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-gray-900 dark:text-white">
                      التنبيهات والإشعارات
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 rounded-full">
                      {notifications.length} جديدة
                    </span>
                  </div>
                  <button
                    onClick={() => setIsNotifOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800/60 max-h-72 overflow-y-auto">
                  {notifications.map((n) => {
                    const Icon = n.icon;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n.link)}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer flex items-start gap-3"
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${n.color}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs text-gray-900 dark:text-white truncate">
                            {n.title}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                            {n.desc}
                          </div>
                          <span className="text-[9px] text-gray-400 mt-1 block">
                            {n.time}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-800 mx-1 hidden sm:block" />

          {/* شارة المستخدم */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
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

          {/* زر تسجيل الخروج */}
          <button
            type="button"
            onClick={handleLogout}
            title="تسجيل الخروج"
            className="flex items-center gap-1.5 p-2 md:px-3 md:py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white transition-all cursor-pointer shadow-xs border border-rose-100 dark:border-rose-900/50"
          >
            <LogOut size={15} />
            <span className="hidden md:inline">تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </header>
  );
}
