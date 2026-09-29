"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import { 
  Droplet, AlertTriangle, Plus, Search, CheckCircle2, XCircle, Save, X, Loader2, DollarSign, Wrench, Trash2 
} from "lucide-react";

interface OilChange {
  id: number; vehicleId: number; plateNumber: string; changeDate: string;
  kmAtChange: number; oilType: string; oilBrand: string; filterChanged: boolean | number;
  airFilterChanged: boolean | number; fuelFilterChanged: boolean | number;
  nextChangeKm: number; nextChangeDate: string; alertKmBefore: number; alertDaysBefore: number;
  cost: number | string; technician: string; notes: string; createdAt: string;
  kmAlert?: boolean; dayAlert?: boolean; currentKm?: number;
}

interface Vehicle { id: number; plateNumber: string; currentKm: number; }

const emptyChange: Partial<OilChange> = {
  plateNumber: "", changeDate: new Date().toISOString().slice(0, 10), kmAtChange: 0,
  oilType: "5W30", oilBrand: "", filterChanged: true, airFilterChanged: false, fuelFilterChanged: false,
  nextChangeKm: 0, nextChangeDate: "", alertKmBefore: 500, alertDaysBefore: 7, cost: 0, technician: "", notes: ""
};

const TEMPLATE_COLUMNS = [
  "رقم اللوحة", "تاريخ التغيير", "العداد وقت التغيير", "نوع الزيت", "ماركة الزيت", 
  "فلتر زيت", "فلتر هواء", "فلتر وقود", "التغيير القادم (كم)", "تاريخ التغيير القادم", "التكلفة", "الفني", "ملاحظات"
];

const safeNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : num;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>{children}</div>
);
const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function OilChangesPage() {
  const { lang, user } = useApp();
  const t = translations[lang] || translations["ar"];
  const [data, setData] = useState<OilChange[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<OilChange>>(emptyChange);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("الكل");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("oil-changes:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (vehicleFilter && vehicleFilter !== "الكل") params.set("vehicleId", vehicleFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/oil-changes?${params}`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [vehicleFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, []);

  const filteredData = data.filter(r => {
    const matchSearch = (r.plateNumber || "").toLowerCase().includes(search.toLowerCase()) || (r.technician || "").toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const totalCost = filteredData.reduce((sum, r) => sum + safeNum(r.cost), 0);
  const alertCount = filteredData.filter(r => r.kmAlert || r.dayAlert).length;

  const mapRow = (row: Record<string, any>) => {
    const plate = row["رقم اللوحة"] || row["plateNumber"] || "";
    if (!String(plate).trim()) return null;
    const cDate = row["تاريخ التغيير"] ? new Date(row["تاريخ التغيير"]) : null;
    const nDate = row["تاريخ التغيير القادم"] ? new Date(row["تاريخ التغيير القادم"]) : null;
    return {
      plateNumber: String(plate).trim(),
      changeDate: cDate && !isNaN(cDate.getTime()) ? cDate.toISOString().slice(0, 10) : null,
      kmAtChange: safeNum(row["العداد وقت التغيير"]),
      oilType: row["نوع الزيت"] || "5W30",
      oilBrand: row["ماركة الزيت"] || "",
      filterChanged: (row["فلتر زيت"] === "نعم" || row["فلتر زيت"] === "تم التغيير") ? 1 : 0,
      airFilterChanged: (row["فلتر هواء"] === "نعم" || row["فلتر هواء"] === "تم التغيير") ? 1 : 0,
      fuelFilterChanged: (row["فلتر وقود"] === "نعم" || row["فلتر وقود"] === "تم التغيير") ? 1 : 0,
      nextChangeKm: safeNum(row["التغيير القادم (كم)"]),
      nextChangeDate: nDate && !isNaN(nDate.getTime()) ? nDate.toISOString().slice(0, 10) : null,
      cost: safeNum(row["التكلفة"]),
      technician: row["الفني"] || "",
      notes: row["ملاحظات"] || "",
    };
  };

  const handleImport = async (rows: any[], mode: "append" | "upsert") => {
    let ok = 0; let failed = 0;
    for (const payload of rows) {
      try {
        const v = vehicles.find(x => x.plateNumber === payload.plateNumber);
        const finalPayload = { ...payload, vehicleId: v?.id || null };
        const res = await fetch("/api/oil-changes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(finalPayload) });
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
      const payload = {
        ...editing, vehicleId: Number(editing.vehicleId) || null, kmAtChange: safeNum(editing.kmAtChange), nextChangeKm: safeNum(editing.nextChangeKm), cost: safeNum(editing.cost),
        filterChanged: editing.filterChanged ? 1 : 0, airFilterChanged: editing.airFilterChanged ? 1 : 0, fuelFilterChanged: editing.fuelFilterChanged ? 1 : 0,
        changeDate: editing.changeDate && String(editing.changeDate).trim() !== "" ? editing.changeDate : null, nextChangeDate: editing.nextChangeDate && String(editing.nextChangeDate).trim() !== "" ? editing.nextChangeDate : null,
      };
      const res = await fetch(isEdit ? `/api/oil-changes/${editing.id}` : "/api/oil-changes", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setModalOpen(false); load(); } else { alert("حدث خطأ أثناء حفظ السجل"); }
    } catch (error) { alert("تعذر الاتصال بالخادم."); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) return;
    await fetch(`/api/oil-changes/${id}`, { method: "DELETE" }); load();
  };

  const excelData = filteredData.map((r) => ({
    "رقم اللوحة": r.plateNumber, "تاريخ التغيير": r.changeDate, "العداد وقت التغيير": safeNum(r.kmAtChange), "نوع الزيت": r.oilType, "ماركة الزيت": r.oilBrand,
    "فلتر زيت": r.filterChanged ? "نعم" : "لا", "فلتر هواء": r.airFilterChanged ? "نعم" : "لا", "فلتر وقود": r.fuelFilterChanged ? "نعم" : "لا",
    "التغيير القادم (كم)": safeNum(r.nextChangeKm), "تاريخ التغيير القادم": r.nextChangeDate, "التكلفة (ج.م)": safeNum(r.cost), "الفني": r.technician, "ملاحظات": r.notes,
  }));

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

  const columns = [
    { key: "plateNumber", header: "اللوحة", render: (r: OilChange) => <div className="flex items-center gap-2"><span className="font-bold text-blue-900">{r.plateNumber}</span>{(r.kmAlert || r.dayAlert) && <AlertTriangle size={15} className="text-red-500 animate-pulse" title="متأخر"/>}</div> },
    { key: "changeDate", header: "التاريخ", render: (r: OilChange) => formatDate(r.changeDate) },
    { key: "kmAtChange", header: "العداد", render: (r: OilChange) => `${safeNum(r.kmAtChange).toLocaleString()} كم` },
    { key: "oilType", header: "الزيت", render: (r: OilChange) => <span className="font-semibold">{r.oilType} <span className="text-xs text-gray-500 block">{r.oilBrand}</span></span> },
    { key: "filterChanged", header: "الفلتر", render: (r: OilChange) => (r.filterChanged === 1 || r.filterChanged === true) ? <CheckCircle2 size={18} className="text-emerald-500 mx-auto"/> : <XCircle size={18} className="text-gray-300 mx-auto"/> },
    { key: "nextChangeKm", header: "القادم", render: (r: OilChange) => <div><div className={`font-bold ${r.kmAlert ? "text-red-600" : "text-gray-800"}`}>{safeNum(r.nextChangeKm).toLocaleString()} كم</div><div className="text-xs text-gray-500">الحالي: {safeNum(r.currentKm).toLocaleString()}</div></div> },
    { key: "cost", header: "التكلفة", render: (r: OilChange) => <span className="font-bold text-emerald-600">{safeNum(r.cost).toLocaleString()} ج.م</span> },
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-blue-200 text-xs font-bold mb-1">إجمالي التكلفة</div><div className="text-3xl font-black">{totalCost.toLocaleString()} <span className="text-sm">ج.م</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><DollarSign size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-red-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-red-100 text-xs font-bold mb-1">تنبيهات عاجلة (متأخر)</div><div className="text-3xl font-black">{alertCount} <span className="text-sm">سيارة</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><AlertTriangle size={22} /></div></div></div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Droplet size={24} /></div><div><h1 className="text-xl font-black text-gray-900">سجلات تغيير الزيوت والفلاتر</h1><p className="text-sm text-gray-500 mt-0.5">إجمالي {filteredData.length} سجل</p></div></div>
        <div className="flex items-center gap-3 flex-wrap">
          <ImportExcelButton templateColumns={TEMPLATE_COLUMNS} templateFileName="قالب_الزيوت" mapRow={mapRow} onImport={handleImport} buttonText="استيراد" />
          <ExportExcelButton data={excelData} fileName="سجلات_الزيوت" dateColumnName="تاريخ التغيير" />
          {canWrite && <button onClick={() => {setEditing(emptyChange); setIsEdit(false); setModalOpen(true);}} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md"><Plus size={18} /><span>إضافة سجل</span></button>}
        </div>
      </div>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2"><label className="text-xs text-gray-500">بحث:</label><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باللوحة..." className="border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 w-32" /></div>
        <div className="flex items-center gap-2"><label className="text-xs text-gray-500">تصفية بالسيارة:</label><select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs outline-none"><option value="الكل">الكل</option>{vehicles.map(v => <option key={v.id} value={String(v.id)}>{v.plateNumber}</option>)}</select></div>
      </FilterBar>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        {loading ? <div className="p-12 flex justify-center text-blue-800"><Loader2 className="animate-spin" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
                <tr><th className="p-4 border-l border-blue-600/50">اللوحة</th><th className="p-4 border-l border-blue-600/50">التاريخ</th><th className="p-4 border-l border-blue-600/50">العداد</th><th className="p-4 border-l border-blue-600/50">الزيت</th><th className="p-4 border-l border-blue-600/50 text-center">الفلتر</th><th className="p-4 border-l border-blue-600/50">القادم</th><th className="p-4 border-l border-blue-600/50">التكلفة</th><th className="p-4 text-center">الإجراءات</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.map((r, i) => (
                  <tr key={r.id} className={`hover:bg-blue-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    {columns.map(col => <td key={col.key} className="p-4 border-l border-gray-100">{col.render ? col.render(r) : (r as any)[col.key]}</td>)}
                    <td className="p-4 text-center flex justify-center gap-2">
                      <button onClick={() => {setEditing(r); setIsEdit(true); setModalOpen(true);}} className="p-1.5 bg-blue-100 text-blue-700 rounded-lg"><Wrench size={16}/></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 bg-red-100 text-red-700 rounded-lg"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? "تعديل سجل الزيت" : "إضافة سجل زيت"} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="رقم اللوحة *"><select required className={inputClass} value={editing.plateNumber || ""} onChange={e => {const v = vehicles.find(x => x.plateNumber === e.target.value); setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id, kmAtChange: v?.currentKm || 0, nextChangeKm: (v?.currentKm || 0) + 5000});}}><option value="">-- اختر السيارة --</option>{vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}</select></Field>
            <Field label="تاريخ التغيير"><input type="date" className={inputClass} value={editing.changeDate || ""} onChange={e => setEditing({...editing, changeDate: e.target.value})} /></Field>
            <Field label="العداد وقت التغيير (كم) *"><input type="number" required className={inputClass} value={editing.kmAtChange || ""} onChange={e => {const km = safeNum(e.target.value); setEditing({...editing, kmAtChange: km, nextChangeKm: km + 5000});}} /></Field>
            <Field label="التغيير القادم عند عداد (كم)"><input type="number" className={inputClass} value={editing.nextChangeKm || ""} onChange={e => setEditing({...editing, nextChangeKm: safeNum(e.target.value)})} /></Field>
            <Field label="نوع الزيت"><select className={inputClass} value={editing.oilType || "5W30"} onChange={e => setEditing({...editing, oilType: e.target.value})}><option value="5W30">5W30</option><option value="10W40">10W40</option><option value="20W50">20W50</option></select></Field>
            <Field label="ماركة الزيت"><input className={inputClass} value={editing.oilBrand || ""} onChange={e => setEditing({...editing, oilBrand: e.target.value})} /></Field>
            <Field label="إجمالي التكلفة (ج.م)"><input type="number" step="0.01" className={inputClass} value={editing.cost || ""} onChange={e => setEditing({...editing, cost: safeNum(e.target.value)})} /></Field>
            <div className="col-span-2 flex flex-wrap gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.filterChanged} onChange={e => setEditing({...editing, filterChanged: e.target.checked})} className="w-4 h-4 accent-orange-500" /><span className="text-sm font-bold text-gray-700">تغيير فلتر الزيت</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.airFilterChanged} onChange={e => setEditing({...editing, airFilterChanged: e.target.checked})} className="w-4 h-4 accent-orange-500" /><span className="text-sm font-bold text-gray-700">تغيير فلتر الهواء</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.fuelFilterChanged} onChange={e => setEditing({...editing, fuelFilterChanged: e.target.checked})} className="w-4 h-4 accent-orange-500" /><span className="text-sm font-bold text-gray-700">تغيير فلتر الوقود</span></label>
            </div>
            <div className="col-span-2"><Field label="ملاحظات"><textarea className={inputClass} rows={2} value={editing.notes || ""} onChange={e => setEditing({...editing, notes: e.target.value})} /></Field></div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-700">إلغاء</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl flex justify-center items-center gap-2">{saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} حفظ</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
