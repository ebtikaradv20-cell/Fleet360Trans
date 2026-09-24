import db from "@/db"; // تأكد من مسار الاستيراد الصحيح لديك
import { vehiclesTable } from "@/db/schema"; // تأكد من مسار الاسكيما

export default async function VehiclesPage() {
  try {
    // جلب البيانات من القاعدة بأمان (مع حماية الـ try/catch)
    const vehicles = await db.select().from(vehiclesTable);

    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6" dir="rtl">
        {/* عنوان الصفحة مع مسافات متجاوبة */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white">إدارة المركبات</h1>
          {/* زر إضافة جديد مثلاً */}
        </div>
        
        {/* الحاوية المتجاوبة للجدول (التي قمنا بتعديلها سابقاً) */}
        <div className="overflow-x-auto w-full bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
          <table className="min-w-full divide-y divide-gray-700 text-right">
            {/* (باقي كود الجدول كما هو...) */}
          </table>
        </div>
      </div>
    );
  } catch (error) {
    // معالجة الخطأ في حال تعذر جلب البيانات (يمنع ظهور شاشة الخطأ السوداء)
    console.error("Error loading vehicles:", error);
    return (
      <div className="p-8 text-center text-red-300 h-full flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold mb-2">⚠️ حدث خطأ أثناء تحميل بيانات المركبات</h2>
        <p className="text-sm opacity-80">يرجى التحقق من اتصال قاعدة البيانات وإعادة تحميل الصفحة.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-orange-600 rounded-lg text-white text-xs"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }
}
