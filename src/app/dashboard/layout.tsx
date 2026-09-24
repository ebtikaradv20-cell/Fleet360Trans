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
      
      {/* 💡 تم دمج توقيعك الهندسي هنا بداخل الـ Sidebar أو أسفل الهيكل الداخلي */}
      <div className={`flex-1 flex flex-col ${marginClass} transition-all duration-300`}>
        <Navbar />
        <main className="flex-1 p-6 fade-in">
          {children}
        </main>
        
        {/* البصمة والتوقيع الرسمي في أسفل لوحة التحكم */}
        <footer className="py-3 px-6 border-t border-slate-200/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-1">
          <span>Fleet360 System v1.0 &copy; {new Date().getFullYear()}</span>
          <span className="font-bold text-slate-700 dark:text-slate-300 tracking-wide">
            Architected & Developed by <span className="text-blue-600 dark:text-blue-400">Omar Abd Elhalim</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
