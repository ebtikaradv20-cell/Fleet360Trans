"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";

interface VehiclePart {
  id: number;
  vehicleId: number;
  plateNumber: string;
  partName: string;
  partCategory: string;
  installDate: string;
  partNumber: string;
  brand: string;
  supplier: string;
  cost: number;
  condition: string;
  kmAtInstall: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface PartHistory {
  id: number;
  vehiclePartId: number;
  vehicleId: number;
  plateNumber: string;
  partName: string;
  action: string;
  actionDate: string;
  kmAtAction: number;
  cost: number;
  technician: string;
  workshop: string;
  notes: string;
  createdAt: string;
}

interface Vehicle { id: number; plateNumber: string; brand: string; currentKm: number; }

const emptyPart: Partial<VehiclePart> = {
  plateNumber: "", partName: "", partCategory: "", installDate: new Date().toISOString().slice(0, 10),
  partNumber: "", brand: "", supplier: "", cost: 0, condition: "good", kmAtInstall: 0, notes: ""
};

const emptyHistory: Partial<PartHistory> = {
  action: "replaced", actionDate: new Date().toISOString().slice(0, 10),
  kmAtAction: 0, cost: 0, technician: "", workshop: "", notes: ""
};

export default function VehicleInspectionPage() {
  const { lang } = useApp();
  const t = translations[lang];
  const [data, setData] = useState<VehiclePart[]>([]);
  const [history, setHistory] = useState<PartHistory[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [histModalOpen, setHistModalOpen] = useState(false);
  const [histViewOpen, setHistViewOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<VehiclePart>>(emptyPart);
  const [editingHist, setEditingHist] = useState<Partial<PartHistory>>(emptyHistory);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedPart, setSelectedPart] = useState<VehiclePart | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<"parts" | "history">("parts");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (vehicleFilter) params.set("vehicleId", vehicleFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    const [partsRes, histRes] = await Promise.all([
      fetch(`/api/vehicle-parts?${params}`),
      fetch(`/api/vehicle-parts-history?${params}`)
    ]);
    const [partsData, histData] = await Promise.all([partsRes.json(), histRes.json()]);
    setData(Array.isArray(partsData) ? partsData : []);
    setHistory(Array.isArray(histData) ? histData : []);
    setLoading(false);
  }, [vehicleFilter, categoryFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
  }, []);

  const handleSave = async () => {
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `/api/vehicle-parts/${editing.id}` : "/api/vehicle-parts";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
    if (res.ok) { setModalOpen(false); load(); }
  };

  const handleDelete = async (row: VehiclePart) => {
    await fetch(`/api/vehicle-parts/${row.id}`, { method: "DELETE" });
    load();
  };

  const handleSaveHistory = async () => {
    const payload = { ...editingHist, vehiclePartId: selectedPart?.id, vehicleId: selectedPart?.vehicleId, plateNumber: selectedPart?.plateNumber, partName: selectedPart?.partName };
    const res = await fetch("/api/vehicle-parts-history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { setHistModalOpen(false); load(); }
  };

  const openAdd = () => { setEditing(emptyPart); setIsEdit(false); setModalOpen(true); };
  const openEdit = (row: VehiclePart) => { setEditing(row); setIsEdit(true); setModalOpen(true); };
  const openHistory = (row: VehiclePart) => { setSelectedPart(row); setHistModalOpen(true); setEditingHist(emptyHistory); };
  const viewHistory = (row: VehiclePart) => { setSelectedPart(row); setHistViewOpen(true); };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : "-";

  const categories = [...new Set(data.map(r => r.partCategory).filter(Boolean))];

  const partColumns = [
    { key: "plateNumber", header: t.plateNumber, render: (r: VehiclePart) => <span className="font-bold text-blue-600 dark:text-blue-400">{r.plateNumber}</span> },
    { key: "partName", header: t.partName, render: (r: VehiclePart) => <span className="font-semibold">{r.partName}</span> },
    { key: "partCategory", header: t.partCategory },
    { key: "brand", header: t.brand },
    { key: "installDate", header: t.installDate, render: (r: VehiclePart) => formatDate(r.installDate) },
    { key: "kmAtInstall", header: t.kmAtInstall, render: (r: VehiclePart) => `${(r.kmAtInstall || 0).toLocaleString()} كم` },
    { key: "cost", header: t.cost, render: (r: VehiclePart) => `${(r.cost || 0).toLocaleString()} ر.س` },
    { key: "condition", header: t.condition, render: (r: VehiclePart) => <StatusBadge status={r.condition} /> },
    { key: "createdAt", header: t.createdAt, render: (r: VehiclePart) => formatDate(r.createdAt) },
  ];

  const histColumns = [
    { key: "plateNumber", header: t.plateNumber, render: (r: PartHistory) => <span className="font-bold text-blue-600 dark:text-blue-400">{r.plateNumber}</span> },
    { key: "partName", header: t.partName, render: (r: PartHistory) => <span className="font-semibold">{r.partName}</span> },
    { key: "action", header: t.action, render: (r: PartHistory) => <StatusBadge status={r.action} /> },
    { key: "actionDate", header: t.actionDate, render: (r: PartHistory) => formatDate(r.actionDate) },
    { key: "kmAtAction", header: t.kmAtAction, render: (r: PartHistory) => `${(r.kmAtAction || 0).toLocaleString()} كم` },
    { key: "cost", header: t.cost, render: (r: PartHistory) => `${(r.cost || 0).toLocaleString()} ر.س` },
    { key: "technician", header: t.technician },
    { key: "workshop", header: t.workshop },
    { key: "createdAt", header: t.createdAt, render: (r: PartHistory) => formatDate(r.createdAt) },
  ];

  const inputClass = "w-full border dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>{children}</div>
  );

  return (
    <div className="fade-in">
      <PageHeader title={lang === "ar" ? "فحص قطع السيارات" : "Vehicle Parts Inspection"} icon="🔍"
        subtitle={lang === "ar" ? `${data.length} قطعة مسجلة` : `${data.length} parts registered`}
        onAdd={openAdd} addLabel={t.addPart}
        data={activeTab === "parts" ? data.map(r => ({ ...r })) : history.map(r => ({ ...r }))}
        exportFileName={activeTab === "parts" ? "vehicle_parts" : "parts_history"}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "parts", label: lang === "ar" ? "قائمة القطع" : "Parts List", icon: "🔩" },
          { key: "history", label: lang === "ar" ? "تاريخ الصيانة" : "Maintenance History", icon: "📅" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as "parts" | "history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key ? "text-white shadow-lg" : "text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
            style={activeTab === tab.key ? { background: "linear-gradient(90deg, #1E3A8A, #1d4ed8)" } : {}}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">{t.vehicles}:</label>
          <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)}
            className="text-xs border dark:border-gray-700 rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:text-white focus:outline-none">
            <option value="">الكل / All</option>
            {vehicles.map(v => <option key={v.id} value={String(v.id)}>{v.plateNumber} - {v.brand}</option>)}
          </select>
        </div>
        <FilterSelect label={t.partCategory} value={categoryFilter} onChange={setCategoryFilter}
          options={categories.map(c => ({ value: c, label: c }))} />
      </FilterBar>

