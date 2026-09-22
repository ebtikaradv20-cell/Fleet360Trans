import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

export const metadata: Metadata = {
  title: "Fleet360 - تطبيق إدارة الأسطول الشامل",
  description: "Fleet360 – Comprehensive Fleet Management System | TRANSCAS / TAQA ARABIA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {/*
          Inline script runs BEFORE React hydrates → zero flash on reload.
          Reads the saved pref from localStorage and adds .dark / sets dir
          on <html> immediately.
        */}
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
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
