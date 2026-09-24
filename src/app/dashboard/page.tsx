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
  const t = translations[lang];
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
          <div className="text-gray-500 dark:text-gray-400">{t.loading}</div>
        </div>
      </div>
    );
  }

  const formatCurrency = (n: number) => `${(n || 0).toLocaleString()} ر.س`;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">
          {t.dashboard}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {lang === "ar" ? "مرحباً بك في نظام إدارة الأسطول الشامل Fleet360" : "Welcome to Fleet360 - Comprehensive Fleet Management System"}
        </p>
      </div>

      {/* Alerts Banner */}
      {data && ((data.licenseAlerts || 0) + (data.oilAlerts || 0) + (data.insuranceAlerts || 0)) > 0 && (
        <div className="mb-6 p-4 rounded-2xl border-2 flex items-center gap-4" style={{ borderColor: "#F97316", background: "rgba(249,115,22,0.05)" }}>
          <div className="text-3xl animate-bounce">⚠️</div>
          <div>
            <div className="font-bold text-orange-600 dark:text-orange-400">
              {lang === "ar" ? "تنبيهات تحتاج اهتمامك!" : "Alerts require your attention!"}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {data.licenseAlerts > 0 && <span className="me-4">📋 {data.licenseAlerts} {lang === "ar" ? "رخصة تنتهي قريباً" : "licenses expiring soon"}</span>}
              {data.insuranceAlerts > 0 && <span className="me-4">🛡️ {data.insuranceAlerts} {lang === "ar" ? "تأمين ينتهي قريباً" : "insurance expiring soon"}</span>}
              {data.oilAlerts > 0 && <span>🛢️ {data.oilAlerts} {lang === "ar" ? "تغيير زيوت مطلوب" : "oil changes due"}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="🚗" label={t.totalVehicles} value={data?.totalVehicles || 0}
          sub={`${data?.activeVehicles || 0} ${t.activeVehicles}`}
          color="#1E3A8A" gradient="linear-gradient(135deg, #1E3A8A, #1d4ed8)"
          onClick={() => router.push("/dashboard/vehicles")}
        />
        <StatCard
          icon="🔧" label={t.openWorkOrders} value={data?.openWorkOrders || 0}
          sub={lang === "ar" ? "أوامر شغل مفتوحة" : "Open work orders"}
          color="#F97316" gradient="linear-gradient(135deg, #F97316, #EA580C)"
          onClick={() => router.push("/dashboard/work-orders")}
        />
        <StatCard
          icon="⛽" label={t.totalFuelCost} value={formatCurrency(data?.totalFuelCost || 0)}
          sub={lang === "ar" ? "إجمالي تكاليف الوقود" : "Total fuel costs"}
          color="#0284C7" gradient="linear-gradient(135deg, #0284C7, #0369a1)"
          onClick={() => router.push("/dashboard/fuel")}
        />
        <StatCard
          icon="📦" label={t.lowStockParts} value={data?.lowStockParts || 0}
          sub={lang === "ar" ? "قطع منخفضة أو منتهية" : "Low or out of stock"}
          color="#7C3AED" gradient="linear-gradient(135deg, #7C3AED, #6d28d9)"
          onClick={() => router.push("/dashboard/spare-parts")}
          alert={(data?.lowStockParts || 0) > 0}
        />
        <StatCard
          icon="🛢️" label={t.oilChangeAlerts} value={data?.oilAlerts || 0}
          sub={lang === "ar" ? "تغيير زيوت مطلوب" : "Oil changes needed"}
          color="#D97706" gradient="linear-gradient(135deg, #D97706, #B45309)"
          onClick={() => router.push("/dashboard/oil-changes")}
          alert={(data?.oilAlerts || 0) > 0}
        />
        <StatCard
          icon="📋" label={t.licenseAlerts} value={data?.licenseAlerts || 0}
          sub={lang === "ar" ? "رخص تنتهي خلال 30 يوم" : "Licenses expiring in 30 days"}
          color="#DC2626" gradient="linear-gradient(135deg, #DC2626, #B91C1C)"
          onClick={() => router.push("/dashboard/vehicles?filter=expired")}
          alert={(data?.licenseAlerts || 0) > 0}
        />
        <StatCard
          icon="💰" label={t.totalMaintenanceCost} value={formatCurrency(data?.totalMaintenanceCost || 0)}
          sub={lang === "ar" ? "إجمالي تكاليف الصيانة" : "Total maintenance costs"}
          color="#059669" gradient="linear-gradient(135deg, #059669, #047857)"
          onClick={() => router.push("/dashboard/work-orders")}
        />
        <StatCard
          icon="🔍" label={t.vehicleInspection} value={lang === "ar" ? "فحص" : "Inspect"}
          sub={lang === "ar" ? "فحص كامل للسيارات" : "Full vehicle inspection"}
          color="#0891B2" gradient="linear-gradient(135deg, #0891B2, #0e7490)"
          onClick={() => router.push("/dashboard/vehicle-inspection")}
        />
      </div>

      {/* Vehicle Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
            🚗 {lang === "ar" ? "توزيع حالة الأسطول" : "Fleet Status Distribution"}
          </h3>
          <div className="space-y-3">
            {[
              { label: lang === "ar" ? "نشطة" : "Active", value: data?.activeVehicles || 0, color: "#22C55E", max: data?.totalVehicles || 1 },
              { label: lang === "ar" ? "قيد الصيانة" : "In Maintenance", value: data?.maintenanceVehicles || 0, color: "#F97316", max: data?.totalVehicles || 1 },
              { label: lang === "ar" ? "منتهية الرخصة" : "License Expired", value: data?.expiredVehicles || 0, color: "#EF4444", max: data?.totalVehicles || 1 },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className="font-bold text-gray-800 dark:text-white">{item.value}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(item.value / item.max) * 100}%`, background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
            ⚡ {lang === "ar" ? "الإجراءات السريعة" : "Quick Actions"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: lang === "ar" ? "إضافة سيارة" : "Add Vehicle", icon: "🚗", path: "/dashboard/vehicles", color: "#1E3A8A" },
              { label: lang === "ar" ? "إضافة وقود" : "Add Fuel", icon: "⛽", path: "/dashboard/fuel", color: "#0284C7" },
              { label: lang === "ar" ? "أمر شغل جديد" : "New Work Order", icon: "🔧", path: "/dashboard/work-orders", color: "#F97316" },
              { label: lang === "ar" ? "تغيير زيوت" : "Oil Change", icon: "🛢️", path: "/dashboard/oil-changes", color: "#059669" },
              { label: lang === "ar" ? "فحص سيارة" : "Inspect Vehicle", icon: "🔍", path: "/dashboard/vehicle-inspection", color: "#7C3AED" },
              { label: lang === "ar" ? "المخزون" : "Inventory", icon: "📦", path: "/dashboard/spare-parts", color: "#DC2626" },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => router.push(item.path)}
                className="flex items-center gap-2 p-3 rounded-xl border dark:border-gray-700 hover:shadow-md transition-all card-hover text-start"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
