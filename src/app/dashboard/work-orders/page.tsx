"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import { 
  Wrench, Search, Plus, Save, X, Loader2, DollarSign, Clock, CheckCircle2, Paperclip, Send, ImageIcon
} from "lucide-react";

interface WorkOrder {
  id: number; orderNumber: string; vehicleId: number; plateNumber: string;
  maintenanceType: string; status: string; workshop: string; description: string;
  cost: number | string; startDate: string; endDate: string; technicianName: string;
  receivedBy: string; lifespanKm: number; lastMaintenanceDate: string; nextMaintenanceDate: string;
  invoiceUrl: string; notes: string; createdAt: string; is_deleted?: number;
}

const MAINTENANCE_TYPES = ["تغيير زيت وفلاتر", "صيانة عفشة", "صيانة كاوتش", "كارتة", "صيانة ميكانيكا", "صيانة كهرباء", "سمكرة ودهان"];
const WO_TEMPLATE_COLUMNS = ["رقم اللوحة", "اسم الصيانة", "الحالة", "الورشة", "الوصف", "التكلفة", "تاريخ البدء", "تاريخ الانتهاء", "الفني", "ملاحظات"];

const emptyWO: Partial<WorkOrder> = {
  orderNumber: `WO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
  plateNumber: "", maintenanceType: "صيانة ميكانيكا", status: "in_progress", workshop: "", description: "", cost: 0, 
  startDate: new Date().toISOString().slice(0, 10), endDate: "", technicianName: "", receivedBy: "", invoiceUrl: "", notes: ""
};

const safeNum = (val: any): number => { if (val === null || val === undefined) return 0; const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (<div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>{children}</div>);
const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50";

export default function WorkOrdersPage() {
  const { user } = useApp();
  const [data, setData] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<WorkOrder>>(emptyWO);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<number | null>(null);
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canWrite = user?.role === "admin" || user?.role === "super_admin" || user?.permissions?.includes("maintenance:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/work-orders`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, [load]);

  const activeOrders = data.filter(r => (r.is_deleted === 0 || !r.is_deleted) && r.status !== 'deleted' && r.status !== 'rejected');
  const archivedOrders = data.filter(r => r.is_deleted === 1 || r.status === 'deleted' || r.status === 'rejected');
  const displayData = activeTab === "active" ? activeOrders : archivedOrders;

  const filteredData = displayData.filter(r => {
    const matchesSearch = (r.orderNumber || "").toLowerCase().includes(search.toLowerCase()) || (r.plateNumber || "").toLowerCase().includes(search.toLowerCase()) || (r.workshop || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "الكل" || r.maintenanceType === typeFilter;
    const matchesStatus = statusFilter === "الكل" || r.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalCost = activeOrders.reduce((acc, row) => acc + safeNum(row.cost), 0);
  const openOrdersCount = activeOrders.filter(r => r.status === "in_progress" || r.status === "pending" || r.status === "pending_approval").length;
  const completedOrdersCount = activeOrders.filter(r => r.status === "completed").length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("حجم الملف يجب ألا يتجاوز 2 ميجابايت"); return; }
    const reader = new FileReader();
    reader.onload = (evt) => { setEditing({ ...editing, invoiceUrl: evt.target?.result as string }); };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = { 
        ...editing, 
        vehicleId: Number(editing.vehicleId) || null, 
        cost: safeNum(editing.cost),
        status: editing.status || "in_progress", // ⚡ إرسال الحالة المحددة من الدروب داون
        startDate: editing.startDate || null, 
        endDate: editing.endDate || null,
      };
      const res = await fetch(isEdit ? `/api/work-orders/${editing.id}` : "/api/work-orders", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.success !== false) {
        if (resData.message) alert(resData.message);
        setModalOpen(false);
        load();
      } else {
        alert(resData.error || "حدث خطأ أثناء الحفظ");
      }
    } catch { alert("تعذر الاتصال بالخادم."); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف أمر الصيانة؟")) return;
    const res = await fetch(`/api/work-orders/${id}`, { method: "DELETE" });
    const resData = await res.json().catch(() => ({}));
    if (res.ok) {
      if (resData.message) alert(resData.message);
      load();
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">مكتمل</span>;
      case "in_progress": return <span className="px-2.5 py-1 bg-orange-100 text-orange-800 rounded-lg text-xs font-bold">قيد التنفيذ</span>;
      case "pending_approval": return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold animate-pulse">بانتظار الموافقة</span>;
      default: return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">معلق</span>;
    }
  };

  const columns = [
    { key: "orderNumber", header: "رقم الأمر", render: (r: WorkOrder) => <span className="font-bold text-blue-900 dark:text-blue-400">{r.orderNumber}</span> },
    { key: "plateNumber", header: "اللوحة" },
    { key: "maintenanceType", header: "نوع الصيانة", render: (r: WorkOrder) => <span className="px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-lg text-xs font-bold">{r.maintenanceType}</span> },
    { key: "status", header: "الحالة", render: (r: WorkOrder) => renderStatusBadge(r.status) },
    { key: "workshop", header: "الورشة / المركز" },
    { key: "cost", header: "التكلفة", render: (r: WorkOrder) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{safeNum(r.cost).toLocaleString()} ج.م</span> },
    { key: "invoice", header: "المرفقات", render: (r: WorkOrder) => r.invoiceUrl ? (
      <a href={r.invoiceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100">
        <ImageIcon size={14} /> معاينة
      </a>
    ) : <span className="text-gray-400 text-xs">-</span> },
    { key: "startDate", header: "تاريخ البدء", render: (r: WorkOrder) => formatDate(r.startDate) },
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      {/* ── الكروت ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-blue-200 text-xs font-bold mb-1">إجمالي تكلفة الصيانة</div><div className="text-3xl font-black">{totalCost.toLocaleString()} <span className="text-sm font-normal">ج.م</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><DollarSign size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-amber-100 text-xs font-bold mb-1">أوامر مفتوحة / قيد التنفيذ</div><div className="text-3xl font-black">{openOrdersCount}</div></div><div className="p-2.5 bg-white/10 rounded-xl"><Clock size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-emerald-100 text-xs font-bold mb-1">صيانات مكتملة</div><div className="text-3xl font-black">{completedOrdersCount}</div></div><div className="p-2.5 bg-white/10 rounded-xl"><CheckCircle2 size={22} /></div></div></div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Wrench size={24} /></div><div><h1 className="text-xl font-black text-gray-900 dark:text-white">أوامر الشغل والصيانة</h1><p className="text-sm text-gray-500 mt-0.5">إجمالي {filteredData.length} أمر مطابق</p></div></div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportExcelButton data={filteredData} fileName="أوامر_الصيانة" dateColumnName="تاريخ البدء" />
          {canWrite && <button onClick={() => {setEditing(emptyWO); setIsEdit(false); setModalOpen(true);}} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md cursor-pointer"><Plus size={18} /><span>إضافة أمر صيانة</span></button>}
        </div>
      </div>

      {/* ── التبويبات ── */}
      <div className="flex gap-2 p-1.5 bg-white dark:bg-gray-900 rounded-xl w-fit border border-gray-200 dark:border-gray-800 shadow-sm">
        <button onClick={() => setActiveTab("active")} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "active" ? "bg-blue-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}>الأوامر النشطة ({activeOrders.length})</button>
        <button onClick={() => setActiveTab("archived")} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "archived" ? "bg-red-700 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}>سجل المحذوفات والمرفوض ({archivedOrders.length})</button>
      </div>

      <FilterBar>
        <div className="flex items-center gap-2"><label className="text-xs text-gray-500">بحث:</label><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..." className="border dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs dark:bg-gray-800 dark:text-white focus:outline-none w-36" /></div>
        <FilterSelect label="نوع الصيانة" value={typeFilter} onChange={setTypeFilter} options={[{value:"الكل", label:"الكل"}, ...MAINTENANCE_TYPES.map(t => ({ value: t, label: t }))]} />
        <FilterSelect label="الحالة" value={statusFilter} onChange={setStatusFilter} options={[{ value: "الكل", label: "الكل" }, { value: "in_progress", label: "قيد التنفيذ" }, { value: "pending", label: "معلق" }, { value: "completed", label: "مكتمل" }]} />
      </FilterBar>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable columns={columns} data={filteredData} loading={loading} onEdit={canWrite && activeTab === 'active' ? (r) => {setEditing(r); setIsEdit(true); setModalOpen(true);} : undefined} onDelete={canWrite && activeTab === 'active' ? (r) => handleDelete(r.id) : undefined} />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-5 my-auto max-h-[95vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-black text-blue-900 dark:text-white flex items-center gap-2"><Wrench className="text-orange-500"/> {isEdit ? "تعديل أمر الصيانة" : "إضافة أمر صيانة جديد"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-800"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="رقم الأمر"><input disabled className={`${inputClass} bg-gray-100 cursor-not-allowed font-bold`} value={editing.orderNumber || ""} readOnly /></Field>
                <Field label="السيارة *"><select required className={inputClass} value={editing.plateNumber || ""} onChange={e => { const v = vehicles.find(v => v.plateNumber === e.target.value); setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id}); }}><option value="">-- اختر السيارة --</option>{vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}</select></Field>
                <Field label="نوع الصيانة *"><select required className={inputClass} value={editing.maintenanceType || ""} onChange={e => setEditing({...editing, maintenanceType: e.target.value})}>{MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
                
                {/* ⚡ التعديل الجوهري: اختيار الحالة وتطبيقها مباشرة */}
                <Field label="الحالة التشغيلية *">
                  <select className={inputClass} value={editing.status || "in_progress"} onChange={e => setEditing({...editing, status: e.target.value})}>
                    <option value="in_progress">قيد التنفيذ</option>
                    <option value="pending">معلق</option>
                    <option value="completed">تمت الصيانة (مكتمل)</option>
                  </select>
                </Field>

                <div className="col-span-1 md:col-span-2 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-300">مرفقات الفواتير</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">ارفع صورة الفاتورة (صورة أو PDF بحد أقصى 2MB)</p>
                  </div>
                  <input type="file" ref={fileInputRef} accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md cursor-pointer whitespace-nowrap">
                    <Paperclip size={16} /> {editing.invoiceUrl ? "تغيير المرفق" : "إرفاق ملف"}
                  </button>
                  {editing.invoiceUrl && <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded">تم المرفق ✓</span>}
                </div>

                <Field label="الورشة / المركز"><input className={inputClass} value={editing.workshop || ""} onChange={e => setEditing({...editing, workshop: e.target.value})} /></Field>
                <Field label="اسم الفني أو المستلم"><input className={inputClass} value={editing.technicianName || ""} onChange={e => setEditing({...editing, technicianName: e.target.value})} /></Field>
                <Field label="إجمالي التكلفة (ج.م)"><input type="number" step="0.01" className={inputClass} value={editing.cost || ""} onChange={e => setEditing({...editing, cost: parseFloat(e.target.value) || 0})} /></Field>
                <div />
                <Field label="تاريخ البدء"><input type="date" className={inputClass} value={editing.startDate || ""} onChange={e => setEditing({...editing, startDate: e.target.value})} /></Field>
                <Field label="تاريخ الانتهاء المتوقع"><input type="date" className={inputClass} value={editing.endDate || ""} onChange={e => setEditing({...editing, endDate: e.target.value})} /></Field>
                <div className="col-span-2"><Field label="تفاصيل العطل والأعمال"><textarea className={inputClass} rows={2} value={editing.description || ""} onChange={e => setEditing({...editing, description: e.target.value})} /></Field></div>
              </div>
              <div className="flex gap-3 pt-5 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl">إلغاء</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-md cursor-pointer">
                  {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} حفظ أمر الصيانة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
