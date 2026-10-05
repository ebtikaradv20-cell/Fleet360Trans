"use client";

import "./globals.css";
import { AppProvider } from "@/context/AppContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <title>Fleet360 - Trans Gas / TAQA ARABIA</title>

        {/* إعدادات الشاشة والهاتف لتطبيق الـ APK */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0B1A3B" />
        <meta name="application-name" content="Fleet360" />
        <meta name="apple-mobile-web-app-title" content="Fleet360" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />

        {/* مسار ملف التعريف والأيقونات */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="shortcut icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />

        {/* سكريبت ضبط اللغة والوضع الليلي اللحظي وتسجيل Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var dark = localStorage.getItem('fleet360_dark') === 'true' || 
                             localStorage.getItem('fleet360_theme') === 'dark' || 
                             localStorage.getItem('theme') === 'dark';
                  var lang = localStorage.getItem('fleet360_lang') || localStorage.getItem('lang') || 'ar';
                  if (dark) document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
                  document.documentElement.setAttribute('lang', lang);
                } catch(e){}

                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function(){});
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white min-h-screen transition-colors duration-300 antialiased selection:bg-teal-500 selection:text-white">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
