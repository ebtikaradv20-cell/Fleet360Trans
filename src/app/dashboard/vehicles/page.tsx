"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";

interface Vehicle {
  id: number;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  department: string;
  driverName: string;
  status: string;
  currentKm: number;
  licenseExpiry: string;
  insuranceExpiry: string;
  color: string;
  vin: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const emptyVehicle: Partial<Vehicle> = {
  plateNumber: "", brand: "", model: "", year: new Date().getFullYear(),
  department: "", driverName: "", status: "active", currentKm: 0,
  licenseExpiry: "", insuranceExpiry: "", color: "", vin: "", notes: ""
};

// فصل مكون الحقل خارج المكون الرئيسي لمنع فقدان التركيز أثناء الكتابة
interface FieldProps {
  label: string;
  children: React.ReactNode;
}
const Field = ({ label, children }: FieldProps) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full border dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function VehiclesPage() {
  const { lang, user } = useApp();
  const t = translations[lang] || translations["ar"];
  const [data, setData] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Vehicle>>(emptyVehicle);
  const [isEdit, setIsEdit] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("vehicles:write");

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (brandFilter) params.set("brand", brandFilter);
      if (deptFilter) params.set("department", deptFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      
      const res = await fetch(`/api/vehicles?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      const d = await res.json();
      
      if (Array.isArray(d)) {
        setData(d);
      } else if (d && Array.isArray(d.vehicles)) {
        setData(d.vehicles);
      } else if (d && Array.isArray(d.data)) {
        setData(d.data);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error("Error loading vehicles:", error);
      setFetchError(lang === "ar" ? "تعذر جلب بيانات المركبات من الخادم" : "Failed to load vehicles from server");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, brandFilter, deptFilter, dateFrom, dateTo, lang]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      const method = isEdit ? "PUT" : "POST";
      // التأكد من إرسال الـ id بشكل صحيح في رابط الـ API عند التعديل
      const url = isEdit && editing.id ? `/api/vehicles/${editing.id}` : "/api/vehicles";
      
      const res = await fetch(url, { 
        method, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(editing) 
      });

      if (res.ok) { 
        setModalOpen(false); 
        load(); 
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Server save error details:", errorData);
        alert(lang === "ar" ? "فشل حفظ بيانات المركبة، تأكد من صحة المدخلات" : "Failed to save vehicle data");
      }
    } catch (err) {
      console.error("Save error exception:", err);
      alert(lang === "ar" ? "حدث خطأ غير متوقع أثناء الحفظ" : "An unexpected error occurred during save");
    }
  };

  const handleDelete = async (row: Vehicle) => {
    if (!confirm(lang === "ar" ? "هل أنت متأكد من حذف هذه المركبة؟" : "Are you sure you want to delete this vehicle?")) return;
    try {
      const res = await fetch(`/api/vehicles/${row.id}`, { method: "DELETE" });
      if (res.ok) {
        load();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const openAdd = () => { setEditing(emptyVehicle); setIsEdit(false); setModalOpen(true); };
  const openEdit = (row: Vehicle) => { setEditing({ ...row }); setIsEdit(true); setModalOpen(true); };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : "-";
  const isExpiringSoon = (d: string) => {
    if (!d) return false;
    const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  };

  const columns = [
    { key: "plateNumber", header: t.plateNumber || "رقم اللوحة", render: (r: Vehicle) => <span className="font-bold text-blue-600 dark:text-blue-400">{r.plateNumber}</span> },
    { key: "brand", header: t.brand || "الماركة", render: (r: Vehicle) => `${r.brand || ""} ${r.model || ""}` },
    { key: "year", header: t.year || "السنة" },
    { key: "department", header: t.department || "القسم" },
    { key: "driverName", header: t.driverName || "السائق" },
    { key: "currentKm", header: t.currentKm || "الكيلومترات", render: (r: Vehicle) => `${(r.currentKm || 0).toLocaleString()} كم` },
    { key: "status", header: t.status || "الحالة", render: (r: Vehicle) => <StatusBadge status={r.status} /> },
    { key: "licenseExpiry", header: t.licenseExpiry || "انتهاء الرخصة", render: (r: Vehicle) => (
      <span className={isExpiringSoon(r.licenseExpiry) ? "text-red-500 font-bold" : ""}>{formatDate(r.licenseExpiry)}</span>
    )},
    { key: "insuranceExpiry", header: t.insuranceExpiry || "انتهاء التأمين", render: (r: Vehicle) => (
      <span className={isExpiringSoon(r.insuranceExpiry) ? "text-red-500 font-bold" : ""}>{formatDate(r.insuranceExpiry)}</span>
    )},
    { key: "createdAt", header: t.createdAt || "تاريخ الإضافة", render: (r: Vehicle) => formatDate(r.createdAt) },
  ];

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title={t.vehicles || "المركبات"} icon="🚗"
        subtitle={lang === "ar" ? `إجمالي ${data.length} سيارة` : `Total ${data.length} vehicles`}
        onAdd={canWrite ? openAdd : undefined}
        addLabel={t.addVehicle || "إضافة مركبة"}
        data={data.map(v => ({ ...v }))}
        exportFileName="vehicles"
      >
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`🔍 ${t.search || "بحث"}...`}
          className="border dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
      </PageHeader>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <FilterSelect label={t.status || "الحالة"} value={statusFilter} onChange={setStatusFilter} options={[
          { value: "active", label: t.active || "نشط" },
          { value: "maintenance", label: lang === "ar" ? "قيد الصيانة" : "In Maintenance" },
          { value: "expired", label: t.expired || "منتهي" },
        ]} />
        <FilterSelect label={t.brand || "الماركة"} value={brandFilter} onChange={setBrandFilter} options={[
          { value: "تويوتا", label: "تويوتا / Toyota" },
          { value: "فورد", label: "فورد / Ford" },
          { value: "نيسان", label: "نيسان / Nissan" },
          { value: "هيونداي", label: "هيونداي / Hyundai" },
          { value: "ميتسوبيشي", label: "ميتسوبيشي / Mitsubishi" },
        ]} />
        <FilterSelect label={t.department || "القسم"} value={deptFilter} onChange={setDeptFilter} options={[
          { value: "المبيعات", label: lang === "ar" ? "المبيعات" : "Sales" },
          { value: "اللوجستيات", label: lang === "ar" ? "اللوجستيات" : "Logistics" },
          { value: "الإدارة", label: lang === "ar" ? "الإدارة" : "Administration" },
          { value: "المشاريع", label: lang === "ar" ? "المشاريع" : "Projects" },
          { value: "الصيانة", label: lang === "ar" ? "الصيانة" : "Maintenance" },
        ]} />
      </FilterBar>

      {fetchError && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl text-red-500 text-sm text-center">
          ⚠️ {fetchError}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden w-full overflow-x-auto">
        <DataTable
          columns={columns} data={data} loading={loading}
          onEdit={canWrite ? openEdit : undefined}
          onDelete={user?.role === "admin" ? handleDelete : undefined}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? (t.edit || "تعديل") : (t.addVehicle || "إضافة مركبة")} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t.plateNumber || "رقم اللوحة"}>
            <input className={inputClass} value={editing.plateNumber || ""} onChange={e => setEditing(prev => ({...prev, plateNumber: e.target.value}))} />
          </Field>
          <Field label={t.brand || "الماركة"}>
            <input className={inputClass} value={editing.brand || ""} onChange={e => setEditing(prev => ({...prev, brand: e.target.value}))} />
          </Field>
          <Field label={t.model || "الموديل"}>
            <input className={inputClass} value={editing.model || ""} onChange={e => setEditing(prev => ({...prev, model: e.target.value}))} />
          </Field>
          <Field label={t.year || "السنة"}>
            <input type="number" className={inputClass} value={editing.year || ""} onChange={e => setEditing(prev => ({...prev, year: parseInt(e.target.value) || 0}))} />
          </Field>
          <Field label={t.department || "القسم"}>
            <input className={inputClass} value={editing.department || ""} onChange={e => setEditing(prev => ({...prev, department: e.target.value}))} />
          </Field>
          <Field label={t.driverName || "السائق"}>
            <input className={inputClass} value={editing.driverName || ""} onChange={e => setEditing(prev => ({...prev, driverName: e.target.value}))} />
          </Field>
          <Field label={t.currentKm || "الكيلومترات الحالية"}>
            <input type="number" className={inputClass} value={editing.currentKm || ""} onChange={e => setEditing(prev => ({...prev, currentKm: parseInt(e.target.value) || 0}))} />
          </Field>
          <Field label={t.status || "الحالة"}>
            <select className={inputClass} value={editing.status || "active"} onChange={e => setEditing(prev => ({...prev, status: e.target.value}))}>
              <option value="active">{t.active || "نشط"}</option>
              <option value="maintenance">{lang === "ar" ? "قيد الصيانة" : "In Maintenance"}</option>
              <option value="expired">{t.expired || "منتهي"}</option>
            </select>
          </Field>
          <Field label={t.licenseExpiry || "انتهاء الرخصة"}>
            <input type="date" className={inputClass} value={editing.licenseExpiry || ""} onChange={e => setEditing(prev => ({...prev, licenseExpiry: e.target.value}))} />
          </Field>
          <Field label={t.insuranceExpiry || "انتهاء التأمين"}>
            <input type="date" className={inputClass} value={editing.insuranceExpiry || ""} onChange={e => setEditing(prev => ({...prev, insuranceExpiry: e.target.value}))} />
          </Field>
          <Field label={t.color || "اللون"}>
            <input className={inputClass} value={editing.color || ""} onChange={e => setEditing(prev => ({...prev, color: e.target.value}))} />
          </Field>
          <Field label={t.vin || "رقم الشاصي (VIN)"}>
            <input className={inputClass} value={editing.vin || ""} onChange={e => setEditing(prev => ({...prev, vin: e.target.value}))} />
          </Field>
          <div className="col-span-1 md:col-span-2">
            <Field label={t.notes || "ملاحظات"}>
              <textarea className={inputClass} rows={3} value={editing.notes || ""} onChange={e => setEditing(prev => ({...prev, notes: e.target.value}))} />
            </Field>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-white font-semibold transition-all hover:opacity-90 shadow-md" style={{ background: "linear-gradient(90deg, #F97316, #EA580C)" }}>
            💾 {t.save || "حفظ"}
          </button>
          <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border dark:border-gray-700-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold transition-all">
            {t.cancel || "إلغاء"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
