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
  Wrench, Search, Plus, Save, X, Loader2, DollarSign, Clock, CheckCircle2, Paperclip, ExternalLink, Image as ImageIcon
} from "lucide-react";

interface WorkOrder {
  id: number; orderNumber: string; vehicleId: number; plateNumber: string;
  maintenanceType: string; status: string; workshop: string; description: string;
  cost: number | string; startDate: string; endDate: string; technicianName: string;
  invoiceUrl: string; notes: string; createdAt: string;
}

const MAINTENANCE_TYPES = ["تغيير زيت وفلاتر", "صيانة عفشة", "صيانة كاوتش", "كارتة", "صيانة ميكانيكا", "صيانة كهرباء", "سمكرة ودهان"];
const WO_TEMPLATE_COLUMNS = ["رقم اللوحة", "اسم الصيانة", "الحالة", "الورشة", "الوصف", "التكلفة", "تاريخ البدء", "تاريخ الانتهاء", "الفني", "ملاحظات"];

const emptyWO: Partial<WorkOrder> = {
  orderNumber: `WO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
  plateNumber: "", maintenanceType: "صيانة ميكانيكا", status: "pending", workshop: "", description: "", cost: 0, 
  startDate: new Date().toISOString().slice(0, 10), endDate: "", technicianName: "", invoiceUrl: "", notes: ""
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
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");
  
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

  const filteredData = data.filter(r => {
    const matchesSearch = (r.orderNumber || "").toLowerCase().includes(search.toLowerCase()) || (r.plateNumber || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "الكل" || r.maintenanceType === typeFilter;
    const matchesStatus = statusFilter === "الكل" || r.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalCost = filteredData.reduce((acc, row) => acc + safeNum(row.cost), 0);
  const openOrdersCount = filteredData.filter(r => r.status !== "completed").length;
  const completedOrdersCount = filteredData.filter(r => r.status === "completed").length;

  // ── دالة ذكية لتحويل ملف الفاتورة المرفق إلى Base64 ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // تقييد الحجم بـ 2 ميجا
      alert("حجم الملف كبير جداً! الحد الأقصى 2 ميجابايت.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      setEditing({ ...editing, invoiceUrl: evt.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = { 
        ...editing, vehicleId: Number(editing.vehicleId) || null, cost: safeNum(editing.cost), 
        startDate: editing.startDate && String(editing.startDate).trim() !== "" ? editing.startDate : null, 
        endDate: editing.endDate && String(editing.endDate).trim() !== "" ? editing.endDate : null,
        invoiceUrl: editing.invoiceUrl || ""
      };
      const res = await fetch(isEdit ? `/api/work-orders/${editing.id}` : "/api/work-orders", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.success !== false) { setModalOpen(false); load(); } 
      else { alert(resData.error || "حدث خطأ أثناء الحفظ"); }
    } catch (error) { alert("تعذر الاتصال بالخادم."); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الصيانة نهائياً؟")) return;
    await fetch(`/api/work-orders/${id}`, { method: "DELETE" }); load();
  };

  const excelData = filteredData.map((r) => ({
    "رقم الأمر": r.orderNumber, "رقم اللوحة": r.plateNumber, "اسم الصيانة": r.maintenanceType,
    "الحالة": r.status === "completed" ? "مكتمل" : r.status === "in_progress" ? "قيد التنفيذ" : "معلق",
    "الورشة": r.workshop, "الوصف": r.description, "التكلفة": safeNum(r.cost),
    "تاريخ البدء": r.startDate, "تاريخ الانتهاء": r.endDate, "الفني": r.technicianName,
  }));

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

  const columns = [
    { key: "orderNumber", header: "رقم الأمر", render: (r: WorkOrder) => <span className="font-bold text-blue-900 dark:text-blue-400">{r.orderNumber}</span> },
    { key: "plateNumber", header: "اللوحة" },
    { key: "maintenanceType", header: "نوع الصيانة", render: (r: WorkOrder) => <span className="px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-lg text-xs font-bold">{r.maintenanceType}</span> },
    { key: "status", header: "الحالة", render: (r: WorkOrder) => <StatusBadge status={r.status} /> },
    { key: "workshop", header: "الورشة / المركز" },
    { key: "cost", header: "التكلفة", render: (r: WorkOrder) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{safeNum(r.cost).toLocaleString()} ج.م</span> },
    // ✅ عمود عرض الفاتورة
    { key: "invoice", header: "الفاتورة", render: (r: WorkOrder) => r.invoiceUrl ? (
      <a href={r.invoiceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors">
        <ImageIcon size={14} /> عرض
      </a>
    ) : <span className="text-gray-400 text-xs">-</span> },
    { key: "startDate", header: "تاريخ البدء", render: (r: WorkOrder) => formatDate(r.startDate) },
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      {/* ── الكروت ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-blue-200 text-xs font-bold mb-1">إجمالي تكلفة الصيانة</div><div className="text-3xl font-black">{totalCost.toLocaleString()} <span className="text-sm font-normal">ج.م</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><DollarSign size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-amber-100 text-xs font-bold mb-1">أوامر مفتوحة</div><div className="text-3xl font-black">{openOrdersCount} <span className="text-sm font-normal">أمر قيد التنفيذ</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><Clock size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-emerald-100 text-xs font-bold mb-1">صيانات مكتملة</div><div className="text-3xl font-black">{completedOrdersCount} <span className="text-sm font-normal">أمر منجز</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><CheckCircle2 size={22} /></div></div></div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Wrench size={24} /></div><div><h1 className="text-xl font-black text-gray-900 dark:text-white">أوامر الشغل والصيانة</h1><p className="text-sm text-gray-500 mt-0.5">إجمالي {filteredData.length} أمر مطابق</p></div></div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportExcelButton data={excelData} fileName="أوامر_الشغل" dateColumnName="تاريخ البدء" />
          {canWrite && <button onClick={() => {setEditing({...emptyWO, orderNumber: `WO-${Date.now()}`}); setIsEdit(false); setModalOpen(true);}} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md"><Plus size={18} /><span>إضافة أمر صيانة</span></button>}
        </div>
      </div>

      <FilterBar>
        <FilterSelect label="نوع الصيانة" value={typeFilter} onChange={setTypeFilter} options={[{value:"الكل", label:"الكل"}, ...MAINTENANCE_TYPES.map(t => ({ value: t, label: t }))]} />
        <FilterSelect label="الحالة" value={statusFilter} onChange={setStatusFilter} options={[{ value: "الكل", label: "الكل" }, { value: "pending", label: "معلق" }, { value: "in_progress", label: "قيد التنفيذ" }, { value: "completed", label: "مكتمل" }]} />
      </FilterBar>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-800 overflow-hidden">
        <DataTable columns={columns} data={filteredData} loading={loading} onEdit={canWrite ? (r) => {setEditing(r); setIsEdit(true); setModalOpen(true);} : undefined} onDelete={user?.role === "admin" ? (r) => handleDelete(r.id) : undefined} />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-5 my-auto max-h-[95vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-black text-blue-900 dark:text-white flex items-center gap-2"><Wrench className="text-orange-500"/> {isEdit ? "تعديل أمر الصيانة" : "إضافة أمر صيانة جديد"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-800 dark:hover:text-white"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="رقم الأمر"><input disabled className={`${inputClass} bg-gray-100 cursor-not-allowed`} value={editing.orderNumber || ""} readOnly /></Field>
                <Field label="السيارة *"><select required className={inputClass} value={editing.plateNumber || ""} onChange={e => { const v = vehicles.find(v => v.plateNumber === e.target.value); setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id}); }}><option value="">-- اختر السيارة --</option>{vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}</select></Field>
                <Field label="نوع الصيانة *"><select required className={inputClass} value={editing.maintenanceType || ""} onChange={e => setEditing({...editing, maintenanceType: e.target.value})}>{MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
                <Field label="الحالة التشغيلية"><select className={inputClass} value={editing.status || "pending"} onChange={e => setEditing({...editing, status: e.target.value})}><option value="pending">بدء الصيانة (معلق)</option><option value="in_progress">قيد التنفيذ</option><option value="completed">تمت الصيانة (مكتمل)</option></select></Field>
                
                {/* ✅ حقل رفع صورة الفاتورة (مدمج كـ Base64) */}
                <div className="col-span-1 md:col-span-2 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-300">مرفقات الصيانة والفواتير</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">ارفع صورة الفاتورة للرجوع إليها لاحقاً (صورة أو PDF بحد أقصى 2MB)</p>
                  </div>
                  <input type="file" ref={fileInputRef} accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-colors whitespace-nowrap">
                    <Paperclip size={18} /> {editing.invoiceUrl ? "تغيير المرفق الحالي" : "إرفاق ملف / فاتورة"}
                  </button>
                  {editing.invoiceUrl && (
                    <a href={editing.invoiceUrl} target="_blank" className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-2 rounded-lg hover:bg-emerald-200">
                      <CheckCircle2 size={14} /> تم الإرفاق بنجاح (معاينة)
                    </a>
                  )}
                </div>

                <Field label="الورشة / المركز"><input className={inputClass} value={editing.workshop || ""} onChange={e => setEditing({...editing, workshop: e.target.value})} /></Field>
                <Field label="اسم الفني أو المستلم"><input className={inputClass} value={editing.technicianName || ""} onChange={e => setEditing({...editing, technicianName: e.target.value})} /></Field>
                <Field label="إجمالي التكلفة (ج.م)"><input type="number" step="0.01" className={inputClass} value={editing.cost || ""} onChange={e => setEditing({...editing, cost: parseFloat(e.target.value) || 0})} /></Field>
                <div />
                
                <Field label="تاريخ البدء"><input type="date" className={inputClass} value={editing.startDate || ""} onChange={e => setEditing({...editing, startDate: e.target.value})} /></Field>
                <Field label="تاريخ الانتهاء المتوقع"><input type="date" className={inputClass} value={editing.endDate || ""} onChange={e => setEditing({...editing, endDate: e.target.value})} /></Field>
                
                <div className="col-span-2"><Field label="تفاصيل العطل والأعمال المطلوبة"><textarea className={inputClass} rows={2} value={editing.description || ""} onChange={e => setEditing({...editing, description: e.target.value})} placeholder="ما هي الأعطال التي تم معالجتها؟" /></Field></div>
              </div>
              <div className="flex gap-3 pt-5 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors">إلغاء</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-md">
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