      {activeTab === "parts" ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <DataTable columns={partColumns} data={data} loading={loading}
            onEdit={openEdit} onDelete={handleDelete}
            extraActions={(row: VehiclePart) => (
              <>
                <button onClick={() => viewHistory(row)}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 transition-all">
                  📅 {lang === "ar" ? "التاريخ" : "History"}
                </button>
                <button onClick={() => openHistory(row)}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 transition-all">
                  ➕ {lang === "ar" ? "سجل" : "Log"}
                </button>
              </>
            )}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <DataTable columns={histColumns} data={history} loading={loading} />
        </div>
      )}

      {/* Add Part Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? t.edit : t.addPart} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t.plateNumber}>
            <select className={inputClass} value={editing.plateNumber || ""}
              onChange={e => {
                const v = vehicles.find(v => v.plateNumber === e.target.value);
                setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id, kmAtInstall: v?.currentKm || 0});
              }}>
              <option value="">-- {lang === "ar" ? "اختر السيارة" : "Select Vehicle"} --</option>
              {vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber} - {v.brand}</option>)}
            </select>
          </Field>
          <Field label={t.partName}>
            <input className={inputClass} value={editing.partName || ""} onChange={e => setEditing({...editing, partName: e.target.value})} />
          </Field>
          <Field label={t.partCategory}>
            <input className={inputClass} value={editing.partCategory || ""} onChange={e => setEditing({...editing, partCategory: e.target.value})}
              placeholder={lang === "ar" ? "مثال: المحرك، الفرامل، كهرباء" : "e.g., Engine, Brakes, Electrical"} />
          </Field>
          <Field label={t.partNumber}>
            <input className={inputClass} value={editing.partNumber || ""} onChange={e => setEditing({...editing, partNumber: e.target.value})} />
          </Field>
          <Field label={t.brand}>
            <input className={inputClass} value={editing.brand || ""} onChange={e => setEditing({...editing, brand: e.target.value})} />
          </Field>
          <Field label={t.supplier}>
            <input className={inputClass} value={editing.supplier || ""} onChange={e => setEditing({...editing, supplier: e.target.value})} />
          </Field>
          <Field label={t.installDate}>
            <input type="date" className={inputClass} value={editing.installDate || ""} onChange={e => setEditing({...editing, installDate: e.target.value})} />
          </Field>
          <Field label={t.kmAtInstall}>
            <input type="number" className={inputClass} value={editing.kmAtInstall || ""} onChange={e => setEditing({...editing, kmAtInstall: parseInt(e.target.value)})} />
          </Field>
          <Field label={t.cost}>
            <input type="number" className={inputClass} value={editing.cost || ""} onChange={e => setEditing({...editing, cost: parseFloat(e.target.value)})} />
          </Field>
          <Field label={t.condition}>
            <select className={inputClass} value={editing.condition || "good"} onChange={e => setEditing({...editing, condition: e.target.value})}>
              <option value="good">{t.good}</option>
              <option value="fair">{t.fair}</option>
              <option value="poor">{t.poor}</option>
              <option value="replaced">{t.replaced}</option>
            </select>
          </Field>
          <div className="col-span-2">
            <Field label={t.notes}>
              <textarea className={inputClass} rows={2} value={editing.notes || ""} onChange={e => setEditing({...editing, notes: e.target.value})} />
            </Field>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-white font-semibold" style={{ background: "linear-gradient(90deg, #F97316, #EA580C)" }}>
            💾 {t.save}
          </button>
          <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold">
            {t.cancel}
          </button>
        </div>
      </Modal>

      {/* Add History Modal */}
      <Modal open={histModalOpen} onClose={() => setHistModalOpen(false)}
        title={`${lang === "ar" ? "إضافة سجل لـ" : "Add History for"}: ${selectedPart?.partName}`} size="md">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="text-sm text-blue-700 dark:text-blue-300">
              🚗 {selectedPart?.plateNumber} | 🔩 {selectedPart?.partName} | {lang === "ar" ? "الحالة:" : "Condition:"} {selectedPart?.condition}
            </div>
          </div>
          <Field label={t.action}>
            <select className={inputClass} value={editingHist.action || "replaced"} onChange={e => setEditingHist({...editingHist, action: e.target.value})}>
              <option value="installed">{t.installed}</option>
              <option value="replaced">{lang === "ar" ? "تم التغيير" : "Replaced"}</option>
              <option value="repaired">{t.repaired}</option>
              <option value="inspected">{t.inspected}</option>
            </select>
          </Field>
          <Field label={t.actionDate}>
            <input type="date" className={inputClass} value={editingHist.actionDate || ""} onChange={e => setEditingHist({...editingHist, actionDate: e.target.value})} />
          </Field>
          <Field label={t.kmAtAction}>
            <input type="number" className={inputClass} value={editingHist.kmAtAction || ""} onChange={e => setEditingHist({...editingHist, kmAtAction: parseInt(e.target.value)})} />
          </Field>
          <Field label={t.cost}>
            <input type="number" className={inputClass} value={editingHist.cost || ""} onChange={e => setEditingHist({...editingHist, cost: parseFloat(e.target.value)})} />
          </Field>
          <Field label={t.technician}>
            <input className={inputClass} value={editingHist.technician || ""} onChange={e => setEditingHist({...editingHist, technician: e.target.value})} />
          </Field>
          <Field label={t.workshop}>
            <input className={inputClass} value={editingHist.workshop || ""} onChange={e => setEditingHist({...editingHist, workshop: e.target.value})} />
          </Field>
          <div className="col-span-2">
            <Field label={t.notes}>
              <textarea className={inputClass} rows={2} value={editingHist.notes || ""} onChange={e => setEditingHist({...editingHist, notes: e.target.value})} />
            </Field>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSaveHistory} className="flex-1 py-2.5 rounded-xl text-white font-semibold" style={{ background: "linear-gradient(90deg, #F97316, #EA580C)" }}>
            💾 {t.save}
          </button>
          <button onClick={() => setHistModalOpen(false)} className="flex-1 py-2.5 rounded-xl border dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold">
            {t.cancel}
          </button>
        </div>
      </Modal>

      {/* View History Modal */}
      <Modal open={histViewOpen} onClose={() => setHistViewOpen(false)}
        title={`${lang === "ar" ? "تاريخ القطعة:" : "Part History:"} ${selectedPart?.partName} - ${selectedPart?.plateNumber}`} size="xl">
        <div className="space-y-3">
          {history.filter(h => h.vehiclePartId === selectedPart?.id).length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">{t.noData}</div>
          ) : (
            history.filter(h => h.vehiclePartId === selectedPart?.id).map(h => (
              <div key={h.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0"
                  style={{ background: h.action === "replaced" ? "#F97316" : h.action === "repaired" ? "#1E3A8A" : "#059669" }}>
                  {h.action === "replaced" ? "🔄" : h.action === "repaired" ? "🔧" : h.action === "installed" ? "✅" : "🔍"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 dark:text-white">
                      {h.action === "replaced" ? (lang === "ar" ? "تم التغيير" : "Replaced") :
                       h.action === "repaired" ? (lang === "ar" ? "إصلاح" : "Repaired") :
                       h.action === "installed" ? (lang === "ar" ? "تركيب" : "Installed") : (lang === "ar" ? "فحص" : "Inspected")}
                    </span>
                    <span className="text-sm text-gray-500">{formatDate(h.actionDate)}</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {h.kmAtAction > 0 && <span className="me-4">📍 {h.kmAtAction.toLocaleString()} كم</span>}
                    {h.cost > 0 && <span className="me-4">💰 {h.cost.toLocaleString()} ر.س</span>}
                    {h.technician && <span className="me-4">👤 {h.technician}</span>}
                    {h.workshop && <span>🏭 {h.workshop}</span>}
                  </div>
                  {h.notes && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{h.notes}</div>}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-4">
          <button onClick={() => { setHistViewOpen(false); openHistory(selectedPart!); }}
            className="w-full py-2.5 rounded-xl text-white font-semibold" style={{ background: "linear-gradient(90deg, #F97316, #EA580C)" }}>
            ➕ {t.addHistory}
          </button>
        </div>
      </Modal>
    </div>
  );
}
