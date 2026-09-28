"use client";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  
  // التحقق الحاسم: هل نحن في صفحة تسجيل الدخول؟
  const isLoginPage = pathname === "/login";

  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-50 dark:bg-gray-950 font-sans antialiased">
        <AppProvider>
          {isLoginPage ? (
            // صفحة تسجيل الدخول فقط (بدون أي قوائم أو أعمدة جانبية)
            <main className="min-h-screen w-full">{children}</main>
          ) : (
            // هيكل لوحة التحكم الداخلية فقط
            <div className="min-h-screen flex flex-row">
              <div
                className={`${
                  sidebarOpen ? "w-64" : "w-0"
                } transition-all duration-300 overflow-hidden flex-shrink-0`}
              >
                <Sidebar />
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <main className="p-6 overflow-x-auto flex-1 bg-gray-50 dark:bg-gray-950">
                  {children}
                </main>
              </div>
            </div>
          )}
        </AppProvider>
      </body>
    </html>
  );
}
