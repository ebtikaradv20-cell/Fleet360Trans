"use client";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {/* ── عنوان وأيقونة اللوجو لتاب المتصفح ── */}
        <title>Fleet360 - Trans Gas / TAQA ARABIA</title>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="shortcut icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />

        {/* ── سكريبت الدارك مود واللغة المفضلة ── */}
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
