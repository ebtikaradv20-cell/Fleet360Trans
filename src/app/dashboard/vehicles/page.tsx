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

// مكون Field معزول لمنع فقدان التركيز (Focus Loss) أثناء الكتابة
const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full border dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function VehiclesPage() {
  const { lang, user } = useApp();
  const t = translations[lang];
  const [data, setData] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Vehicle>>(emptyVehicle);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false); 
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("vehicles:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (brandFilter) params.set("brand", brandFilter);
      if (deptFilter) params.set("department", deptFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/vehicles?${params}`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) {
      console.error("Failed to load vehicles:", error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, brandFilter, deptFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // دالة الحفظ المُحدثة مع تنظيف البيانات الفارغة وتحويلها لـ null
  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/vehicles/${editing.id}` : "/api/vehicles";
      
      // معالجة وتنظيف البيانات قبل إرسالها لـ API لتجنب رفض قاعدة البيانات
      const payload = {
        ...editing,
        year: Number(editing.year) || new Date().getFullYear(),
        currentKm: Number(editing.currentKm) || 0,
        licenseExpiry: editing.licenseExpiry && editing.licenseExpiry.trim() !== "" ? editing.licenseExpiry : null,
        insuranceExpiry: editing.insuranceExpiry && editing.insuranceExpiry.trim() !== "" ? editing.insuranceExpiry : null,
      };

      const res = await fetch(url, { 
        method, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });

      if (res.ok) { 
        setModalOpen(false); 
        load(); 
      } else {
        const errData = await res.json();
        alert(errData.error || "حدث خطأ أثناء حفظ البيانات");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("تعذر الاتصال بالخادم، تأكد من سلامة الاتصال.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Vehicle) => {
    if (!confirm("هل أنت متأكد من حذف هذا العنصر؟")) return;
    try {
      await fetch(`/api/vehicles/${row.id}`, { method: "DELETE" });
      load();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const openAdd = () => { setEditing(emptyVehicle); setIsEdit(false); setModalOpen(true); };
  const openEdit = (row: Vehicle) => { setEditing({...row}); setIsEdit(true); setModalOpen(true); };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : "-";
  const isExpiringSoon = (d: string) => {
    if (!d) return false;
    const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  };

  const columns = [
    { key: "plateNumber", header: t.plateNumber, render: (r: Vehicle) => <span className="font-bold text-blue-600 dark:text-blue-400">{r.plateNumber}</span> },
    { key: "brand", header: t.brand, render: (r: Vehicle) => `${r.brand} ${r.model}` },
    { key: "year", header: t.year },
    { key: "department", header: t.department },
    { key: "driverName", header: t.driverName },
    { key: "currentKm", header: t.currentKm, render: (r: Vehicle) => `${(r.currentKm || 0).toLocaleString()} كم` },
    { key: "status", header: t.status, render: (r: Vehicle) => <StatusBadge status={r.status} /> },
    { key: "licenseExpiry", header: t.licenseExpiry, render: (r: Vehicle) => (
      <span className={isExpiringSoon(r.licenseExpiry) ? "text-red-500 font-bold" : ""}>{formatDate(r.licenseExpiry)}</span>
    )},
    { key: "insuranceExpiry", header: t.insuranceExpiry, render: (r: Vehicle) => (
      <span className={isExpiringSoon(r.insuranceExpiry) ? "text-red-500 font-bold" : ""}>{formatDate(r.insuranceExpiry)}</span>
    )},
    { key: "createdAt", header: t.createdAt, render: (r: Vehicle) => formatDate(r.createdAt) },
  ];

  return (
    <div className="fade-in">
      <PageHeader
        title={t.vehicles} icon="🚗"
        subtitle={lang === "ar" ? `إجمالي ${data.length} سيارة` : `Total ${data.length} vehicles`}
        onAdd={canWrite ? openAdd : undefined}
        addLabel={t.addVehicle}
        data={data.map(v => ({ ...v }))}
        exportFileName="vehicles"
      >
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`🔍 ${t.search}...`}
          className="border dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
      </PageHeader>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <FilterSelect label={t.status} value={statusFilter} onChange={setStatusFilter} options={[
          { value: "active", label: t.active },
          { value: "maintenance", label: lang === "ar" ? "قيد الصيانة" : "In Maintenance" },
          { value: "expired", label: t.expired },
        ]} />
        <FilterSelect label={t.brand} value={brandFilter} onChange={setBrandFilter} options={[
          { value: "تويوتا", label: "تويوتا / Toyota" },
          { value: "فورد", label: "فورد / Ford" },
          { value: "نيسان", label: "نيسان / Nissan" },
          { value: "هيونداي", label: "هيونداي / Hyundai" },
          { value: "ميتسوبيشي", label: "ميتسوبيشي / Mitsubishi" },
        ]} />
        <FilterSelect label={t.department} value={deptFilter} onChange={setDeptFilter} options={[
          { value: "المبيعات", label: lang === "ar" ? "المبيعات" : "Sales" },
          { value: "اللوجستيات", label: lang === "ar" ? "اللوجستيات" : "Logistics" },
          { value: "الإدارة", label: lang === "ar" ? "الإدارة" : "Administration" },
          { value: "المشاريع", label: lang === "ar" ? "المشاريع" : "Projects" },
          { value: "الصيانة", label: lang === "ar" ? "الصيانة" : "Maintenance" },
        ]} />
      </FilterBar>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <DataTable
          columns={columns} data={data} loading={loading}
          onEdit={canWrite ? openEdit : undefined}
          onDelete={user?.role === "admin" ? handleDelete : undefined}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? t.edit : t.addVehicle} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t.plateNumber}>
            <input className={inputClass} value={editing.plateNumber || ""} onChange={e => setEditing({...editing, plateNumber: e.target.value})} />
          </Field>
          <Field label={t.brand}>
            <input className={inputClass} value={editing.brand || ""} onChange={e => setEditing({...editing, brand: e.target.value})} />
          </Field>
          <Field label={t.model}>
            <input className={inputClass} value={editing.model || ""} onChange={e => setEditing({...editing, model: e.target.value})} />
          </Field>
          <Field label={t.year}>
            <input type="number" className={inputClass} value={editing.year || ""} onChange={e => setEditing({...editing, year: parseInt(e.target.value) || 0})} />
          </Field>
          <Field label={t.department}>
            <input className={inputClass} value={editing.department || ""} onChange={e => setEditing({...editing, department: e.target.value})} />
          </Field>
          <Field label={t.driverName}>
            <input className={inputClass} value={editing.driverName || ""} onChange={e => setEditing({...editing, driverName: e.target.value})} />
          </Field>
          <Field label={t.currentKm}>
            <input type="number" className={inputClass} value={editing.currentKm || ""} onChange={e => setEditing({...editing, currentKm: parseInt(e.target.value) || 0})} />
          </Field>
          <Field label={t.status}>
            <select className={inputClass} value={editing.status || "active"} onChange={e => setEditing({...editing, status: e.target.value})}>
              <option value="active">{t.active}</option>
              <option value="maintenance">{lang === "ar" ? "قيد الصيانة" : "In Maintenance"}</option>
              <option value="expired">{t.expired}</option>
            </select>
          </Field>
          <Field label={t.licenseExpiry}>
            <input type="date" className={inputClass} value={editing.licenseExpiry || ""} onChange={e => setEditing({...editing, licenseExpiry: e.target.value})} />
          </Field>
          <Field label={t.insuranceExpiry}>
            <input type="date" className={inputClass} value={editing.insuranceExpiry || ""} onChange={e => setEditing({...editing, insuranceExpiry: e.target.value})} />
          </Field>
          <Field label={t.color}>
            <input className={inputClass} value={editing.color || ""} onChange={e => setEditing({...editing, color: e.target.value})} />
          </Field>
          <Field label={t.vin}>
            <input className={inputClass} value={editing.vin || ""} onChange={e => setEditing({...editing, vin: e.target.value})} />
          </Field>
          <div className="col-span-2">
            <Field label={t.notes}>
              <textarea className={inputClass} rows={3} value={editing.notes || ""} onChange={e => setEditing({...editing, notes: e.target.value})} />
            </Field>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50" 
            style={{ background: "linear-gradient(90deg, #F97316, #EA580C)" }}
          >
            {saving ? "⏳ جارِ الحفظ..." : `💾 ${t.save}`}
          </button>
          <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold transition-all">
            {t.cancel}
          </button>
        </div>
      </Modal>
    </div>
  );
}
