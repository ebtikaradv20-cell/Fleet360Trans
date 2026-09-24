"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { useApp } from "@/context/AppContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setUser, user, isRTL, sidebarCollapsed } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setUser(d.user);
          setLoading(false);
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, [setUser, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #1d4ed8 100%)" }}>
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚙️</div>
          <div className="text-white text-xl font-bold">Fleet360</div>
          <div className="text-blue-300 text-sm mt-1">تطبيق إدارة الأسطول الشامل</div>
        </div>
      </div>
    );
  }

  // حساب الهامش بمرونة بناءً على حالة الطي واتجاه الصفحة (RTL/LTR)
  const marginClass = sidebarCollapsed 
    ? (isRTL ? "mr-16" : "ml-16") 
    : (isRTL ? "mr-64" : "ml-64");

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className={`flex-1 flex flex-col ${marginClass} transition-all duration-300`}>
        <Navbar />
        <main className="flex-1 p-6 fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
<div className="mt-auto p-4 border-t border-slate-100 text-center bg-slate-50/50">
  <p className="text-[11px] text-slate-400">Fleet360 System v1.0</p>
  <p className="text-xs font-bold text-slate-700 mt-0.5">By Omar Abd Elhalim</p>
</div>
