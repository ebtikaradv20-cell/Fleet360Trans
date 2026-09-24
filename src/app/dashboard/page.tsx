"use client";
import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";

export default function DashboardPage() {
  const { lang, user } = useApp();
  const t = translations[lang];
  const [stats, setStats] = useState({ vehicles: 0, workOrders: 0, fuelLogs: 0 });

  useEffect(() => {
    // جلب الإحصائيات العامة للوحة التحكم
    Promise.all([
      fetch("/api/vehicles").then(r => r.json()).catch(() => []),
      fetch("/api/work-orders").then(r => r.json()).catch(() => []),
    ]).then(([vehicles, workOrders]) => {
      setStats({
        vehicles: Array.isArray(vehicles) ? vehicles.length : 0,
        workOrders: Array.isArray(workOrders) ? workOrders.length : 0,
        fuelLogs: 0,
      });
    });
  }, []);

  return (
    <div className="fade-in space-y-6">
      <PageHeader 
        title={lang === "ar" ? "لوحة التحكم" : "Dashboard"} 
        subtitle={lang === "ar" ? `مرحباً بك، ${user?.name || "مدير النظام"}` : `Welcome back, ${user?.name || "Admin"}`} 
        icon="📊" 
      />

      {/* بطاقات الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">{lang === "ar" ? "إجمالي السيارات" : "Total Vehicles"}</div>
          <div className="text-3xl font-black text-blue-600 mt-2">{stats.vehicles}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">{lang === "ar" ? "أوامر الشغل" : "Work Orders"}</div>
          <div className="text-3xl font-black text-orange-500 mt-2">{stats.workOrders}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">{lang === "ar" ? "حالة النظام" : "System Status"}</div>
          <div className="text-3xl font-black text-green-600 mt-2">متصل ✓</div>
        </div>
      </div>
    </div>
  );
}
