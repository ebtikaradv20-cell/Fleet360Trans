"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";

interface DashboardData {
  totalVehicles: number;
  activeVehicles: number;
  maintenanceVehicles: number;
  expiredVehicles: number;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  openWorkOrders: number;
  lowStockParts: number;
  licenseAlerts: number;
  insuranceAlerts: number;
  oilAlerts: number;
  recentFuel: unknown[];
  recentWorkOrders: unknown[];
}

function StatCard({ icon, label, value, sub, color, gradient, onClick, alert }: {
  icon: string; label: string; value: string | number; sub?: string;
  color: string; gradient: string; onClick?: () => void; alert?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-5 shadow-lg card-hover text-white relative overflow-hidden ${onClick ? "cursor-pointer" : ""} ${alert ? "alert-pulse" : ""}`}
      style={{ background: gradient }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 -translate-y-6 translate-x-6"
        style={{ background: "white" }} />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="text-3xl">{icon}</div>
          {alert && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">!</span>}
        </div>
        <div className="text-3xl font-black mb-1">{value}</div>
        <div className="text-sm font-semibold opacity-90">{label}</div>
        {sub && <div className="text-xs opacity-75 mt-1">{sub}</div>}
        {onClick && (
          <div className="text-xs opacity-75 mt-2 flex items-center gap-1">
            <span>اضغط للعرض</span>
            <span>←</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { lang } = useApp();
  const t = translations[lang] || translations["ar"];
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚙️</div>
          <div className="text-gray-500 dark:text-gray-400">{t.loading || "جاري التحميل..."}</div>
        </div>
      </div>
    );
  }

  const formatCurrency = (n: number) => `${(n || 0).toLocaleString()} ر.س`;

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
          {t.dashboard || "لوحة التحكم"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {lang === "ar" ? "مرحباً بك في نظام إدارة الأسطول الشامل Fleet360" : "Welcome to Fleet360 - Comprehensive Fleet Management System"}
        </p>
      </div>

      {/* Alerts Banner */}
      {data && ((data.licenseAlerts || 0) + (data.oilAlerts || 0) + (data.insuranceAlerts || 0)) > 0 && (
        <div className="p-4 rounded-2xl border-2 flex items-center gap-4 shadow-sm" style={{ borderColor: "#F97316", background: "rgba(249,115,22,0.05)" }}>
          <div className="text-3xl animate-bounce">⚠️</div>
          <div>
            <div className="font-bold text-orange-600 dark:text-orange-400 text-sm">
              {lang === "ar" ? "تنبيهات تحتاج اهتمامك!" : "Alerts require your attention!"}
            </div>
            <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {data.licenseAlerts > 0 && <span className="me-4 inline-block">📋 {data.licenseAlerts} {lang === "ar" ? "رخصة تنتهي قريباً" : "licenses expiring soon"}</span>}
              {data.insuranceAlerts > 0 && <span className="me-4 inline-block">🛡️ {data.insuranceAlerts} {lang === "ar" ? "تأمين ينتهي قريباً" : "insurance expiring soon"}</span>}
              {data.oilAlerts > 0 && <span className="inline-block">🛢️ {data.oilAlerts} {lang === "ar" ? "تغيير زيوت مطلوب" : "oil changes due"}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="🚗" label={t.totalVehicles || "إجمالي السيارات"} value={data?.totalVehicles || 0}
          sub={`${data?.activeVehicles || 0} ${t.activeVehicles || "نشطة"}`}
          color="#1E3A8A" gradient="linear-gradient(135deg, #1E3A8A, #1d4ed8)"
          onClick={() => router.push("/dashboard/vehicles")}
        />
        <StatCard
          icon="🔧" label={t.openWorkOrders || "أوامر الشغل"} value={data?.openWorkOrders || 0}
          sub={lang === "ar" ? "أوامر شغل مفتوحة" : "Open work orders"}
          color="#F97316" gradient="linear-gradient(135deg, #F97316, #EA580C)"
          onClick={() => router.push("/dashboard/work-orders")}
        />
        <StatCard
          icon="⛽" label={t.totalFuelCost || "تكاليف الوقود"} value={formatCurrency(data?.totalFuelCost || 0)}
          sub={lang === "ar" ? "إجمالي تكاليف الوقود" : "Total fuel costs"}
          color="#0284C7" gradient="linear-gradient(135deg, #0284C7, #0369a1)"
          onClick={() => router.push("/dashboard/fuel")}
        />
        <StatCard
          icon="📦" label={t.lowStockParts || "قطع منخفضة"} value={data?.lowStockParts || 0}
          sub={lang === "ar" ? "قطع منخفضة أو منتهية" : "Low or out of stock"}
          color="#7C3AED" gradient="linear-gradient(135deg, #7C3AED, #6d28d9)"
          onClick={() => router.push("/dashboard/spare-parts")}
          alert={(data?.lowStockParts || 0) > 0}
        />
      </div>

      {/* Vehicle Status & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4">
            🚗 {lang === "ar" ? "توزيع حالة الأسطول" : "Fleet Status Distribution"}
          </h3>
          <div className="space-y-4">
            {[
              { label: lang === "ar" ? "نشطة" : "Active", value: data?.activeVehicles || 0, color: "#22C55E", max: data?.totalVehicles || 1 },
              { label: lang === "ar" ? "قيد الصيانة" : "In Maintenance", value: data?.maintenanceVehicles || 0, color: "#F97316", max: data?.totalVehicles || 1 },
              { label: lang === "ar" ? "منتهية الرخصة" : "License Expired", value: data?.expiredVehicles || 0, color: "#EF4444", max: data?.totalVehicles || 1 },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className="font-bold text-gray-800 dark:text-white">{item.value}</span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%`, background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4">
            ⚡ {lang === "ar" ? "الإجراءات السريعة" : "Quick Actions"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: lang === "ar" ? "إضافة سيارة" : "Add Vehicle", icon: "🚗", path: "/dashboard/vehicles" },
              { label: lang === "ar" ? "إضافة وقود" : "Add Fuel", icon: "⛽", path: "/dashboard/fuel" },
              { label: lang === "ar" ? "أمر شغل جديد" : "New Work Order", icon: "🔧", path: "/dashboard/work-orders" },
              { label: lang === "ar" ? "تغيير زيوت" : "Oil Change", icon: "🛢️", path: "/dashboard/oil-changes" },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => router.push(item.path)}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-500 transition-all text-start"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
