"use client";
import React, { useState } from "react";
import { AppProvider } from "@/context/AppContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-50 dark:bg-gray-950 font-sans antialiased">
        <AppProvider>
          {/* إذا كانت الصفحة الحالية صفحة تسجيل الدخول، لا نعرض القائمة والناف بار */}
          <div className="min-h-screen flex">
            <div className={`${sidebarOpen ? "w-64" : "w-0"} transition-all duration-300 overflow-hidden flex-shrink-0`}>
              <Sidebar />
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
              <main className="p-6 overflow-x-auto flex-1">
                {children}
              </main>
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
