"use client";
import type { Metadata } from "next";
import { useState } from "react";
import { usePathname } from "next/navigation";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var dark = localStorage.getItem('fleet360_dark') === 'true';
    var lang = localStorage.getItem('fleet360_lang') || 'ar';
    if (dark) document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('dir',  lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  } catch(e){}
})();
            `,
          }}
        />
      </head>
      <body className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white min-h-screen transition-colors duration-300">
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

              {/* المحتوى الرئيسي والناف بار الموحد */}
              <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
                <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <main className="p-6 flex-1 bg-gray-50 dark:bg-gray-950">
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
