// هيكل الحاوية العامة لمنع التداخل وضمان استقرار الجدول في مكانه الصحيح
<div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex" dir="rtl">
  {/* الشريط الجانبي القابل للطي */}
  <div className={`${sidebarOpen ? "w-64" : "w-0"} transition-all duration-300 overflow-hidden flex-shrink-0`}>
    <Sidebar />
  </div>

  {/* محتوى الصفحة والجدول */}
  <div className="flex-1 flex flex-col min-w-0">
    <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
    <main className="p-6 overflow-x-auto flex-1">
      {children}
    </main>
  </div>
</div>
