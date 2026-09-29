"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import StatusBadge from "@/components/ui/StatusBadge";
import { 
  Droplet, AlertTriangle, Plus, Search, Save, Loader2, Package, Disc 
} from "lucide-react";

const safeNum = (val: any) => { const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const Field = ({ label, children }: any) => (<div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>{children}</div>);
const inputClass = "w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50";
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

export default function OilsAndPartsPage() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<"oils" | "tires" | "parts">("oils");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [oilsData, setOilsData] = useState<any[]>([]);
  const [tiresData, setTiresData] = useState<any[]>([]);
  const [partsData, setPartsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal States
  const [modalType, setModalType] = useState<"oil" | "tire" | "part" | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isEdit, setIsEdit] = useState(false);
  const [oilLifespan, setOilLifespan] = useState(5000);
  const [tireLifespan, setTireLifespan] = useState(40000);

  const canWrite = user?.role === "admin" || user?.permissions?.includes("oil-changes:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, t, p] = await Promise.all([
        fetch("/api/oil-changes").then(r=>r.json()).catch(()=>[]),
        fetch("/api/tires").then(r=>r.json()).catch(()=>[]),
        fetch("/api/spare-parts").then(r=>r.json()).catch(()=>[]),
      ]);
      setOilsData(Array.isArray(o) ? o : []);
      setTiresData(Array.isArray(t) ? t : []);
      setPartsData(Array.isArray(p) ? p : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, [load]);

  const openModal = (type: "oil" | "tire" | "part", row?: any) => {
    setModalType(type);
    setIsEdit(!!row);
    setEditData(row || {});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      let url = ""; let payload: any = {...editData};
      if (modalType === "oil") { 
        url = "/api/oil-changes";
        payload.filterChanged = payload.filterChanged ? 1 : 0;
        payload.airFilterChanged = payload.airFilterChanged ? 1 : 0;
        payload.fuelFilterChanged = payload.fuelFilterChanged ? 1 : 0;
      }
      else if (modalType === "tire") { url = "/api/tires"; }
      else if (modalType === "part") { url = "/api/spare-parts"; }

      const method = isEdit ? "PUT" : "POST";
      const finalUrl = isEdit ? `${url}/${editData.id}` : url;

      const res = await fetch(finalUrl, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setModalType(null); load(); }
      else { const err = await res.json(); alert(err.error || "فشل الحفظ"); }
    } catch { alert("خطأ اتصال"); } finally { setSaving(false); }
  };

  const handleDelete = async (type: string, id: number) => {
    if (!confirm("حذف نهائي؟")) return;
    await fetch(`/api/${type}/${id}`, { method: "DELETE" }); load();
  };

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      {/* التبويبات */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-white dark:bg-gray-900 rounded-2xl w-full sm:w-fit border shadow-sm">
        <button onClick={() => setActiveTab("oils")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold ${activeTab === "oils" ? "bg-blue-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><Droplet size={18}/> الزيوت والفلاتر</button>
        <button onClick={() => setActiveTab("tires")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold ${activeTab === "tires" ? "bg-blue-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><Disc size={18}/> الكاوتش (الإطارات)</button>
        <button onClick={() => setActiveTab("parts")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold ${activeTab === "parts" ? "bg-blue-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}><Package size={18}/> قطع الغيار</button>
      </div>

      {/* ─── قسم الزيوت ─── */}
      {activeTab === "oils" && (
        <div className="space-y-4">
          <div className="flex justify-between bg-white p-5 rounded-2xl shadow-sm border">
            <h1 className="text-xl font-black flex items-center gap-2"><Droplet className="text-orange-500"/> سجلات الزيوت والفلاتر</h1>
            <button onClick={() => openModal("oil")} className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold shadow-md flex items-center gap-2"><Plus size={18}/> إضافة سجل زيت</button>
          </div>
          <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
            <DataTable columns={[
              { key: "plateNumber", header: "اللوحة", render: (r:any) => <span className="font-bold text-blue-900">{r.plateNumber}</span> },
              { key: "changeDate", header: "تاريخ التغيير", render: (r:any) => formatDate(r.changeDate) },
              { key: "kmAtChange", header: "العداد", render: (r:any) => `${safeNum(r.kmAtChange).toLocaleString()} كم` },
              { key: "oilType", header: "نوع الزيت" },
              { key: "nextChangeKm", header: "التغيير القادم", render: (r:any) => <span className="text-red-600 font-bold">{safeNum(r.nextChangeKm).toLocaleString()} كم</span> },
              { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.cost).toLocaleString()} ج.م</span> },
            ]} data={oilsData} loading={loading} onEdit={r => openModal("oil", r)} onDelete={r => handleDelete("oil-changes", r.id)} />
          </div>
        </div>
      )}

      {/* ─── قسم الكاوتش ─── */}
      {activeTab === "tires" && (
        <div className="space-y-4">
          <div className="flex justify-between bg-white p-5 rounded-2xl shadow-sm border">
            <h1 className="text-xl font-black flex items-center gap-2"><Disc className="text-orange-500"/> إدارة الكاوتش (الإطارات)</h1>
            <button onClick={() => openModal("tire")} className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold shadow-md flex items-center gap-2"><Plus size={18}/> إضافة كاوتش</button>
          </div>
          <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
            <DataTable columns={[
              { key: "plateNumber", header: "اللوحة", render: (r:any) => <span className="font-bold text-blue-900">{r.plateNumber || r.plate_number}</span> },
              { key: "tireBrand", header: "الماركة", render: (r:any) => r.tire_brand || r.tireBrand },
              { key: "tireSize", header: "المقاس", render: (r:any) => <span className="font-bold">{r.tire_size || r.tireSize}</span> },
              { key: "installDate", header: "تاريخ التركيب", render: (r:any) => formatDate(r.install_date || r.installDate) },
              { key: "kmAtInstall", header: "العداد وقت التركيب", render: (r:any) => `${safeNum(r.km_at_install || r.kmAtInstall).toLocaleString()} كم` },
              { key: "nextChangeKm", header: "التغيير القادم", render: (r:any) => <span className="text-red-600 font-bold">{safeNum(r.next_change_km || r.nextChangeKm).toLocaleString()} كم</span> },
              { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.cost).toLocaleString()} ج.م</span> },
            ]} data={tiresData} loading={loading} onEdit={r => openModal("tire", r)} onDelete={r => handleDelete("tires", r.id)} />
          </div>
        </div>
      )}

      {/* ─── قسم قطع الغيار ─── */}
      {activeTab === "parts" && (
        <div className="space-y-4">
          <div className="flex justify-between bg-white p-5 rounded-2xl shadow-sm border">
            <h1 className="text-xl font-black flex items-center gap-2"><Package className="text-orange-500"/> مخزون قطع الغيار</h1>
            <button onClick={() => openModal("part")} className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold shadow-md flex items-center gap-2"><Plus size={18}/> إضافة قطعة</button>
          </div>
          <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
            <DataTable columns={[
              { key: "partName", header: "اسم القطعة", render: (r:any) => <span className="font-bold text-blue-900">{r.partName}</span> },
              { key: "category", header: "الفئة" },
              { key: "quantity", header: "الكمية", render: (r:any) => <span className={`font-bold ${safeNum(r.quantity) <= safeNum(r.minimumQuantity) ? 'text-red-600' : ''}`}>{r.quantity}</span> },
              { key: "unitPrice", header: "السعر", render: (r:any) => <span className="font-bold text-emerald-600">{safeNum(r.unitPrice).toLocaleString()} ج.م</span> },
              { key: "status", header: "الحالة", render: (r:any) => <StatusBadge status={r.status} /> },
            ]} data={partsData} loading={loading} onEdit={r => openModal("part", r)} onDelete={r => handleDelete("spare-parts", r.id)} />
          </div>
        </div>
      )}

      {/* ─── مودال متعدد الاستخدامات ─── */}
      <Modal open={!!modalType} onClose={() => setModalType(null)} title={modalType === "oil" ? "سجل زيت" : modalType === "tire" ? "كاوتش" : "قطعة غيار"} size="lg">
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          
          {/* حقل السيارة يظهر للزيوت والكاوتش فقط */}
          {(modalType === "oil" || modalType === "tire") && (
            <Field label="السيارة *">
              <select required className={inputClass} value={editData.plateNumber || ""} 
                onChange={e => {
                  const v = vehicles.find(x => x.plateNumber === e.target.value);
                  const currentKm = v?.currentKm || 0;
                  if (modalType === "oil") {
                    setEditData({...editData, plateNumber: e.target.value, vehicleId: v?.id, kmAtChange: currentKm, nextChangeKm: currentKm + oilLifespan});
                  } else {
                    setEditData({...editData, plateNumber: e.target.value, vehicleId: v?.id, kmAtInstall: currentKm, nextChangeKm: currentKm + tireLifespan});
                  }
                }}>
                <option value="">-- اختر السيارة --</option>
                {vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}
              </select>
            </Field>
          )}

          {/* ─── نموذج الزيوت ─── */}
          {modalType === "oil" && <>
            <Field label="تاريخ التغيير"><input type="date" className={inputClass} value={editData.changeDate||""} onChange={e=>setEditData({...editData, changeDate: e.target.value})}/></Field>
            <Field label="العداد وقت التغيير"><input type="number" required className={inputClass} value={editData.kmAtChange||""} onChange={e=>{const km=safeNum(e.target.value); setEditData({...editData, kmAtChange:km, nextChangeKm: km + oilLifespan});}}/></Field>
            <Field label="عمر الزيت"><select className={inputClass} value={oilLifespan} onChange={e=>{const s=safeNum(e.target.value); setOilLifespan(s); setEditData({...editData, nextChangeKm: safeNum(editData.kmAtChange) + s});}}><option value="5000">5,000 كم</option><option value="10000">10,000 كم</option></select></Field>
            <Field label="نوع الزيت"><select className={inputClass} value={editData.oilType||"5W30"} onChange={e=>setEditData({...editData, oilType: e.target.value})}><option>5W30</option><option>10W40</option><option>20W50</option></select></Field>
            <Field label="التكلفة"><input type="number" className={inputClass} value={editData.cost||""} onChange={e=>setEditData({...editData, cost: e.target.value})}/></Field>
            <div className="col-span-2 flex gap-4 bg-gray-50 p-3 rounded-xl">
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editData.filterChanged} onChange={e=>setEditData({...editData, filterChanged: e.target.checked})} className="w-4 h-4"/><span className="text-sm font-bold">فلتر زيت</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editData.airFilterChanged} onChange={e=>setEditData({...editData, airFilterChanged: e.target.checked})} className="w-4 h-4"/><span className="text-sm font-bold">فلتر هواء</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editData.fuelFilterChanged} onChange={e=>setEditData({...editData, fuelFilterChanged: e.target.checked})} className="w-4 h-4"/><span className="text-sm font-bold">فلتر وقود</span></label>
            </div>
          </>}

          {/* ─── نموذج الكاوتش الجديد ─── */}
          {modalType === "tire" && <>
            <Field label="مقاس الكاوتش *"><input required className={inputClass} value={editData.tireSize || editData.tire_size ||""} onChange={e=>setEditData({...editData, tireSize: e.target.value})} placeholder="مثال: 265/65 R17"/></Field>
            <Field label="ماركة الكاوتش"><input className={inputClass} value={editData.tireBrand || editData.tire_brand ||""} onChange={e=>setEditData({...editData, tireBrand: e.target.value})} placeholder="مثال: ميشلان"/></Field>
            <Field label="تاريخ التركيب"><input type="date" className={inputClass} value={editData.installDate||editData.install_date||""} onChange={e=>setEditData({...editData, installDate: e.target.value})}/></Field>
            <Field label="العداد وقت التركيب"><input type="number" required className={inputClass} value={editData.kmAtInstall||editData.km_at_install||""} onChange={e=>{const km=safeNum(e.target.value); setEditData({...editData, kmAtInstall:km, nextChangeKm: km + tireLifespan});}}/></Field>
            <Field label="العمر الافتراضي (كم)">
              <select className={inputClass} value={tireLifespan} onChange={e=>{const s=safeNum(e.target.value); setTireLifespan(s); setEditData({...editData, lifespanKm: s, nextChangeKm: safeNum(editData.kmAtInstall) + s});}}>
                <option value="40000">40,000 كم</option>
                <option value="60000">60,000 كم</option>
                <option value="80000">80,000 كم</option>
                <option value="100000">100,000 كم</option>
              </select>
            </Field>
            <Field label="التغيير القادم (كم)"><input type="number" disabled className={`${inputClass} bg-red-50 text-red-600 font-bold`} value={editData.nextChangeKm||""} readOnly/></Field>
            <Field label="التكلفة"><input type="number" className={inputClass} value={editData.cost||""} onChange={e=>setEditData({...editData, cost: e.target.value})}/></Field>
          </>}

          {/* ─── نموذج قطع الغيار ─── */}
          {modalType === "part" && <>
            <Field label="اسم القطعة *"><input required className={inputClass} value={editData.partName||""} onChange={e=>setEditData({...editData, partName: e.target.value})}/></Field>
            <Field label="الفئة"><input className={inputClass} value={editData.category||""} onChange={e=>setEditData({...editData, category: e.target.value})}/></Field>
            <Field label="الكمية"><input type="number" className={inputClass} value={editData.quantity||""} onChange={e=>setEditData({...editData, quantity: e.target.value})}/></Field>
            <Field label="الحد الأدنى"><input type="number" className={inputClass} value={editData.minimumQuantity||""} onChange={e=>setEditData({...editData, minimumQuantity: e.target.value})}/></Field>
            <Field label="سعر الوحدة"><input type="number" className={inputClass} value={editData.unitPrice||""} onChange={e=>setEditData({...editData, unitPrice: e.target.value})}/></Field>
            <Field label="الحالة"><select className={inputClass} value={editData.status||"available"} onChange={e=>setEditData({...editData, status: e.target.value})}><option value="available">متوفر</option><option value="low">منخفض</option><option value="out_of_stock">نفذ</option></select></Field>
          </>}

          <button type="submit" disabled={saving} className="col-span-2 py-3 bg-blue-900 text-white rounded-xl font-bold flex items-center justify-center gap-2">
            {saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} {isEdit ? "حفظ التعديل" : "حفظ الإضافة"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
