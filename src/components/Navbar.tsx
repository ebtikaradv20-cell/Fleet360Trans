"use client";
import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import { Search, Bell, Sun, Moon, Menu, AlertTriangle, Droplet, CheckCheck, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface NavbarProps {
  onSearch?: (q: string) => void;
  onToggleSidebar?: () => void;
}

interface DbNotification {
  id: number;
  title: string;
  message: string;
  link: string;
  created_at: string;
}

export default function Navbar({ onSearch, onToggleSidebar }: NavbarProps) {
  const { lang, setLang, darkMode, toggleDarkMode, user } = useApp();
  const t = translations[lang] || translations["ar"];
  const [search, setSearch] = useState("");
  const [notifData, setNotifData] = useState<{ totalAlerts: number; detailedAlerts: any[] }>({ totalAlerts: 0, detailedAlerts: [] });
  const [dbNotifs, setDbNotifs] = useState<DbNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [readAlerts, setReadAlerts] = useState<string[]>([]);
  const [toasts, setToasts] = useState<DbNotification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const seenIdsRef = useRef<Set<number>>(new Set());
  const firstLoadRef = useRef(true);

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

  // ⚡ جلب إشعارات الموافقات الحقيقية من قاعدة البيانات + Polling دوري
  const loadDbNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data: DbNotification[] = await res.json();
      if (!Array.isArray(data)) return;

      if (!firstLoadRef.current) {
        const newOnes = data.filter(n => !seenIdsRef.current.has(n.id));
        if (newOnes.length > 0) {
          setToasts(prev => [...newOnes, ...prev].slice(0, 4));
          newOnes.forEach(n => {
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== n.id));
            }, 7000);
          });
        }
      }

      data.forEach(n => seenIdsRef.current.add(n.id));
      firstLoadRef.current = false;
      setDbNotifs(data);
    } catch {}
  };

  useEffect(() => {
    loadDbNotifications();
    const interval = setInterval(loadDbNotifications, 20000); // كل 20 ثانية
    return () => clearInterval(interval);
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
  const notifCount = visibleAlerts.length + dbNotifs.length;

  const markAsRead = (type: string, id: number) => {
    const uniqueId = `${type}-${id}`;
    const updated = [...readAlerts, uniqueId];
    setReadAlerts(updated);
    localStorage.setItem("fleet360_read_alerts", JSON.stringify(updated));
    setIsNotifOpen(false);
  };

  const markAllAsRead = async () => {
    const allIds = notifData.detailedAlerts.map(a => `${a.type}-${a.id}`);
    const updated = [...new Set([...readAlerts, ...allIds])];
    setReadAlerts(updated);
    localStorage.setItem("fleet360_read_alerts", JSON.stringify(updated));

    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setDbNotifs([]);
    } catch {}
  };

  const markDbNotifAsRead = async (id: number) => {
    setDbNotifs(prev => prev.filter(n => n.id !== id));
    try { await fetch(`/api/notifications/${id}`, { method: "PUT" }); } catch {}
    setIsNotifOpen(false);
  };

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const extractPlateNumber = (message: string) => {
    const match = message.match(/\(([^)]+)\)/);
    return match ? match[1] : "";
  };

  const handleLangToggle = () => {
    const newLang = lang === "ar" ? "en" : "ar";
    setLang(newLang);
    localStorage.setItem("fleet360_lang", newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
    window.location.reload();
  };

  return (
    <>
      <header className="h-16 flex items-center gap-4 px-4 sm:px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-30 transition-colors duration-300">
        {onToggleSidebar && (
          <button onClick={onToggleSidebar} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-teal-50 hover:text-teal-600 transition-colors flex-shrink-0">
            <Menu size={20} />
          </button>
        )}

        <div className="flex-1 max-w-lg">
          <div className="relative flex items-center">
            <span className="absolute inset-y-0 start-0 flex items-center ps-3.5 text-gray-400"><Search size={18} /></span>
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); onSearch?.(e.target.value); }} placeholder={t.globalSearch || "بحث شامل..."} className="w-full bg-gray-100 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/60 rounded-xl py-2 ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 dark:text-white transition-all" />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ms-auto">
          
          <button onClick={handleLangToggle} className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-black text-xs text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
            {lang === "ar" ? "EN" : "ع"}
          </button>

          <button onClick={toggleDarkMode} className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
            {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
          </button>

          <div className="relative" ref={notifRef}>
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
              <Bell size={18} className="text-gray-700 dark:text-gray-200" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md bg-red-500 ring-2 ring-white dark:ring-gray-900">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute top-full mt-3 end-0 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <span className="font-black text-gray-900 dark:text-white text-sm">التنبيهات العاجلة</span>
                  <button onClick={markAllAsRead} className="flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-800 transition-colors">
                    <CheckCheck size={14} /> تعليم الكل كمقروء
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                  {notifCount === 0 ? (
                    <div className="text-center p-8 text-sm text-gray-500 font-medium">✅ لا توجد تنبيهات جديدة</div>
                  ) : (
                    <>
                      {/* إشعارات الموافقات الحقيقية (الأولوية) */}
                      {dbNotifs.map((n) => (
                        <Link key={`db-${n.id}`} href={n.link || "#"} onClick={() => markDbNotifAsRead(n.id)} className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                          <div className="p-2.5 rounded-xl shrink-0 mt-0.5 shadow-sm bg-blue-600 text-white">
                            <ShieldCheck size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-blue-700 dark:text-blue-400">{n.title}</p>
                            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed font-bold group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">{n.message}</p>
                          </div>
                        </Link>
                      ))}

                      {/* تنبيهات الرخصة/الزيت الحالية */}
                      {visibleAlerts.map((alert, idx) => {
                        const plate = extractPlateNumber(alert.message);
                        const smartLink = plate ? `${alert.link}?search=${encodeURIComponent(plate)}` : alert.link;
                        
                        return (
                          <Link key={idx} href={smartLink} onClick={() => markAsRead(alert.type, alert.id)} className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                            <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 shadow-sm ${alert.type === 'license' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                              {alert.type === 'license' ? <AlertTriangle size={18} /> : <Droplet size={18} />}
                            </div>
                            <div>
                              <p className={`text-xs font-black ${alert.type === 'license' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>{alert.title}</p>
                              <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed font-bold group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">{alert.message}</p>
                            </div>
                          </Link>
                        )
                      })}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 border-s border-gray-200 dark:border-gray-800 ps-3 ms-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm bg-gradient-to-tr from-teal-700 to-teal-500 ring-2 ring-teal-900/20">{user?.name?.charAt(0) || "U"}</div>
            <div className="hidden md:flex flex-col text-start">
              <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{user?.name || "مدير النظام"}</span>
              <span className="text-[10px] text-gray-500 font-medium">Fleet Manager</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Toast منبثق للإشعارات الجديدة فوراً ── */}
      <div className="fixed top-20 end-5 z-[100] flex flex-col gap-3 w-80">
        {toasts.map((n) => (
          <div key={n.id} className="bg-white dark:bg-gray-900 border-s-4 border-blue-600 rounded-xl shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-right">
            <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0"><ShieldCheck size={16} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-gray-900 dark:text-white">{n.title}</p>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{n.message}</p>
              <Link href={n.link || "#"} onClick={() => { dismissToast(n.id); markDbNotifAsRead(n.id); }} className="text-[11px] font-bold text-blue-600 mt-1.5 inline-block hover:underline">
                عرض التفاصيل ←
              </Link>
            </div>
            <button onClick={() => dismissToast(n.id)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0"><X size={16}/></button>
          </div>
        ))}
      </div>
    </>
  );
}
