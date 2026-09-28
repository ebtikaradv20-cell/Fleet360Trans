"use client";
import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Pencil, Trash2, Car, X, 
  FileSpreadsheet, Loader2, Download
} from "lucide-react";
import { exportToExcel } from "@/lib/excel";

interface Vehicle {
  id: number;
  plate_number: string;
  company: string;
  brand: string;
  model: string;
  year: number;
  governorate: string;
  region: string;
  department: string;
  driver_name: string;
  status: string;
  current_km: number;
  license_expiry?: string;
  fuel_type?: string;
  createdAt?: string;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [selectedStatus, setSelectedStatus] = useState("الكل");
  const [selectedCompany, setSelectedCompany] = useState("الكل");
  const [selectedGovernorate, setSelectedGovernorate] = useState("الكل");
  const [selectedFuel, setSelectedFuel] = useState("الكل");
  const [selectedDept, setSelectedDept] = useState("الكل");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  const [formData, setFormData] = useState({
    plate_number: "", company: "", brand: "", model: "", year: new Date().getFullYear(),
    governorate: "", region: "", department: "", driver_name: "", status: "active",
    current_km: 0, license_expiry: "", fuel_type: "بنزين",
  });

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vehicles");
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : (data.vehicles || []));
    } catch (err) {
      console.error("خطأ في جلب السيارات:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const uniqueStatuses = ["الكل", ...Array.from(new Set(vehicles.map(v => v.status || "active")))];
  const uniqueCompanies = ["الكل", ...Array.from(new Set(vehicles.map(v => v.company || "غير محدد")))];
  const uniqueGovs = ["الكل", ...Array.from(new Set(vehicles.map(v => v.governorate || "غير محدد")))];
  const uniqueFuels = ["الكل", ...Array.from(new Set(vehicles.map(v => v.fuel_type || "بنزين")))];
  const uniqueDepts = ["الكل", ...Array.from(new Set(vehicles.map(v => v.department || "غير محدد")))];

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = 
      (v.plate_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.driver_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.model || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.brand || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.company || "").toLowerCase().includes(search.toLowerCase());

    return matchesSearch &&
      (selectedStatus === "الكل" || v.status === selectedStatus) &&
      (selectedCompany === "الكل" || v.company === selectedCompany) &&
      (selectedGovernorate === "الكل" || v.governorate === selectedGovernorate) &&
      (selectedDept === "الكل" || v.department === selectedDept) &&
      (selectedFuel === "الكل" || (v.fuel_type || "بنزين") === selectedFuel);
  });

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ 
      plate_number: "", company: "", brand: "", model: "", year: new Date().getFullYear(),
      governorate: "", region: "", department: "", driver_name: "", status: "active",
      current_km: 0, license_expiry: "", fuel_type: "بنزين"
    });
    setIsModalOpen(true);
  };

  const handleExportExcel = () => {
    const finalExportData = filteredVehicles.filter(v => {
      if (!exportStartDate && !exportEndDate) return true;
      const vDate = v.createdAt ? new Date(v.createdAt).getTime() : 0;
      const sDate = exportStartDate ? new Date(exportStartDate).getTime() : 0;
      const eDate = exportEndDate ? new Date(exportEndDate).getTime() : Infinity;
      return vDate >= sDate && vDate <= eDate;
    }).map(v => ({
      "رقم اللوحة": v.plate_number,
      "الشركة المالكة": v.company,
      "المحافظة": v.governorate,
      "المنطقة": v.region,
      "الإدارة": v.department,
      "الماركة": v.brand,
      "الموديل": v.model,
      "سنة الصنع": v.year,
      "نوع الوقود": v.fuel_type,
      "تاريخ الترخيص": v.license_expiry,
      "اسم السائق": v.driver_name,
      "الحالة": v.status === "active" ? "نشطة" : v.status,
    }));

    exportToExcel(finalExportData, "سجل_السيارات_المفصل");
    setIsExportModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("⚠️ تنبيه: هل أنت متأكد من حذف هذه السيارة نهائياً؟")) return;

    const previousVehicles = [...vehicles];
    setVehicles(prev => prev.filter(v => v.id !== id));

    try {
      let res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      if (res.status === 404 || res.status === 405) {
        res = await fetch(`/api/vehicles?id=${id}`, { method: "DELETE" });
      }

      if (res.ok) {
        fetchVehicles();
      } else {
        setVehicles(previousVehicles);
        let errorMsg = "❌ تعذر حذف السيارة لأنها مرتبطة بسجلات أخرى (وقود / صيانة / أوامر شغل).";
        try {
          const errData = await res.json();
          if (errData && errData.error) errorMsg = errData.error;
        } catch {}
        alert(errorMsg);
      }
    } catch (err) {
      setVehicles(previousVehicles);
      console.error("Delete Exception:", err);
      alert("❌ تعذر الاتصال بالخادم لحذف السيارة.");
    }
  };

  // ✅ دالة الحفظ المحدثة: تظهر سبب الخطأ الحقيقي من السيرفر
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // تنظيف التواريخ الفارغة قبل الإرسال
      const payload = {
        ...formData,
        license_expiry: formData.license_expiry && formData.license_expiry.trim() !== "" 
          ? formData.license_expiry 
          : null,
        year: Number(formData.year) || null,
        current_km: Number(formData.current_km) || 0,
      };

      const res = await fetch(editingId ? `/api/vehicles/${editingId}` : "/api/vehicles", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success !== false) {
        setIsModalOpen(false);
        setEditingId(null);
        fetchVehicles();
      } else {
        // ✅ إظهار رسالة الخطأ الحقيقية من السيرفر
        alert(data.error || data.message || "حدث خطأ أثناء حفظ بيانات السيارة");
      }
    } catch (err) {
      console.error(err);
      alert("تعذر حفظ البيانات، تأكد من الاتصال بالخادم.");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData({
      plate_number: vehicle.plate_number || "",
      company: vehicle.company || "",
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      year: vehicle.year || new Date().getFullYear(),
      governorate: vehicle.governorate || "",
      region: vehicle.region || "",
      department: vehicle.department || "",
      driver_name: vehicle.driver_name || "",
      status: vehicle.status || "active",
      current_km: vehicle.current_km || 0,
      license_expiry: vehicle.license_expiry || "",
      fuel_type: vehicle.fuel_type || "بنزين",
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl">
            <Car size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">إدارة الأسطول والسيارات</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              إجمالي <span className="font-bold text-gray-900 dark:text-white">{vehicles.length}</span> سيارة مسجلة بالأسطول
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer"
          >
            <FileSpreadsheet size={18} />
            <span>تصدير Excel</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer"
          >
            <Plus size={18} />
            <span>إضافة سيارة</span>
          </button>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">البحث الشامل</label>
            <div className="relative">
              <Search size={16} className="absolute inset-y-0 start-3 top-2.5 text-gray-400" />
              <input 
                type="text" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="ابحث باللوحة، السائق، الموديل، الشركة..." 
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl ps-9 pe-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">الشركة المالكة</label>
            <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none">
              {uniqueCompanies.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">المحافظة</label>
            <select value={selectedGovernorate} onChange={e => setSelectedGovernorate(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none">
              {uniqueGovs.map((g, i) => <option key={i} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">الإدارة</label>
            <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none">
              {uniqueDepts.map((d, i) => <option key={i} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">الوقود</label>
            <select value={selectedFuel} onChange={e => setSelectedFuel(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none">
              {uniqueFuels.map((f, i) => <option key={i} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center gap-3 text-blue-800 dark:text-blue-400 font-bold">
            <Loader2 className="animate-spin" />
            <span>جاري تحميل بيانات الأسطول...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-sm">
                <tr>
                  <th className="p-4 font-bold border-l border-blue-600/50">رقم اللوحة</th>
                  <th className="p-4 font-bold border-l border-blue-600/50">الشركة المالكة</th>
                  <th className="p-4 font-bold border-l border-blue-600/50">الماركة / الموديل</th>
                  <th className="p-4 font-bold border-l border-blue-600/50">المحافظة</th>
                  <th className="p-4 font-bold border-l border-blue-600/50">نوع الوقود</th>
                  <th className="p-4 font-bold border-l border-blue-600/50">اسم السائق</th>
                  <th className="p-4 font-bold border-l border-blue-600/50">تاريخ الترخيص</th>
                  <th className="p-4 font-bold border-l border-blue-600/50">الحالة</th>
                  <th className="p-4 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredVehicles.map((v, index) => (
                  <tr key={v.id} className={`transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20 ${index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/60 dark:bg-gray-800/40"}`}>
                    <td className="p-4 font-black text-blue-900 dark:text-blue-400 border-l border-gray-100 dark:border-gray-800">{v.plate_number}</td>
                    <td className="p-4 font-semibold text-gray-700 dark:text-gray-300 border-l border-gray-100 dark:border-gray-800">{v.company || "-"}</td>
                    <td className="p-4 font-semibold text-gray-800 dark:text-gray-200 border-l border-gray-100 dark:border-gray-800">{v.brand} - {v.model}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 border-l border-gray-100 dark:border-gray-800">{v.governorate || "-"}</td>
                    <td className="p-4 font-bold text-orange-600 dark:text-orange-400 border-l border-gray-100 dark:border-gray-800">{v.fuel_type || "-"}</td>
                    <td className="p-4 font-semibold text-gray-700 dark:text-gray-300 border-l border-gray-100 dark:border-gray-800">{v.driver_name || "-"}</td>
                    <td className="p-4 text-gray-500 dark:text-gray-400 text-xs border-l border-gray-100 dark:border-gray-800">{v.license_expiry || "-"}</td>
                    <td className="p-4 border-l border-gray-100 dark:border-gray-800">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${v.status === "active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400"}`}>
                        {v.status === "active" ? "نشطة" : v.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button onClick={() => openEditModal(v)} className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors" title="تعديل"><Pencil size={16}/></button>
                        <button onClick={() => handleDelete(v.id)} className="p-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors" title="حذف نهائي"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredVehicles.length === 0 && <div className="p-10 text-center text-gray-500 font-bold">لا توجد بيانات مطابقة للفلاتر.</div>}
          </div>
        )}
      </div>

      {/* نافذة تصدير Excel */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 dark:border-gray-800 pb-3">
              <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600"/>
                <span>خيارات تصدير Excel</span>
              </h2>
              <button onClick={() => setIsExportModalOpen(false)} className="text-gray-400 hover:text-gray-800 dark:hover:text-white"><X size={20}/></button>
            </div>
            <div className="space-y-4 mb-6">
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                سيتم تصدير البيانات المفلترة حالياً فقط. يمكنك تحديد نطاق زمني اختيارياً:
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">من تاريخ</label>
                <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
                <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:border-emerald-500" />
              </div>
            </div>
            <button onClick={handleExportExcel} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer">
              <Download size={18} />
              <span>تحميل شيت الإكسيل</span>
            </button>
          </div>
        </div>
      )}

      {/* نافذة إضافة / تعديل */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
              <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Car className="text-orange-500" />
                <span>{editingId ? "تعديل بيانات السيارة" : "إضافة سيارة جديدة للأسطول"}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-800 dark:hover:text-white"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">رقم اللوحة *</label>
                  <input type="text" required value={formData.plate_number} onChange={e=>setFormData({...formData, plate_number: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="مثال: ل ج أ 6318" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الشركة المالكة</label>
                  <input type="text" value={formData.company} onChange={e=>setFormData({...formData, company: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="مثال: ترانس جاس" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الماركة</label>
                  <input type="text" value={formData.brand} onChange={e=>setFormData({...formData, brand: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="مثال: تويوتا" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الموديل</label>
                  <input type="text" value={formData.model} onChange={e=>setFormData({...formData, model: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="مثال: دويبل كابينة" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">سنة الصنع</label>
                  <input type="number" value={formData.year} onChange={e=>setFormData({...formData, year: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">نوع الوقود</label>
                  <select value={formData.fuel_type} onChange={e=>setFormData({...formData, fuel_type: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500">
                    <option value="بنزين">بنزين</option>
                    <option value="سولار">سولار</option>
                    <option value="غاز">غاز</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">المحافظة</label>
                  <input type="text" value={formData.governorate} onChange={e=>setFormData({...formData, governorate: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="مثال: كفر الشيخ" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">المنطقة</label>
                  <input type="text" value={formData.region} onChange={e=>setFormData({...formData, region: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="مثال: دسوق" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الإدارة المختصة</label>
                  <input type="text" value={formData.department} onChange={e=>setFormData({...formData, department: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="مثال: الصيانة" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">اسم السائق</label>
                  <input type="text" value={formData.driver_name} onChange={e=>setFormData({...formData, driver_name: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">تاريخ انتهاء الترخيص</label>
                  <input type="date" value={formData.license_expiry} onChange={e=>setFormData({...formData, license_expiry: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الحالة التشغيلية</label>
                  <select value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500">
                    <option value="active">نشطة</option>
                    <option value="maintenance">صيانة</option>
                    <option value="stopped">متوقفة</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-5 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition-colors">إلغاء</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-md transition-all cursor-pointer">
                  {saving ? <Loader2 className="animate-spin" size={18}/> : "حفظ بيانات السيارة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
