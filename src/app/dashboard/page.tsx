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

function StatCard({ icon, label, value, sub, gradient, onClick, alert }: {
  icon: string; label: string; value: string | number; sub?: string;
  gradient: string; onClick?: () => void; alert?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-5 shadow-sm border border-blue-500/10 text-white relative overflow-hidden transition-all duration-200 ${onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.01]" : ""} ${alert ? "ring-2 ring-orange-400" : ""}`}
      style={{ background: gradient }}
    >
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -translate-y-4 translate-x-4 bg-white" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2">
          <div className="text-2xl">{icon}</div>
          {alert && <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">تنبيه</span>}
        </div>
        <div className="text-2xl font-black mb-1">{value}</div>
        <div className="text-xs font-semibold opacity-90">{label}</div>
        {sub && <div className="text-[11px] opacity-75 mt-1">{sub}</div>}
        {onClick && (
          <div className="text-[10px] opacity-75 mt-2 flex items-center gap-1">
            <span>التفاصيل</span>
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
          <div className="text-5xl mb-4 animate-spin">⚙️</div>
          <div className="text-gray-500 dark:text-gray-400">{t.loading}</div>
        </div>
      </div>
    );
  }

  const formatCurrency = (n: number) => `${(n || 0).toLocaleString()} ${lang === "ar" ? "ج.م" : "EGP"}`;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t.dashboard}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {lang === "ar" ? "مرحباً بك في نظام إدارة الأسطول الشامل Fleet360" : "Welcome to Fleet360 - Comprehensive Fleet Management System"}
        </p>
      </div>

      {/* Alerts Banner */}
      {data && ((data.licenseAlerts || 0) + (data.oilAlerts || 0) + (data.insuranceAlerts || 0)) > 0 && (
        <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 flex items-center gap-4">
          <div className="text-2xl animate-pulse">⚠️</div>
          <div>
            <div className="font-bold text-orange-600 dark:text-orange-400 text-sm">
              {lang === "ar" ? "تنبيهات تحتاج اهتمامك الفوري!" : "Alerts require your attention!"}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {data.licenseAlerts > 0 && <span className="me-3">📋 {data.licenseAlerts} {lang === "ar" ? "رخصة تنتهي قريباً" : "licenses expiring soon"}</span>}
              {data.insuranceAlerts > 0 && <span className="me-3">🛡️ {data.insuranceAlerts} {lang === "ar" ? "تأمين ينتهي قريباً" : "insurance expiring soon"}</span>}
              {data.oilAlerts > 0 && <span>🛢️ {data.oilAlerts} {lang === "ar" ? "تغيير زيوت مطلوب" : "oil changes due"}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid - متدرجة من اللون الأزرق المؤسسي ودرجاته بالترتيب */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          icon="🚗" label={t.totalVehicles} value={data?.totalVehicles || 0}
          sub={`${data?.activeVehicles || 0} ${t.activeVehicles}`}
          gradient="linear-gradient(135deg, #1E3A8A, #1E40AF)"
          onClick={() => router.push("/dashboard/vehicles")}
        />
        <StatCard
          icon="🔧" label={t.openWorkOrders} value={data?.openWorkOrders || 0}
          sub={lang === "ar" ? "أوامر شغل مفتوحة" : "Open work orders"}
          gradient="linear-gradient(135deg, #1D4ED8, #2563EB)"
          onClick={() => router.push("/dashboard/work-orders")}
        />
        <StatCard
          icon="⛽" label={t.totalFuelCost} value={formatCurrency(data?.totalFuelCost || 0)}
          sub={lang === "ar" ? "إجمالي تكاليف الوقود" : "Total fuel costs"}
          gradient="linear-gradient(135deg, #2563EB, #3B82F6)"
          onClick={() => router.push("/dashboard/fuel")}
        />
        <StatCard
          icon="📦" label={t.lowStockParts} value={data?.lowStockParts || 0}
          sub={lang === "ar" ? "قطع منخفضة المخزون" : "Low stock parts"}
          gradient="linear-gradient(135deg, #3B82F6, #60A5FA)"
          onClick={() => router.push("/dashboard/spare-parts")}
          alert={(data?.lowStockParts || 0) > 0}
        />
        <StatCard
          icon="🛢️" label={t.oilChangeAlerts} value={data?.oilAlerts || 0}
          sub={lang === "ar" ? "تغيير زيوت مطلوب" : "Oil changes needed"}
          gradient="linear-gradient(135deg, #1E40AF, #1D4ED8)"
          onClick={() => router.push("/dashboard/oil-changes")}
          alert={(data?.oilAlerts || 0) > 0}
        />
        <StatCard
          icon="📋" label={t.licenseAlerts} value={data?.licenseAlerts || 0}
          sub={lang === "ar" ? "رخص تنتهي قريباً" : "Licenses expiring"}
          gradient="linear-gradient(135deg, #1D4ED8, #2563EB)"
          onClick={() => router.push("/dashboard/vehicles?filter=expired")}
          alert={(data?.licenseAlerts || 0) > 0}
        />
        <StatCard
          icon="💰" label={t.totalMaintenanceCost} value={formatCurrency(data?.totalMaintenanceCost || 0)}
          sub={lang === "ar" ? "إجمالي تكاليف الصيانة" : "Total maintenance"}
          gradient="linear-gradient(135deg, #2563EB, #60A5FA)"
          onClick={() => router.push("/dashboard/work-orders")}
        />
        <StatCard
          icon="🔍" label={t.vehicleInspection} value={lang === "ar" ? "فحص" : "Inspect"}
          sub={lang === "ar" ? "فحص كامل للسيارات" : "Full vehicle inspection"}
          gradient="linear-gradient(135deg, #1E3A8A, #2563EB)"
          onClick={() => router.push("/dashboard/vehicle-inspection")}
        />
      </div>

      {/* Vehicle Status & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
            🚗 {lang === "ar" ? "توزيع حالة الأسطول" : "Fleet Status Distribution"}
          </h3>
          <div className="space-y-3">
            {[
              { label: lang === "ar" ? "نشطة" : "Active", value: data?.activeVehicles || 0, color: "#22C55E", max: data?.totalVehicles || 1 },
              { label: lang === "ar" ? "قيد الصيانة" : "In Maintenance", value: data?.maintenanceVehicles || 0, color: "#F97316", max: data?.totalVehicles || 1 },
              { label: lang === "ar" ? "منتهية الرخصة" : "License Expired", value: data?.expiredVehicles || 0, color: "#EF4444", max: data?.totalVehicles || 1 },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{item.value}</span>
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

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
            ⚡ {lang === "ar" ? "الإجراءات السريعة" : "Quick Actions"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: lang === "ar" ? "إضافة سيارة" : "Add Vehicle", icon: "🚗", path: "/dashboard/vehicles" },
              { label: lang === "ar" ? "إضافة وقود" : "Add Fuel", icon: "⛽", path: "/dashboard/fuel" },
              { label: lang === "ar" ? "أمر شغل جديد" : "New Work Order", icon: "🔧", path: "/dashboard/work-orders" },
              { label: lang === "ar" ? "تغيير زيوت" : "Oil Change", icon: "🛢️", path: "/dashboard/oil-changes" },
              { label: lang === "ar" ? "فحص سيارة" : "Inspect Vehicle", icon: "🔍", path: "/dashboard/vehicle-inspection" },
              { label: lang === "ar" ? "المخزون" : "Inventory", icon: "📦", path: "/dashboard/spare-parts" },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => router.push(item.path)}
                className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:bg-orange-50 hover:border-orange-200 dark:hover:bg-orange-950/20 transition-all text-start group cursor-pointer"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-orange-600 dark:group-hover:text-orange-400">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
