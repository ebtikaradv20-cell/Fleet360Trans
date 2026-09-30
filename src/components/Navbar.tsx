"use client";
import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";
import { Search, Bell, Sun, Moon, Menu, AlertTriangle, Droplet, CheckCheck } from "lucide-react";
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
  const [readAlerts, setReadAlerts] = useState<string[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("fleet360_read_alerts");
    if (saved) setReadAlerts(JSON.parse(saved));
  }, []);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.detailedAlerts) setNotifData(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleAlerts = notifData.detailedAlerts.filter(a => !readAlerts.includes(`${a.type}-${a.id}`));
  const notifCount = visibleAlerts.length;

  const markAsRead = (type: string, id: number) => {
    const uniqueId = `${type}-${id}`;
    const updated = [...readAlerts, uniqueId];
    setReadAlerts(updated);
    localStorage.setItem("fleet360_read_alerts", JSON.stringify(updated));
    setIsNotifOpen(false);
  };

  const markAllAsRead = () => {
    const allIds = notifData.detailedAlerts.map(a => `${a.type}-${a.id}`);
    const updated = [...new Set([...readAlerts, ...allIds])];
    setReadAlerts(updated);
    localStorage.setItem("fleet360_read_alerts", JSON.stringify(updated));
  };

  // استخراج رقم اللوحة من رسالة الإشعار لإنشاء الرابط الذكي
  const extractPlateNumber = (message: string) => {
    const match = message.match(/\(([^)]+)\)/);
    return match ? match[1] : "";
  };

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
        <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} 
