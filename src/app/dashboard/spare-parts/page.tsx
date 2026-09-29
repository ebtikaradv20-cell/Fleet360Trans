"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import { Package, Search, Plus, Save, X, Loader2, Box, DollarSign, AlertTriangle } from "lucide-react";

const safeNum = (val: any) => { const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const Field = ({ label, children }: any) => (<div><label className="block text-xs font-bold text-gray-700 mb-1.5">{label}</label>{children}</div>);
const inputClass = "w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-orange-500/50 outline-none";

export default function SparePartsPage() {
  const { user } = useApp();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>({});
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // ✅ الفلاتر الحية
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [categoryFilter, setCategoryFilter] = useState("الكل");
  const [nameFilter, setNameFilter] = useState("الكل");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("spare-parts:write");

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch(`/api/spare-parts`); const d = await res.json(); setData(Array.isArray(d) ? d : []); } 
    catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ⚡ التصفية الحية
  const filteredData = data.filter(r => {
    const sMatch = (r.partNumber || "").toLowerCase().includes(search.toLowerCase());
    const stMatch = statusFilter === "الكل" || r.status === statusFilter;
    const cMatch = categoryFilter === "الكل" || r.category === categoryFilter;
    const nMatch = nameFilter === "الكل" || r.partName === nameFilter;
    return sMatch && stMatch && cMatch && nMatch;
  });

  const totalStockValue = filteredData.reduce((sum, item) => sum + (safeNum(item.quantity) * safeNum(item.unitPrice)), 0);
  const lowStockCount = filteredData.filter(r => safeNum(r.quantity) <= safeNum(r.minimumQuantity)).length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...editing, quantity: safeNum(editing.quantity), minimumQuantity: safeNum(editing.minimumQuantity), unitPrice: safeNum(editing.unitPrice) };
      const res = await fetch(isEdit ? `/api/spare-parts/${editing.id}` : "/api/spare-parts", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setModalOpen(false); load(); }
    } catch { alert("خطأ اتصال"); } finally { setSaving(false); }
  };
  const handleDelete = async (id: number) => { if (confirm("حذف؟")) { await fetch(`/api/spare-parts/${id}`, { method: "DELETE" }); load(); } };

  return (
    <div className="w-full space-y-6" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg"><div className="text-xs mb-1">أصناف قطع الغيار</div><div className="text-3xl font-black">{filteredData.length}</div></div>
        <div className="bg-gradient-to-br from-sky-600 to-cyan-500 text-white rounded-2xl p-5 shadow-lg"><div className="text-xs mb-1">قيمة المخزون</div><div className="text-3xl font-black">{totalStockValue.toLocaleString()} <span className="text-sm">ج.م</span></div></div>
        <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg"><div className="text-xs mb-1">أصناف النواقص</div><div className="text-3xl font-black">{lowStockCount}</div></div>
      </div>

      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-100 text-orange-500 rounded-xl"><Package/></div><h1 className="text-xl font-black">مخزون قطع الغيار</h1></div>
        <div className="flex items-center gap-3">
          <ImportExcelButton templateColumns={["اسم القطعة", "الكمية"]} templateFileName="القطع" mapRow={() => null} onImport={async () => {return {ok:0, failed:0}}} />
          <ExportExcelButton data={filteredData} fileName="المخزون" dateColumnName="تاريخ الإنشاء" />
          {canWrite && <button onClick={() => {setEditing({}); setIsEdit(false); setModalOpen(true);}} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold"><Plus size={18}/>إضافة</button>}
        </div>
      </div>

      {/* ✅ فلاتر سريعة للقطع */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
        <div><label className="block text-xs font-bold mb-1">بحث بالرقم</label><input type="text" value={search} onChange={e=>setSearch(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none" placeholder="رقم القطعة..."/></div>
        <div><label className="block text-xs font-bold mb-1">اسم القطعة</label><select value={nameFilter} onChange={e=>setNameFilter(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none"><option value="الكل">الكل</option>{[...new Set(data.map(d=>d.partName).filter(Boolean))].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
        <div><label className="block text-xs font-bold mb-1">الفئة</label><select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none"><option value="الكل">الكل</option>{[...new Set(data.map(d=>d.category).filter(Boolean))].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
        <div><label className="block text-xs font-bold mb-1">الحالة</label><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none"><option value="الكل">الكل</option><option value="available">متوفر</option><option value="low">مخزون منخفض</option><option value="out_of_stock">نفذ</option></select></div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <DataTable columns={[
          { key: "partName", header: "اسم القطعة", render: (r:any) => <div className="font-bold text-blue-900">{r.partName} {safeNum(r.quantity) <= safeNum(r.minimumQuantity) && <AlertTriangle size={14} className="inline text-amber-500"/>}</div> },
          { key: "category", header: "الفئة", render: (r:any) => <span className="px-2 py-1 bg-gray-200 rounded text-xs font-bold">{r.category}</span> },
          { key: "quantity", header: "الكمية", render: (r:any) => <span className={`font-bold ${safeNum(r.quantity) <= safeNum(r.minimumQuantity) ? 'text-red-600' : ''}`}>{safeNum(r.quantity)}</span> },
          { key: "unitPrice", header: "السعر", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.unitPrice).toLocaleString()} ج.م</span> },
          { key: "status", header: "الحالة", render: (r:any) => <StatusBadge status={r.status} /> },
        ]} data={filteredData} loading={loading} onEdit={canWrite ? r => {setEditing(r); setIsEdit(true); setModalOpen(true);} : undefined} onDelete={user?.role === "admin" ? r => handleDelete(r.id) : undefined} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="قطعة غيار" size="md">
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
           <Field label="اسم القطعة"><input required className={inputClass} value={editing.partName||""} onChange={e=>setEditing({...editing, partName: e.target.value})} /></Field>
           <Field label="رقم القطعة"><input className={inputClass} value={editing.partNumber||""} onChange={e=>setEditing({...editing, partNumber: e.target.value})} /></Field>
           <Field label="الكمية"><input type="number" className={inputClass} value={editing.quantity||""} onChange={e=>setEditing({...editing, quantity: safeNum(e.target.value)})} /></Field>
           <Field label="السعر"><input type="number" step="0.01" className={inputClass} value={editing.unitPrice||""} onChange={e=>setEditing({...editing, unitPrice: safeNum(e.target.value)})} /></Field>
           <button type="submit" disabled={saving} className="col-span-2 py-3 bg-blue-900 text-white rounded-xl font-bold">{saving ? "جاري الحفظ..." : "حفظ"}</button>
        </form>
      </Modal>
    </div>
  );
}
