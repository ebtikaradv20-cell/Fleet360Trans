"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { 
  Wrench, Search, Plus, Save, X, Loader2, DollarSign, Clock, CheckCircle2 
} from "lucide-react";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";

interface WorkOrder {
  id: number; orderNumber: string; vehicleId: number; plateNumber: string;
  maintenanceType: string; status: string; workshop: string; description: string;
  cost: number | string; startDate: string; endDate: string; technicianName: string;
  notes: string; createdAt: string;
}

const MAINTENANCE_TYPES = ["تغيير زيت وفلاتر", "صيانة عفشة", "صيانة كاوتش", "كارتة", "صيانة ميكانيكا", "صيانة كهرباء"];

const WO_TEMPLATE_COLUMNS = [
  "رقم اللوحة", "اسم الصيانة", "الحالة", "الورشة", "الوصف", "التكلفة", "تاريخ البدء", "تاريخ الانتهاء", "الفني", "ملاحظات"
];

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
  
  // ── الفلاتر الحديثة ──
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("maintenance:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/work-orders`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, []);

  // ── التصفية الحية ──
  const filteredData = data.filter(r => {
    const matchesSearch = 
      (r.orderNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.plateNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.workshop || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.technicianName || "").toLowerCase().includes(search.toLowerCase());
      
    const matchesType = typeFilter === "الكل" || r.maintenanceType === typeFilter;
    const matchesStatus = statusFilter === "الكل" || r.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const totalCost = filteredData.reduce((acc, row) => acc + safeNum(row.cost), 0);
  const openOrdersCount = filteredData.filter(r => r.status !== "completed").length;
  const completedOrdersCount = filteredData.filter(r => r.status === "completed").length;

  // ── دوال الإكسيل (تصدير واستيراد) ──
  const mapWORow = (row: Record<string, any>) => {
    const plate = row["رقم اللوحة"] || row["plateNumber"] || "";
    if (!String(plate).trim()) return null;

    let status = "pending";
    if (row["الحالة"] === "مكتمل") status = "completed";
    if (row["الحالة"] === "قيد التنفيذ") status = "in_progress";

    const sDate = row["تاريخ البدء"] ? new Date(row["تاريخ البدء"]) : null;
    const eDate = row["تاريخ الانتهاء"] ? new Date(row["تاريخ الانتهاء"]) : null;

    return {
      plateNumber: String(plate).trim(),
      maintenanceType: row["اسم الصيانة"] || "صيانة ميكانيكا",
      status: status,
      workshop: row["الورشة"] || "",
      description: row["الوصف"] || "",
      cost: safeNum(row["التكلفة"]),
      startDate: sDate && !isNaN(sDate.getTime()) ? sDate.toISOString().slice(0, 10) : null,
      endDate: eDate && !isNaN(eDate.getTime()) ? eDate.toISOString().slice(0, 10) : null,
      technicianName: row["الفني"] || "",
      notes: row["ملاحظات"] || "",
    };
  };

  const handleImport = async (rows: any[], mode: "append" | "upsert") => {
    let ok = 0; let failed = 0;
    for (const payload of rows) {
      try {
        const res = await fetch("/api/work-orders", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        if (res.ok) ok++; else failed++;
      } catch { failed++; }
    }
    await load();
    return { ok, failed };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = { ...editing, vehicleId: Number(editing.vehicleId) || null, cost: safeNum(editing.cost), startDate: editing.startDate && String(editing.startDate).trim() !== "" ? editing.startDate : null, endDate: editing.endDate && String(editing.endDate).trim() !== "" ? editing.endDate : null };
      const res = await fetch(isEdit ? `/api/work-orders/${editing.id}` : "/api/work-orders", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.success !== false) { setModalOpen(false); load(); } 
      else { alert(resData.error || "حدث خطأ أثناء الحفظ"); }
    } catch (error) { alert("تعذر الاتصال بالخادم."); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف أمر الشغل؟")) return;
    await fetch(`/api/work-orders/${id}`, { method: "DELETE" }); load();
  };

  const excelData = filteredData.map((r) => ({
    "رقم الأمر": r.orderNumber, "رقم اللوحة": r.plateNumber, "اسم الصيانة": r.maintenanceType,
    "الحالة": r.status === "completed" ? "مكتمل" : r.status === "in_progress" ? "قيد التنفيذ" : "معلق",
    "الورشة": r.workshop, "الوصف": r.description, "التكلفة": safeNum(r.cost),
    "تاريخ البدء": r.startDate, "تاريخ الانتهاء": r.endDate, "الفني": r.technicianName,
  }));

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* ── الكروت ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-blue-200 text-xs font-bold mb-1">إجمالي تكلفة الصيانة</div><div className="text-3xl font-black">{totalCost.toLocaleString()} <span className="text-sm font-normal">ج.م</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><DollarSign size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-amber-100 text-xs font-bold mb-1">أوامر مفتوحة</div><div className="text-3xl font-black">{openOrdersCount} <span className="text-sm font-normal">أمر قيد التنفيذ</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><Clock size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-emerald-100 text-xs font-bold mb-1">أوامر مكتملة</div><div className="text-3xl font-black">{completedOrdersCount} <span className="text-sm font-normal">أمر منجز</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><CheckCircle2 size={22} /></div></div></div>
      </div>

      {/* ── رأس الصفحة ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Wrench size={24} /></div><div><h1 className="text-xl font-black text-gray-900 dark:text-white">أوامر الشغل والصيانة</h1><p className="text-sm text-gray-500 mt-0.5">إجمالي {filteredData.length} أمر مطابق</p></div></div>
        <div className="flex items-center gap-3 flex-wrap">
          <ImportExcelButton templateColumns={WO_TEMPLATE_COLUMNS} templateFileName="قالب_أوامر_الشغل" sampleRow={{"رقم اللوحة":"ل ج أ 1234", "اسم الصيانة":"تغيير زيت وفلاتر", "الحالة":"مكتمل", "الورشة":"صيانة الشركة", "التكلفة":500}} mapRow={mapWORow} onImport={handleImport} buttonText="استيراد" />
          <ExportExcelButton data={excelData} fileName="أوامر_الشغل" dateColumnName="تاريخ البدء" />
          {canWrite && <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md"><Plus size={18} /><span>إضافة أمر شغل</span></button>}
        </div>
      </div>

      {/* ── الفلاتر الحديثة المتطابقة ── */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">بحث باللوحة / الفني / الورشة</label><div className="relative"><Search size={16} className="absolute inset-y-0 start-3 top-2.5 text-gray-400" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث هنا..." className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl ps-9 pe-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div></div>
          <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">اسم الصيانة</label><select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none"><option value="الكل">الكل</option>{MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">الحالة</label><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none"><option value="الكل">الكل</option><option value="pending">معلق</option><option value="in_progress">قيد التنفيذ</option><option value="completed">مكتمل</option></select></div>
        </div>
      </div>

      {/* ── الجدول المؤسسي ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center text-blue-800 dark:text-blue-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
                <tr>
                  <th className="p-4 border-l border-blue-600/50">رقم الأمر</th><th className="p-4 border-l border-blue-600/50">اللوحة</th><th className="p-4 border-l border-blue-600/50">نوع الصيانة</th><th className="p-4 border-l border-blue-600/50">الحالة</th><th className="p-4 border-l border-blue-600/50">الورشة</th><th className="p-4 border-l border-blue-600/50">التكلفة</th><th className="p-4 border-l border-blue-600/50">البدء</th><th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredData.map((r, i) => (
                  <tr key={r.id} className={`hover:bg-blue-50/50 dark:hover:bg-blue-950/20 ${i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/60 dark:bg-gray-800/40"}`}>
                    <td className="p-4 font-black text-blue-900 dark:text-blue-400">{r.orderNumber}</td>
                    <td className="p-4 font-bold">{r.plateNumber}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold">{r.maintenanceType}</span></td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : r.status === 'in_progress' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>{r.status === 'completed' ? 'مكتمل' : r.status === 'in_progress' ? 'قيد التنفيذ' : 'معلق'}</span></td>
                    <td className="p-4 font-semibold text-gray-700 dark:text-gray-300">{r.workshop || "-"}</td>
                    <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">{safeNum(r.cost).toLocaleString()} ج</td>
                    <td className="p-4 text-xs font-semibold">{formatDate(r.startDate)}</td>
                    <td className="p-4 text-center flex justify-center gap-2">
                      <button onClick={() => { setEditing(r); setIsEdit(true); setModalOpen(true); }} className="p-1.5 bg-blue-100 text-blue-700 rounded-lg"><Wrench size={16}/></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 bg-red-100 text-red-700 rounded-lg"><X size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length === 0 && <div className="p-10 text-center text-gray-500 font-bold">لا توجد أوامر شغل.</div>}
          </div>
        )}
      </div>

      {/* ── المودال ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-black text-blue-900 flex items-center gap-2"><Wrench/> {isEdit ? "تعديل أمر الشغل" : "إضافة أمر شغل"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-800"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="رقم الأمر"><input disabled className={`${inputClass} bg-gray-100`} value={editing.orderNumber || ""} readOnly /></Field>
                <Field label="السيارة *"><select required className={inputClass} value={editing.plateNumber || ""} onChange={e => { const v = vehicles.find(v => v.plateNumber === e.target.value); setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id}); }}><option value="">-- اختر --</option>{vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}</select></Field>
                <Field label="نوع الصيانة *"><select required className={inputClass} value={editing.maintenanceType || ""} onChange={e => setEditing({...editing, maintenanceType: e.target.value})}>{MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
                <Field label="الحالة"><select className={inputClass} value={editing.status || "pending"} onChange={e => setEditing({...editing, status: e.target.value})}><option value="pending">معلق</option><option value="in_progress">قيد التنفيذ</option><option value="completed">مكتمل</option></select></Field>
                <Field label="الورشة"><input className={inputClass} value={editing.workshop || ""} onChange={e => setEditing({...editing, workshop: e.target.value})} /></Field>
                <Field label="الفني"><input className={inputClass} value={editing.technicianName || ""} onChange={e => setEditing({...editing, technicianName: e.target.value})} /></Field>
                <Field label="التكلفة (ج.م)"><input type="number" step="0.01" className={inputClass} value={editing.cost || ""} onChange={e => setEditing({...editing, cost: e.target.value})} /></Field>
                <div />
                <Field label="تاريخ البدء"><input type="date" className={inputClass} value={editing.startDate || ""} onChange={e => setEditing({...editing, startDate: e.target.value})} /></Field>
                <Field label="تاريخ الانتهاء"><input type="date" className={inputClass} value={editing.endDate || ""} onChange={e => setEditing({...editing, endDate: e.target.value})} /></Field>
                <div className="col-span-2"><Field label="الوصف"><textarea className={inputClass} rows={2} value={editing.description || ""} onChange={e => setEditing({...editing, description: e.target.value})} /></Field></div>
                <div className="col-span-2"><Field label="ملاحظات"><textarea className={inputClass} rows={2} value={editing.notes || ""} onChange={e => setEditing({...editing, notes: e.target.value})} /></Field></div>
              </div>
              <div className="flex gap-3 pt-5 border-t">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">إلغاء</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl flex justify-center items-center gap-2"><Save size={18}/> حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
