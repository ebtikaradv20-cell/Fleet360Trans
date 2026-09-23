"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FilterBar from "@/components/ui/FilterBar";

interface OilChange {
  id: number;
  vehicleId: number;
  plateNumber: string;
  changeDate: string;
  kmAtChange: number;
  oilType: string;
  oilBrand: string;
  filterChanged: boolean;
  airFilterChanged: boolean;
  fuelFilterChanged: boolean;
  nextChangeKm: number;
  nextChangeDate: string;
  alertKmBefore: number;
  alertDaysBefore: number;
  cost: number;
  technician: string;
  notes: string;
  createdAt: string;
  kmAlert?: boolean;
  dayAlert?: boolean;
  currentKm?: number;
}

interface Vehicle { id: number; plateNumber: string; currentKm: number; }

const emptyChange: Partial<OilChange> = {
  plateNumber: "", changeDate: new Date().toISOString().slice(0, 10), kmAtChange: 0,
  oilType: "5W30", oilBrand: "Shell", filterChanged: true, airFilterChanged: false,
  fuelFilterChanged: false, nextChangeKm: 0, nextChangeDate: "", alertKmBefore: 500,
  alertDaysBefore: 7, cost: 0, technician: "", notes: ""
};

// 1. عزل مكون Field خارج الصفحة لمنع فقدان التركيز
const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>{children}</div>
);

