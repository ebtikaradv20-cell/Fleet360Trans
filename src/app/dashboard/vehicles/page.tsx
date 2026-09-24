export default function VehiclesPage() {
  // بيانات تجريبية مؤقتة لضمان نجاح الـ Build بنجاح تام
  const vehicles = [
    { id: 1, plateNumber: "أ ب ج 1234", type: "شاحنة نقل ثقيل", driverName: "محمد أحمد", status: "متوفرة" },
    { id: 2, plateNumber: "س ص ع 5678", type: "سيارة إشراف", driverName: "محمود حسن", status: "في الطريق" },
    { id: 3, plateNumber: "ط ك ل 9012", type: "تريلا بضائع", driverName: "إبراهيم علي", status: "صيانة" },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-white">إدارة المركبات</h1>
        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-xl text-xs font-bold border border-blue-500/30">
          إجمالي المركبات: {vehicles.length}
        </span>
      </div>
      
      {/* جدول متجاوب أفقياً للهواتف المحمولة */}
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
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-white/5 transition">
                <td className="px-4 py-3 text-sm font-medium">{vehicle.plateNumber}</td>
                <td className="px-4 py-3 text-sm">{vehicle.type}</td>
                <td className="px-4 py-3 text-sm">{vehicle.driverName}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-500/30">
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
}
