"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import { SearchCheck, Wrench, History, Plus, RefreshCw, CheckCircle2, User, Building2, Save, X, Loader2, Calendar, Coins, MapPin } from "lucide-react";

const emptyPart = { plateNumber: "", partName: "", partCategory: "", installDate: new Date().toISOString().slice(0, 10), partNumber: "", brand: "", supplier: "", cost: 0, condition: "good", kmAtInstall: 0, notes: "" };
const emptyHistory = { action: "replaced", actionDate: new Date().toISOString().slice(0, 10), kmAtAction: 0, cost: 0, technician: "", workshop: "", notes: "" };
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (<div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>{children}</div>);
const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50";

export default function VehicleInspectionPage() {
  const { user } = useApp();
  const [data, setData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [histModalOpen, setHistModalOpen] = useState(false);
  const [histViewOpen, setHistViewOpen] = useState(false);
  const [editing, setEditing] = useState<any>(emptyPart);
  const [editingHist, setEditingHist] = useState<any>(emptyHistory);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"parts" | "history">("parts");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [partsRes, histRes] = await Promise.all([fetch(`/api/vehicle-parts`), fetch(`/api/vehicle-parts-history`)]);
      const [partsData, histData] = await Promise.all([partsRes.json(), histRes.json()]);
      
      // توحيد الحقول لتظهر البيانات المخفية
      setData((Array.isArray(partsData) ? partsData : []).map(r => ({
        ...r,
        plateNumber: r.plateNumber || r.plate_number,
        partName: r.partName || r.part_name,
        partCategory: r.partCategory || r.part_category,
        installDate: r.installDate || r.install_date,
        kmAtInstall: r.kmAtInstall || r.km_at_install
      })));

      setHistory((Array.isArray(histData) ? histData : []).map(r => ({
        ...r,
        plateNumber: r.plateNumber || r.plate_number,
        partName: r.partName || r.part_name,
        actionDate: r.actionDate || r.action_date,
        kmAtAction: r.kmAtAction || r.km_at_action,
        vehiclePartId: r.vehiclePartId || r.vehicle_part_id
      })));
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/vehicle-parts/${editing.id}` : "/api/vehicle-parts", {
        method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({...editing, kmAtInstall: Number(editing.kmAtInstall)||0, cost: Number(editing.cost)||0})
      });
      if (res.ok) { setModalOpen(false); load(); }
    } finally { setSaving(false); }
  };

  const handleSaveHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/vehicle-parts-history", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({...editingHist, vehiclePartId: selectedPart?.id, vehicleId: selectedPart?.vehicleId, plateNumber: selectedPart?.plateNumber, partName: selectedPart?.partName})
      });
      if (res.ok) { setHistModalOpen(false); load(); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (row: any) => {
    if (!confirm("تأكيد الحذف؟")) return;
    await fetch(`/api/vehicle-parts/${row.id}`, { method: "DELETE" });
    load();
  };

  const openAdd = () => { setEditing(emptyPart); setIsEdit(false); setModalOpen(true); };
  const openEdit = (row: any) => { setEditing(row); setIsEdit(true); setModalOpen(true); };
  const openHistory = (row: any) => { setSelectedPart(row); setEditingHist(emptyHistory); setHistModalOpen(true); };
  const viewHistory = (row: any) => { setSelectedPart(row); setHistViewOpen(true); };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

  const partsExcelData = data.map(r => ({"رقم اللوحة": r.plateNumber, "اسم القطعة": r.partName, "تاريخ التركيب": r.installDate, "التكلفة (ج.م)": r.cost}));
  const histExcelData = history.map(r => ({"رقم اللوحة": r.plateNumber, "اسم القطعة": r.partName, "الإجراء": r.action, "التاريخ": r.actionDate}));

  const partColumns = [
    { key: "plateNumber", header: "اللوحة", render: (r:any) => <span className="font-bold text-blue-900">{r.plateNumber}</span> },
    { key: "partName", header: "اسم القطعة", render: (r:any) => <span className="font-bold">{r.partName}</span> },
    { key: "partCategory", header: "الفئة" },
    { key: "installDate", header: "تاريخ التركيب", render: (r:any) => formatDate(r.installDate) },
    { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{(r.cost || 0).toLocaleString()} ج</span> },
  ];

  const histColumns = [
    { key: "plateNumber", header: "اللوحة" },
    { key: "partName", header: "اسم القطعة" },
    { key: "action", header: "الإجراء", render: (r:any) => <StatusBadge status={r.action} /> },
    { key: "actionDate", header: "التاريخ", render: (r:any) => formatDate(r.actionDate) },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><SearchCheck size={24} /></div>
          <div><h1 className="text-xl font-black text-gray-900 dark:text-white">فحص وسجلات قطع السيارات</h1><p className="text-sm text-gray-500 mt-0.5">إجمالي {data.length} قطعة مسجلة</p></div>
        </div>
        <div className="flex items-center gap-3">
          <ExportExcelButton data={activeTab === "parts" ? partsExcelData : histExcelData} fileName={activeTab === "parts" ? "فحص_قطع_السيارات" : "تاريخ_صيانة_القطع"} dateColumnName={activeTab === "parts" ? "تاريخ التركيب" : "التاريخ"} />
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[#F97316] text-white rounded-xl font-bold shadow-md"><Plus size={18} /><span>إضافة قطعة</span></button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit border border-gray-200">
        <button onClick={() => setActiveTab("parts")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "parts" ? "bg-blue-900 text-white" : "text-gray-600"}`}><Wrench size={16} /> قائمة القطع</button>
        <button onClick={() => setActiveTab("history")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "history" ? "bg-blue-900 text-white" : "text-gray-600"}`}><History size={16} /> تاريخ الصيانة</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {activeTab === "parts" ? (
          <DataTable columns={partColumns} data={data} loading={loading} onEdit={openEdit} onDelete={handleDelete} extraActions={(row:any) => (
            <div className="flex gap-1.5">
              <button onClick={() => viewHistory(row)} className="p-1.5 rounded-lg text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 flex gap-1"><History size={14} />التاريخ</button>
              <button onClick={() => openHistory(row)} className="p-1.5 rounded-lg text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 flex gap-1"><Plus size={14} />سجل</button>
            </div>
          )}/>
        ) : (
          <DataTable columns={histColumns} data={history} loading={loading} />
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? "تعديل" : "إضافة قطعة"} size="lg">
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          <Field label="السيارة"><select required className={inputClass} value={editing.plateNumber||""} onChange={e=>{const v=vehicles.find(v=>v.plateNumber===e.target.value); setEditing({...editing, plateNumber:e.target.value, vehicleId:v?.id});}}><option value="">-- اختر --</option>{vehicles.map(v=><option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}</select></Field>
          <Field label="اسم القطعة"><input className={inputClass} value={editing.partName||""} onChange={e=>setEditing({...editing, partName:e.target.value})} /></Field>
          <Field label="الفئة"><input className={inputClass} value={editing.partCategory||""} onChange={e=>setEditing({...editing, partCategory:e.target.value})} /></Field>
          <Field label="تاريخ التركيب"><input type="date" className={inputClass} value={editing.installDate||""} onChange={e=>setEditing({...editing, installDate:e.target.value})} /></Field>
          <Field label="التكلفة (ج.م)"><input type="number" className={inputClass} value={editing.cost||""} onChange={e=>setEditing({...editing, cost:e.target.value})} /></Field>
          <button type="submit" disabled={saving} className="col-span-2 py-3 bg-blue-900 text-white rounded-xl font-bold">{saving?"جاري الحفظ...":"حفظ"}</button>
        </form>
      </Modal>

      <Modal open={histModalOpen} onClose={() => setHistModalOpen(false)} title="إضافة سجل صيانة" size="md">
        <form onSubmit={handleSaveHistory} className="grid grid-cols-2 gap-4">
          <Field label="الإجراء"><select className={inputClass} value={editingHist.action||"replaced"} onChange={e=>setEditingHist({...editingHist, action:e.target.value})}><option value="replaced">تغيير</option><option value="repaired">إصلاح</option><option value="inspected">فحص</option></select></Field>
          <Field label="التاريخ"><input type="date" className={inputClass} value={editingHist.actionDate||""} onChange={e=>setEditingHist({...editingHist, actionDate:e.target.value})} /></Field>
          <Field label="التكلفة"><input type="number" className={inputClass} value={editingHist.cost||""} onChange={e=>setEditingHist({...editingHist, cost:e.target.value})} /></Field>
          <button type="submit" disabled={saving} className="col-span-2 py-3 bg-blue-900 text-white rounded-xl font-bold">{saving?"جاري الحفظ...":"حفظ"}</button>
        </form>
      </Modal>

      <Modal open={histViewOpen} onClose={() => setHistViewOpen(false)} title={`سجل: ${selectedPart?.partName}`} size="md">
        <div className="space-y-3">
          {history.filter(h => h.vehiclePartId === selectedPart?.id).length === 0 ? <p className="text-center text-gray-500 py-4">لا توجد سجلات</p> :
            history.filter(h => h.vehiclePartId === selectedPart?.id).map(h => (
              <div key={h.id} className="p-3 bg-gray-50 border rounded-xl flex justify-between">
                <span className="font-bold text-blue-900">{h.action === "replaced" ? "تغيير" : h.action === "repaired" ? "إصلاح" : "فحص"}</span>
                <span className="text-gray-500 text-sm">{formatDate(h.actionDate)}</span>
              </div>
            ))
          }
        </div>
      </Modal>
    </div>
  );
}
