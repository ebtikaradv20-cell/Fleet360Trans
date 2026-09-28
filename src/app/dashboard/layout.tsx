"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { useApp } from "@/context/AppContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setUser, isRTL } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚙️</div>
          <div className="text-white text-xl font-bold">Fleet360</div>
          <div className="text-blue-300 text-sm mt-1">تطبيق إدارة الأسطول الشامل</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex" dir={isRTL ? "rtl" : "ltr"}>
      {/* القائمة الجانبية */}
      <Sidebar collapsed={isSidebarCollapsed} />

      {/* الحاوية الرئيسية (Navbar + Page Content) */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
        isSidebarCollapsed 
          ? (isRTL ? "md:mr-20" : "md:ml-20") 
          : (isRTL ? "md:mr-64" : "md:ml-64")
      }`}>
        {/* شريط التنقل العلوي الموحد */}
        <Navbar onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

        {/* محتوى الصفحة الرئيسية يملأ العرض بالكامل */}
        <main className="flex-1 p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