const inputClass = "w-full border dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function OilChangesPage() {
  const { lang, user } = useApp();
  const t = translations[lang];
  const [data, setData] = useState<OilChange[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<OilChange>>(emptyChange);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false); // 2. حالة الحفظ لمنع التكرار
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("oil-changes:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (vehicleFilter) params.set("vehicleId", vehicleFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/oil-changes?${params}`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) {
      console.error("Failed to load oil changes:", error);
    } finally {
      setLoading(false);
    }
  }, [vehicleFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
  }, []);

  // 3. معالجة الحفظ وتنظيف البيانات (تحويل التواريخ الفارغة لـ null والأرقام لـ numbers) وتحويل العملة لمصر
  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/oil-changes/${editing.id}` : "/api/oil-changes";

      const payload = {
        ...editing,
        vehicleId: Number(editing.vehicleId) || null,
        kmAtChange: Number(editing.kmAtChange) || 0,
        nextChangeKm: Number(editing.nextChangeKm) || 0,
        alertKmBefore: Number(editing.alertKmBefore) || 0,
        alertDaysBefore: Number(editing.alertDaysBefore) || 0,
        cost: Number(editing.cost) || 0,
        changeDate: editing.changeDate && editing.changeDate.trim() !== "" ? editing.changeDate : null,
        nextChangeDate: editing.nextChangeDate && editing.nextChangeDate.trim() !== "" ? editing.nextChangeDate : null,
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
        alert(errData.error || "حدث خطأ أثناء حفظ سجل تغيير الزيوت");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("تعذر الاتصال بالخادم، تأكد من سلامة الاتصال.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: OilChange) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
    try {
      await fetch(`/api/oil-changes/${row.id}`, { method: "DELETE" });
      load();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const openAdd = () => { setEditing(emptyChange); setIsEdit(false); setModalOpen(true); };
  const openEdit = (row: OilChange) => { setEditing({...row}); setIsEdit(true); setModalOpen(true); };
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : "-";

  const alertCount = data.filter(r => r.kmAlert || r.dayAlert).length;

  const columns = [
    { key: "plateNumber", header: t.plateNumber, render: (r: OilChange) => (
      <div className="flex items-center gap-2">
        <span className="font-bold text-blue-600 dark:text-blue-400">{r.plateNumber}</span>
        {(r.kmAlert || r.dayAlert) && <span className="text-red-500 text-lg animate-pulse">⚠️</span>}
      </div>
    )},
    { key: "changeDate", header: t.changeDate, render: (r: OilChange) => formatDate(r.changeDate) },
    { key: "kmAtChange", header: t.kmAtChange, render: (r: OilChange) => `${(r.kmAtChange || 0).toLocaleString()} كم` },
    { key: "oilType", header: t.oilType },
    { key: "oilBrand", header: t.oilBrand },
    { key: "filterChanged", header: t.filterChanged, render: (r: OilChange) => r.filterChanged ? "✅" : "❌" },
    { key: "nextChangeKm", header: t.nextChangeKm, render: (r: OilChange) => (
      <div>
        <div className={`font-bold ${r.kmAlert ? "text-red-500" : "text-gray-700 dark:text-gray-300"}`}>
          {(r.nextChangeKm || 0).toLocaleString()} كم
        </div>
        {r.currentKm !== undefined && (
          <div className="text-xs text-gray-400">
            {lang === "ar" ? "الحالي:" : "Current:"} {(r.currentKm || 0).toLocaleString()} كم
          </div>
        )}
      </div>
    )},
    { key: "nextChangeDate", header: t.nextChangeDate, render: (r: OilChange) => (
      <span className={r.dayAlert ? "text-red-500 font-bold" : ""}>{formatDate(r.nextChangeDate)}</span>
    )},
    { key: "cost", header: t.cost, render: (r: OilChange) => `${(r.cost || 0).toLocaleString()} ج.م` }, // تم التعديل إلى الجنيه المصري
    { key: "createdAt", header: t.createdAt, render: (r: OilChange) => formatDate(r.createdAt) },
  ];

  return (
    <div className="fade-in">
      {alertCount > 0 && (
        <div className="mb-6 p-4 rounded-2xl border-2 border-red-400 bg-red-50 dark:bg-red-900/20 flex items-center gap-4">
          <span className="text-3xl animate-bounce">🛢️</span>
          <div>
            <div className="font-bold text-red-600 dark:text-red-400">
              {lang === "ar" ? `${alertCount} سيارة تحتاج تغيير زيوت!` : `${alertCount} vehicle(s) need oil change!`}
            </div>
          </div>
        </div>
      )}

      <PageHeader title={lang === "ar" ? "سجلات تغيير الزيوت والفلاتر" : "Oil Changes & Filters"} icon="🛢️"
        subtitle={lang === "ar" ? `${data.length} سجل` : `${data.length} records`}
        onAdd={openAdd} addLabel={t.addOilChange}
        data={data.map(r => ({ ...r }))} exportFileName="oil_changes"
      />

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">{t.vehicles}:</label>
          <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)}
            className="text-xs border dark:border-gray-700 rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:text-white focus:outline-none">
            <option value="">الكل / All</option>
            {vehicles.map(v => <option key={v.id} value={String(v.id)}>{v.plateNumber}</option>)}
          </select>
        </div>
      </FilterBar>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <DataTable columns={columns} data={data} loading={loading}
          onEdit={openEdit} onDelete={handleDelete}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? t.edit : t.addOilChange} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t.plateNumber}>
            <select className={inputClass} value={editing.plateNumber || ""}
              onChange={e => {
                const v = vehicles.find(v => v.plateNumber === e.target.value);
                setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id, kmAtChange: v?.currentKm || 0});
              }}>
              <option value="">-- {lang === "ar" ? "اختر السيارة" : "Select Vehicle"} --</option>
              {vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber} ({(v.currentKm || 0).toLocaleString()} km)</option>)}
            </select>
          </Field>
          <Field label={t.changeDate}>
            <input type="date" className={inputClass} value={editing.changeDate || ""} onChange={e => setEditing({...editing, changeDate: e.target.value})} />
          </Field>
          <Field label={t.kmAtChange}>
            <input type="number" className={inputClass} value={editing.kmAtChange || ""} onChange={e => {
              const km = parseInt(e.target.value) || 0;
              setEditing({...editing, kmAtChange: km, nextChangeKm: km + 5000});
            }} />
          </Field>
          <Field label={t.oilType}>
            <select className={inputClass} value={editing.oilType || "5W30"} onChange={e => setEditing({...editing, oilType: e.target.value})}>
              <option value="5W30">5W30</option>
              <option value="10W40">10W40</option>
              <option value="0W20">0W20</option>
              <option value="15W40">15W40</option>
              <option value="20W50">20W50</option>
            </select>
          </Field>
          <Field label={t.oilBrand}>
            <input className={inputClass} value={editing.oilBrand || ""} onChange={e => setEditing({...editing, oilBrand: e.target.value})} />
          </Field>
          <Field label={t.cost}>
            <input type="number" className={inputClass} value={editing.cost || ""} onChange={e => setEditing({...editing, cost: parseFloat(e.target.value) || 0})} />
          </Field>
          <Field label={t.nextChangeKm}>
            <input type="number" className={inputClass} value={editing.nextChangeKm || ""} onChange={e => setEditing({...editing, nextChangeKm: parseInt(e.target.value) || 0})} />
          </Field>
          <Field label={t.nextChangeDate}>
            <input type="date" className={inputClass} value={editing.nextChangeDate || ""} onChange={e => setEditing({...editing, nextChangeDate: e.target.value})} />
          </Field>
          <Field label={t.alertKmBefore}>
            <input type="number" className={inputClass} value={editing.alertKmBefore || ""} onChange={e => setEditing({...editing, alertKmBefore: parseInt(e.target.value) || 0})}
              placeholder="e.g. 500" />
          </Field>
          <Field label={t.alertDaysBefore}>
            <input type="number" className={inputClass} value={editing.alertDaysBefore || ""} onChange={e => setEditing({...editing, alertDaysBefore: parseInt(e.target.value) || 0})}
              placeholder="e.g. 7" />
          </Field>
          <Field label={t.technician}>
            <input className={inputClass} value={editing.technician || ""} onChange={e => setEditing({...editing, technician: e.target.value})} />
          </Field>
          <div />
          {/* Checkboxes */}
          <div className="col-span-2 flex gap-6">
            {[
              { key: "filterChanged" as const, label: t.filterChanged },
              { key: "airFilterChanged" as const, label: t.airFilterChanged },
              { key: "fuelFilterChanged" as const, label: t.fuelFilterChanged },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!editing[key]} onChange={e => setEditing({...editing, [key]: e.target.checked})}
                  className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
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
