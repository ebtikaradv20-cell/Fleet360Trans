export default async function VehiclesPage() {
  try {
    // جلب البيانات من القاعدة بأمان
    const vehicles = await db.select().from(vehiclesTable);

    return (
      <div className="p-4 md:p-6" dir="rtl">
        <h1 className="text-2xl font-bold text-white mb-4">إدارة المركبات</h1>
        
        {/* التغليف المتجاوب لمنع انضغاط التصميم على الموبايل */}
        <div className="overflow-x-auto w-full bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
          <table className="min-w-full divide-y divide-gray-700 text-right">
            <thead className="bg-white/10 text-blue-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold">رقم المركبة</th>
                <th className="px-4 py-3 text-sm font-semibold">النوع</th>
                <th className="px-4 py-3 text-sm font-semibold">السائق</th>
                <th className="px-4 py-3 text-sm font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 text-white">
              {vehicles.map((vehicle: any) => (
                <tr key={vehicle.id} className="hover:bg-white/5 transition">
                  <td className="px-4 py-3 text-sm">{vehicle.plateNumber}</td>
                  <td className="px-4 py-3 text-sm">{vehicle.type}</td>
                  <td className="px-4 py-3 text-sm">{vehicle.driverName}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">
                      {vehicle.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading vehicles:", error);
    return (
      <div className="p-8 text-center text-red-300" dir="rtl">
        <h2 className="text-xl font-bold mb-2">⚠️ حدث خطأ أثناء تحميل بيانات المركبات</h2>
        <p className="text-sm opacity-80">يرجى التحقق من اتصال قاعدة البيانات أو إعادة تحميل الصفحة.</p>
      </div>
    );
  }
}
