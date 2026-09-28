"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import { 
  SearchCheck, 
  Wrench, 
  History, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  User, 
  Building2, 
  Save, 
  X, 
  Loader2,
  Calendar,
  Layers,
  Coins,
  MapPin,
  Clock
} from "lucide-react";

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
  plateNumber: "", 
  partName: "", 
  partCategory: "", 
  installDate: new Date().toISOString().slice(0, 10),
  partNumber: "", 
  brand: "", 
  supplier: "", 
  cost: 0, 
  condition: "good", 
  kmAtInstall: 0, 
  notes: ""
};

const emptyHistory: Partial<PartHistory> = {
  action: "replaced", 
  actionDate: new Date().toISOString().slice(0, 10),
  kmAtAction: 0, 
  cost: 0, 
  technician: "", 
  workshop: "", 
  notes: ""
};

// ✅ مكون Field معزول خارج الصفحة لمنع فقدان التركيز عند الكتابة
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all";

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
  const [saving, setSaving] = useState(false);
  const [selectedPart, setSelectedPart] = useState<VehiclePart | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<"parts" | "history">("parts");

  const load = useCallback(async () => {
    setLoading(true);
    try {
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
    } catch (error) {
      console.error("Failed to load vehicle inspection data:", error);
    } finally {
      setLoading(false);
    }
  }, [vehicleFilter, categoryFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
  }, []);

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/vehicle-parts/${editing.id}` : "/api/vehicle-parts";
      
      const payload = {
        ...editing,
        vehicleId: Number(editing.vehicleId) || null,
        kmAtInstall: Number(editing.kmAtInstall) || 0,
        cost: Number(editing.cost) || 0,
        installDate: editing.installDate && editing.installDate.trim() !== "" ? editing.installDate : null,
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
        alert(errData.error || "حدث خطأ أثناء حفظ القطعة");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("تعذر الاتصال بالخادم، تأكد من سلامة الاتصال.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: VehiclePart) => {
    if (!confirm("هل أنت متأكد من حذف هذه القطعة؟")) return;
    try {
      await fetch(`/api/vehicle-parts/${row.id}`, { method: "DELETE" });
      load();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleSaveHistory = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const payload = { 
        ...editingHist, 
        vehiclePartId: selectedPart?.id, 
        vehicleId: Number(selectedPart?.vehicleId) || null, 
        plateNumber: selectedPart?.plateNumber, 
        partName: selectedPart?.partName,
        kmAtAction: Number(editingHist.kmAtAction) || 0,
        cost: Number(editingHist.cost) || 0,
        actionDate: editingHist.actionDate && editingHist.actionDate.trim() !== "" ? editingHist.actionDate : null,
      };

      const res = await fetch("/api/vehicle-parts-history", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });

      if (res.ok) { 
        setHistModalOpen(false); 
        load(); 
      } else {
        const errData = await res.json();
        alert(errData.error || "حدث خطأ أثناء حفظ سجل القطعة");
      }
    } catch (error) {
      console.error("Save history error:", error);
      alert("تعذر الاتصال بالخادم، تأكد من سلامة الاتصال.");
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => { setEditing(emptyPart); setIsEdit(false); setModalOpen(true); };
  const openEdit = (row: VehiclePart) => { setEditing({...row}); setIsEdit(true); setModalOpen(true); };
  const openHistory = (row: VehiclePart) => { setSelectedPart(row); setHistModalOpen(true); setEditingHist(emptyHistory); };
  const viewHistory = (row: VehiclePart) => { setSelectedPart(row); setHistViewOpen(true); };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : "-";

  const categories = [...new Set(data.map(r => r.partCategory).filter(Boolean))];

  // تجهيز شيت إكسيل للقطع الحالية
  const partsExcelData = data.map((r) => ({
    "رقم اللوحة": r.plateNumber || "",
    "اسم القطعة": r.partName || "",
    "فئة القطعة": r.partCategory || "غير محدد",
    "الماركة": r.brand || "غير محدد",
    "تاريخ التركيب": r.installDate || "",
    "العداد عند التركيب (كم)": r.kmAtInstall || 0,
    "التكلفة (ج.م)": r.cost || 0,
    "الحالة الفنية": r.condition || "",
    "المورد": r.supplier || "",
    "ملاحظات": r.notes || "",
  }));

  // تجهيز شيت إكسيل لتاريخ الصيانة
  const historyExcelData = history.map((r) => ({
    "رقم اللوحة": r.plateNumber || "",
    "اسم القطعة": r.partName || "",
    "الإجراء": r.action || "",
    "تاريخ الإجراء": r.actionDate || "",
    "العداد وقت الإجراء (كم)": r.kmAtAction || 0,
    "التكلفة (ج.م)": r.cost || 0,
    "الفني المسؤول": r.technician || "",
    "الورشة / المركز": r.workshop || "",
    "ملاحظات": r.notes || "",
  }));

  const partColumns = [
    { key: "plateNumber", header: t.plateNumber, render: (r: VehiclePart) => <span className="font-bold text-blue-900 dark:text-blue-400">{r.plateNumber}</span> },
    { key: "partName", header: t.partName, render: (r: VehiclePart) => <span className="font-bold text-gray-900 dark:text-white">{r.partName}</span> },
    { key: "partCategory", header: t.partCategory },
    { key: "brand", header: t.brand },
    { key: "installDate", header: t.installDate, render: (r: VehiclePart) => formatDate(r.installDate) },
    { key: "kmAtInstall", header: t.kmAtInstall, render: (r: VehiclePart) => `${(r.kmAtInstall || 0).toLocaleString()} كم` },
    { key: "cost", header: t.cost, render: (r: VehiclePart) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{(r.cost || 0).toLocaleString()} ج.م</span> },
    { key: "condition", header: t.condition, render: (r: VehiclePart) => <StatusBadge status={r.condition} /> },
    { key: "createdAt", header: t.createdAt, render: (r: VehiclePart) => formatDate(r.createdAt) },
  ];

  const histColumns = [
    { key: "plateNumber", header: t.plateNumber, render: (r: PartHistory) => <span className="font-bold text-blue-900 dark:text-blue-400">{r.plateNumber}</span> },
    { key: "partName", header: t.partName, render: (r: PartHistory) => <span className="font-bold text-gray-900 dark:text-white">{r.partName}</span> },
    { key: "action", header: t.action, render: (r: PartHistory) => <StatusBadge status={r.action} /> },
    { key: "actionDate", header: t.actionDate, render: (r: PartHistory) => formatDate(r.actionDate) },
    { key: "kmAtAction", header: t.kmAtAction, render: (r: PartHistory) => `${(r.kmAtAction || 0).toLocaleString()} كم` },
    { key: "cost", header: t.cost, render: (r: PartHistory) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{(r.cost || 0).toLocaleString()} ج.م</span> },
    { key: "technician", header: t.technician },
    { key: "workshop", header: t.workshop },
    { key: "createdAt", header: t.createdAt, render: (r: PartHistory) => formatDate(r.createdAt) },
  ];

  return (
    <div className="w-full space-y-6">
      
      {/* ── رأس الصفحة المؤسسي + زِر الإكسيل السحري ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
            <SearchCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">
              {lang === "ar" ? "فحص وسجلات قطع السيارات" : "Vehicle Parts Inspection"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              إجمالي {data.length} قطعة مسجلة بالأسطول
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ExportExcelButton 
            data={activeTab === "parts" ? partsExcelData : historyExcelData} 
            fileName={activeTab === "parts" ? "فحص_قطع_السيارات" : "تاريخ_صيانة_القطع"} 
          />

          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-bold text-sm transition-all shadow-md"
          >
            <Plus size={18} />
            <span>{t.addPart || "إضافة قطعة"}</span>
          </button>
        </div>
      </div>

      {/* ── التبويبات المؤسسية (Tabs) ── */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl w-fit border border-gray-200 dark:border-gray-700">
        {[
          { key: "parts", label: lang === "ar" ? "قائمة القطع الحالية" : "Parts List", icon: <Wrench size={16} /> },
          { key: "history", label: lang === "ar" ? "تاريخ الصيانة والإجراءات" : "Maintenance History", icon: <History size={16} /> },
        ].map(tab => (
          <button 
            key={tab.key} 
            onClick={() => setActiveTab(tab.key as "parts" | "history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.key 
                ? "bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-sm" 
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── الفلاتر ── */}
      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">{t.vehicles}:</label>
          <select 
            value={vehicleFilter} 
            onChange={e => setVehicleFilter(e.target.value)}
            className="text-xs border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            <option value="">الكل / All</option>
            {vehicles.map(v => <option key={v.id} value={String(v.id)}>{v.plateNumber} - {v.brand}</option>)}
          </select>
        </div>
        <FilterSelect 
          label={t.partCategory} 
          value={categoryFilter} 
          onChange={setCategoryFilter}
          options={categories.map(c => ({ value: c, label: c }))} 
        />
      </FilterBar>

      {/* ── الجداول المؤسسية ── */}
      {activeTab === "parts" ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <DataTable 
            columns={partColumns} 
            data={data} 
            loading={loading}
            onEdit={openEdit} 
            onDelete={handleDelete}
            extraActions={(row: VehiclePart) => (
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => viewHistory(row)}
                  className="p-1.5 rounded-lg text-xs font-bold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 transition-all flex items-center gap-1"
                  title="سجل التغيرات"
                >
                  <History size={14} />
                  <span>{lang === "ar" ? "التاريخ" : "History"}</span>
                </button>
                <button 
                  onClick={() => openHistory(row)}
                  className="p-1.5 rounded-lg text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 transition-all flex items-center gap-1"
                  title="تسجيل إجراء جديد"
                >
                  <Plus size={14} />
                  <span>{lang === "ar" ? "سجل" : "Log"}</span>
                </button>
              </div>
            )}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <DataTable columns={histColumns} data={history} loading={loading} />
        </div>
      )}

      {/* ── مودال إضافة / تعديل قطعة ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? t.edit : t.addPart} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t.plateNumber}>
            <select 
              className={inputClass} 
              value={editing.plateNumber || ""}
              onChange={e => {
                const v = vehicles.find(v => v.plateNumber === e.target.value);
                setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id, kmAtInstall: v?.currentKm || 0});
              }}
            >
              <option value="">-- {lang === "ar" ? "اختر السيارة" : "Select Vehicle"} --</option>
              {vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber} - {v.brand}</option>)}
            </select>
          </Field>

          <Field label={t.partName}>
            <input className={inputClass} value={editing.partName || ""} onChange={e => setEditing({...editing, partName: e.target.value})} placeholder="مثال: طنبورة فرامل" />
          </Field>

          <Field label={t.partCategory}>
            <input className={inputClass} value={editing.partCategory || ""} onChange={e => setEditing({...editing, partCategory: e.target.value})} placeholder="مثال: المحرك، الفرامل، كهرباء" />
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
            <input type="number" className={inputClass} value={editing.kmAtInstall || ""} onChange={e => setEditing({...editing, kmAtInstall: parseInt(e.target.value) || 0})} />
          </Field>

          <Field label={t.cost}>
            <input type="number" className={inputClass} value={editing.cost || ""} onChange={e => setEditing({...editing, cost: parseFloat(e.target.value) || 0})} />
          </Field>

          <Field label={t.condition}>
            <select className={inputClass} value={editing.condition || "good"} onChange={e => setEditing({...editing, condition: e.target.value})}>
              <option value="good">{t.good || "ممتازة"}</option>
              <option value="fair">{t.fair || "متوسطة"}</option>
              <option value="poor">{t.poor || "ضعيفة"}</option>
              <option value="replaced">{t.replaced || "تم الاستبدال"}</option>
            </select>
          </Field>

          <div className="col-span-2">
            <Field label={t.notes}>
              <textarea className={inputClass} rows={2} value={editing.notes || ""} onChange={e => setEditing({...editing, notes: e.target.value})} />
            </Field>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold transition-all hover:opacity-90 disabled:opacity-50 bg-gradient-to-r from-[#F97316] to-[#EA580C] shadow-md"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{t.save || "حفظ البيانات"}</span>
              </>
            )}
          </button>
          <button 
            onClick={() => setModalOpen(false)} 
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold transition-colors"
          >
            <X size={16} />
            <span>{t.cancel || "إلغاء"}</span>
          </button>
        </div>
      </Modal>

      {/* ── مودال إضافة إجراء للقطعة (Add History) ── */}
      <Modal 
        open={histModalOpen} 
        onClose={() => setHistModalOpen(false)}
        title={`${lang === "ar" ? "تسجيل صيانة/إجراء لـ" : "Add History for"}: ${selectedPart?.partName}`} 
        size="md"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-300">
            <span>السيارة: {selectedPart?.plateNumber}</span>
            <span>القطعة: {selectedPart?.partName}</span>
          </div>

          <Field label={t.action}>
            <select className={inputClass} value={editingHist.action || "replaced"} onChange={e => setEditingHist({...editingHist, action: e.target.value})}>
              <option value="installed">{t.installed || "تركيب"}</option>
              <option value="replaced">{lang === "ar" ? "استبدال / تغيير" : "Replaced"}</option>
              <option value="repaired">{t.repaired || "إصلاح"}</option>
              <option value="inspected">{t.inspected || "فحص واختبار"}</option>
            </select>
          </Field>

          <Field label={t.actionDate}>
            <input type="date" className={inputClass} value={editingHist.actionDate || ""} onChange={e => setEditingHist({...editingHist, actionDate: e.target.value})} />
          </Field>

          <Field label={t.kmAtAction}>
            <input type="number" className={inputClass} value={editingHist.kmAtAction || ""} onChange={e => setEditingHist({...editingHist, kmAtAction: parseInt(e.target.value) || 0})} />
          </Field>

          <Field label={t.cost}>
            <input type="number" className={inputClass} value={editingHist.cost || ""} onChange={e => setEditingHist({...editingHist, cost: parseFloat(e.target.value) || 0})} />
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

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button 
            onClick={handleSaveHistory} 
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold transition-all hover:opacity-90 disabled:opacity-50 bg-gradient-to-r from-[#F97316] to-[#EA580C] shadow-md"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{t.save || "حفظ السجل"}</span>
              </>
            )}
          </button>
          <button 
            onClick={() => setHistModalOpen(false)} 
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold transition-colors"
          >
            <X size={16} />
            <span>{t.cancel || "إلغاء"}</span>
          </button>
        </div>
      </Modal>

      {/* ── مودال عرض التايم لاين لتاريخ القطعة (View History Timeline) ── */}
      <Modal 
        open={histViewOpen} 
        onClose={() => setHistViewOpen(false)}
        title={`${lang === "ar" ? "تاريخ وصيانة القطعة:" : "Part History:"} ${selectedPart?.partName} (${selectedPart?.plateNumber})`} 
        size="xl"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pe-1">
          {history.filter(h => h.vehiclePartId === selectedPart?.id).length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12 font-medium">
              لا توجد سجلات صيانة سابقة لهذه القطعة
            </div>
          ) : (
            history.filter(h => h.vehiclePartId === selectedPart?.id).map(h => (
              <div key={h.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800">
                <div 
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm ${
                    h.action === "replaced" ? "bg-orange-500" :
                    h.action === "repaired" ? "bg-blue-900" :
                    h.action === "installed" ? "bg-emerald-600" : "bg-purple-600"
                  }`}
                >
                  {h.action === "replaced" ? <RefreshCw size={18} /> :
                   h.action === "repaired" ? <Wrench size={18} /> :
                   h.action === "installed" ? <CheckCircle2 size={18} /> : <SearchCheck size={18} />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {h.action === "replaced" ? (lang === "ar" ? "استبدال وتغيير" : "Replaced") :
                       h.action === "repaired" ? (lang === "ar" ? "إصلاح وصيانة" : "Repaired") :
                       h.action === "installed" ? (lang === "ar" ? "تركيب جديد" : "Installed") : (lang === "ar" ? "فحص واختبار" : "Inspected")}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <Calendar size={13} />
                      <span>{formatDate(h.actionDate)}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-600 dark:text-gray-400 mt-2">
                    {h.kmAtAction > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={13} className="text-blue-500" />
                        <span>{h.kmAtAction.toLocaleString()} كم</span>
                      </span>
                    )}
                    {h.cost > 0 && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        <Coins size={13} />
                        <span>{h.cost.toLocaleString()} ج.م</span>
                      </span>
                    )}
                    {h.technician && (
                      <span className="inline-flex items-center gap-1">
                        <User size={13} className="text-orange-500" />
                        <span>{h.technician}</span>
                      </span>
                    )}
                    {h.workshop && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 size={13} className="text-purple-500" />
                        <span>{h.workshop}</span>
                      </span>
                    )}
                  </div>

                  {h.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                      {h.notes}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button 
            onClick={() => { setHistViewOpen(false); openHistory(selectedPart!); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold bg-gradient-to-r from-[#F97316] to-[#EA580C] shadow-md hover:opacity-90 transition-all text-sm"
          >
            <Plus size={16} />
            <span>{t.addHistory || "إضافة سجل جديد لهذه القطعة"}</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
