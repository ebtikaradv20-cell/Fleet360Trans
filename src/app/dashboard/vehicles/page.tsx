"use client";
import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Pencil, Trash2, Car, X, Loader2, Hash, Download, FileSpreadsheet
} from "lucide-react";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";

interface Vehicle {
  id: number;
  plate_number: string;
  vin: string;
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

const VEHICLE_TEMPLATE_COLUMNS = [
  "رقم اللوحة", "رقم الشاسيه", "الشركة المالكة", "الماركة", "الموديل", "سنة الصنع",
  "المحافظة", "المنطقة", "الإدارة", "اسم السائق", "نوع الوقود",
  "تاريخ الترخيص", "الحالة", "الكيلومتر الحالي"
];

const FUEL_TYPES = [
  "بنزين", "سولار", "بنزين و غاز", "سولار وغاز", "غاز"
];

const safeNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : num;
};

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    plate_number: "", vin: "", company: "", brand: "", model: "", year: new Date().getFullYear(),
    governorate: "", region: "", department: "", driver_name: "", status: "active",
    current_km: 0, license_expiry: "", fuel_type: "بنزين",
  });

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vehicles", { cache: "no-store" });
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : (data.vehicles || []));
    } catch (err) {
      console.error("خطأ في جلب السيارات:", err);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const uniqueStatuses = ["الكل", ...Array.from(new Set(safeVehicles.map(v => v?.status || "active")))];
  const uniqueCompanies = ["الكل", ...Array.from(new Set(safeVehicles.map(v => v?.company || "غير محدد")))];
  const uniqueGovs = ["الكل", ...Array.from(new Set(safeVehicles.map(v => v?.governorate || "غير محدد")))];
  const uniqueFuels = ["الكل", ...Array.from(new Set(safeVehicles.map(v => v?.fuel_type || "بنزين")))];
  const uniqueDepts = ["الكل", ...Array.from(new Set(safeVehicles.map(v => v?.department || "غير محدد")))];

  const filteredVehicles = safeVehicles.filter(v => {
    if (!v) return false;
    const matchesSearch = 
      (v.plate_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.vin || "").toLowerCase().includes(search.toLowerCase()) ||
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

  const mapVehicleRow = (row: Record<string, any>) => {
    const plate = row["رقم اللوحة"] || row["plate_number"] || "";
    if (!String(plate).trim()) return null;

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
      vin: row["رقم الشاسيه"] || row["vin"] || "",
      company: row["الشركة المالكة"] || "",
      brand: row["الماركة"] || "",
      model: row["الموديل"] || "",
      year: safeNum(row["سنة الصنع"]) || new Date().getFullYear(),
      governorate: row["المحافظة"] || "",
      region: row["المنطقة"] || "",
      department: row["الإدارة"] || "",
      driver_name: row["اسم السائق"] || "",
      fuel_type: row["نوع الوقود"] || "بنزين",
      license_expiry: licenseDate,
      status: status,
      current_km: safeNum(row["الكيلومتر الحالي"]),
    };
  };

  const handleVehiclesImport = async (rows: any[], mode: "append" | "upsert") => {
    let ok = 0; let failed = 0;
    for (const payload of rows) {
      try {
        if (mode === "upsert") {
          const existing = vehicles.find(v => (v.plate_number || "").trim() === payload.plate_number);
          if (existing) {
            const res = await fetch(`/api/vehicles/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (res.ok) ok++; else failed++; continue;
          }
        }
        const res = await fetch("/api/vehicles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) ok++; else failed++;
      } catch { failed++; }
    }
    await fetchVehicles();
    return { ok, failed };
  };

  const handleDelete = async (id: number) => {
    if (!confirm("⚠️ تنبيه: هل أنت متأكد من حذف هذه السيارة؟")) return;

    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      const resData = await res.json().catch(() => ({}));

      if (res.ok) {
        if (resData.message) alert(resData.message);
        fetchVehicles();
      } else {
        alert(resData.error || "❌ تعذر حذف السيارة.");
      }
    } catch (err) {
      alert("❌ تعذر الاتصال بالخادم لحذف السيارة.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        license_expiry: formData.license_expiry && formData.license_expiry.trim() !== "" ? formData.license_expiry : null,
        year: safeNum(formData.year) || new Date().getFullYear(),
        current_km: safeNum(formData.current_km),
      };

      const res = await fetch(editingId ? `/api/vehicles/${editingId}` : "/api/vehicles", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json().catch(() => ({}));

      if (res.ok && resData.success !== false) {
        setIsModalOpen(false);
        setEditingId(null);
        fetchVehicles();
      } else {
        alert(resData.error || resData.message || "حدث خطأ أثناء الحفظ");
      }
    } catch (err) {
      alert("تعذر حفظ البيانات، تأكد من الاتصال بالخادم.");
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ plate_number: "", vin: "", company: "", brand: "", model: "", year: new Date().getFullYear(), governorate: "", region: "", department: "", driver_name: "", status: "active", current_km: 0, license_expiry: "", fuel_type: "بنزين" });
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData({ 
      plate_number: vehicle.plate_number || "", vin: vehicle.vin || "", company: vehicle.company || "", brand: vehicle.brand || "", model: vehicle.model || "", year: vehicle.year || new Date().getFullYear(), governorate: vehicle.governorate || "", region: vehicle.region || "", department: vehicle.department || "", driver_name: vehicle.driver_name || "", status: vehicle.status || "active", current_km: vehicle.current_km || 0, license_expiry: vehicle.license_expiry || "", fuel_type: vehicle.fuel_type || "بنزين" 
    });
    setIsModalOpen(true);
  };

  const excelData = filteredVehicles.map(v => ({
    "رقم اللوحة": v.plate_number || "", "رقم الشاسيه": v.vin || "", "الشركة المالكة": v.company || "", "الماركة": v.brand || "", "الموديل": v.model || "", "سنة الصنع": v.year || "", "المحافظة": v.governorate || "", "المنطقة": v.region || "", "الإدارة": v.department || "", "اسم السائق": v.driver_name || "", "نوع الوقود": v.fuel_type || "بنزين", "تاريخ الترخيص": v.license_expiry || "", "الحالة": v.status === "active" ? "نشطة" : v.status === "maintenance" ? "صيانة" : "متوقفة", "الكيلومتر الحالي": safeNum(v.current_km),
  }));

  return (
    <div className="space-y-6" dir="rtl">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl"><Car size={26} /></div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">إدارة الأسطول والسيارات</h1>
            <p className="text-sm text-gray-500 mt-0.5">إجمالي <span className="font-bold text-gray-900 dark:text-white">{safeVehicles.length}</span> سيارة مسجلة بالأسطول</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ImportExcelButton 
            templateColumns={VEHICLE_TEMPLATE_COLUMNS}
            templateFileName="قالب_السيارات"
            sampleRow={{
              "رقم اللوحة": "ل ج أ 1234", "رقم الشاسيه": "JT2BF22", "الشركة المالكة": "ترانس جاس", "الماركة": "تويوتا", "الموديل": "هايلوكس", "سنة الصنع": 2022,
              "المحافظة": "القاهرة", "المنطقة": "التجمع", "الإدارة": "الحركة", "اسم السائق": "أحمد", "نوع الوقود": "بنزين و غاز",
              "تاريخ الترخيص": "2025-12-31", "الحالة": "نشطة", "الكيلومتر الحالي": 50000
            }}
            mapRow={mapVehicleRow}
            onImport={handleVehiclesImport}
            buttonText="استيراد Excel"
          />

          <ExportExcelButton 
            data={excelData} 
            fileName="سجل_السيارات" 
            dateColumnName="تاريخ الترخيص" 
          />

          <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer">
            <Plus size={18} /><span>إضافة سيارة</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">البحث الشامل</label>
            <div className="relative">
              <Search size={16} className="absolute inset-y-0 start-3 top-2.5 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باللوحة، الشاسيه، السائق، الموديل..." className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl ps-9 pe-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">الشركة</label><select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none">{uniqueCompanies.map((c, i) => <option key={i} value={c}>{c}</option>)}</select></div>
          <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">المحافظة</label><select value={selectedGovernorate} onChange={e => setSelectedGovernorate(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none">{uniqueGovs.map((g, i) => <option key={i} value={g}>{g}</option>)}</select></div>
          <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">الإدارة</label><select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none">{uniqueDepts.map((d, i) => <option key={i} value={d}>{d}</option>)}</select></div>
          <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">الوقود</label><select value={selectedFuel} onChange={e => setSelectedFuel(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none">{uniqueFuels.map((f, i) => <option key={i} value={f}>{f}</option>)}</select></div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center gap-3 text-blue-800 dark:text-blue-400 font-bold"><Loader2 className="animate-spin" /> جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-sm">
                <tr>
                  <th className="p-4 font-bold border-l border-blue-600/50">اللوحة / الشاسيه</th>
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
                {filteredVehicles.map((v, i) => (
                  <tr key={v.id || i} className={`transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20 ${i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/60 dark:bg-gray-800/40"}`}>
                    <td className="p-4 font-black text-blue-900 dark:text-blue-400 border-l border-gray-100 dark:border-gray-800">
                      {v.plate_number}
                      {v.vin && <div className="text-[10px] text-gray-500 font-semibold mt-1">VIN: {v.vin}</div>}
                    </td>
                    <td className="p-4 font-semibold text-gray-700 dark:text-gray-300 border-l border-gray-100 dark:border-gray-800">{v.company || "-"}</td>
                    <td className="p-4 font-semibold text-gray-800 dark:text-gray-200 border-l border-gray-100 dark:border-gray-800">{v.brand} - {v.model}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 border-l border-gray-100 dark:border-gray-800">{v.governorate || "-"}</td>
                    <td className="p-4 font-bold text-orange-600 dark:text-orange-400 border-l border-gray-100 dark:border-gray-800">{v.fuel_type || "-"}</td>
                    <td className="p-4 font-semibold text-gray-700 dark:text-gray-300 border-l border-gray-100 dark:border-gray-800">{v.driver_name || "-"}</td>
                    <td className="p-4 text-gray-500 dark:text-gray-400 text-xs border-l border-gray-100 dark:border-gray-800">{v.license_expiry || "-"}</td>
                    <td className="p-4 border-l border-gray-100 dark:border-gray-800"><span className={`px-3 py-1 rounded-full text-xs font-bold ${v.status === "active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400"}`}>{v.status === "active" ? "نشطة" : v.status}</span></td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button onClick={() => openEditModal(v)} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400 transition-colors" title="تعديل"><Pencil size={16}/></button>
                        <button onClick={() => handleDelete(v.id)} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 transition-colors" title="حذف"><Trash2 size={16}/></button>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
              <h2 className="text-xl font-black text-blue-900 dark:text-white flex items-center gap-2"><Car className="text-orange-500" /> {editingId ? "تعديل بيانات السيارة" : "إضافة سيارة جديدة للأسطول"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-800 dark:hover:text-white"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">رقم اللوحة *</label>
                  <input type="text" required value={formData.plate_number} onChange={e=>setFormData({...formData, plate_number: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="مثال: ل ج أ 6318" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">رقم الشاسيه (VIN)</label>
                  <div className="relative"><Hash className="absolute start-3 top-2.5 text-gray-400" size={16}/><input type="text" value={formData.vin || ""} onChange={e=>setFormData({...formData, vin: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl ps-9 pe-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="مثال: JT2BF22..." /></div>
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
                  <input type="text" value={formData.model} onChange={e=>setFormData({...formData, model: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="مثال: دوبل كابينة" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">سنة الصنع</label>
                  <input type="number" value={formData.year} onChange={e=>setFormData({...formData, year: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">نوع الوقود</label>
                  <select value={formData.fuel_type} onChange={e=>setFormData({...formData, fuel_type: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500">
                    {FUEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">اسم السائق الرئيسي</label>
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
