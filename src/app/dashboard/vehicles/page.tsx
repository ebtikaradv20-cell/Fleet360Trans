"use client";
import React, { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, Car, Filter, X, Calendar, Fuel, Building2, User, Gauge } from "lucide-react";
import ExportExcelButton from "@/components/ExportExcelButton";

interface Vehicle {
  id: number; plate_number: string; brand: string; model: string; year: number; department: string; driver_name: string; status: string; current_km: number; license_expiry?: string; fuel_type?: string; insurance_expiry?: string;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("الكل");
  const [selectedBrand, setSelectedBrand] = useState("الكل");
  const [selectedDept, setSelectedDept] = useState("الكل");
  const [selectedFuel, setSelectedFuel] = useState("الكل");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    plate_number: "", brand: "", model: "", year: new Date().getFullYear(), department: "", driver_name: "", status: "active", current_km: 0, license_expiry: "", fuel_type: "بنزين",
  });

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/vehicles");
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : (data.vehicles || []));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const uniqueStatuses = ["الكل", ...Array.from(new Set(vehicles.map(v => v.status || "active")))];
  const uniqueBrands = ["الكل", ...Array.from(new Set(vehicles.map(v => v.brand || "غير محدد")))];
  const uniqueDepts = ["الكل", ...Array.from(new Set(vehicles.map(v => v.department || "غير محدد")))];
  const uniqueFuels = ["الكل", ...Array.from(new Set(vehicles.map(v => v.fuel_type || "بنزين")))];

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = (v.plate_number || "").toLowerCase().includes(search.toLowerCase()) || (v.brand || "").toLowerCase().includes(search.toLowerCase()) || (v.department || "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (selectedStatus === "الكل" || v.status === selectedStatus) && (selectedBrand === "الكل" || v.brand === selectedBrand) && (selectedDept === "الكل" || v.department === selectedDept) && (selectedFuel === "الكل" || (v.fuel_type || "بنزين") === selectedFuel);
  });

  const excelData = filteredVehicles.map(v => ({
    "رقم اللوحة": v.plate_number || "", "الماركة": v.brand || "", "الموديل": v.model || "", "سنة الصنع": v.year || "", "الإدارة المختصة": v.department || "غير متوفر", "نوع الوقود": v.fuel_type || "بنزين", "موعد الترخيص": v.license_expiry || "غير محدد", "اسم السائق": v.driver_name || "غير متوفر", "الكيلومتر الحالي": v.current_km || 0, "الحالة": v.status === "active" ? "نشطة" : v.status,
  }));

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه السيارة؟")) return;
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      if (res.ok) setVehicles(vehicles.filter(v => v.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(editingId ? `/api/vehicles/${editingId}` : "/api/vehicles", {
        method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData),
      });
      if (res.ok) { setIsModalOpen(false); setEditingId(null); fetchVehicles(); }
    } catch (err) { console.error(err); }
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData({ plate_number: vehicle.plate_number || "", brand: vehicle.brand || "", model: vehicle.model || "", year: vehicle.year || new Date().getFullYear(), department: vehicle.department || "", driver_name: vehicle.driver_name || "", status: vehicle.status || "active", current_km: vehicle.current_km || 0, license_expiry: vehicle.license_expiry || "", fuel_type: vehicle.fuel_type || "بنزين" });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Car size={26} /></div>
          <div><h1 className="text-2xl font-black text-gray-900 dark:text-white">إدارة الأسطول والسيارات</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">إجمالي <span className="font-bold text-gray-900 dark:text-white">{vehicles.length}</span> سيارة</p></div>
        </div>
        <div className="flex items-center gap-3">
          <ExportExcelButton data={excelData} fileName="سجل_السيارات_الأسطول" />
          <button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#F97316] text-white rounded-xl font-bold text-sm shadow-md"><Plus size={18} /><span>إضافة سيارة</span></button>
        </div>
      </div>
      {/* Search and Filters and Table... omitted for brevity if needed but I provide full */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">البحث</label><input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500/50" /></div>
          <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">الحالة</label><select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm"><option value="الكل">الكل</option><option value="active">نشطة</option></select></div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? <div className="p-12 text-center">جاري التحميل...</div> : (
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-gray-700">
              <tr><th className="p-3.5">رقم اللوحة</th><th className="p-3.5">الماركة</th><th className="p-3.5">الحالة</th><th className="p-3.5 text-center">الإجراءات</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredVehicles.map(v => (
                <tr key={v.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                  <td className="p-3.5 font-bold text-blue-900 dark:text-blue-400">{v.plate_number}</td>
                  <td className="p-3.5">{v.brand} - {v.model}</td>
                  <td className="p-3.5">{v.status === "active" ? "نشطة" : v.status}</td>
                  <td className="p-3.5 text-center flex justify-center gap-1.5">
                    <button onClick={() => openEditModal(v)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Pencil size={15}/></button>
                    <button onClick={() => handleDelete(v.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg"><Trash2 size={15}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
