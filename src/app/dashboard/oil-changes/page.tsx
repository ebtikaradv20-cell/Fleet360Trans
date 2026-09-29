"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import StatusBadge from "@/components/ui/StatusBadge";
import { 
  Droplet, AlertTriangle, Plus, Search, CheckCircle2, XCircle, Save, X, Loader2, DollarSign, Wrench, Trash2, Box, Package
} from "lucide-react";

// --- Helpers ---
const safeNum = (val: any) => { const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const Field = ({ label, children }: any) => (<div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>{children}</div>);
const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50";
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

export default function OilsAndPartsPage() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<"oils" | "parts">("oils");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canWrite = user?.role === "admin" || user?.permissions?.includes("oil-changes:write");

  // --- States for Oils ---
  const [oilsData, setOilsData] = useState<any[]>([]);
  const [oilModal, setOilModal] = useState(false);
  const [editOil, setEditOil] = useState<any>({});
  const [oilLifespan, setOilLifespan] = useState<number>(5000);
  const [oilSearch, setOilSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("الكل");

  // --- States for Parts ---
  const [partsData, setPartsData] = useState<any[]>([]);
  const [partModal, setPartModal] = useState(false);
  const [editPart, setEditPart] = useState<any>({});
  const [partSearch, setPartSearch] = useState("");
  const [catFilter, setCatFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, pRes] = await Promise.all([fetch(`/api/oil-changes`), fetch(`/api/spare-parts`)]);
      const oData = await oRes.json();
      const pData = await pRes.json();
      setOilsData(Array.isArray(oData) ? oData : []);
      setPartsData(Array.isArray(pData) ? pData : []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, [loadData]);

  // --- Filtered Data ---
  const filteredOils = oilsData.filter(r => (r.plateNumber || "").toLowerCase().includes(oilSearch.toLowerCase()) && (vehicleFilter === "الكل" || r.plateNumber === vehicleFilter));
  const filteredParts = partsData.filter(r => (r.partName || "").toLowerCase().includes(partSearch.toLowerCase()) && (catFilter === "الكل" || r.category === catFilter) && (statusFilter === "الكل" || r.status === statusFilter));

  const totalOilCost = filteredOils.reduce((sum, r) => sum + safeNum(r.cost), 0);
  const oilAlertCount = filteredOils.filter(r => r.kmAlert || r.dayAlert).length;
  
  const totalStockValue = filteredParts.reduce((sum, r) => sum + (safeNum(r.quantity) * safeNum(r.unitPrice)), 0);
  const lowStockCount = filteredParts.filter(r => safeNum(r.quantity) <= safeNum(r.minimumQuantity)).length;

  // --- Save Handlers ---
  const handleSaveOil = async (e: React.FormEvent) => {
    e.preventDefault(); if (saving) return; setSaving(true);
    try {
      const p = { ...editOil, kmAtChange: safeNum(editOil.kmAtChange), nextChangeKm: safeNum(editOil.nextChangeKm), cost: safeNum(editOil.cost), filterChanged: editOil.filterChanged ? 1 : 0, airFilterChanged: editOil.airFilterChanged ? 1 : 0, fuelFilterChanged: editOil.fuelFilterChanged ? 1 : 0 };
      await fetch(editOil.id ? `/api/oil-changes/${editOil.id}` : "/api/oil-changes", { method: editOil.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      setOilModal(false); loadData();
    } catch { alert("خطأ بالخادم"); } finally { setSaving(false); }
  };

  const handleSavePart = async (e: React.FormEvent) => {
    e.preventDefault(); if (saving) return; setSaving(true);
    try {
      const p = { ...editPart, quantity: safeNum(editPart.quantity), minimumQuantity: safeNum(editPart.minimumQuantity), unitPrice: safeNum(editPart.unitPrice) };
      await fetch(editPart.id ? `/api/spare-parts/${editPart.id}` : "/api/spare-parts", { method: editPart.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      setPartModal(false); loadData();
    } catch { alert("خطأ بالخادم"); } finally { setSaving(false); }
  };

  const delAPI = async (type: string, id: number) => { if(confirm("حذف نهائي؟")) { await fetch(`/api/${type}/${id}`, {method: "DELETE"}); loadData(); } };

  // --- Excel Prep ---
  const oilExcel = filteredOils.map(r => ({ "اللوحة": r.plateNumber, "التاريخ": r.changeDate, "العداد": r.kmAtChange, "الزيت": r.oilType, "فلتر زيت": r.filterChanged ? "نعم":"لا", "فلتر هواء": r.airFilterChanged ? "نعم":"لا", "فلتر وقود": r.fuelFilterChanged ? "نعم":"لا", "التغيير القادم": r.nextChangeKm, "التكلفة": r.cost, "الفني": r.technician, "ملاحظات": r.notes }));
  const partExcel = filteredParts.map(r => ({ "القطعة": r.partName, "رقم القطعة": r.partNumber, "الفئة": r.category, "الكمية": r.quantity, "الحد الأدنى": r.minimumQuantity, "السعر": r.unitPrice, "المورد": r.supplier, "الحالة": r.status === "available" ? "متوفر" : r.status === "low" ? "منخفض" : "نفذ", "الموقع": r.location }));

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      {/* ── التبويبات العلوية المؤسسية ── */}
      <div className="flex gap-2 p-1.5 bg-white dark:bg-gray-900 rounded-2xl w-fit border border-gray-200 dark:border-gray-800 shadow-sm mx-auto sm:mx-0">
        <button onClick={() => setActiveTab("oils")} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "oils" ? "bg-blue-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"}`}><Droplet size={18} /> سجلات الزيوت والفلاتر</button>
        <button onClick={() => setActiveTab("parts")} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "parts" ? "bg-blue-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"}`}><Package size={18} /> مخزون قطع الغيار</button>
      </div>

      {activeTab === "oils" ? (
        <div className="space-y-6 fade-in">
          {oilAlertCount > 0 && <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3"><div className="p-2 bg-red-500 text-white rounded-xl"><AlertTriangle/></div><div className="font-black text-red-700">تنبيه: {oilAlertCount} سيارات تجاوزت موعد تغيير الزيت!</div></div>}
          
          <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3"><div className="p-3 bg-orange-100 text-orange-500 rounded-xl"><Droplet size={24}/></div><div><h1 className="text-xl font-black">سجلات تغيير الزيوت</h1><p className="text-sm text-gray-500">إجمالي التكلفة: {totalOilCost.toLocaleString()} ج.م</p></div></div>
            <div className="flex gap-3 flex-wrap">
              <ExportExcelButton data={oilExcel} fileName="سجلات_الزيوت" dateColumnName="التاريخ" />
              {canWrite && <button onClick={() => {setEditOil({kmAtChange:0, cost:0, oilType:"5W30", filterChanged:true}); setOilModal(true); setIsEdit(false);}} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold shadow-md"><Plus size={18}/>إضافة سجل زيت</button>}
            </div>
          </div>

          <FilterBar>
            <div className="relative"><Search size={16} className="absolute start-3 top-2.5 text-gray-400"/><input type="text" value={oilSearch} onChange={e=>setOilSearch(e.target.value)} placeholder="بحث باللوحة..." className="border rounded-xl ps-9 pe-3 py-2 text-sm outline-none w-48"/></div>
            <FilterSelect label="السيارة" value={vehicleFilter} onChange={setVehicleFilter} options={[{value:"الكل", label:"الكل"}, ...[...new Set(vehicles.map(v=>v.plateNumber))].map(x=>({value:x, label:x}))]} />
          </FilterBar>

          <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
            <DataTable columns={[
              { key: "plateNumber", header: "اللوحة", render: (r:any) => <div className="font-bold text-blue-900">{r.plateNumber} {(r.kmAlert || r.dayAlert) && <AlertTriangle size={15} className="inline text-red-500 animate-pulse"/>}</div> },
              { key: "changeDate", header: "التاريخ", render: (r:any) => formatDate(r.changeDate) },
              { key: "kmAtChange", header: "العداد", render: (r:any) => `${safeNum(r.kmAtChange).toLocaleString()} كم` },
              { key: "oilType", header: "الزيت", render: (r:any) => <span className="font-bold">{r.oilType}</span> },
              { key: "filters", header: "الفلاتر المُستبدلة", render: (r:any) => (
                <div className="flex flex-col items-center gap-1 text-[9px] font-bold">
                  {r.filterChanged ? <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">زيت</span> : null}
                  {r.airFilterChanged ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">هواء</span> : null}
                  {r.fuelFilterChanged ? <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">وقود</span> : null}
                </div>
              )},
              { key: "nextChangeKm", header: "القادم", render: (r:any) => <div className={`font-bold ${r.kmAlert ? "text-red-600" : "text-gray-800"}`}>{safeNum(r.nextChangeKm).toLocaleString()} كم</div> },
              { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.cost).toLocaleString()} ج.م</span> },
            ]} data={filteredOils} loading={loading} onEdit={canWrite ? r => {setEditOil(r); setIsEdit(true); setOilModal(true);} : undefined} onDelete={user?.role === "admin" ? r => delAPI("oil-changes", r.id) : undefined} />
          </div>
        </div>
      ) : (
        <div className="space-y-6 fade-in">
          <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3"><div className="p-3 bg-orange-100 text-orange-500 rounded-xl"><Package size={24}/></div><div><h1 className="text-xl font-black">مخزون قطع الغيار</h1><p className="text-sm text-gray-500">قيمة المخزون: {totalStockValue.toLocaleString()} ج.م | نواقص: {lowStockCount}</p></div></div>
            <div className="flex gap-3 flex-wrap">
              <ImportExcelButton templateColumns={["اسم القطعة", "الفئة", "الكمية المتاحة", "السعر"]} templateFileName="قطع_الغيار" mapRow={() => null} onImport={async () => ({ok:0, failed:0})} />
              <ExportExcelButton data={partExcel} fileName="مخزون_القطع" />
              {canWrite && <button onClick={() => {setEditPart({quantity:0, unitPrice:0}); setPartModal(true); setIsEdit(false);}} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold shadow-md"><Plus size={18}/>إضافة قطعة</button>}
            </div>
          </div>

          <FilterBar>
            <div className="relative"><Search size={16} className="absolute start-3 top-2.5 text-gray-400"/><input type="text" value={partSearch} onChange={e=>setPartSearch(e.target.value)} placeholder="بحث باسم القطعة..." className="border rounded-xl ps-9 pe-3 py-2 text-sm outline-none w-48"/></div>
            <FilterSelect label="الفئة" value={catFilter} onChange={setCatFilter} options={[{value:"الكل", label:"الكل"}, ...[...new Set(partsData.map(c=>c.category).filter(Boolean))].map(x=>({value:x, label:x}))]} />
            <FilterSelect label="الحالة" value={statusFilter} onChange={setStatusFilter} options={[{value:"الكل", label:"الكل"}, {value:"available", label:"متوفر"}, {value:"low", label:"منخفض"}, {value:"out_of_stock", label:"نفذ"}]} />
          </FilterBar>

          <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
            <DataTable columns={[
              { key: "partName", header: "القطعة", render: (r:any) => <div className="font-bold text-blue-900">{r.partName}</div> },
              { key: "category", header: "الفئة", render: (r:any) => <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold">{r.category || "-"}</span> },
              { key: "quantity", header: "الكمية", render: (r:any) => <span className={`font-bold ${safeNum(r.quantity) <= safeNum(r.minimumQuantity) ? 'text-red-600' : ''}`}>{safeNum(r.quantity)}</span> },
              { key: "unitPrice", header: "السعر", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.unitPrice).toLocaleString()} ج.م</span> },
              { key: "status", header: "الحالة", render: (r:any) => <StatusBadge status={r.status} /> },
            ]} data={filteredParts} loading={loading} onEdit={canWrite ? r => {setEditPart(r); setIsEdit(true); setPartModal(true);} : undefined} onDelete={user?.role === "admin" ? r => delAPI("spare-parts", r.id) : undefined} />
          </div>
        </div>
      )}

      {/* ── مودال الزيوت ── */}
      <Modal open={oilModal} onClose={() => setOilModal(false)} title={isEdit ? "تعديل الزيت" : "إضافة زيت"} size="lg">
        <form onSubmit={handleSaveOil} className="grid grid-cols-2 gap-4">
          <Field label="السيارة *"><select required className={inputClass} value={editOil.plateNumber||""} onChange={e=>{const v = vehicles.find(x=>x.plateNumber===e.target.value); setEditOil({...editOil, plateNumber: e.target.value, vehicleId: v?.id, kmAtChange: v?.currentKm || 0, nextChangeKm: (v?.currentKm || 0) + oilLifespan});}}><option value="">--اختر--</option>{vehicles.map(v=><option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}</select></Field>
          <Field label="العداد وقت التغيير (كم) *"><input type="number" required className={inputClass} value={editOil.kmAtChange||""} onChange={e=>{const km = safeNum(e.target.value); setEditOil({...editOil, kmAtChange: km, nextChangeKm: km + oilLifespan});}} /></Field>
          <Field label="عمر الزيت (للتنبيه)"><select className={inputClass} value={oilLifespan} onChange={e=>{const span = safeNum(e.target.value); setOilLifespan(span); setEditOil({...editOil, nextChangeKm: safeNum(editOil.kmAtChange) + span});}}><option value="5000">5,000 كم</option><option value="10000">10,000 كم</option></select></Field>
          <Field label="التغيير القادم"><input type="number" disabled className={`${inputClass} bg-gray-100 font-bold text-red-600`} value={editOil.nextChangeKm||""} readOnly/></Field>
          <Field label="تاريخ التغيير"><input type="date" className={inputClass} value={editOil.changeDate||""} onChange={e=>setEditOil({...editOil, changeDate: e.target.value})}/></Field>
          <Field label="التكلفة (ج.م)"><input type="number" className={inputClass} value={editOil.cost||""} onChange={e=>setEditOil({...editOil, cost: e.target.value})}/></Field>
          <div className="col-span-2 flex flex-wrap gap-4 bg-gray-50 p-3 rounded-xl border">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!editOil.filterChanged} onChange={e=>setEditOil({...editOil, filterChanged: e.target.checked})} className="w-4 h-4 accent-orange-500" /><span className="text-sm font-bold">تغيير فلتر الزيت</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!editOil.airFilterChanged} onChange={e=>setEditOil({...editOil, airFilterChanged: e.target.checked})} className="w-4 h-4 accent-orange-500" /><span className="text-sm font-bold">تغيير فلتر الهواء</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!editOil.fuelFilterChanged} onChange={e=>setEditOil({...editOil, fuelFilterChanged: e.target.checked})} className="w-4 h-4 accent-orange-500" /><span className="text-sm font-bold">تغيير فلتر الوقود</span></label>
          </div>
          <button type="submit" disabled={saving} className="col-span-2 py-3 bg-blue-900 text-white rounded-xl font-bold">{saving?"جاري الحفظ...":"حفظ"}</button>
        </form>
      </Modal>

      {/* ── مودال قطع الغيار ── */}
      <Modal open={partModal} onClose={() => setPartModal(false)} title={isEdit ? "تعديل قطعة" : "إضافة قطعة"} size="lg">
        <form onSubmit={handleSavePart} className="grid grid-cols-2 gap-4">
          <Field label="اسم القطعة *"><input required className={inputClass} value={editPart.partName||""} onChange={e=>setEditPart({...editPart, partName: e.target.value})} /></Field>
          <Field label="الفئة"><input className={inputClass} value={editPart.category||""} onChange={e=>setEditPart({...editPart, category: e.target.value})} /></Field>
          <Field label="الكمية المتاحة"><input type="number" className={inputClass} value={editPart.quantity||""} onChange={e=>setEditPart({...editPart, quantity: e.target.value})} /></Field>
          <Field label="الحد الأدنى"><input type="number" className={inputClass} value={editPart.minimumQuantity||""} onChange={e=>setEditPart({...editPart, minimumQuantity: e.target.value})} /></Field>
          <Field label="سعر الوحدة (ج.م)"><input type="number" className={inputClass} value={editPart.unitPrice||""} onChange={e=>setEditPart({...editPart, unitPrice: e.target.value})} /></Field>
          <Field label="الحالة"><select className={inputClass} value={editPart.status||"available"} onChange={e=>setEditPart({...editPart, status: e.target.value})}><option value="available">متوفر</option><option value="low">مخزون منخفض</option><option value="out_of_stock">نفذ</option></select></Field>
          <button type="submit" disabled={saving} className="col-span-2 py-3 bg-blue-900 text-white rounded-xl font-bold">{saving?"جاري الحفظ...":"حفظ"}</button>
        </form>
      </Modal>
    </div>
  );
}
