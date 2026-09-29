"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import { Fuel, DollarSign, Droplets, Search, Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";

const safeNum = (val: any) => { const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const Field = ({ label, children }: any) => (<div><label className="block text-xs font-bold text-gray-700 mb-1.5">{label}</label>{children}</div>);
const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-orange-500/50 outline-none";

export default function FuelPage() {
  const { user } = useApp();
  const [data, setData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>({});
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [search, setSearch] = useState("");
  const [driverFilter, setDriverFilter] = useState("الكل");
  const [stationFilter, setStationFilter] = useState("الكل");
  // ✅ فلاتر التاريخ الجديدة
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("fuel:write");

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch("/api/fuel"); const d = await res.json(); setData(Array.isArray(d) ? d : []); } 
    catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, [load]);

  // ⚡ فلترة حية وسريعة جداً ⚡
  const filteredData = data.filter(r => {
    const sMatch = (r.plateNumber || "").includes(search) || (r.driverName || "").includes(search);
    const dMatch = driverFilter === "الكل" || r.driverName === driverFilter;
    const stMatch = stationFilter === "الكل" || r.station === stationFilter;
    
    // فلترة التاريخ
    let dateMatch = true;
    if (dateFrom || dateTo) {
      const rowDate = new Date(r.fuelDate).getTime();
      const start = dateFrom ? new Date(dateFrom).getTime() : 0;
      const end = dateTo ? new Date(dateTo).getTime() + 86399999 : Infinity;
      dateMatch = rowDate >= start && rowDate <= end;
    }
    return sMatch && dMatch && stMatch && dateMatch;
  });

  const totalCost = filteredData.reduce((acc, row) => acc + safeNum(row.totalCost), 0);
  const totalLiters = filteredData.reduce((acc, row) => acc + safeNum(row.liters), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...editing, vehicleId: Number(editing.vehicleId) || null, liters: safeNum(editing.liters), costPerLiter: safeNum(editing.costPerLiter), totalCost: safeNum(editing.totalCost), odometer: Number(editing.odometer) || 0, fuelDate: editing.fuelDate || null };
      const res = await fetch(isEdit ? `/api/fuel/${editing.id}` : "/api/fuel", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setModalOpen(false); load(); } else { alert("خطأ بالحفظ"); }
    } catch { alert("خطأ اتصال"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => { if (confirm("حذف؟")) { await fetch(`/api/fuel/${id}`, { method: "DELETE" }); load(); } };

  return (
    <div className="w-full space-y-6" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg"><div className="text-xs mb-1">إجمالي تكلفة الوقود</div><div className="text-3xl font-black">{totalCost.toLocaleString()} <span className="text-sm">ج.م</span></div></div>
        <div className="bg-gradient-to-br from-sky-600 to-cyan-500 text-white rounded-2xl p-5 shadow-lg"><div className="text-xs mb-1">إجمالي اللترات</div><div className="text-3xl font-black">{totalLiters.toLocaleString()} <span className="text-sm">L</span></div></div>
      </div>

      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-100 text-orange-500 rounded-xl"><Fuel/></div><h1 className="text-xl font-black">سجلات الوقود</h1></div>
        <div className="flex items-center gap-3">
          <ImportExcelButton templateColumns={["رقم اللوحة", "اسم السائق", "اللترات", "سعر اللتر", "العداد", "المحطة", "تاريخ التزود"]} templateFileName="الوقود" mapRow={() => null} onImport={async () => {return {ok:0, failed:0}}} />
          <ExportExcelButton data={filteredData} fileName="الوقود" dateColumnName="تاريخ التزود" />
          {canWrite && <button onClick={() => {setEditing({}); setIsEdit(false); setModalOpen(true);}} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold shadow-md"><Plus size={18}/>إضافة</button>}
        </div>
      </div>

      {/* ✅ الفلاتر الجديدة السريعة */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="col-span-2 md:col-span-1"><label className="block text-xs font-bold mb-1">بحث</label><input type="text" value={search} onChange={e=>setSearch(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none" placeholder="اللوحة..."/></div>
        <div><label className="block text-xs font-bold mb-1">السائق</label><select value={driverFilter} onChange={e=>setDriverFilter(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none"><option value="الكل">الكل</option>{[...new Set(data.map(d=>d.driverName).filter(Boolean))].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
        <div><label className="block text-xs font-bold mb-1">المحطة</label><select value={stationFilter} onChange={e=>setStationFilter(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none"><option value="الكل">الكل</option>{[...new Set(data.map(d=>d.station).filter(Boolean))].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
        <div><label className="block text-xs font-bold mb-1">من تاريخ</label><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none" /></div>
        <div><label className="block text-xs font-bold mb-1">إلى تاريخ</label><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none" /></div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <DataTable columns={[
          { key: "plateNumber", header: "اللوحة", render: (r:any) => <span className="font-bold text-blue-900">{r.plateNumber}</span> },
          { key: "driverName", header: "السائق" }, { key: "station", header: "المحطة" },
          { key: "liters", header: "اللترات", render: (r:any) => <span className="font-bold text-sky-600">{r.liters} L</span> },
          { key: "costPerLiter", header: "السعر", render: (r:any) => `${r.costPerLiter} ج` },
          { key: "totalCost", header: "الإجمالي", render: (r:any) => <span className="font-bold text-emerald-600">{r.totalCost} ج.م</span> },
          { key: "fuelDate", header: "التاريخ", render: (r:any) => r.fuelDate ? new Date(r.fuelDate).toLocaleDateString("en-GB") : "-" },
        ]} data={filteredData} loading={loading} onEdit={canWrite ? r => {setEditing(r); setIsEdit(true); setModalOpen(true);} : undefined} onDelete={user?.role === "admin" ? r => handleDelete(r.id) : undefined} />
      </div>
      
      {/* ... (Modal stays the same) ... */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="سجل الوقود" size="lg">
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
           {/* نفس الحقول التي لديك */}
           <Field label="السيارة"><select required className={inputClass} value={editing.plateNumber||""} onChange={e=>{const v = vehicles.find(x=>x.plateNumber===e.target.value); setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id, driverName: v?.driverName});}}><option value="">--اختر--</option>{vehicles.map(v=><option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}</select></Field>
           <Field label="اللترات"><input type="number" step="0.01" className={inputClass} value={editing.liters||""} onChange={e=>{const l = safeNum(e.target.value); setEditing({...editing, liters: l, totalCost: l * safeNum(editing.costPerLiter)});}} /></Field>
           <Field label="سعر اللتر"><input type="number" step="0.01" className={inputClass} value={editing.costPerLiter||""} onChange={e=>{const c = safeNum(e.target.value); setEditing({...editing, costPerLiter: c, totalCost: c * safeNum(editing.liters)});}} /></Field>
           <Field label="الإجمالي"><input disabled className={`${inputClass} bg-gray-100`} value={editing.totalCost||""}/></Field>
           <Field label="العداد (كم)"><input type="number" required className={inputClass} value={editing.odometer||""} onChange={e=>setEditing({...editing, odometer: safeNum(e.target.value)})} /></Field>
           <Field label="التاريخ"><input type="date" className={inputClass} value={editing.fuelDate||""} onChange={e=>setEditing({...editing, fuelDate: e.target.value})} /></Field>
           <button type="submit" disabled={saving} className="col-span-2 py-3 bg-blue-900 text-white rounded-xl font-bold">{saving ? "جاري الحفظ..." : "حفظ"}</button>
        </form>
      </Modal>
    </div>
  );
}
