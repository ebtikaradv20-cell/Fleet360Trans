"use client"; // هذا الملف يجب أن يكون Client Component
import React, { useState } from "react";
import { AppProvider } from "@/context/AppContext"; // التأكد من استيراد الـ Provider الصحيح
import Sidebar from "@/components/Sidebar"; // استيراد مكون الـ Sidebar
import Navbar from "@/components/Navbar"; // استيراد مكون الـ Navbar
import "./globals.css"; // استيراد ملف التنسيقات العامة

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // حالة التحكم بفتح وإغلاق القائمة الجانبية (تم تعريفها وتمريرها هنا)
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-50 dark:bg-gray-950 font-sans antialiased">
        {/* تفعيل الـ AppProvider ليحتوي التطبيق بالكامل */}
        <AppProvider>
          {/* الهيكل العام للوحة التحكم (Dashboard Layout) */}
          <div className="min-h-screen flex flex-row">
            {/* الشريط الجانبي (يتم طيه وإظهاره بناءً على الحالة) */}
            <div
              className={` ${
                sidebarOpen ? "w-64" : "w-0"
              } transition-all duration-300 overflow-hidden flex-shrink-0`}
            >
              <Sidebar />
            </div>

            {/* منطقة المحتوى والناف بار */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* الشريط العلوي (يتم تمرير حالة الـ sidebar للتحكم به) */}
              <Navbar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
              />

              {/* المحتوى الرئيسي للصفحات */}
              <main className="p-6 overflow-x-auto flex-1 bg-gray-50 dark:bg-gray-950">
                {children}
              </main>
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
