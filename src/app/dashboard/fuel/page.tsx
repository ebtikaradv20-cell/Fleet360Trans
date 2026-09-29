"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import { Fuel, DollarSign, Droplets, Search, Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";

interface FuelRecord { id: number; vehicleId: number; plateNumber: string; driverName: string; liters: number | string; costPerLiter: number | string; totalCost: number | string; odometer: number; station: string; fuelDate: string; notes: string; createdAt: string; }
interface Vehicle { id: number; plateNumber: string; driverName: string; }
const emptyRecord: Partial<FuelRecord> = { plateNumber: "", driverName: "", liters: 0, costPerLiter: 0, totalCost: 0, odometer: 0, station: "", fuelDate: new Date().toISOString().slice(0, 10), notes: "" };

const safeNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : num;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>{children}</div>
);
const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all";

export default function FuelPage() {
  const { lang, user } = useApp();
  const t = translations[lang] || translations["ar"];
  const [data, setData] = useState<FuelRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<FuelRecord>>(emptyRecord);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [stationFilter, setStationFilter] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("fuel:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fuel");
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/vehicles").then((r) => r.json()).then((d) => setVehicles(Array.isArray(d) ? d : [])); }, []);

  const filteredData = data.filter(r => {
    const matchesSearch = (r.plateNumber || "").toLowerCase().includes(search.toLowerCase()) || (r.driverName || "").toLowerCase().includes(search.toLowerCase()) || (r.station || "").toLowerCase().includes(search.toLowerCase());
    const matchesDriver = !driverFilter || r.driverName === driverFilter;
    const matchesStation = !stationFilter || r.station === stationFilter;
    return matchesSearch && matchesDriver && matchesStation;
  });

  const totalCost = filteredData.reduce((acc, row) => acc + safeNum(row.totalCost), 0);
  const totalLiters = filteredData.reduce((acc, row) => acc + safeNum(row.liters), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    try {
      setSaving(true);
      const payload = {
        ...editing, vehicleId: Number(editing.vehicleId) || null, liters: safeNum(editing.liters), costPerLiter: safeNum(editing.costPerLiter), totalCost: safeNum(editing.totalCost), odometer: Number(editing.odometer) || 0, fuelDate: editing.fuelDate && String(editing.fuelDate).trim() !== "" ? editing.fuelDate : null,
      };
      const res = await fetch(isEdit ? `/api/fuel/${editing.id}` : "/api/fuel", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.success !== false) { setModalOpen(false); load(); } 
      else { alert(resData.error || "حدث خطأ أثناء حفظ سجل الوقود"); }
    } catch (error) { alert("تعذر الاتصال بالخادم."); } finally { setSaving(false); }
  };

  const handleDelete = async (row: FuelRecord) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) return;
    try { const res = await fetch(`/api/fuel/${row.id}`, { method: "DELETE" }); if (res.ok) load(); } catch (error) { console.error(error); }
  };

  const openAdd = () => { setEditing(emptyRecord); setIsEdit(false); setModalOpen(true); };
  const openEdit = (row: FuelRecord) => { setEditing({ ...row }); setIsEdit(true); setModalOpen(true); };
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : "-";

  const excelData = filteredData.map((r) => ({
    "رقم اللوحة": r.plateNumber || "", "اسم السائق": r.driverName || "", "اللترات": safeNum(r.liters), "سعر اللتر": safeNum(r.costPerLiter), "التكلفة الإجمالية (ج.م)": safeNum(r.totalCost), "العداد (كم)": r.odometer || 0, "المحطة": r.station || "", "تاريخ التزود": r.fuelDate || "", "ملاحظات": r.notes || "",
  }));

  const columns = [
    { key: "plateNumber", header: "رقم اللوحة", render: (r: FuelRecord) => <span className="font-bold text-blue-900 dark:text-blue-400">{r.plateNumber}</span> },
    { key: "driverName", header: "اسم السائق" },
    { key: "liters", header: "اللترات", render: (r: FuelRecord) => <span className="font-bold text-sky-600 dark:text-sky-400">{safeNum(r.liters).toLocaleString()} L</span> },
    { key: "costPerLiter", header: "سعر اللتر", render: (r: FuelRecord) => `${safeNum(r.costPerLiter).toLocaleString()} ج.م` },
    { key: "totalCost", header: "التكلفة الإجمالية", render: (r: FuelRecord) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{safeNum(r.totalCost).toLocaleString()} ج.م</span> },
    { key: "odometer", header: "العداد الحالي", render: (r: FuelRecord) => `${safeNum(r.odometer).toLocaleString()} كم` },
    { key: "station", header: "المحطة" },
    { key: "fuelDate", header: "تاريخ التزود", render: (r: FuelRecord) => formatDate(r.fuelDate) },
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-blue-200 text-xs font-bold mb-1">إجمالي تكلفة الوقود</div><div className="text-3xl font-black">{totalCost.toLocaleString()} <span className="text-sm font-normal">ج.م</span></div></div><div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm"><DollarSign size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-sky-600 to-cyan-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-cyan-100 text-xs font-bold mb-1">إجمالي اللترات المستهلكة</div><div className="text-3xl font-black">{totalLiters.toLocaleString()} <span className="text-sm font-normal">L</span></div></div><div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm"><Droplets size={22} /></div></div></div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Fuel size={24} /></div><div><h1 className="text-xl font-black text-gray-900 dark:text-white">سجلات الوقود</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{filteredData.length} سجل مسجل</p></div></div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* ✅ زر التصدير الذكي هنا */}
          <ExportExcelButton data={excelData} fileName="سجلات_الوقود" dateColumnName="تاريخ التزود" />
          <div className="relative"><Search size={16} className="absolute inset-y-0 start-3 top-2.5 text-gray-400" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..." className="border border-gray-200 dark:border-gray-700 rounded-xl ps-9 pe-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 w-44" /></div>
          {canWrite && <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-bold text-sm transition-all shadow-md"><Plus size={18} /><span>إضافة سجل وقود</span></button>}
        </div>
      </div>

      <FilterBar>
        <FilterSelect label="السائق" value={driverFilter} onChange={setDriverFilter} options={[...new Set(vehicles.map(v => v.driverName).filter(Boolean))].map(d => ({ value: d, label: d }))} />
        <FilterSelect label="المحطة" value={stationFilter} onChange={setStationFilter} options={[...new Set(data.map(r => r.station).filter(Boolean))].map(s => ({ value: s, label: s }))} />
      </FilterBar>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable columns={columns} data={filteredData} loading={loading} onEdit={canWrite ? openEdit : undefined} onDelete={user?.role === "admin" ? handleDelete : undefined} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? "تعديل سجل الوقود" : "إضافة سجل وقود جديد"} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="رقم اللوحة *"><select required className={inputClass} value={editing.plateNumber || ""} onChange={(e) => { const v = vehicles.find((v) => v.plateNumber === e.target.value); setEditing({ ...editing, plateNumber: e.target.value, vehicleId: v?.id, driverName: v?.driverName || editing.driverName }); }}><option value="">-- اختر السيارة --</option>{vehicles.map((v) => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}</select></Field>
            <Field label="اسم السائق"><input className={inputClass} value={editing.driverName || ""} onChange={(e) => setEditing({ ...editing, driverName: e.target.value })} /></Field>
            <Field label="اللترات *"><input type="number" step="0.01" required className={inputClass} value={editing.liters || ""} onChange={(e) => { const liters = safeNum(e.target.value); const cpl = safeNum(editing.costPerLiter); setEditing({ ...editing, liters, totalCost: liters * cpl }); }} /></Field>
            <Field label="سعر اللتر (ج.م)"><input type="number" step="0.01" className={inputClass} value={editing.costPerLiter || ""} onChange={(e) => { const cpl = safeNum(e.target.value); const liters = safeNum(editing.liters); setEditing({ ...editing, costPerLiter: cpl, totalCost: liters * cpl }); }} /></Field>
            <Field label="التكلفة الإجمالية (ج.م)"><input type="number" className={`${inputClass} bg-gray-100 dark:bg-gray-800 cursor-not-allowed font-bold text-emerald-600`} value={editing.totalCost || ""} readOnly /></Field>
            <Field label="قراءة العداد الحالية (كم) *"><input type="number" required className={inputClass} value={editing.odometer || ""} onChange={(e) => setEditing({ ...editing, odometer: parseInt(e.target.value) || 0 })} placeholder="لتحديث العداد تلقائياً" /></Field>
            <Field label="اسم المحطة"><input className={inputClass} value={editing.station || ""} onChange={(e) => setEditing({ ...editing, station: e.target.value })} /></Field>
            <Field label="تاريخ التزود"><input type="date" className={inputClass} value={editing.fuelDate || ""} onChange={(e) => setEditing({ ...editing, fuelDate: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="ملاحظات"><textarea className={inputClass} rows={2} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field></div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 font-bold rounded-xl">إلغاء</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-900 text-white font-bold rounded-xl flex justify-center items-center gap-2">{saving ? <Loader2 className="animate-spin" size={18}/> : "حفظ سجل الوقود"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
