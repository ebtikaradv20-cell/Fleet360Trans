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
  Wrench, Search, Plus, Save, X, Loader2, DollarSign, Clock, CheckCircle2, Pencil, Trash2, Paperclip, Mail, Send
} from "lucide-react";

interface WorkOrder {
  id: number; orderNumber: string; vehicleId: number; plateNumber: string;
  maintenanceType: string; status: string; workshop: string; description: string;
  cost: number; startDate: string; endDate: string; technicianName: string;
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
const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canWrite = user?.role === "admin" || user?.role === "super_admin" || user?.permissions?.includes("maintenance:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter && typeFilter !== "الكل") params.set("maintenanceType", typeFilter);
      if (statusFilter && statusFilter !== "الكل") params.set("status", statusFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/work-orders?${params}`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [search, typeFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => { load(); fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, [load]);

  const activeOrders = data.filter(r => (r as any).is_deleted === 0 && r.status !== 'pending_approval' && r.status !== 'rejected_creation');
  const archivedOrders = data.filter(r => (r as any).is_deleted === 1 || r.status === 'deleted' || r.status === 'rejected_creation');
  const displayData = activeTab === "active" ? activeOrders : archivedOrders;

  const totalCost = activeOrders.reduce((acc, row) => acc + safeNum(row.cost), 0);
  const openOrdersCount = activeOrders.filter(r => r.status !== "completed").length;
  const completedOrdersCount = activeOrders.filter(r => r.status === "completed").length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("الحد الأقصى 2 ميجابايت."); return; }
    const reader = new FileReader();
    reader.onload = (evt) => { setEditing({ ...editing, invoiceUrl: evt.target?.result as string }); };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); if (saving) return; setSaving(true);
    try {
      const payload = { ...editing, vehicleId: Number(editing.vehicleId) || null, cost: safeNum(editing.cost), startDate: editing.startDate || null, endDate: editing.endDate || null, invoiceUrl: editing.invoiceUrl || "" };
      const res = await fetch(isEdit ? `/api/work-orders/${editing.id}` : "/api/work-orders", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setModalOpen(false); load(); } else { alert("حدث خطأ أثناء الحفظ"); }
    } catch { alert("تعذر الاتصال بالخادم."); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الصيانة نهائياً؟")) return;
    await fetch(`/api/work-orders/${id}`, { method: "DELETE" }); load();
  };

  // ── 📧 الدالة السحرية لإرسال الفاتورة عبر الإيميل ──
  const sendInvoiceEmail = async (row: WorkOrder) => {
    if (!confirm("سيتم إرسال إشعار بهذه الصيانة والمرفقات إلى الإدارة. هل تريد المتابعة؟")) return;
    setSendingEmail(row.id);
    try {
      const emailHtml = `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 30px; background-color: #f8fafc; border-radius: 15px;">
          <h2 style="color: #1E3A8A; margin-bottom: 5px;">نظام إدارة الأسطول Fleet360</h2>
          <h3 style="color: #ea580c; margin-top: 0;">اعتماد فاتورة صيانة - Trans Gas</h3>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
          <p>السادة الإدارة، تم الانتهاء من صيانة السيارة الموضحة أدناه ويرجى التكرم بالاطلاع على الفاتورة المرفقة:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr><td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; background: #e2e8f0;">رقم اللوحة</td><td style="padding: 10px; border: 1px solid #cbd5e1;">${row.plateNumber}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; background: #e2e8f0;">نوع الصيانة</td><td style="padding: 10px; border: 1px solid #cbd5e1;">${row.maintenanceType}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; background: #e2e8f0;">التكلفة الإجمالية</td><td style="padding: 10px; border: 1px solid #cbd5e1; color: #059669; font-weight: bold;">${safeNum(row.cost).toLocaleString()} ج.م</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; background: #e2e8f0;">المركز / الورشة</td><td style="padding: 10px; border: 1px solid #cbd5e1;">${row.workshop || "-"}</td></tr>
          </table>
          <p style="margin-top: 20px; font-size: 12px; color: #64748b;">تجدون الفاتورة في المرفقات.</p>
        </div>
      `;

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "admin@taqa.com.eg", // إيميل المدير الذي سيستلم الفاتورة
          subject: `فاتورة صيانة جديدة - سيارة (${row.plateNumber})`,
          html: emailHtml,
          attachmentUrl: row.invoiceUrl,
          attachmentName: `Invoice_${row.orderNumber}.png`
        })
      });
      
      const data = await res.json();
      if (res.ok) alert("✅ تم الإرسال بنجاح إلى الإدارة!");
      else alert(data.error || "فشل الإرسال.");
    } catch (err) {
      alert("خطأ في الاتصال بسيرفر الإيميل.");
    } finally {
      setSendingEmail(null);
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

  const columns = [
    { key: "orderNumber", header: "رقم الأمر", render: (r:any) => <span className="font-bold text-blue-900 dark:text-blue-400">{r.orderNumber}</span> },
    { key: "plateNumber", header: "اللوحة", render: (r:any) => <span className="font-bold">{r.plateNumber}</span> },
    { key: "maintenanceType", header: "الصيانة", render: (r:any) => <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold">{r.maintenanceType}</span> },
    { key: "status", header: "الحالة", render: (r:any) => <StatusBadge status={r.status} /> },
    { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{safeNum(r.cost).toLocaleString()} ج.م</span> },
    
    // ── 📧 عمود الفاتورة وإرسال الإيميل المدمج ──
    { key: "invoice", header: "المرفقات", render: (r: WorkOrder) => r.invoiceUrl ? (
      <div className="flex flex-col gap-1 items-center justify-center">
        <a href={r.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors">
          عرض
        </a>
        {r.status === "completed" && activeTab === "active" && (
          <button 
            onClick={() => sendInvoiceEmail(r)}
            disabled={sendingEmail === r.id}
            className="flex items-center gap-1 text-[10px] font-bold text-white bg-orange-500 px-2 py-1 rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {sendingEmail === r.id ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>} إرسال
          </button>
        )}
      </div>
    ) : <span className="text-gray-400 text-xs">-</span> },
    { key: "startDate", header: "تاريخ البدء", render: (r:any) => formatDate(r.startDate) },
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      {/* الكروت الإحصائية */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-blue-200 text-xs font-bold mb-1">إجمالي تكلفة الصيانة</div><div className="text-3xl font-black">{totalCost.toLocaleString()} <span className="text-sm font-normal">ج.م</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><DollarSign size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-amber-100 text-xs font-bold mb-1">أوامر مفتوحة</div><div className="text-3xl font-black">{openOrdersCount} <span className="text-sm font-normal">قيد التنفيذ</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><Clock size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-emerald-100 text-xs font-bold mb-1">صيانات مكتملة</div><div className="text-3xl font-black">{completedOrdersCount} <span className="text-sm font-normal">أمر منجز</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><CheckCircle2 size={22} /></div></div></div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Wrench size={24} /></div><div><h1 className="text-xl font-black text-gray-900 dark:text-white">أوامر الشغل والصيانة</h1><p className="text-sm text-gray-500 mt-0.5">إجمالي {displayData.length} أمر مطابق</p></div></div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportExcelButton data={displayData} fileName="أوامر_الشغل" dateColumnName="تاريخ البدء" />
          {canWrite && <button onClick={() => {setEditing(emptyWO); setIsEdit(false); setModalOpen(true);}} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"><Plus size={18} /><span>إضافة صيانة</span></button>}
        </div>
      </div>

      {/* ── تبويبات النشط والمحذوف (الأرشيف) ── */}
      <div className="flex gap-2 p-1.5 bg-white dark:bg-gray-900 rounded-xl w-fit border border-gray-200 dark:border-gray-800 shadow-sm mb-4">
        <button onClick={() => setActiveTab("active")} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "active" ? "bg-blue-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}>أوامر الشغل النشطة ({activeOrders.length})</button>
        <button onClick={() => setActiveTab("archived")} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "archived" ? "bg-red-700 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}>سجل المحذوفات والمرفوض ({archivedOrders.length})</button>
      </div>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2"><label className="text-xs text-gray-500 dark:text-gray-400">بحث:</label><div className="relative"><Search size={14} className="absolute inset-y-0 start-2 top-2.5 text-gray-400" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="border dark:border-gray-700 rounded-lg ps-7 pe-2 py-1.5 text-xs dark:bg-gray-800 dark:text-white outline-none w-32" /></div></div>
        <FilterSelect label="الصيانة" value={typeFilter} onChange={setTypeFilter} options={[{value:"الكل", label:"الكل"}, ...MAINTENANCE_TYPES.map(t => ({ value: t, label: t }))]} />
        <FilterSelect label="الحالة" value={statusFilter} onChange={setStatusFilter} options={[{ value: "الكل", label: "الكل" }, { value: "pending", label: "معلق" }, { value: "in_progress", label: "قيد التنفيذ" }, { value: "completed", label: "مكتمل" }]} />
      </FilterBar>

      {/* الجدول */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable columns={columns} data={displayData} loading={loading} onEdit={activeTab === "active" && canWrite ? (r) => {setEditing(r); setIsEdit(true); setModalOpen(true);} : undefined} onDelete={activeTab === "active" && user?.role === "admin" ? (r) => handleDelete(r.id) : undefined} />
      </div>

      {/* المودال */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center bg-blue-900 text-white p-4 rounded-t-2xl shrink-0"><h2 className="text-xl font-black flex items-center gap-2"><Wrench/> {isEdit ? "تعديل أمر الصيانة" : "إضافة أمر صيانة جديد"}</h2><button onClick={() => setModalOpen(false)} className="hover:text-red-400"><X size={24}/></button></div>
            
            <div className="p-6 overflow-y-auto">
              <form id="maintenance-form" onSubmit={handleSave} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <Field label="رقم الأمر"><input disabled className={`${inputClass} bg-gray-200 dark:bg-gray-700 cursor-not-allowed font-bold`} value={editing.orderNumber || ""} readOnly /></Field>
                  <Field label="السيارة *"><select required className={inputClass} value={editing.plateNumber || ""} onChange={e => { const v = vehicles.find(v => v.plateNumber === e.target.value); setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id}); }}><option value="">-- اختر --</option>{vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}</select></Field>
                  <Field label="نوع الصيانة *"><select required className={inputClass} value={editing.maintenanceType || ""} onChange={e => setEditing({...editing, maintenanceType: e.target.value})}>{MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
                  <Field label="الحالة التشغيلية"><select className={inputClass} value={editing.status || "pending"} onChange={e => setEditing({...editing, status: e.target.value})}><option value="pending">بدء الصيانة (معلق)</option><option value="in_progress">قيد التنفيذ</option><option value="completed">تمت الصيانة (مكتمل)</option></select></Field>
                  <Field label="اسم الورشة / المركز"><input className={inputClass} value={editing.workshop || ""} onChange={e => setEditing({...editing, workshop: e.target.value})} /></Field>
                  <Field label="إجمالي التكلفة (ج.م)"><input type="number" step="0.01" className={inputClass} value={editing.cost || ""} onChange={e => setEditing({...editing, cost: safeNum(e.target.value)})} /></Field>
                </div>

                {/* المرفقات والفاتورة */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-300">مرفقات الصيانة والفواتير</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">ارفع الفاتورة لإرسالها للإدارة (صورة أو PDF بحد أقصى 2MB)</p>
                  </div>
                  <input type="file" ref={fileInputRef} accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-colors whitespace-nowrap cursor-pointer">
                    <Paperclip size={18} /> {editing.invoiceUrl ? "تغيير المرفق الحالي" : "إرفاق ملف / فاتورة"}
                  </button>
                  {editing.invoiceUrl && (
                    <a href={editing.invoiceUrl} target="_blank" className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-2 rounded-lg">
                      <CheckCircle2 size={14} /> تم الإرفاق (معاينة)
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="تاريخ البدء"><input type="date" required className={inputClass} value={editing.startDate || ""} onChange={e => setEditing({...editing, startDate: e.target.value})} /></Field>
                  <Field label="تاريخ الانتهاء المتوقع"><input type="date" className={inputClass} value={editing.endDate || ""} onChange={e => setEditing({...editing, endDate: e.target.value})} /></Field>
                  <div className="col-span-2"><Field label="تفاصيل العطل والأعمال المطلوبة"><textarea className={inputClass} rows={2} value={editing.description || ""} onChange={e => setEditing({...editing, description: e.target.value})} /></Field></div>
                </div>

              </form>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-3 shrink-0 rounded-b-2xl">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-white dark:bg-gray-900 border text-gray-700 dark:text-gray-300 font-bold rounded-xl shadow-sm hover:bg-gray-100">إلغاء</button>
              <button form="maintenance-form" type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-md cursor-pointer">
                {saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} حفظ أمر الصيانة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
