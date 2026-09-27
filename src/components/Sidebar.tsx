"use client";
import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { lang } = useApp();
  const t = translations[lang];
  const pathname = usePathname();
  const router = useRouter();

  // تحديد الاتجاه بناءً على اللغة (العربية يمين، وغيرها يسار)
  const isRtl = lang === "ar";

  const menuItems = [
    { label: t.dashboard, path: "/dashboard", icon: "📊" },
    { label: lang === "ar" ? "السيارات" : "Vehicles", path: "/dashboard/vehicles", icon: "🚗" },
    { label: lang === "ar" ? "أوامر الشغل" : "Work Orders", path: "/dashboard/work-orders", icon: "🔧" },
    { label: lang === "ar" ? "الوقود" : "Fuel", path: "/dashboard/fuel", icon: "⛽" },
    { label: lang === "ar" ? "تغيير الزيوت" : "Oil Changes", path: "/dashboard/oil-changes", icon: "🛢️" },
    { label: lang === "ar" ? "قطع الغيار" : "Spare Parts", path: "/dashboard/spare-parts", icon: "📦" },
    { label: lang === "ar" ? "الفحص" : "Inspection", path: "/dashboard/vehicle-inspection", icon: "🔍" },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false); // إغلاق القائمة تلقائياً على الموبايل عند الضغط على أي قسم
  };

  return (
    <>
      {/* شريط العلوي للهواتف فقط للتحكم في فتح وإغلاق القائمة */}
      <div className="lg:hidden flex items-center justify-between bg-white dark:bg-gray-900 p-4 border-b dark:border-gray-800 sticky top-0 z-40 shadow-sm">
        <span className="font-black text-lg text-gray-800 dark:text-white">Fleet360</span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
          aria-label="Toggle Menu"
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* طبقة عتمة خلف القائمة عند فتحها على الهواتف */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
        />
      )}

      {/* الشريط الجانبي الرئيسي */}
      <aside
        className={`fixed top-0 bottom-0 z-50 w-64 bg-white dark:bg-gray-900 border-x dark:border-gray-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shadow-xl lg:shadow-none ${
          isRtl
            ? isOpen ? "right-0" : "-right-64 lg:right-auto"
            : isOpen ? "left-0" : "-left-64 lg:left-auto"
        }`}
      >
        <div className="p-6 flex flex-col h-full">
          {/* شعار النظام */}
          <div className="mb-8 hidden lg:block">
            <h1 className="text-2xl font-black text-blue-600">Fleet360</h1>
            <p className="text-xs text-gray-400 mt-1">Fleet Management</p>
          </div>

          {/* روابط القائمة */}
          <nav className="space-y-2 flex-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-start ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
