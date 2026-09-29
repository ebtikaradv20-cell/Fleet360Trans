"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import { 
  Wrench, Search, Plus, Save, X, Loader2, DollarSign, Clock, CheckCircle2, Pencil, Trash2 
} from "lucide-react";

interface WorkOrder {
  id: number; orderNumber: string; vehicleId: number; plateNumber: string;
  maintenanceType: string; status: string; workshop: string; description: string;
  cost: number | string; startDate: string; endDate: string; technicianName: string;
  notes: string; createdAt: string;
}

const MAINTENANCE_TYPES = ["تغيير زيت وفلاتر", "صيانة عفشة", "صيانة كاوتش", "كارتة", "صيانة ميكانيكا", "صيانة كهرباء"];

const WO_TEMPLATE_COLUMNS = ["رقم اللوحة", "اسم الصيانة", "الحالة", "الورشة", "الوصف", "التكلفة", "تاريخ البدء", "تاريخ الانتهاء", "الفني", "ملاحظات"];

const emptyWO: Partial<WorkOrder> = {
  orderNumber: `WO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
  plateNumber: "", maintenanceType: "صيانة ميكانيكا", status: "pending", workshop: "", description: "", cost: 0, 
  startDate: new Date().toISOString().slice(0, 10), endDate: "", technicianName: "", notes: ""
};

const safeNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : num;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>{children}</div>
);
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("maintenance:write");

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

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, []);

  const totalCost = data.reduce((acc, row) => acc + safeNum(row.cost), 0);
  const openOrdersCount = data.filter(r => r.status !== "completed").length;
  const completedOrdersCount = data.filter(r => r.status === "completed").length;

  const mapWORow = (row: Record<string, any>) => {
    const plate = row["رقم اللوحة"] || row["plateNumber"] || "";
    if (!String(plate).trim()) return null;
    let status = "pending";
    if (row["الحالة"] === "مكتمل") status = "completed";
    if (row["الحالة"] === "قيد التنفيذ") status = "in_progress";
    const sDate = row["تاريخ البدء"] ? new Date(row["تاريخ البدء"]) : null;
    const eDate = row["تاريخ الانتهاء"] ? new Date(row["تاريخ الانتهاء"]) : null;
    return {
      plateNumber: String(plate).trim(), maintenanceType: row["اسم الصيانة"] || "صيانة ميكانيكا", status: status,
      workshop: row["الورشة"] || "", description: row["الوصف"] || "", cost: safeNum(row["التكلفة"]),
      startDate: sDate && !isNaN(sDate.getTime()) ? sDate.toISOString().slice(0, 10) : null,
      endDate: eDate && !isNaN(eDate.getTime()) ? eDate.toISOString().slice(0, 10) : null,
      technicianName: row["الفني"] || "", notes: row["ملاحظات"] || "",
    };
  };

  const handleImport = async (rows: any[], mode: "append" | "upsert") => {
    let ok = 0; let failed = 0;
    for (const payload of rows) {
      try {
        const res = await fetch("/api/work-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) ok++; else failed++;
      } catch { failed++; }
    }
    await load(); return { ok, failed };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = { ...editing, vehicleId: Number(editing.vehicleId) || null, cost: safeNum(editing.cost), startDate: editing.startDate && String(editing.startDate).trim() !== "" ? editing.startDate : null, endDate: editing.endDate && String(editing.endDate).trim() !== "" ? editing.endDate : null };
      const res = await fetch(isEdit ? `/api/work-orders/${editing.id}` : "/api/work-orders", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setModalOpen(false); load(); } else { alert("حدث خطأ أثناء الحفظ"); }
    } catch (error) { alert("تعذر الاتصال بالخادم."); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف أمر الشغل؟")) return;
    await fetch(`/api/work-orders/${id}`, { method: "DELETE" }); load();
  };

  const excelData = data.map((r) => ({
    "رقم الأمر": r.orderNumber, "رقم اللوحة": r.plateNumber, "اسم الصيانة": r.maintenanceType,
    "الحالة": r.status === "completed" ? "مكتمل" : r.status === "in_progress" ? "قيد التنفيذ" : "معلق",
    "الورشة": r.workshop, "الوصف": r.description, "التكلفة (ج.م)": safeNum(r.cost),
    "تاريخ البدء": r.startDate, "تاريخ الانتهاء": r.endDate, "الفني": r.technicianName,
  }));

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

  const columns = [
    { key: "orderNumber", header: "رقم الأمر", render: (r: WorkOrder) => <span className="font-bold text-blue-900 dark:text-blue-400">{r.orderNumber}</span> },
    { key: "plateNumber", header: "اللوحة" },
    { key: "maintenanceType", header: "اسم الصيانة", render: (r: WorkOrder) => <span className="px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-lg text-xs font-bold">{r.maintenanceType}</span> },
    { key: "status", header: "الحالة", render: (r: WorkOrder) => <StatusBadge status={r.status} /> },
    { key: "workshop", header: "الورشة" },
    { key: "description", header: "الوصف", render: (r: WorkOrder) => <span className="max-w-[120px] truncate block font-medium" title={r.description}>{r.description || "-"}</span> },
    { key: "cost", header: "التكلفة", render: (r: WorkOrder) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{safeNum(r.cost).toLocaleString()} ج.م</span> },
    { key: "startDate", header: "تاريخ البدء", render: (r: WorkOrder) => formatDate(r.startDate) },
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-blue-200 text-xs font-bold mb-1">إجمالي تكلفة الصيانة</div><div className="text-3xl font-black">{totalCost.toLocaleString()} <span className="text-sm font-normal">ج.م</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><DollarSign size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-amber-100 text-xs font-bold mb-1">أوامر مفتوحة</div><div className="text-3xl font-black">{openOrdersCount}</div></div><div className="p-2.5 bg-white/10 rounded-xl"><Clock size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-emerald-100 text-xs font-bold mb-1">أوامر مكتملة</div><div className="text-3xl font-black">{completedOrdersCount}</div></div><div className="p-2.5 bg-white/10 rounded-xl"><CheckCircle2 size={22} /></div></div></div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Wrench size={24} /></div><div><h1 className="text-xl font-black text-gray-900 dark:text-white">أوامر الشغل والصيانة</h1><p className="text-sm text-gray-500 mt-0.5">إجمالي {data.length} أمر مطابق</p></div></div>
        <div className="flex items-center gap-3 flex-wrap">
          <ImportExcelButton templateColumns={WO_TEMPLATE_COLUMNS} templateFileName="قالب_أوامر_الشغل" mapRow={mapWORow} onImport={handleImport} buttonText="استيراد" />
          <ExportExcelButton data={excelData} fileName="أوامر_الشغل" dateColumnName="تاريخ البدء" />
          {canWrite && <button onClick={() => {setEditing({...emptyWO, orderNumber: `WO-${Date.now()}`}); setIsEdit(false); setModalOpen(true);}} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md"><Plus size={18} /><span>إضافة أمر شغل</span></button>}
        </div>
      </div>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">بحث:</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="border dark:border-gray-700 rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:text-white focus:outline-none w-32 text-xs" />
        </div>
        <FilterSelect label="الصيانة" value={typeFilter} onChange={setTypeFilter} options={[{value:"الكل", label:"الكل"}, ...MAINTENANCE_TYPES.map(t => ({ value: t, label: t }))]} />
        <FilterSelect label="الحالة" value={statusFilter} onChange={setStatusFilter} options={[{ value: "الكل", label: "الكل" }, { value: "pending", label: "معلق" }, { value: "in_progress", label: "قيد التنفيذ" }, { value: "completed", label: "مكتمل" }]} />
      </FilterBar>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-800 overflow-hidden">
        <DataTable columns={columns} data={data} loading={loading} onEdit={canWrite ? (r) => {setEditing(r); setIsEdit(true); setModalOpen(true);} : undefined} onDelete={user?.role === "admin" ? (r) => handleDelete(r.id) : undefined} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? "تعديل أمر الشغل" : "إضافة أمر شغل"} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="رقم الأمر"><input disabled className={`${inputClass} bg-gray-100 cursor-not-allowed`} value={editing.orderNumber || ""} readOnly /></Field>
            <Field label="السيارة *"><select required className={inputClass} value={editing.plateNumber || ""} onChange={e => { const v = vehicles.find(v => v.plateNumber === e.target.value); setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id}); }}><option value="">-- اختر --</option>{vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}</select></Field>
            <Field label="نوع الصيانة *"><select required className={inputClass} value={editing.maintenanceType || ""} onChange={e => setEditing({...editing, maintenanceType: e.target.value})}>{MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="الحالة"><select className={inputClass} value={editing.status || "pending"} onChange={e => setEditing({...editing, status: e.target.value})}><option value="pending">معلق</option><option value="in_progress">قيد التنفيذ</option><option value="completed">مكتمل</option></select></Field>
            <Field label="الورشة / المركز"><input className={inputClass} value={editing.workshop || ""} onChange={e => setEditing({...editing, workshop: e.target.value})} /></Field>
            <Field label="الفني"><input className={inputClass} value={editing.technicianName || ""} onChange={e => setEditing({...editing, technicianName: e.target.value})} /></Field>
            <Field label="التكلفة (ج.م)"><input type="number" step="0.01" className={inputClass} value={editing.cost || ""} onChange={e => setEditing({...editing, cost: e.target.value})} /></Field>
            <div />
            <Field label="تاريخ البدء"><input type="date" className={inputClass} value={editing.startDate || ""} onChange={e => setEditing({...editing, startDate: e.target.value})} /></Field>
            <Field label="تاريخ الانتهاء"><input type="date" className={inputClass} value={editing.endDate || ""} onChange={e => setEditing({...editing, endDate: e.target.value})} /></Field>
            <div className="col-span-2"><Field label="الوصف"><textarea className={inputClass} rows={2} value={editing.description || ""} onChange={e => setEditing({...editing, description: e.target.value})} /></Field></div>
          </div>
          <div className="flex gap-3 pt-5 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-700">إلغاء</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl flex justify-center items-center gap-2"><Save size={18}/> حفظ</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
