"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Vehicle {
  id: number;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  department: string;
  driver_name: string;
  status: string;
  current_km: number;
  license_expiry?: string;
  insurance_expiry?: string;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // فلتر ديناميكي متطابق مع البيانات
  const [selectedStatus, setSelectedStatus] = useState("الكل");
  const [selectedBrand, setSelectedBrand] = useState("الكل");
  const [selectedDept, setSelectedDept] = useState("الكل");

  // حالات نافذة الإضافة/التعديل
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    plate_number: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    department: "",
    driver_name: "",
    status: "active",
    current_km: 0,
  });

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/vehicles");
      const data = await res.json();
      if (Array.isArray(data)) {
        setVehicles(data);
      } else if (data.vehicles) {
        setVehicles(data.vehicles);
      }
    } catch (err) {
      console.error("خطأ في جلب السيارات:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // استخراج الفلاتر ديناميكياً من البيانات الحقيقية للجدول
  const uniqueStatuses = ["الكل", ...Array.from(new Set(vehicles.map(v => v.status || "active")))];
  const uniqueBrands = ["الكل", ...Array.from(new Set(vehicles.map(v => v.brand || "غير محدد")))];
  const uniqueDepts = ["الكل", ...Array.from(new Set(vehicles.map(v => v.department || "غير محدد")))];

  // تصفية البيانات بناءً على البحث والفلاتر الديناميكية
  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = 
      (v.plate_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.brand || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.department || "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus = selectedStatus === "الكل" || v.status === selectedStatus;
    const matchesBrand = selectedBrand === "الكل" || v.brand === selectedBrand;
    const matchesDept = selectedDept === "الكل" || v.department === selectedDept;

    return matchesSearch && matchesStatus && matchesBrand && matchesDept;
  });

  // دالة الحذف (تعمل بـ ID الصحيح)
  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه السيارة؟")) return;
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      if (res.ok) {
        setVehicles(vehicles.filter(v => v.id !== id));
      } else {
        alert("فشل في حذف السيارة من الخادم");
      }
    } catch (err) {
      console.error("خطأ الحذف:", err);
    }
  };

  // دالة الحفظ (إضافة أو تعديل)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/vehicles/${editingId}` : "/api/vehicles";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({
          plate_number: "",
          brand: "",
          model: "",
          year: new Date().getFullYear(),
          department: "",
          driver_name: "",
          status: "active",
          current_km: 0,
        });
        fetchVehicles();
      } else {
        alert("حدث خطأ أثناء حفظ البيانات");
      }
    } catch (err) {
      console.error("خطأ الحفظ:", err);
    }
  };

  // فتح نافذة التعديل
  const openEditModal = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData({
      plate_number: vehicle.plate_number || "",
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      year: vehicle.year || new Date().getFullYear(),
      department: vehicle.department || "",
      driver_name: vehicle.driver_name || "",
      status: vehicle.status || "active",
      current_km: vehicle.current_km || 0,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">السيارات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">إجمالي {vehicles.length} سيارة مسجلة في الأسطول</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ plate_number: "", brand: "", model: "", year: new Date().getFullYear(), department: "", driver_name: "", status: "active", current_km: 0 });
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-lg font-medium text-sm transition-all shadow-sm"
          >
            ＋ إضافة سيارة
          </button>
        </div>
      </div>

      {/* شريط البحث والفلاتر الديناميكية المطابقة للبنود */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">بحث برقم اللوحة أو الماركة</label>
            <input
              type="text"
              placeholder="بحث..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">فلتر الحالة</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {uniqueStatuses.map((st, idx) => (
                <option key={idx} value={st}>{st === "active" ? "نشطة" : st}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">فلتر الماركة</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {uniqueBrands.map((b, idx) => (
                <option key={idx} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">فلتر القسم (الفرع)</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {uniqueDepts.map((d, idx) => (
                <option key={idx} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* جدول البيانات بتصميم مؤسسي رسمي (Corporate UI) */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">جاري تحميل البيانات...</div>
        ) : filteredVehicles.length === 0 ? (
          <div className="p-12 text-center text-gray-500">لا توجد سيارات مطابقة للبحث أو الفلتر</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="p-3">رقم اللوحة</th>
                  <th className="p-3">الماركة والموديل</th>
                  <th className="p-3">السنة</th>
                  <th className="p-3">القسم</th>
                  <th className="p-3">اسم السائق</th>
                  <th className="p-3">الكيلومتر الحالي</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{vehicle.plate_number}</td>
                    <td className="p-3">{vehicle.brand} - {vehicle.model}</td>
                    <td className="p-3">{vehicle.year}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium">
                        {vehicle.department || "غير متوفر"}
                      </span>
                    </td>
                    <td className="p-3">{vehicle.driver_name || "غير متوفر"}</td>
                    <td className="p-3">{vehicle.current_km ? `${vehicle.current_km.toLocaleString()} كم` : "0 كم"}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {vehicle.status === "active" ? "نشطة" : vehicle.status}
                      </span>
                    </td>
                    <td className="p-3 text-center space-x-2 space-x-reverse">
                      <button
                        onClick={() => openEditModal(vehicle)}
                        className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 text-xs font-medium transition-colors"
                      >
                        ✏️ تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(vehicle.id)}
                        className="px-2.5 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-100 text-xs font-medium transition-colors"
                      >
                        🗑️ حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة الإضافة أو التعديل (Modal) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-800 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingId ? "تعديل بيانات السيارة" : "إضافة سيارة جديدة"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">رقم اللوحة</label>
                <input
                  type="text"
                  required
                  value={formData.plate_number}
                  onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white text-right"
                  placeholder="مثال: ل ج أ 6318"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">الماركة</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white text-right"
                    placeholder="مثال: نيسان"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">الموديل</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white text-right"
                    placeholder="مثال: بيك أب"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">سنة الصنع</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">القسم / الفرع</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white text-right"
                    placeholder="مثال: دسوق"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">اسم السائق</label>
                  <input
                    type="text"
                    value={formData.driver_name}
                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">الكيلومتر الحالي</label>
                  <input
                    type="number"
                    value={formData.current_km}
                    onChange={(e) => setFormData({ ...formData, current_km: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white text-right"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
