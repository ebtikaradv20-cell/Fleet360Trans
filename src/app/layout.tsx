// مثال للهيكل العام داخل لوحة التحكم لضمان عدم تداخل الـ Sidebar مع الجدول
"use client";
import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex" dir="rtl">
      {/* الشريط الجانبي المتحكم في إظهاره وإخفائه */}
      <div className={`${sidebarOpen ? "w-64" : "w-0 overflow-hidden"} transition-all duration-300 flex-shrink-0`}>
        <Sidebar />
      </div>

      {/* منطقة المحتوى والجدول */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="p-6 overflow-x-auto flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
