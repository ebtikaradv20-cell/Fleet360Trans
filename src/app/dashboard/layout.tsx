"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { useApp } from "@/context/AppContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setUser, user, isRTL, sidebarCollapsed } = useApp(); // جلب حالة طي القائمة
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

  // تحديد الهامش بناءً على اتجاه الصفحة (RTL/LTR) وحالة طي القائمة الجانبية
  // إذا كانت القائمة مطوية تصبح المسافة أصغر (مثلاً w-20 أي ما يعادل ml-20 أو mr-20)
  const sidebarWidthClass = sidebarCollapsed 
    ? (isRTL ? "mr-20" : "ml-20") 
    : (isRTL ? "mr-64" : "ml-64");

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className={`flex-1 flex flex-col ${sidebarWidthClass} transition-all duration-300`}>
        <Navbar />
        <main className="flex-1 p-6 fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
