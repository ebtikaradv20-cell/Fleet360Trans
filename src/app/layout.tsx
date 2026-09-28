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
  const isLoginPage = pathname === "/login";

  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-50 dark:bg-gray-950 font-sans antialiased transition-colors">
        <AppProvider>
          {isLoginPage ? (
            <main className="min-h-screen w-full">{children}</main>
          ) : (
            <div className="min-h-screen flex" dir="rtl">
              {/* القائمة الجانبية */}
              <div
                className={`${
                  sidebarOpen ? "w-64" : "w-0"
                } transition-all duration-300 overflow-hidden flex-shrink-0 relative z-40`}
              >
                <Sidebar />
              </div>

              {/* حاوية الناف بار وبيانات الصفحة الأصلية */}
              <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
                <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <div className="p-6 flex-1 bg-gray-50 dark:bg-gray-950">
                  {children}
                </div>
              </div>
            </div>
          )}
        </AppProvider>
      </body>
    </html>
  );
}
