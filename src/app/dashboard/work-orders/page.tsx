"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import { Wrench, Search, Plus, Save, Loader2, DollarSign, Clock, CheckCircle2 } from "lucide-react";

const safeNum = (val: any) => { const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const Field = ({ label, children }: any) => (<div><label className="block text-xs font-bold text-gray-700 mb-1.5">{label}</label>{children}</div>);
const inputClass = "w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-orange-500/50 outline-none";
const MAINTENANCE_TYPES = ["تغيير زيت وفلاتر", "صيانة عفشة", "صيانة كاوتش", "كارتة", "صيانة ميكانيكا", "صيانة كهرباء"];

export default function WorkOrdersPage() {
  const { user } = useApp();
  const [data, setData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>({});
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");
  // ✅ فلتر السيارة الجديد
  const [vehicleFilter, setVehicleFilter] = useState("الكل");
  
  const canWrite = user?.role === "admin" || user?.permissions?.includes("maintenance:write");

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch("/api/work-orders"); const d = await res.json(); setData(Array.isArray(d) ? d : []); } 
    catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, [load]);

  // ⚡ الفلترة الحية ⚡
  const filteredData = data.filter(r => {
    const sMatch = (r.orderNumber || "").includes(search) || (r.description || "").includes(search) || (r.technicianName || "").includes(search);
    const tMatch = typeFilter === "الكل" || r.maintenanceType === typeFilter;
    const stMatch = statusFilter === "الكل" || r.status === statusFilter;
    const vMatch = vehicleFilter === "الكل" || r.plateNumber === vehicleFilter;
    return sMatch && tMatch && stMatch && vMatch;
  });

  const totalCost = filteredData.reduce((acc, row) => acc + safeNum(row.cost), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...editing, vehicleId: Number(editing.vehicleId) || null, cost: safeNum(editing.cost), startDate: editing.startDate || null, endDate: editing.endDate || null };
      const res = await fetch(isEdit ? `/api/work-orders/${editing.id}` : "/api/work-orders", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setModalOpen(false); load(); }
    } catch { alert("خطأ اتصال"); } finally { setSaving(false); }
  };
  const handleDelete = async (id: number) => { if (confirm("حذف؟")) { await fetch(`/api/work-orders/${id}`, { method: "DELETE" }); load(); } };

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* ── الكروت ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg"><div className="text-xs mb-1">إجمالي تكلفة الصيانة</div><div className="text-3xl font-black">{totalCost.toLocaleString()} <span className="text-sm">ج.م</span></div></div>
        <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg"><div className="text-xs mb-1">أوامر مفتوحة</div><div className="text-3xl font-black">{filteredData.filter(r => r.status !== "completed").length}</div></div>
        <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 text-white rounded-2xl p-5 shadow-lg"><div className="text-xs mb-1">مكتملة</div><div className="text-3xl font-black">{filteredData.filter(r => r.status === "completed").length}</div></div>
      </div>

      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-100 text-orange-500 rounded-xl"><Wrench/></div><h1 className="text-xl font-black">أوامر الشغل</h1></div>
        <div className="flex items-center gap-3">
          <ImportExcelButton templateColumns={["رقم اللوحة", "نوع الصيانة", "التكلفة"]} templateFileName="أوامر_الشغل" mapRow={() => null} onImport={async () => {return {ok:0, failed:0}}} />
          <ExportExcelButton data={filteredData} fileName="أوامر_الشغل" dateColumnName="تاريخ البدء" />
          {canWrite && <button onClick={() => {setEditing({orderNumber: `WO-${Date.now()}`, status: "pending", maintenanceType: "صيانة ميكانيكا"}); setIsEdit(false); setModalOpen(true);}} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold"><Plus size={18}/>إضافة</button>}
        </div>
      </div>

      {/* ✅ فلاتر سريعة ذكية */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
        <div><label className="block text-xs font-bold mb-1">بحث</label><input type="text" value={search} onChange={e=>setSearch(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none" placeholder="ابحث..."/></div>
        <div><label className="block text-xs font-bold mb-1">السيارة</label><select value={vehicleFilter} onChange={e=>setVehicleFilter(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none"><option value="الكل">الكل</option>{[...new Set(data.map(d=>d.plateNumber).filter(Boolean))].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
        <div><label className="block text-xs font-bold mb-1">نوع الصيانة</label><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none"><option value="الكل">الكل</option>{MAINTENANCE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        <div><label className="block text-xs font-bold mb-1">الحالة</label><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none"><option value="الكل">الكل</option><option value="pending">معلق</option><option value="in_progress">قيد التنفيذ</option><option value="completed">مكتمل</option></select></div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <DataTable columns={[
          { key: "orderNumber", header: "رقم الأمر", render: (r:any) => <span className="font-bold text-blue-900">{r.orderNumber}</span> },
          { key: "plateNumber", header: "اللوحة" },
          { key: "maintenanceType", header: "نوع الصيانة", render: (r:any) => <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">{r.maintenanceType}</span> },
          { key: "status", header: "الحالة", render: (r:any) => <StatusBadge status={r.status} /> },
          { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.cost).toLocaleString()} ج.م</span> },
          { key: "startDate", header: "تاريخ البدء", render: (r:any) => r.startDate ? new Date(r.startDate).toLocaleDateString("en-GB") : "-" },
        ]} data={filteredData} loading={loading} onEdit={canWrite ? r => {setEditing(r); setIsEdit(true); setModalOpen(true);} : undefined} onDelete={user?.role === "admin" ? r => handleDelete(r.id) : undefined} />
      </div>

      {/* المودال */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="أمر شغل" size="lg">
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
           {/* نفس الحقول لديك */}
           <Field label="رقم اللوحة"><select required className={inputClass} value={editing.plateNumber||""} onChange={e=>{const v = vehicles.find(x=>x.plateNumber===e.target.value); setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id});}}><option value="">--اختر--</option>{vehicles.map(v=><option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}</select></Field>
           <Field label="نوع الصيانة"><select className={inputClass} value={editing.maintenanceType||""} onChange={e=>setEditing({...editing, maintenanceType: e.target.value})}>{MAINTENANCE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
           <Field label="الحالة"><select className={inputClass} value={editing.status||"pending"} onChange={e=>setEditing({...editing, status: e.target.value})}><option value="pending">معلق</option><option value="in_progress">قيد التنفيذ</option><option value="completed">مكتمل</option></select></Field>
           <Field label="التكلفة (ج.م)"><input type="number" className={inputClass} value={editing.cost||""} onChange={e=>setEditing({...editing, cost: safeNum(e.target.value)})} /></Field>
           <Field label="الفني"><input className={inputClass} value={editing.technicianName||""} onChange={e=>setEditing({...editing, technicianName: e.target.value})} /></Field>
           <Field label="تاريخ البدء"><input type="date" className={inputClass} value={editing.startDate||""} onChange={e=>setEditing({...editing, startDate: e.target.value})} /></Field>
           <button type="submit" disabled={saving} className="col-span-2 py-3 bg-blue-900 text-white rounded-xl font-bold">{saving ? "جاري الحفظ..." : "حفظ"}</button>
        </form>
      </Modal>
    </div>
  );
}
