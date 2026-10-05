"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { useApp } from "@/context/AppContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, setUser, isRTL } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(!user);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem("sidebar_collapsed");
    if (savedState !== null) {
      setIsSidebarCollapsed(savedState === "true");
    }
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function verifyAuth() {
      try {
        const res = await fetch("/api/auth/me", {
          signal: controller.signal,
          headers: { "Cache-Control": "no-cache" }
        });

        if (!res.ok) throw new Error("Unauthorized");

        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setLoading(false);
        } else {
          router.replace("/login");
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
          router.replace("/login");
        }
      }
    }

    verifyAuth();
    return () => controller.abort();
  }, [user, setUser, router]);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem("sidebar_collapsed", String(nextState));
      return nextState;
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white" dir="rtl">
        <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <div className="mt-4 text-xl font-bold tracking-wider">Fleet360</div>
        <div className="text-slate-400 text-sm mt-1">تطبيق إدارة الأسطول الشامل</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-gray-50 dark:bg-gray-950" dir={isRTL ? "rtl" : "ltr"}>
      {/* 1. السايدبار: ثابت تماماً في مكانه بارتفاع الشاشة ولا يتحرك */}
      <Sidebar collapsed={isSidebarCollapsed} />

      {/* 2. منطقة العمل: النافبار ثابت في الأعلى، والسكرول داخل المحتوى فقط */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <Navbar onToggleSidebar={handleToggleSidebar} />

        {/* 3. هذا السكشن هو الوحيد القابل للتمرير والسكرول لأعلى ولأسفل */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
