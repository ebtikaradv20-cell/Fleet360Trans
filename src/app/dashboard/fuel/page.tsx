"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import { Fuel, DollarSign, Droplets, Search, Plus, Pencil, Trash2, X, Loader2, Paperclip, CheckCircle2, ImageIcon } from "lucide-react";

const safeNum = (val: any) => { const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const Field = ({ label, children }: any) => (<div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>{children}</div>);
const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-teal-500/50 outline-none";

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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canWrite = user?.role === "admin" || user?.role === "super_admin" || user?.permissions?.includes("fuel:write");

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch("/api/fuel"); const d = await res.json(); setData(Array.isArray(d) ? d : []); } 
    catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, [load]);

  const filteredData = data.filter(r => {
    const sMatch = (r.plateNumber || "").includes(search) || (r.driverName || "").includes(search);
    const dMatch = driverFilter === "الكل" || r.driverName === driverFilter;
    const stMatch = stationFilter === "الكل" || r.station === stationFilter;
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

  // ✅ رفع الفاتورة كمرفق
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("الحد الأقصى 2 ميجابايت."); return; }
    const reader = new FileReader();
    reader.onload = (evt) => { setEditing({ ...editing, invoiceUrl: evt.target?.result as string }); };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...editing, vehicleId: Number(editing.vehicleId) || null, liters: safeNum(editing.liters), costPerLiter: safeNum(editing.costPerLiter), totalCost: safeNum(editing.totalCost), odometer: Number(editing.odometer) || 0, fuelDate: editing.fuelDate || null, invoiceUrl: editing.invoiceUrl || "" };
      const res = await fetch(isEdit ? `/api/fuel/${editing.id}` : "/api/fuel", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setModalOpen(false); load(); } else { alert("خطأ بالحفظ"); }
    } catch { alert("خطأ اتصال"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => { if (confirm("حذف؟")) { await fetch(`/api/fuel/${id}`, { method: "DELETE" }); load(); } };

  const excelData = filteredData.map(r => ({
    "رقم اللوحة": r.plateNumber, "اسم السائق": r.driverName, "اللترات": safeNum(r.liters),
    "سعر اللتر": safeNum(r.costPerLiter), "التكلفة (ج.م)": safeNum(r.totalCost),
    "العداد (كم)": r.odometer, "المحطة": r.station, "تاريخ التزود": r.fuelDate
  }));

  const columns = [
    { key: "plateNumber", header: "اللوحة", render: (r:any) => <span className="font-bold text-blue-900">{r.plateNumber}</span> },
    { key: "driverName", header: "السائق" }, { key: "station", header: "المحطة" },
    { key: "liters", header: "اللترات", render: (r:any) => <span className="font-bold text-sky-600">{r.liters} L</span> },
    { key: "costPerLiter", header: "السعر", render: (r:any) => `${r.costPerLiter} ج` },
    { key: "totalCost", header: "الإجمالي", render: (r:any) => <span className="font-bold text-emerald-600">{r.totalCost} ج.م</span> },
    { key: "odometer", header: "العداد", render: (r:any) => `${(r.odometer || 0).toLocaleString()} كم` },
    // ✅ عمود عرض الفاتورة
    { key: "invoiceUrl", header: "المرفقات", render: (r:any) => r.invoiceUrl ? <a href={r.invoiceUrl} target="_blank" className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100"><ImageIcon size={14} /> عرض</a> : <span className="text-gray-400">-</span> },
    { key: "fuelDate", header: "التاريخ", render: (r:any) => r.fuelDate ? new Date(r.fuelDate).toLocaleDateString("en-GB") : "-" },
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg"><div className="text-xs mb-1">إجمالي تكلفة الوقود</div><div className="text-3xl font-black">{totalCost.toLocaleString()} <span className="text-sm">ج.م</span></div></div>
        <div className="bg-gradient-to-br from-sky-600 to-cyan-500 text-white rounded-2xl p-5 shadow-lg"><div className="text-xs mb-1">إجمالي اللترات</div><div className="text-3xl font-black">{totalLiters.toLocaleString()} <span className="text-sm">L</span></div></div>
      </div>

      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3"><div className="p-3 bg-teal-100 text-teal-600 rounded-xl"><Fuel/></div><h1 className="text-xl font-black">سجلات الوقود</h1></div>
        <div className="flex items-center gap-3">
          <ImportExcelButton templateColumns={["رقم اللوحة", "اسم السائق", "اللترات", "سعر اللتر", "العداد", "المحطة", "تاريخ التزود"]} templateFileName="الوقود" mapRow={() => null} onImport={async () => {return {ok:0, failed:0}}} buttonText="استيراد" />
          <ExportExcelButton data={excelData} fileName="الوقود" dateColumnName="تاريخ التزود" />
          {canWrite && <button onClick={() => {setEditing({fuelDate: new Date().toISOString().slice(0, 10)}); setIsEdit(false); setModalOpen(true);}} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl font-bold shadow-md"><Plus size={18}/>إضافة وقود</button>}
        </div>
      </div>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2"><label className="text-xs font-bold text-gray-500">بحث:</label><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..." className="border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-teal-500 w-32" /></div>
        <FilterSelect label="السائق" value={driverFilter} onChange={setDriverFilter} options={[{value:"الكل", label:"الكل"}, ...[...new Set(data.map(d=>d.driverName).filter(Boolean))].map(x=>({value:x, label:x}))]} />
        <FilterSelect label="المحطة" value={stationFilter} onChange={setStationFilter} options={[{value:"الكل", label:"الكل"}, ...[...new Set(data.map(d=>d.station).filter(Boolean))].map(x=>({value:x, label:x}))]} />
      </FilterBar>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <DataTable columns={columns} data={filteredData} loading={loading} onEdit={canWrite ? r => {setEditing(r); setIsEdit(true); setModalOpen(true);} : undefined} onDelete={user?.role === "admin" || user?.role === "super_admin" ? r => handleDelete(r.id) : undefined} />
      </div>
      
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="سجل الوقود" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
           <div className="grid grid-cols-2 gap-4">
             <Field label="السيارة"><select required className={inputClass} value={editing.plateNumber||""} onChange={e=>{const v = vehicles.find(x=>x.plateNumber===e.target.value); setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id, driverName: v?.driverName});}}><option value="">--اختر--</option>{vehicles.map(v=><option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}</select></Field>
             <Field label="اللترات"><input type="number" step="0.01" className={inputClass} value={editing.liters||""} onChange={e=>{const l = safeNum(e.target.value); setEditing({...editing, liters: l, totalCost: l * safeNum(editing.costPerLiter)});}} /></Field>
             <Field label="سعر اللتر"><input type="number" step="0.01" className={inputClass} value={editing.costPerLiter||""} onChange={e=>{const c = safeNum(e.target.value); setEditing({...editing, costPerLiter: c, totalCost: c * safeNum(editing.liters)});}} /></Field>
             <Field label="الإجمالي"><input disabled className={`${inputClass} bg-gray-100 font-bold text-teal-600`} value={editing.totalCost||""}/></Field>
             <Field label="العداد (كم)"><input type="number" required className={inputClass} value={editing.odometer||""} onChange={e=>setEditing({...editing, odometer: safeNum(e.target.value)})} /></Field>
             <Field label="التاريخ"><input type="date" className={inputClass} value={editing.fuelDate||""} onChange={e=>setEditing({...editing, fuelDate: e.target.value})} /></Field>
             <Field label="اسم المحطة"><input className={inputClass} value={editing.station || ""} onChange={e=>setEditing({...editing, station: e.target.value})} /></Field>
             <Field label="اسم السائق"><input className={inputClass} value={editing.driverName || ""} onChange={e=>setEditing({...editing, driverName: e.target.value})} /></Field>
             
             {/* ✅ رفع فاتورة الوقود */}
             <div className="col-span-2 p-4 bg-teal-50 rounded-xl border border-teal-200 flex flex-col sm:flex-row justify-between items-center gap-4">
               <div><p className="text-sm font-bold text-teal-900">مرفق الفاتورة/البون</p><p className="text-xs text-teal-600">يمكنك تصوير بون البنزينة وإرفاقه هنا.</p></div>
               <input type="file" ref={fileInputRef} accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
               <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-teal-700">
                 <Paperclip size={16} /> {editing.invoiceUrl ? "تغيير المرفق" : "إرفاق بون/فاتورة"}
               </button>
               {editing.invoiceUrl && <span className="text-xs font-bold text-emerald-600"><CheckCircle2 size={14} className="inline"/> تم الإرفاق</span>}
             </div>
             
             <div className="col-span-2"><Field label="ملاحظات"><textarea className={inputClass} rows={2} value={editing.notes||""} onChange={e=>setEditing({...editing, notes: e.target.value})} /></Field></div>
           </div>
           <div className="flex gap-3 pt-4 border-t border-gray-100">
             <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-700 hover:bg-gray-200">إلغاء</button>
             <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl">{saving ? "جاري الحفظ..." : "حفظ سجل الوقود"}</button>
           </div>
        </form>
      </Modal>
    </div>
  );
}
