"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import { 
  Wrench, Search, Plus, Save, X, Loader2, DollarSign, Clock, CheckCircle2, Pencil, Trash2, Paperclip 
} from "lucide-react";

interface MaintenanceRecord {
  id: number; orderNumber: string; vehicleId: number; plateNumber: string;
  maintenanceType: string; status: string; workshop: string; description: string;
  cost: number | string; startDate: string; endDate: string; technicianName: string;
  receivedBy: string; lifespanKm: number; lastMaintenanceDate: string; nextMaintenanceDate: string;
  invoiceUrl: string; notes: string; createdAt: string;
}

const MAINTENANCE_TYPES = ["تغيير زيت وفلاتر", "صيانة عفشة", "صيانة كاوتش", "كارتة", "صيانة ميكانيكا", "صيانة كهرباء"];

const emptyRecord: Partial<MaintenanceRecord> = {
  orderNumber: `MNT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
  plateNumber: "", maintenanceType: "صيانة ميكانيكا", status: "pending", workshop: "", description: "", cost: 0, 
  startDate: new Date().toISOString().slice(0, 10), endDate: "", technicianName: "", receivedBy: "", 
  lifespanKm: 0, lastMaintenanceDate: "", nextMaintenanceDate: "", invoiceUrl: "", notes: ""
};

const safeNum = (val: any): number => { if (val === null || val === undefined) return 0; const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const Field = ({ label, children }: any) => (<div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>{children}</div>);
const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function MaintenancePage() {
  const { user } = useApp();
  const [data, setData] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<MaintenanceRecord>>(emptyRecord);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canWrite = user?.role === "admin" || user?.permissions?.includes("maintenance:write");

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch(`/api/work-orders`); const d = await res.json(); setData(Array.isArray(d) ? d : []); } 
    catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, [load]);

  const filteredData = data.filter(r => {
    const sMatch = (r.orderNumber || "").includes(search) || (r.plateNumber || "").includes(search) || (r.workshop || "").includes(search);
    const tMatch = typeFilter === "الكل" || r.maintenanceType === typeFilter;
    const stMatch = statusFilter === "الكل" || r.status === statusFilter;
    return sMatch && tMatch && stMatch;
  });

  const totalCost = filteredData.reduce((acc, row) => acc + safeNum(row.cost), 0);
  const openOrdersCount = filteredData.filter(r => r.status !== "completed").length;
  const completedOrdersCount = filteredData.filter(r => r.status === "completed").length;

  // ── تحويل ملف الفاتورة إلى رابط/Base64 ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => { setEditing({ ...editing, invoiceUrl: evt.target?.result as string }); };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); if (saving) return; setSaving(true);
    try {
      const payload = { 
        ...editing, vehicleId: Number(editing.vehicleId) || null, cost: safeNum(editing.cost), lifespanKm: safeNum(editing.lifespanKm),
        startDate: editing.startDate || null, endDate: editing.endDate || null, lastMaintenanceDate: editing.lastMaintenanceDate || null, nextMaintenanceDate: editing.nextMaintenanceDate || null
      };
      // Note: We use work-orders API endpoints
      const res = await fetch(isEdit ? `/api/work-orders/${editing.id}` : "/api/work-orders", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setModalOpen(false); load(); } else { alert("حدث خطأ أثناء الحفظ"); }
    } catch { alert("تعذر الاتصال بالخادم."); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => { if (confirm("حذف؟")) { await fetch(`/api/work-orders/${id}`, { method: "DELETE" }); load(); } };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

  const excelData = filteredData.map((r) => ({
    "رقم الصيانة": r.orderNumber, "رقم اللوحة": r.plateNumber, "نوع الصيانة": r.maintenanceType,
    "الحالة": r.status === "completed" ? "مكتمل" : r.status === "in_progress" ? "قيد التنفيذ" : "معلق",
    "الورشة": r.workshop || "", "التكلفة (ج.م)": safeNum(r.cost),
    "تاريخ البدء": r.startDate, "تاريخ الانتهاء": r.endDate, 
    "الفني المعالج": r.technicianName || "", "المستلم": r.receivedBy || "",
    "العمر الافتراضي": safeNum(r.lifespanKm), "آخر صيانة": r.lastMaintenanceDate, "الصيانة القادمة": r.nextMaintenanceDate
  }));

  const columns = [
    { key: "orderNumber", header: "رقم الأمر", render: (r:any) => <span className="font-bold text-blue-900">{r.orderNumber}</span> },
    { key: "plateNumber", header: "اللوحة", render: (r:any) => <span className="font-bold">{r.plateNumber}</span> },
    { key: "maintenanceType", header: "نوع الصيانة", render: (r:any) => <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold">{r.maintenanceType}</span> },
    { key: "status", header: "الحالة", render: (r:any) => <StatusBadge status={r.status} /> },
    { key: "workshop", header: "الورشة" },
    { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.cost).toLocaleString()} ج.م</span> },
    { key: "startDate", header: "تاريخ الصيانة", render: (r:any) => formatDate(r.startDate) },
    { key: "invoice", header: "الفاتورة", render: (r:any) => r.invoiceUrl ? <a href={r.invoiceUrl} target="_blank" className="text-blue-500 hover:underline flex items-center justify-center"><Paperclip size={16}/> عرض</a> : "-" },
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* ── الكروت ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-blue-200 text-xs font-bold mb-1">إجمالي تكلفة الصيانة</div><div className="text-3xl font-black">{totalCost.toLocaleString()} <span className="text-sm">ج.م</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><DollarSign size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-amber-100 text-xs font-bold mb-1">صيانات مفتوحة</div><div className="text-3xl font-black">{openOrdersCount}</div></div><div className="p-2.5 bg-white/10 rounded-xl"><Clock size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-emerald-100 text-xs font-bold mb-1">مكتملة</div><div className="text-3xl font-black">{completedOrdersCount}</div></div><div className="p-2.5 bg-white/10 rounded-xl"><CheckCircle2 size={22} /></div></div></div>
      </div>

      {/* ── الهيدر ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3"><div className="p-3 bg-blue-50 text-blue-700 rounded-xl"><Wrench size={24} /></div><div><h1 className="text-xl font-black text-gray-900">سجلات الصيانة</h1><p className="text-sm text-gray-500 mt-0.5">إجمالي {filteredData.length} سجل صيانة</p></div></div>
        <div className="flex items-center gap-3 flex-wrap">
          <ImportExcelButton templateColumns={["رقم اللوحة", "نوع الصيانة", "التكلفة"]} templateFileName="سجلات_الصيانة" mapRow={() => null} onImport={async () => {return {ok:0, failed:0}}} buttonText="استيراد" />
          <ExportExcelButton data={excelData} fileName="سجلات_الصيانة" dateColumnName="تاريخ البدء" />
          {canWrite && <button onClick={() => {setEditing(emptyRecord); setIsEdit(false); setModalOpen(true);}} className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 text-white rounded-xl font-bold shadow-md hover:bg-blue-800"><Plus size={18} /><span>إضافة صيانة</span></button>}
        </div>
      </div>

      <FilterBar>
        <div className="relative"><Search size={16} className="absolute start-3 top-2.5 text-gray-400"/><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..." className="border rounded-xl ps-9 pe-3 py-2 text-sm outline-none w-48"/></div>
        <FilterSelect label="نوع الصيانة" value={typeFilter} onChange={setTypeFilter} options={[{value:"الكل", label:"الكل"}, ...MAINTENANCE_TYPES.map(t => ({ value: t, label: t }))]} />
        <FilterSelect label="الحالة" value={statusFilter} onChange={setStatusFilter} options={[{ value: "الكل", label: "الكل" }, { value: "pending", label: "معلق" }, { value: "in_progress", label: "قيد التنفيذ" }, { value: "completed", label: "مكتمل" }]} />
      </FilterBar>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <DataTable columns={columns} data={filteredData} loading={loading} onEdit={canWrite ? (r) => {setEditing(r); setIsEdit(true); setModalOpen(true);} : undefined} onDelete={user?.role === "admin" ? (r) => handleDelete(r.id) : undefined} />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] border border-gray-200">
            <div className="flex justify-between items-center bg-blue-900 text-white p-4 rounded-t-2xl shrink-0">
              <h2 className="text-xl font-black flex items-center gap-2"><Wrench/> {isEdit ? "تعديل سجل الصيانة" : "إضافة سجل صيانة جديد"}</h2>
              <button onClick={() => setModalOpen(false)} className="hover:text-red-400"><X size={24}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="maintenance-form" onSubmit={handleSave} className="space-y-6">
                
                {/* معلومات الصيانة الأساسية */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <Field label="رقم أمر الشغل/الصيانة"><input disabled className={`${inputClass} bg-gray-200 cursor-not-allowed font-bold`} value={editing.orderNumber || ""} readOnly /></Field>
                  <Field label="السيارة *"><select required className={inputClass} value={editing.plateNumber || ""} onChange={e => { const v = vehicles.find(v => v.plateNumber === e.target.value); setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id}); }}><option value="">-- اختر --</option>{vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}</select></Field>
                  <Field label="نوع الصيانة *"><select required className={inputClass} value={editing.maintenanceType || ""} onChange={e => setEditing({...editing, maintenanceType: e.target.value})}>{MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
                  <Field label="الحالة التشغيلية"><select className={inputClass} value={editing.status || "pending"} onChange={e => setEditing({...editing, status: e.target.value})}><option value="pending">معلق</option><option value="in_progress">قيد التنفيذ</option><option value="completed">مكتمل</option></select></Field>
                  <Field label="اسم الورشة / المركز"><input className={inputClass} value={editing.workshop || ""} onChange={e => setEditing({...editing, workshop: e.target.value})} /></Field>
                  <Field label="إجمالي التكلفة (ج.م)"><input type="number" step="0.01" className={inputClass} value={editing.cost || ""} onChange={e => setEditing({...editing, cost: safeNum(e.target.value)})} /></Field>
                </div>

                {/* معلومات الفني والتاريخ ── الإضافات الجديدة ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-blue-200 p-5 rounded-xl bg-blue-50/50">
                  <Field label="اسم الفني (المعالج)"><input className={inputClass} value={editing.technicianName || ""} onChange={e => setEditing({...editing, technicianName: e.target.value})} placeholder="المهندس المسؤول" /></Field>
                  <Field label="اسم المستلم (مندوب الشركة)"><input className={inputClass} value={editing.receivedBy || ""} onChange={e => setEditing({...editing, receivedBy: e.target.value})} placeholder="من استلم السيارة؟" /></Field>
                  <Field label="العمر الافتراضي (للقطعة/الصيانة)"><input type="number" className={inputClass} value={editing.lifespanKm || ""} onChange={e => setEditing({...editing, lifespanKm: safeNum(e.target.value)})} placeholder="بالكيلومتر (مثال 40000)" /></Field>
                  
                  <Field label="تاريخ آخر صيانة سابقة"><input type="date" className={inputClass} value={editing.lastMaintenanceDate || ""} onChange={e => setEditing({...editing, lastMaintenanceDate: e.target.value})} /></Field>
                  <Field label="تاريخ البدء (الحالي)"><input type="date" required className={inputClass} value={editing.startDate || ""} onChange={e => setEditing({...editing, startDate: e.target.value})} /></Field>
                  <Field label="تاريخ التغيير/الصيانة القادمة"><input type="date" className={inputClass} value={editing.nextMaintenanceDate || ""} onChange={e => setEditing({...editing, nextMaintenanceDate: e.target.value})} /></Field>
                </div>

                {/* رفع المرفقات والملاحظات */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <Field label="إرفاق فاتورة / مستند (صورة أو PDF)">
                      <input type="file" ref={fileInputRef} accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-slate-800">
                          <Paperclip size={16} /> رفع ملف
                        </button>
                        {editing.invoiceUrl && <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded">تم الإرفاق بنجاح ✓</span>}
                      </div>
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="تفاصيل العطل والوصف"><textarea className={inputClass} rows={2} value={editing.description || ""} onChange={e => setEditing({...editing, description: e.target.value})} /></Field>
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3 shrink-0 rounded-b-2xl">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-white border text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-100">إلغاء</button>
              <button form="maintenance-form" type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-md hover:bg-blue-800">
                {saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} حفظ بيانات الصيانة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
