"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";

interface FuelRecord {
  id: number;
  vehicleId: number;
  plateNumber: string;
  driverName: string;
  liters: number;
  costPerLiter: number;
  totalCost: number;
  odometer: number;
  station: string;
  fuelDate: string;
  notes: string;
  createdAt: string;
}

interface Vehicle { id: number; plateNumber: string; driverName: string; }

const emptyRecord: Partial<FuelRecord> = {
  plateNumber: "", driverName: "", liters: 0, costPerLiter: 2.5, totalCost: 0,
  odometer: 0, station: "", fuelDate: new Date().toISOString().slice(0, 10), notes: ""
};

// 1. نقل مكون Field خارج الصفحة لمنع فقدان التركيز أثناء الكتابة
const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>{children}</div>
);

const inputClass = "w-full border dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function FuelPage() {
  const { lang, user } = useApp();
  const t = translations[lang];
  const [data, setData] = useState<FuelRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<FuelRecord>>(emptyRecord);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false); // 2. حالة الحفظ لمنع التكرار ومعالجة الزر
  const [search, setSearch] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [stationFilter, setStationFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("fuel:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (driverFilter) params.set("driver", driverFilter);
      if (stationFilter) params.set("station", stationFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/fuel?${params}`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) {
      console.error("Failed to load fuel records:", error);
    } finally {
      setLoading(false);
    }
  }, [search, driverFilter, stationFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
  }, []);

  // 3. تحديث دالة الحفظ مع تنظيف البيانات ومعالجة الأخطاء
  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/fuel/${editing.id}` : "/api/fuel";
      
      const payload = {
        ...editing,
        vehicleId: Number(editing.vehicleId) || null,
        liters: Number(editing.liters) || 0,
        costPerLiter: Number(editing.costPerLiter) || 0,
        totalCost: Number(editing.totalCost) || 0,
        odometer: Number(editing.odometer) || 0,
        fuelDate: editing.fuelDate && editing.fuelDate.trim() !== "" ? editing.fuelDate : null,
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
        alert(errData.error || "حدث خطأ أثناء حفظ سجل الوقود");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("تعذر الاتصال بالخادم، تأكد من سلامة الاتصال.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: FuelRecord) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
    try {
      await fetch(`/api/fuel/${row.id}`, { method: "DELETE" });
      load();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const openAdd = () => { setEditing(emptyRecord); setIsEdit(false); setModalOpen(true); };
  const openEdit = (row: FuelRecord) => { setEditing({...row}); setIsEdit(true); setModalOpen(true); };
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : "-";

  const totalCost = data.reduce((s, r) => s + (r.totalCost || 0), 0);
  const totalLiters = data.reduce((s, r) => s + (r.liters || 0), 0);

  const columns = [
    { key: "plateNumber", header: t.plateNumber, render: (r: FuelRecord) => <span className="font-bold text-blue-600 dark:text-blue-400">{r.plateNumber}</span> },
    { key: "driverName", header: t.driverName },
    { key: "liters", header: t.liters, render: (r: FuelRecord) => `${r.liters} L` },
    { key: "costPerLiter", header: t.costPerLiter, render: (r: FuelRecord) => `${r.costPerLiter} ج.م` },
    { key: "totalCost", header: t.totalCost, render: (r: FuelRecord) => <span className="font-bold text-green-600 dark:text-green-400">{r.totalCost?.toLocaleString()} ج.م</span> },
    { key: "odometer", header: t.odometer, render: (r: FuelRecord) => `${(r.odometer || 0).toLocaleString()} كم` },
    { key: "station", header: t.station },
    { key: "fuelDate", header: t.fuelDate, render: (r: FuelRecord) => formatDate(r.fuelDate) },
    { key: "createdAt", header: t.createdAt, render: (r: FuelRecord) => formatDate(r.createdAt) },
  ];

  const drivers = [...new Set(vehicles.map(v => v.driverName).filter(Boolean))];
  const stations = [...new Set(data.map(r => r.station).filter(Boolean))];

  return (
    <div className="fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-4 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400">{lang === "ar" ? "إجمالي التكلفة" : "Total Cost"}</div>
          <div className="text-2xl font-black text-green-600 dark:text-green-400">{totalCost.toLocaleString()} ج.م</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-4 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400">{lang === "ar" ? "إجمالي اللترات" : "Total Liters"}</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{totalLiters.toLocaleString()} L</div>
        </div>
      </div>

      <PageHeader
        title={lang === "ar" ? "سجلات الوقود" : "Fuel Records"} icon="⛽"
        subtitle={lang === "ar" ? `${data.length} سجل` : `${data.length} records`}
        onAdd={canWrite ? openAdd : undefined}
        addLabel={t.addFuelRecord}
        data={data.map(r => ({ ...r }))}
        exportFileName="fuel_records"
      >
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`🔍 ${t.search}...`}
          className="border dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
      </PageHeader>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <FilterSelect label={t.driverName} value={driverFilter} onChange={setDriverFilter}
          options={drivers.map(d => ({ value: d, label: d }))} />
        <FilterSelect label={t.station} value={stationFilter} onChange={setStationFilter}
          options={stations.map(s => ({ value: s, label: s }))} />
      </FilterBar>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <DataTable columns={columns} data={data} loading={loading}
          onEdit={canWrite ? openEdit : undefined}
          onDelete={user?.role === "admin" ? handleDelete : undefined}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? t.edit : t.addFuelRecord} size="md">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t.plateNumber}>
            <select className={inputClass} value={editing.plateNumber || ""}
              onChange={e => {
                const v = vehicles.find(v => v.plateNumber === e.target.value);
                setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id, driverName: v?.driverName || editing.driverName});
              }}>
              <option value="">-- {lang === "ar" ? "اختر" : "Select"} --</option>
              {vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}
            </select>
          </Field>
          <Field label={t.driverName}>
            <input className={inputClass} value={editing.driverName || ""} onChange={e => setEditing({...editing, driverName: e.target.value})} />
          </Field>
          <Field label={t.liters}>
            <input type="number" className={inputClass} value={editing.liters || ""} onChange={e => {
              const liters = parseFloat(e.target.value) || 0;
              setEditing({...editing, liters, totalCost: liters * (editing.costPerLiter || 0)});
            }} />
          </Field>
          <Field label={t.costPerLiter}>
            <input type="number" step="0.01" className={inputClass} value={editing.costPerLiter || ""}
              onChange={e => {
                const cpl = parseFloat(e.target.value) || 0;
                setEditing({...editing, costPerLiter: cpl, totalCost: (editing.liters || 0) * cpl});
              }} />
          </Field>
          <Field label={t.totalCost}>
            <input type="number" className={inputClass} value={editing.totalCost || ""} readOnly style={{ background: "#f9fafb" }} />
          </Field>
          <Field label={t.odometer}>
            <input type="number" className={inputClass} value={editing.odometer || ""} onChange={e => setEditing({...editing, odometer: parseInt(e.target.value) || 0})} />
          </Field>
          <Field label={t.station}>
            <input className={inputClass} value={editing.station || ""} onChange={e => setEditing({...editing, station: e.target.value})} />
          </Field>
          <Field label={t.fuelDate}>
            <input type="date" className={inputClass} value={editing.fuelDate || ""} onChange={e => setEditing({...editing, fuelDate: e.target.value})} />
          </Field>
          <div className="col-span-2">
            <Field label={t.notes}>
              <textarea className={inputClass} rows={2} value={editing.notes || ""} onChange={e => setEditing({...editing, notes: e.target.value})} />
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
          <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold">
            {t.cancel}
          </button>
        </div>
      </Modal>
    </div>
  );
}
