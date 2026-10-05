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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex w-full overflow-x-hidden" dir={isRTL ? "rtl" : "ltr"}>
      {/* القائمة الجانبية ممرر لها حالة الطي */}
      <Sidebar collapsed={isSidebarCollapsed} />

      {/* الحاوية الرئيسية تبدأ مباشرة بجوار السايدبار دون هوامش مضاعفة */}
      <div className="flex-1 flex flex-col min-w-0 w-full min-h-screen transition-all duration-300 ease-in-out">
        <Navbar onToggleSidebar={handleToggleSidebar} />

        {/* مساحة المحتوى الرئيسية بمحاذاة تامة ومسافة أمان قياسية متناسقة */}
        <main className="flex-1 p-4 md:p-6 w-full max-w-full space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
