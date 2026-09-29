"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import { Droplet, AlertTriangle, Plus, Search, CheckCircle2, XCircle, Save, Loader2, DollarSign, Wrench } from "lucide-react";

const safeNum = (val: any) => { const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const Field = ({ label, children }: any) => (<div><label className="block text-xs font-bold text-gray-700 mb-1.5">{label}</label>{children}</div>);
const inputClass = "w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-orange-500/50 outline-none";

export default function OilChangesPage() {
  const { user } = useApp();
  const [data, setData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>({});
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // ✅ الفلاتر الحية للزيوت (بحث + سيارة + نوع الفلتر)
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("الكل");
  const [filterTypeFilter, setFilterTypeFilter] = useState("الكل"); 

  const canWrite = user?.role === "admin" || user?.permissions?.includes("oil-changes:write");

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch(`/api/oil-changes`); const d = await res.json(); setData(Array.isArray(d) ? d : []); } 
    catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, [load]);

  // ⚡ التصفية الحية
  const filteredData = data.filter(r => {
    const sMatch = (r.plateNumber || "").toLowerCase().includes(search.toLowerCase());
    const vMatch = vehicleFilter === "الكل" || r.plateNumber === vehicleFilter;
    
    // فلترة نوع الفلتر
    let fMatch = true;
    if (filterTypeFilter === "زيت") fMatch = r.filterChanged === 1 || r.filterChanged === true;
    if (filterTypeFilter === "هواء") fMatch = r.airFilterChanged === 1 || r.airFilterChanged === true;
    if (filterTypeFilter === "وقود") fMatch = r.fuelFilterChanged === 1 || r.fuelFilterChanged === true;

    return sMatch && vMatch && fMatch;
  });

  const totalCost = filteredData.reduce((sum, r) => sum + safeNum(r.cost), 0);
  const alertCount = filteredData.filter(r => r.kmAlert || r.dayAlert).length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...editing, vehicleId: Number(editing.vehicleId) || null, kmAtChange: safeNum(editing.kmAtChange), nextChangeKm: safeNum(editing.nextChangeKm), cost: safeNum(editing.cost), filterChanged: editing.filterChanged ? 1 : 0, airFilterChanged: editing.airFilterChanged ? 1 : 0, fuelFilterChanged: editing.fuelFilterChanged ? 1 : 0, changeDate: editing.changeDate || null, nextChangeDate: editing.nextChangeDate || null };
      const res = await fetch(isEdit ? `/api/oil-changes/${editing.id}` : "/api/oil-changes", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setModalOpen(false); load(); }
    } catch { alert("خطأ اتصال"); } finally { setSaving(false); }
  };
  const handleDelete = async (id: number) => { if (confirm("حذف؟")) { await fetch(`/api/oil-changes/${id}`, { method: "DELETE" }); load(); } };

  const excelData = filteredData.map((r) => ({
    "اللوحة": r.plateNumber, "التاريخ": r.changeDate, "العداد": safeNum(r.kmAtChange), "الزيت": r.oilType,
    "فلتر زيت": r.filterChanged ? "نعم" : "لا", "فلتر هواء": r.airFilterChanged ? "نعم" : "لا", "فلتر وقود": r.fuelFilterChanged ? "نعم" : "لا",
    "التكلفة": safeNum(r.cost)
  }));

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      {alertCount > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 flex items-center gap-3.5"><div className="p-2.5 bg-red-500 text-white rounded-xl shadow-md"><AlertTriangle size={22} /></div><div className="font-black text-red-700 text-sm">تنبيه صيانة عاجل: {alertCount} سيارات تجاوزت موعد التغيير!</div></div>
      )}

      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-100 text-orange-500 rounded-xl"><Droplet/></div><h1 className="text-xl font-black">سجلات تغيير الزيوت</h1></div>
        <div className="flex items-center gap-3">
          <ExportExcelButton data={excelData} fileName="الزيوت" dateColumnName="التاريخ" />
          {canWrite && <button onClick={() => {setEditing({}); setIsEdit(false); setModalOpen(true);}} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold"><Plus size={18}/>إضافة سجل</button>}
        </div>
      </div>

      {/* ✅ فلاتر سريعة للزيوت */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div><label className="block text-xs font-bold mb-1">تصفية بالسيارة</label><select value={vehicleFilter} onChange={e=>setVehicleFilter(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none"><option value="الكل">الكل</option>{[...new Set(vehicles.map(v=>v.plateNumber))].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
        <div><label className="block text-xs font-bold mb-1">نوع الفلتر المُغيّر</label><select value={filterTypeFilter} onChange={e=>setFilterTypeFilter(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none"><option value="الكل">الكل</option><option value="زيت">فلتر زيت</option><option value="هواء">فلتر هواء</option><option value="وقود">فلتر وقود</option></select></div>
        <div className="flex flex-col justify-center items-center bg-blue-50 rounded-xl border border-blue-100 p-2"><div className="text-xs font-bold text-blue-800">إجمالي التكلفة</div><div className="text-xl font-black text-blue-900">{totalCost.toLocaleString()} ج.م</div></div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <DataTable columns={[
          { key: "plateNumber", header: "اللوحة", render: (r:any) => <span className="font-bold text-blue-900">{r.plateNumber}</span> },
          { key: "changeDate", header: "التاريخ", render: (r:any) => r.changeDate ? new Date(r.changeDate).toLocaleDateString("en-GB") : "-" },
          { key: "kmAtChange", header: "العداد", render: (r:any) => `${safeNum(r.kmAtChange).toLocaleString()} كم` },
          { key: "oilType", header: "الزيت" },
          // ✅ إظهار نوع الفلتر بوضوح تام (شارات ملونة أسفل علامة الصح)
          { key: "filters", header: "الفلاتر المُستبدلة", render: (r:any) => (
            <div className="flex flex-col items-center gap-1 text-[10px] font-bold">
              {(r.filterChanged === 1 || r.filterChanged === true) && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">فلتر زيت</span>}
              {(r.airFilterChanged === 1 || r.airFilterChanged === true) && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">فلتر هواء</span>}
              {(r.fuelFilterChanged === 1 || r.fuelFilterChanged === true) && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">فلتر وقود</span>}
              {(!r.filterChanged && !r.airFilterChanged && !r.fuelFilterChanged) && <span className="text-gray-400">بدون فلاتر</span>}
            </div>
          )},
          { key: "nextChangeKm", header: "القادم", render: (r:any) => <div><div className={`font-bold ${r.kmAlert ? "text-red-600" : "text-gray-800"}`}>{safeNum(r.nextChangeKm).toLocaleString()} كم</div></div> },
          { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.cost).toLocaleString()} ج.م</span> },
        ]} data={filteredData} loading={loading} onEdit={canWrite ? r => {setEditing(r); setIsEdit(true); setModalOpen(true);} : undefined} onDelete={user?.role === "admin" ? r => handleDelete(r.id) : undefined} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="سجل الزيت" size="lg">
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
           {/* نفس الحقول لديك */}
           <Field label="رقم اللوحة *"><select required className={inputClass} value={editing.plateNumber||""} onChange={e=>{const v = vehicles.find(x=>x.plateNumber===e.target.value); setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id, kmAtChange: v?.currentKm || 0, nextChangeKm: (v?.currentKm || 0) + 5000});}}><option value="">--اختر--</option>{vehicles.map(v=><option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}</select></Field>
           <Field label="العداد وقت التغيير (كم) *"><input type="number" required className={inputClass} value={editing.kmAtChange||""} onChange={e=>{const km = safeNum(e.target.value); setEditing({...editing, kmAtChange: km, nextChangeKm: km + 5000});}} /></Field>
           <div className="col-span-2 flex flex-wrap gap-4 bg-gray-50 p-3 rounded-xl border">
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.filterChanged} onChange={e=>setEditing({...editing, filterChanged: e.target.checked})} className="w-4 h-4 accent-orange-500" /><span className="text-sm font-bold">تغيير فلتر الزيت</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.airFilterChanged} onChange={e=>setEditing({...editing, airFilterChanged: e.target.checked})} className="w-4 h-4 accent-orange-500" /><span className="text-sm font-bold">تغيير فلتر الهواء</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.fuelFilterChanged} onChange={e=>setEditing({...editing, fuelFilterChanged: e.target.checked})} className="w-4 h-4 accent-orange-500" /><span className="text-sm font-bold">تغيير فلتر الوقود</span></label>
           </div>
           <Field label="إجمالي التكلفة (ج.م)"><input type="number" className={inputClass} value={editing.cost||""} onChange={e=>setEditing({...editing, cost: safeNum(e.target.value)})} /></Field>
           <button type="submit" disabled={saving} className="col-span-2 py-3 bg-blue-900 text-white rounded-xl font-bold">{saving ? "جاري الحفظ..." : "حفظ البيانات"}</button>
        </form>
      </Modal>
    </div>
  );
}
