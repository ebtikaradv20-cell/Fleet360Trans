"use client";
import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Pencil, Trash2, Car, X, 
  FileSpreadsheet, Loader2 
} from "lucide-react";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton"; // 👈 الزر الجديد
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

// ── أعمدة قالب الإكسيل المطلوبة ──
const VEHICLE_TEMPLATE_COLUMNS = [
  "رقم اللوحة", "الشركة المالكة", "الماركة", "الموديل", "سنة الصنع",
  "المحافظة", "المنطقة", "الإدارة", "اسم السائق", "نوع الوقود",
  "تاريخ الترخيص", "الحالة", "الكيلومتر الحالي"
];

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

  // ── دوال الاستيراد من الإكسيل ──
  const mapVehicleRow = (row: Record<string, any>) => {
    const plate = row["رقم اللوحة"] || row["plate_number"] || "";
    if (!String(plate).trim()) return null; // تخطي الصفوف الفارغة

    // معالجة التاريخ لو جاي من إكسيل
    let licenseDate = null;
    if (row["تاريخ الترخيص"]) {
      const d = new Date(row["تاريخ الترخيص"]);
      if (!isNaN(d.getTime())) licenseDate = d.toISOString().slice(0, 10);
    }

    let status = "active";
    if (row["الحالة"] === "صيانة" || row["الحالة"] === "maintenance") status = "maintenance";
    if (row["الحالة"] === "متوقفة" || row["الحالة"] === "stopped") status = "stopped";

    return {
      plate_number: String(plate).trim(),
      company: row["الشركة المالكة"] || "",
      brand: row["الماركة"] || "",
      model: row["الموديل"] || "",
      year: Number(row["سنة الصنع"]) || new Date().getFullYear(),
      governorate: row["المحافظة"] || "",
      region: row["المنطقة"] || "",
      department: row["الإدارة"] || "",
      driver_name: row["اسم السائق"] || "",
      fuel_type: row["نوع الوقود"] || "بنزين",
      license_expiry: licenseDate,
      status: status,
      current_km: Number(row["الكيلومتر الحالي"]) || 0,
    };
  };

  const handleVehiclesImport = async (rows: any[], mode: "append" | "upsert") => {
    let ok = 0;
    let failed = 0;

    for (const payload of rows) {
      try {
        if (mode === "upsert") {
          // البحث عن السيارة برقم اللوحة
          const existing = vehicles.find(v => (v.plate_number || "").trim() === payload.plate_number);
          if (existing) {
            const res = await fetch(`/api/vehicles/${existing.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (res.ok) ok++; else failed++;
            continue;
          }
        }
        
        // إضافة جديدة
        const res = await fetch("/api/vehicles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        if (res.ok) ok++; else failed++;
      } catch {
        failed++;
      }
    }

    await fetchVehicles(); // تحديث الجدول بعد الانتهاء
    return { ok, failed };
  };

  const handleExportExcel = () => {
    const finalExportData = filteredVehicles.map(v => ({
      "رقم اللوحة": v.plate_number,
      "الشركة المالكة": v.company,
      "الماركة": v.brand,
      "الموديل": v.model,
      "سنة الصنع": v.year,
      "المحافظة": v.governorate,
      "المنطقة": v.region,
      "الإدارة": v.department,
      "اسم السائق": v.driver_name,
      "نوع الوقود": v.fuel_type,
      "تاريخ الترخيص": v.license_expiry,
      "الحالة": v.status === "active" ? "نشطة" : v.status === "maintenance" ? "صيانة" : "متوقفة",
      "الكيلومتر الحالي": v.current_km,
    }));
    exportToExcel(finalExportData, "سجل_السيارات");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("⚠️ هل أنت متأكد من حذف هذه السيارة؟")) return;
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      if (res.ok) fetchVehicles();
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        license_expiry: formData.license_expiry && formData.license_expiry.trim() !== "" ? formData.license_expiry : null,
        year: Number(formData.year) || null,
        current_km: Number(formData.current_km) || 0,
      };

      const res = await fetch(editingId ? `/api/vehicles/${editingId}` : "/api/vehicles", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchVehicles();
      } else {
        const data = await res.json();
        alert(data.error || "حدث خطأ أثناء الحفظ");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ plate_number: "", company: "", brand: "", model: "", year: new Date().getFullYear(), governorate: "", region: "", department: "", driver_name: "", status: "active", current_km: 0, license_expiry: "", fuel_type: "بنزين" });
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData({ plate_number: vehicle.plate_number || "", company: vehicle.company || "", brand: vehicle.brand || "", model: vehicle.model || "", year: vehicle.year || new Date().getFullYear(), governorate: vehicle.governorate || "", region: vehicle.region || "", department: vehicle.department || "", driver_name: vehicle.driver_name || "", status: vehicle.status || "active", current_km: vehicle.current_km || 0, license_expiry: vehicle.license_expiry || "", fuel_type: vehicle.fuel_type || "بنزين" });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* ── رأس الصفحة المؤسسي ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl"><Car size={26} /></div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">إدارة الأسطول والسيارات</h1>
            <p className="text-sm text-gray-500 mt-0.5">إجمالي <span className="font-bold text-gray-900 dark:text-white">{vehicles.length}</span> سيارة مسجلة بالأسطول</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* ✅ زر الاستيراد السحري */}
          <ImportExcelButton 
            templateColumns={VEHICLE_TEMPLATE_COLUMNS}
            templateFileName="قالب_السيارات"
            sampleRow={{
              "رقم اللوحة": "ل ج أ 1234", "الشركة المالكة": "طاقة عربية", "الماركة": "تويوتا", "الموديل": "هايلوكس", "سنة الصنع": 2022,
              "المحافظة": "القاهرة", "المنطقة": "التجمع", "الإدارة": "الحركة", "اسم السائق": "أحمد", "نوع الوقود": "سولار",
              "تاريخ الترخيص": "2025-12-31", "الحالة": "نشطة", "الكيلومتر الحالي": 50000
            }}
            mapRow={mapVehicleRow}
            onImport={handleVehiclesImport}
            buttonText="استيراد"
          />

          <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md">
            <FileSpreadsheet size={18} /><span>تصدير</span>
          </button>

          <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md">
            <Plus size={18} /><span>إضافة سيارة</span>
          </button>
        </div>
      </div>

      {/* ── الفلاتر ── */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold mb-1.5">البحث الشامل</label>
            <div className="relative">
              <Search size={16} className="absolute inset-y-0 start-3 top-2.5 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باللوحة، السائق، الموديل..." className="w-full bg-gray-50 border border-gray-200 rounded-xl ps-9 pe-3 py-2 text-sm outline-none" />
            </div>
          </div>
          <div><label className="block text-xs font-bold mb-1.5">الشركة</label><select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none">{uniqueCompanies.map((c, i) => <option key={i} value={c}>{c}</option>)}</select></div>
          <div><label className="block text-xs font-bold mb-1.5">المحافظة</label><select value={selectedGovernorate} onChange={e => setSelectedGovernorate(e.target.value)} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none">{uniqueGovs.map((g, i) => <option key={i} value={g}>{g}</option>)}</select></div>
          <div><label className="block text-xs font-bold mb-1.5">الإدارة</label><select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none">{uniqueDepts.map((d, i) => <option key={i} value={d}>{d}</option>)}</select></div>
          <div><label className="block text-xs font-bold mb-1.5">الوقود</label><select value={selectedFuel} onChange={e => setSelectedFuel(e.target.value)} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none">{uniqueFuels.map((f, i) => <option key={i} value={f}>{f}</option>)}</select></div>
        </div>
      </div>

      {/* ── الجدول ── */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center gap-3 font-bold"><Loader2 className="animate-spin" /> جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
                <tr>
                  <th className="p-4 border-l border-blue-600/50">اللوحة</th><th className="p-4 border-l border-blue-600/50">الشركة</th><th className="p-4 border-l border-blue-600/50">الماركة</th><th className="p-4 border-l border-blue-600/50">المحافظة</th><th className="p-4 border-l border-blue-600/50">الوقود</th><th className="p-4 border-l border-blue-600/50">السائق</th><th className="p-4 border-l border-blue-600/50">الترخيص</th><th className="p-4 border-l border-blue-600/50">الحالة</th><th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredVehicles.map((v, i) => (
                  <tr key={v.id} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}>
                    <td className="p-4 font-black text-blue-900">{v.plate_number}</td>
                    <td className="p-4 font-semibold text-gray-700">{v.company || "-"}</td>
                    <td className="p-4 font-semibold text-gray-800">{v.brand} - {v.model}</td>
                    <td className="p-4 text-gray-600">{v.governorate || "-"}</td>
                    <td className="p-4 font-bold text-orange-600">{v.fuel_type || "-"}</td>
                    <td className="p-4 font-semibold text-gray-700">{v.driver_name || "-"}</td>
                    <td className="p-4 text-gray-500 text-xs">{v.license_expiry || "-"}</td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${v.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{v.status === "active" ? "نشطة" : v.status}</span></td>
                    <td className="p-4 text-center flex justify-center gap-2">
                      <button onClick={() => openEditModal(v)} className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Pencil size={16}/></button>
                      <button onClick={() => handleDelete(v.id)} className="p-2 bg-red-100 text-red-700 rounded-lg"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── نافذة إضافة/تعديل سيارة ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-black text-blue-900 flex items-center gap-2"><Car/> {editingId ? "تعديل بيانات السيارة" : "إضافة سيارة جديدة"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-800"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-xs font-bold mb-1">رقم اللوحة *</label><input type="text" required value={formData.plate_number} onChange={e=>setFormData({...formData, plate_number: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"/></div>
                <div><label className="block text-xs font-bold mb-1">الشركة المالكة</label><input type="text" value={formData.company} onChange={e=>setFormData({...formData, company: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                <div><label className="block text-xs font-bold mb-1">الماركة</label><input type="text" value={formData.brand} onChange={e=>setFormData({...formData, brand: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                <div><label className="block text-xs font-bold mb-1">الموديل</label><input type="text" value={formData.model} onChange={e=>setFormData({...formData, model: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                <div><label className="block text-xs font-bold mb-1">سنة الصنع</label><input type="number" value={formData.year} onChange={e=>setFormData({...formData, year: Number(e.target.value)})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"/></div>
                <div><label className="block text-xs font-bold mb-1">نوع الوقود</label><select value={formData.fuel_type} onChange={e=>setFormData({...formData, fuel_type: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="بنزين">بنزين</option><option value="سولار">سولار</option><option value="غاز">غاز</option></select></div>
                <div><label className="block text-xs font-bold mb-1">المحافظة</label><input type="text" value={formData.governorate} onChange={e=>setFormData({...formData, governorate: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                <div><label className="block text-xs font-bold mb-1">المنطقة</label><input type="text" value={formData.region} onChange={e=>setFormData({...formData, region: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                <div><label className="block text-xs font-bold mb-1">الإدارة المختصة</label><input type="text" value={formData.department} onChange={e=>setFormData({...formData, department: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                <div><label className="block text-xs font-bold mb-1">اسم السائق</label><input type="text" value={formData.driver_name} onChange={e=>setFormData({...formData, driver_name: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                <div><label className="block text-xs font-bold mb-1">تاريخ الترخيص</label><input type="date" value={formData.license_expiry} onChange={e=>setFormData({...formData, license_expiry: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                <div><label className="block text-xs font-bold mb-1">الحالة التشغيلية</label><select value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="active">نشطة</option><option value="maintenance">صيانة</option><option value="stopped">متوقفة</option></select></div>
              </div>

              <div className="flex gap-3 pt-5 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">إلغاء</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl hover:bg-blue-800 flex justify-center items-center gap-2">
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
