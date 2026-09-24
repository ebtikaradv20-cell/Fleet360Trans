"use client";
import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import Link from "next/link";

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
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 -translate-y-6 translate-x-6" style={{ background: "white" }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-3xl">{icon}</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md font-medium">{sub || ""}</span>
        </div>
        <h4 className="text-sm font-medium opacity-90">{label}</h4>
        <div className="text-3xl font-black mt-1 tracking-tight">{value}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { lang } = useApp();
  const t = translations[lang] || translations["ar"];
  const [data, setData] = useState<DashboardData>({
    totalVehicles: 0,
    activeVehicles: 0,
    maintenanceVehicles: 0,
    expiredVehicles: 0,
    totalFuelCost: 0,
    totalMaintenanceCost: 0,
    openWorkOrders: 0,
    lowStockParts: 0,
    licenseAlerts: 0,
    insuranceAlerts: 0,
    oilAlerts: 0,
    recentFuel: [],
    recentWorkOrders: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const resVehicles = await fetch("/api/vehicles");
        const vehiclesData = await resVehicles.json().catch(() => []);
        const vehicles = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData.vehicles || vehiclesData.data || []);

        const totalVehicles = vehicles.length;
        const activeVehicles = vehicles.filter((v: any) => v.status === "active").length;
        const maintenanceVehicles = vehicles.filter((v: any) => v.status === "maintenance").length;
        
        const now = Date.now();
        const licenseAlerts = vehicles.filter((v: any) => {
          if (!v.licenseExpiry) return false;
          const diff = (new Date(v.licenseExpiry).getTime() - now) / (1000 * 60 * 60 * 24);
          return diff <= 30;
        }).length;

        const insuranceAlerts = vehicles.filter((v: any) => {
          if (!v.insuranceExpiry) return false;
          const diff = (new Date(v.insuranceExpiry).getTime() - now) / (1000 * 60 * 60 * 24);
          return diff <= 30;
        }).length;

        setData({
          totalVehicles,
          activeVehicles,
          maintenanceVehicles,
          expiredVehicles: vehicles.filter((v: any) => v.status === "expired").length,
          totalFuelCost: 0,
          totalMaintenanceCost: 0,
          openWorkOrders: 0,
          lowStockParts: 0,
          licenseAlerts,
          insuranceAlerts,
          oilAlerts: 0,
          recentFuel: [],
          recentWorkOrders: []
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 fade-in p-4 md:p-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-md">
        <h1 className="text-2xl font-bold mb-2">{t.dashboard || "لوحة التحكم"}</h1>
        <p className="text-blue-100 text-sm">
          {lang === "ar" ? "مرحباً بك في نظام إدارة الأسطول الشامل Fleet360" : "Welcome to Fleet360 Management System"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/vehicles">
          <StatCard
            icon="🚗"
            label={t.totalVehicles || "إجمالي السيارات"}
            value={loading ? "..." : data.totalVehicles}
            sub={`${data.activeVehicles} ${t.active || "نشط"}`}
            color="blue"
            gradient="linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)"
          />
        </Link>

        <Link href="/dashboard/vehicles">
          <StatCard
            icon="🔧"
            label={t.maintenance || "قيد الصيانة"}
            value={loading ? "..." : data.maintenanceVehicles}
            sub={lang === "ar" ? "مركبات" : "Vehicles"}
            color="amber"
            gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
          />
        </Link>

        <Link href="/dashboard/vehicles">
          <StatCard
            icon="📄"
            label={t.licenseAlerts || "تنبيهات الرخص"}
            value={loading ? "..." : data.licenseAlerts}
            sub={lang === "ar" ? "تنتهي قريباً" : "Expiring"}
            color="red"
            gradient="linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
            alert={data.licenseAlerts > 0}
          />
        </Link>

        <Link href="/dashboard/fuel">
          <StatCard
            icon="⛽"
            label={t.fuelCost || "تكلفة الوقود"}
            value={`${data.totalFuelCost.toLocaleString()} ج.م`}
            sub={t.currentMonth || "الشهر الحالي"}
            color="emerald"
            gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
          />
        </Link>
      </div>
    </div>
  );
}
