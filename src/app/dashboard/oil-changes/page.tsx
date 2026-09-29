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
  Droplet, AlertTriangle, Plus, Search, CheckCircle2, XCircle, Save, X, Loader2, DollarSign, Wrench, Trash2, Pencil 
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
  "تغيير فلتر زيت", "تغيير فلتر هواء", "تغيير فلتر وقود", "التغيير القادم (كم)", "تاريخ التغيير القادم", "التكلفة", "الفني", "ملاحظات"
];

const safeNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : num;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>{children}</div>
);
const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all";

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
  const [oilLifespan, setOilLifespan] = useState<number>(5000); // ⚡ عمر الزيت لحساب التغيير القادم
  
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("الكل");
  const [filterTypeFilter, setFilterTypeFilter] = useState("الكل");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("oil-changes:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/oil-changes`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, []);

  const filteredData = data.filter(r => {
    const sMatch = (r.plateNumber || "").toLowerCase().includes(search.toLowerCase());
    const vMatch = vehicleFilter === "الكل" || r.plateNumber === vehicleFilter;
    let fMatch = true;
    if (filterTypeFilter === "زيت") fMatch = !!r.filterChanged;
    if (filterTypeFilter === "هواء") fMatch = !!r.airFilterChanged;
    if (filterTypeFilter === "وقود") fMatch = !!r.fuelFilterChanged;
    let dateMatch = true;
    if (dateFrom || dateTo) {
      const rowDate = new Date(r.changeDate).getTime();
      const start = dateFrom ? new Date(dateFrom).getTime() : 0;
      const end = dateTo ? new Date(dateTo).getTime() + 86399999 : Infinity;
      dateMatch = rowDate >= start && rowDate <= end;
    }
    return sMatch && vMatch && fMatch && dateMatch;
  });

  const totalCost = filteredData.reduce((sum, r) => sum + safeNum(r.cost), 0);
  const alertCount = filteredData.filter(r => r.kmAlert || r.dayAlert).length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...editing, vehicleId: Number(editing.vehicleId) || null, 
        kmAtChange: safeNum(editing.kmAtChange), nextChangeKm: safeNum(editing.nextChangeKm), 
        cost: safeNum(editing.cost), alertKmBefore: 500, // ⚡ إجبار التنبيه قبل 500 كم
        filterChanged: editing.filterChanged ? 1 : 0, airFilterChanged: editing.airFilterChanged ? 1 : 0, fuelFilterChanged: editing.fuelFilterChanged ? 1 : 0,
        changeDate: editing.changeDate || null, nextChangeDate: editing.nextChangeDate || null,
      };
      const res = await fetch(isEdit ? `/api/oil-changes/${editing.id}` : "/api/oil-changes", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setModalOpen(false); load(); } else { alert("حدث خطأ أثناء الحفظ"); }
    } catch { alert("تعذر الاتصال بالخادم."); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) { await fetch(`/api/oil-changes/${id}`, { method: "DELETE" }); load(); }
  };

  const openAdd = () => { setEditing(emptyChange); setOilLifespan(5000); setIsEdit(false); setModalOpen(true); };

  const excelData = filteredData.map((r) => ({
    "رقم اللوحة": r.plateNumber, "تاريخ التغيير": r.changeDate, "العداد وقت التغيير": safeNum(r.kmAtChange), "نوع الزيت": r.oilType, "ماركة الزيت": r.oilBrand,
    "تغيير فلتر زيت": r.filterChanged ? "نعم" : "لا", "تغيير فلتر هواء": r.airFilterChanged ? "نعم" : "لا", "تغيير فلتر وقود": r.fuelFilterChanged ? "نعم" : "لا",
    "التغيير القادم (كم)": safeNum(r.nextChangeKm), "تاريخ التغيير القادم": r.nextChangeDate, "التكلفة (ج.م)": safeNum(r.cost), "الفني": r.technician, "ملاحظات": r.notes,
  }));

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      {alertCount > 0 && (
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/30 flex items-center gap-3.5"><div className="p-2.5 bg-red-500 text-white rounded-xl shadow-md"><AlertTriangle size={22} /></div><div><div className="font-black text-red-700 dark:text-red-400 text-sm">تنبيه صيانة عاجل: {alertCount} سيارات تجاوزت موعد تغيير الزيت!</div></div></div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Droplet size={24} /></div><div><h1 className="text-xl font-black text-gray-900 dark:text-white">سجلات تغيير الزيوت</h1><p className="text-sm text-gray-500 mt-0.5">إجمالي {filteredData.length} سجل | التكلفة: {totalCost.toLocaleString()} ج.م</p></div></div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportExcelButton data={excelData} fileName="سجلات_الزيوت" dateColumnName="تاريخ التغيير" />
          {canWrite && <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md"><Plus size={18} /><span>إضافة سجل زيت</span></button>}
        </div>
      </div>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2"><label className="text-xs font-bold text-gray-500">بحث باللوحة:</label><input type="text" value={search} onChange={e => setSearch(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 w-32 dark:bg-gray-800 dark:text-white dark:border-gray-700" /></div>
        <FilterSelect label="تصفية بالسيارة" value={vehicleFilter} onChange={setVehicleFilter} options={[{value:"الكل", label:"الكل"}, ...[...new Set(vehicles.map(v=>v.plateNumber))].map(x=>({value:x, label:x}))]} />
        <FilterSelect label="نوع الفلتر المُغيّر" value={filterTypeFilter} onChange={setFilterTypeFilter} options={[{value:"الكل", label:"الكل"}, {value:"زيت", label:"فلتر زيت"}, {value:"هواء", label:"فلتر هواء"}, {value:"وقود", label:"فلتر وقود"}]} />
      </FilterBar>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? <div className="p-12 flex justify-center text-blue-800 dark:text-blue-400"><Loader2 className="animate-spin" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-sm">
                <tr><th className="p-4 border-l border-blue-600/50">اللوحة</th><th className="p-4 border-l border-blue-600/50">التاريخ</th><th className="p-4 border-l border-blue-600/50">العداد</th><th className="p-4 border-l border-blue-600/50">الزيت</th><th className="p-4 border-l border-blue-600/50 text-center">الفلاتر المُستبدلة</th><th className="p-4 border-l border-blue-600/50">التغيير القادم</th><th className="p-4 border-l border-blue-600/50">التكلفة</th><th className="p-4 text-center">الإجراءات</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredData.map((r, i) => (
                  <tr key={r.id} className={`hover:bg-blue-50/50 dark:hover:bg-blue-950/30 ${i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/60 dark:bg-gray-800/40"}`}>
                    <td className="p-4 font-black text-blue-900 dark:text-blue-400">{r.plateNumber} {(r.kmAlert || r.dayAlert) && <AlertTriangle size={14} className="inline text-red-500 animate-pulse ms-1"/>}</td>
                    <td className="p-4 font-semibold text-gray-700 dark:text-gray-300">{formatDate(r.changeDate)}</td>
                    <td className="p-4 font-bold text-gray-800 dark:text-gray-200">{safeNum(r.kmAtChange).toLocaleString()} كم</td>
                    <td className="p-4 font-semibold text-gray-700 dark:text-gray-300">{r.oilType} <span className="text-[10px] text-gray-400 block">{r.oilBrand}</span></td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1 text-[9px] font-bold">
                        {r.filterChanged ? <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded">زيت</span> : null}
                        {r.airFilterChanged ? <span className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 px-2 py-0.5 rounded">هواء</span> : null}
                        {r.fuelFilterChanged ? <span className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 px-2 py-0.5 rounded">وقود</span> : null}
                        {(!r.filterChanged && !r.airFilterChanged && !r.fuelFilterChanged) && <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="p-4"><div className={`font-bold ${r.kmAlert ? "text-red-600" : "text-gray-800 dark:text-gray-200"}`}>{safeNum(r.nextChangeKm).toLocaleString()} كم</div><div className="text-[10px] text-gray-500">الحالي: {safeNum(r.currentKm).toLocaleString()}</div></td>
                    <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">{safeNum(r.cost).toLocaleString()} ج.م</td>
                    <td className="p-4 text-center flex justify-center gap-2">
                      <button onClick={() => {setEditing(r); setIsEdit(true); setModalOpen(true);}} className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"><Pencil size={15}/></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"><Trash2 size={15}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? "تعديل سجل الزيت" : "إضافة سجل زيت جديد"} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            
            <Field label="رقم اللوحة *">
              <select required className={inputClass} value={editing.plateNumber || ""} 
                onChange={e => {
                  const v = vehicles.find(x => x.plateNumber === e.target.value); 
                  // ⚡ الترابط: جلب العداد الحالي للسيارة تلقائياً
                  setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id, kmAtChange: v?.currentKm || 0, nextChangeKm: (v?.currentKm || 0) + oilLifespan});
                }}>
                <option value="">-- اختر السيارة --</option>
                {vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber} (العداد: {v.currentKm} كم)</option>)}
              </select>
            </Field>

            <Field label="العداد وقت التغيير (كم) *">
              <input type="number" required className={inputClass} value={editing.kmAtChange || ""} 
                onChange={e => {
                  const km = safeNum(e.target.value); 
                  // ⚡ الترابط: تحديث التغيير القادم بناءً على العداد الجديد
                  setEditing({...editing, kmAtChange: km, nextChangeKm: km + oilLifespan});
                }} 
              />
            </Field>

            {/* ⚡ الترابط: حقل عمر الزيت لبرمجة التنبيه القادم */}
            <Field label="عمر الزيت (لبرمجة التنبيه)">
              <select className={inputClass} value={oilLifespan}
                onChange={e => {
                  const span = safeNum(e.target.value);
                  setOilLifespan(span);
                  setEditing({...editing, nextChangeKm: safeNum(editing.kmAtChange) + span});
                }}>
                <option value="5000">5,000 كم</option>
                <option value="10000">10,000 كم</option>
                <option value="15000">15,000 كم</option>
              </select>
            </Field>

            <Field label="التغيير القادم المتوقع (كم)">
              <input type="number" disabled className={`${inputClass} bg-gray-100 dark:bg-gray-800 font-bold text-red-600`} value={editing.nextChangeKm || ""} readOnly title="يتم حسابه تلقائياً" />
            </Field>

            <Field label="تاريخ التغيير"><input type="date" className={inputClass} value={editing.changeDate || ""} onChange={e => setEditing({...editing, changeDate: e.target.value})} /></Field>
            <Field label="نوع الزيت"><select className={inputClass} value={editing.oilType || "5W30"} onChange={e => setEditing({...editing, oilType: e.target.value})}><option value="5W30">5W30</option><option value="10W40">10W40</option><option value="20W50">20W50</option></select></Field>
            <Field label="ماركة الزيت"><input className={inputClass} value={editing.oilBrand || ""} onChange={e => setEditing({...editing, oilBrand: e.target.value})} placeholder="مثال: شيل" /></Field>
            <Field label="إجمالي التكلفة (ج.م)"><input type="number" step="0.01" className={inputClass} value={editing.cost || ""} onChange={e => setEditing({...editing, cost: safeNum(e.target.value)})} /></Field>
            
            <div className="col-span-2 flex flex-wrap gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!editing.filterChanged} onChange={e => setEditing({...editing, filterChanged: e.target.checked})} className="w-4 h-4 accent-orange-500" /><span className="text-sm font-bold text-gray-700 dark:text-gray-300">تغيير فلتر الزيت</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!editing.airFilterChanged} onChange={e => setEditing({...editing, airFilterChanged: e.target.checked})} className="w-4 h-4 accent-orange-500" /><span className="text-sm font-bold text-gray-700 dark:text-gray-300">تغيير فلتر الهواء</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!editing.fuelFilterChanged} onChange={e => setEditing({...editing, fuelFilterChanged: e.target.checked})} className="w-4 h-4 accent-orange-500" /><span className="text-sm font-bold text-gray-700 dark:text-gray-300">تغيير فلتر الوقود</span></label>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200">إلغاء</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-md">
              {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} حفظ السجل
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
