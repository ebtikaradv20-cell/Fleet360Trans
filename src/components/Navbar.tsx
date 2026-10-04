"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import {
  Search,
  Moon,
  Sun,
  Bell,
  Menu,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock
} from "lucide-react";

interface NotificationItem {
  id: number | string;
  title?: string;
  message?: string;
  content?: string;
  type?: string;
  is_read?: number | boolean;
  read?: boolean;
  createdAt?: string;
  created_at?: string;
}

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const context = (useApp() as any) || {};
  const {
    user,
    theme,
    toggleTheme,
    toggleDarkMode,
    setTheme,
    lang,
    language,
    setLang,
    setLanguage,
    toggleLanguage,
    toggleLang,
    toggleSidebar
  } = context;

  // ── 1. منطق اللغة (عرض EN على العربي و AR على الإنجليزي) ──
  const currentLang = lang || language || "ar";
  const isArabic = currentLang === "ar";

  const handleToggleLanguage = () => {
    const nextLang = isArabic ? "en" : "ar";
    if (typeof toggleLanguage === "function") {
      toggleLanguage();
    } else if (typeof toggleLang === "function") {
      toggleLang();
    } else if (typeof setLang === "function") {
      setLang(nextLang);
    } else if (typeof setLanguage === "function") {
      setLanguage(nextLang);
    }
  };

  // ── 2. منطق الوضع الليلي / النهاري المباشر والمضمون ──
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkStored =
      document.documentElement.classList.contains("dark") ||
      localStorage.getItem("fleet360_theme") === "dark" ||
      localStorage.getItem("theme") === "dark" ||
      theme === "dark";

    setIsDark(isDarkStored);
    if (isDarkStored) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const handleToggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);

    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("fleet360_theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("fleet360_theme", "light");
      localStorage.setItem("theme", "light");
    }

    if (typeof toggleTheme === "function") toggleTheme();
    if (typeof toggleDarkMode === "function") toggleDarkMode();
    if (typeof setTheme === "function") setTheme(nextDark ? "dark" : "light");
  };

  // ── 3. منطق قائمة الإشعارات التفاعلية ──
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const d = await res.json();
        const list = Array.isArray(d) ? d : d.notifications || [];
        setNotifications(list);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // إغلاق قائمة الإشعارات عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(
    (n) => !n.is_read && !n.read && n.is_read !== 1
  ).length;

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read_all" })
      }).catch(() => {});

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: 1, read: true }))
      );
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const markAsRead = async (id: number | string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: 1, read: true })
      }).catch(() => {});

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1, read: true } : n))
      );
    } catch (err) {
      console.error("Error marking read:", err);
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

      {/* ── الجانب الأيسر: الإجراءات ── */}
      <div className="flex items-center gap-3">
        {/* زر تغيير اللغة (يعكس النص الخارجي كما هو مطلوب) */}
        <button
          type="button"
          onClick={handleToggleLanguage}
          className="px-3 py-1.5 text-xs font-black tracking-wider uppercase border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          title="تغيير اللغة"
        >
          {isArabic ? "EN" : "AR"}
        </button>

        {/* زر الدارك / اللايت ثيم */}
        <button
          type="button"
          onClick={handleToggleTheme}
          className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Toggle Theme"
          title={isDark ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
        >
          {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
        </button>

        {/* زر وقائمة الإشعارات */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Notifications"
            title="الإشعارات"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
                {unreadCount > 9 ? "+9" : unreadCount}
              </span>
            )}
          </button>

          {/* النافذة المنسدلة للإشعارات */}
          {showNotifications && (
            <div className="absolute left-0 rtl:right-auto rtl:left-0 ltr:right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-gray-900 dark:text-white">الإشعارات</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300 rounded-full">
                      {unreadCount} جديد
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    لا توجد إشعارات جديدة حالياً
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isUnread = !notif.is_read && !notif.read && notif.is_read !== 1;
                    return (
                      <div
                        key={notif.id}
                        onClick={() => markAsRead(notif.id)}
                        className={`p-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer flex gap-3 items-start ${
                          isUnread ? "bg-teal-50/40 dark:bg-teal-950/20" : ""
                        }`}
                      >
                        <div
                          className={`mt-0.5 p-2 rounded-xl shrink-0 ${
                            notif.type === "warning" || notif.type === "danger"
                              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                              : notif.type === "success"
                              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                        >
                          <Bell size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {notif.title || "تنبيه تشغيلي"}
                            </p>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug line-clamp-2">
                            {notif.message || notif.content || ""}
                          </p>
                          {(notif.createdAt || notif.created_at) && (
                            <span className="text-[10px] text-gray-400 mt-1 block">
                              {new Date(notif.createdAt || notif.created_at).toLocaleDateString("ar-EG", {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* بيانات المستخدم الحالي */}
        <div className="flex items-center gap-2.5 pr-2 border-r border-gray-200 dark:border-gray-800">
          <div className="flex flex-col text-left rtl:text-right">
            <span className="text-xs font-bold text-gray-800 dark:text-white leading-tight">
              {user?.name || "مدير النظام الرئيسي"}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {user?.roleName || user?.role || "owner"}
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
