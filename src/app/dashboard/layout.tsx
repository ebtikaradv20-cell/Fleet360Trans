"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { useApp } from "@/context/AppContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setUser, user, isRTL } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setUser(d.user);
          setLoading(false);
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, [setUser, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #1d4ed8 100%)" }}>
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚙️</div>
          <div className="text-white text-xl font-bold">Fleet360</div>
          <div className="text-blue-300 text-sm mt-1">تطبيق إدارة الأسطول الشامل</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950" dir={isRTL ? "rtl" : "ltr"}>
      {/* البار الجانبي مع تمرير حالة التصغير والتوسيع */}
      <Sidebar collapsed={isSidebarCollapsed} />

      {/* الحاوية الرئيسية تتكيف بنعومة مع عرض البار الجانبي */}
      <div className={`flex-1 flex flex-col transition-all duration-300 w-full overflow-x-hidden ${
        isSidebarCollapsed 
          ? (isRTL ? "md:mr-20" : "md:ml-20") 
          : (isRTL ? "md:mr-64" : "md:ml-64")
      }`}>
        {/* البار العلوي الوحيد الذي يتحكم في فتح/إغلاق القائمة */}
        <Navbar onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

        {/* محتوى الصفحات بمسافات مضبوطة ومتناسقة تملأ الشاشة */}
        <main className="flex-1 p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
