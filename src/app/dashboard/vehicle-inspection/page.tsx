"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { SearchCheck, Plus, X, Save, Loader2, Car, Calendar, Search } from "lucide-react";
import ExportExcelButton from "@/components/ExportExcelButton";
import FilterBar from "@/components/ui/FilterBar";

const CONDITION_OPTIONS = [
  { value: "", label: "— اختر —" },
  { value: "excellent", label: "ممتاز" },
  { value: "good", label: "جيد" },
  { value: "average", label: "متوسط" },
  { value: "poor", label: "سيء" },
] as const;

const CONDITION_COLOR: Record<string, string> = {
  excellent: "bg-emerald-100 text-emerald-800 font-bold",
  good: "bg-blue-100 text-blue-800 font-bold",
  average: "bg-amber-100 text-amber-800 font-bold",
  poor: "bg-red-100 text-red-800 font-bold",
};

const INSPECTION_CATEGORIES = [
  { title: "1. مستندات ومعلومات المركبة", items: ["رخصة السيارة", "التأمين", "جهاز التتبع / GPS", "مفتاح إضافي", "مطابقة بيانات السيارة"] },
  { title: "2. الفحص الخارجي", items: ["الصدام الأمامي", "الصدام الخلفي", "الكبوت", "السقف", "الأبواب", "المرايا الجانبية", "الزجاج الأمامي والخلفي", "الأنوار الخارجية", "الإطارات والجنوط", "الاستبن"] },
  { title: "3. الفحص الداخلي", items: ["المقاعد", "لوحة العدادات", "أحزمة الأمان", "التكييف", "الزجاج الكهربائي", "القفل المركزي", "البوق (الكلاكس)", "المساحات"] },
  { title: "4. الفحص الميكانيكي", items: ["المحرك", "الزيت", "المياه / سائل التبريد", "البطارية", "الفرامل", "العفشة", "ناقل الحركة (الفتيس)", "التسريب أسفل السيارة"] },
  { title: "5. الفحص الكهربائي والسلامة", items: ["الأنوار الداخلية", "إشارات الانعطاف", "حساسات / كاميرا خلفية", "طفاية الحريق", "مثلث التحذير", "عدة الإسعافات"] }
];

export default function VehicleInspectionPage() {
  const { user } = useApp();
  const [data, setData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [formData, setFormData] = useState({
    plateNumber: "", vehicleId: null as number | null, inspectionDate: new Date().toISOString().slice(0, 10),
    odometer: 0, branchName: "", driverName: "", inspectorName: user?.name || "فاحص النظام",
    exteriorNotes: "", generalNotes: ""
  });
  
  const [checklist, setChecklist] = useState<any>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      let res = await fetch(`/api/vehicle-inspections?${params}`);
      if (!res.ok) res = await fetch(`/api/vehicle-parts?${params}`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, []);

  const filteredData = data.filter(r => {
    const plate = r.plate_number || r.plateNumber || "";
    const driver = r.driver_name || r.driverName || "";
    return plate.toLowerCase().includes(search.toLowerCase()) || driver.toLowerCase().includes(search.toLowerCase());
  });

  const updateItem = (item: string, field: string, value: string) => {
    setChecklist((prev: any) => ({ ...prev, [item]: { ...prev[item], [field]: value } }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let res = await fetch("/api/vehicle-inspections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formData, checklist }) });
      if (!res.ok) {
        res = await fetch("/api/vehicle-parts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formData, checklist, partName: formData.inspectorName, brand: formData.driverName, supplier: formData.branchName, installDate: formData.inspectionDate, kmAtInstall: formData.odometer, notes: formData.generalNotes }) });
      }
      if (res.ok) { setModalOpen(false); loadData(); } else { alert("فشل الحفظ."); }
    } catch { alert("خطأ اتصال."); } finally { setSaving(false); }
  };

  const openAdd = () => {
    setFormData({ plateNumber: "", vehicleId: null, inspectionDate: new Date().toISOString().slice(0, 10), odometer: 0, branchName: "", driverName: "", inspectorName: user?.name || "فاحص النظام", exteriorNotes: "", generalNotes: "" });
    setChecklist({}); setModalOpen(true);
  };

  const excelData = filteredData.map(r => ({
    "رقم اللوحة": r.plate_number || r.plateNumber, "تاريخ الفحص": r.inspection_date || r.inspectionDate, 
    "الفرع": r.branch_name || r.branchName, "السائق": r.driver_name || r.driverName, 
    "الفاحص": r.inspector_name || r.inspectorName, "قراءة العداد": Number(r.odometer || r.kmAtInstall || 0)
  }));

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3"><div className="p-3 bg-blue-50 text-blue-700 rounded-xl"><SearchCheck size={26} /></div><div><h1 className="text-2xl font-black text-gray-900">تقارير فحص السيارات</h1><p className="text-sm text-gray-500 mt-0.5">إجمالي {filteredData.length} تقرير</p></div></div>
        <div className="flex items-center gap-3">
          <ExportExcelButton data={excelData} fileName="تقارير_الفحص" dateColumnName="تاريخ الفحص" />
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md transition-all"><Plus size={18} /><span>إضافة تقرير فحص</span></button>
        </div>
      </div>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">بحث باللوحة / السائق:</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث هنا..." className="border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 w-40" />
        </div>
      </FilterBar>

      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center text-blue-800"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-sm">
                <tr><th className="p-4 border-l border-blue-600/50">رقم اللوحة</th><th className="p-4 border-l border-blue-600/50">تاريخ الفحص</th><th className="p-4 border-l border-blue-600/50">السائق</th><th className="p-4 border-l border-blue-600/50">الفاحص</th><th className="p-4 border-l border-blue-600/50">الفرع</th><th className="p-4">العداد</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.map((r, i) => (
                  <tr key={r.id || i} className={`hover:bg-blue-50/50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="p-4 font-black text-blue-900 border-l border-gray-100">{r.plate_number || r.plateNumber}</td>
                    <td className="p-4 text-gray-700 font-semibold border-l border-gray-100">{r.inspection_date || r.inspectionDate ? new Date(r.inspection_date || r.inspectionDate).toLocaleDateString("en-GB") : "-"}</td>
                    <td className="p-4 font-bold border-l border-gray-100">{r.driver_name || r.driverName || "-"}</td>
                    <td className="p-4 border-l border-gray-100">{r.inspector_name || r.inspectorName || "-"}</td>
                    <td className="p-4 text-gray-600 border-l border-gray-100">{r.branch_name || r.branchName || "-"}</td>
                    <td className="p-4 text-orange-600 font-bold">{Number(r.odometer || r.kmAtInstall || 0).toLocaleString()} كم</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length === 0 && <div className="p-10 text-center text-gray-500 font-bold">لا توجد تقارير مطابقة.</div>}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-auto flex flex-col max-h-full border border-gray-200">
            <div className="flex justify-between items-center bg-blue-900 text-white p-4 rounded-t-xl shrink-0">
              <h2 className="text-xl font-black flex items-center gap-2"><SearchCheck /> استمارة فحص سيارة (التقييم الفني)</h2>
              <button onClick={() => setModalOpen(false)} className="hover:text-red-400"><X size={24}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="inspection-form" onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">السيارة *</label>
                    <div className="relative"><Car className="absolute start-3 top-2.5 text-gray-400" size={16}/>
                      <select required className="w-full border rounded-lg py-2 ps-9 pe-3 text-sm outline-none focus:border-blue-500" value={formData.plateNumber} onChange={e => { const v = vehicles.find(x => x.plateNumber === e.target.value); setFormData({...formData, plateNumber: e.target.value, vehicleId: v?.id ?? null, odometer: Number(v?.currentKm ?? v?.current_km) || 0 }); }}>
                        <option value="">-- اختر السيارة --</option>
                        {vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">العداد (كم)</label><input type="number" required className="w-full border rounded-lg py-2 px-3 text-sm outline-none" value={formData.odometer} onChange={e => setFormData({...formData, odometer: Number(e.target.value) || 0})} /></div>
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">تاريخ الفحص</label><div className="relative"><Calendar className="absolute start-3 top-2.5 text-gray-400" size={16}/><input type="date" required className="w-full border rounded-lg py-2 ps-9 pe-3 text-sm outline-none" value={formData.inspectionDate} onChange={e => setFormData({...formData, inspectionDate: e.target.value})} /></div></div>
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">الفرع</label><input type="text" className="w-full border rounded-lg py-2 px-3 text-sm outline-none" value={formData.branchName} onChange={e => setFormData({...formData, branchName: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">اسم السائق</label><input type="text" className="w-full border rounded-lg py-2 px-3 text-sm outline-none" value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">اسم الفاحص</label><input type="text" required className="w-full border rounded-lg py-2 px-3 text-sm outline-none" value={formData.inspectorName} onChange={e => setFormData({...formData, inspectorName: e.target.value})} /></div>
                </div>

                <div className="border border-blue-900 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-blue-900 text-white flex text-sm font-bold text-center items-center"><div className="flex-[1.2] py-3 border-l border-white/20 px-2">البند</div><div className="w-36 py-3 border-l border-white/20">التقييم</div><div className="flex-1 py-3 hidden md:block">ملاحظات الفاحص</div></div>
                  {INSPECTION_CATEGORIES.map((cat, cIdx) => (
                    <div key={cIdx}>
                      <div className="bg-gray-200 text-gray-900 font-black py-2.5 px-4 text-sm border-y border-gray-300 shadow-inner">{cat.title}</div>
                      {cat.items.map((item, iIdx) => {
                        const current = checklist[item]?.status || "";
                        return (
                          <div key={item} className="flex border-b border-gray-100 hover:bg-gray-50 bg-white">
                            <div className="flex-[1.2] min-w-[140px] py-2.5 px-3 font-bold text-gray-800 border-l border-gray-200 flex items-center justify-between gap-2"><span>{item}</span><span className="text-[10px] text-gray-400 font-black w-5 h-5 flex items-center justify-center bg-gray-100 rounded-full shrink-0">{iIdx + 1}</span></div>
                            <div className="w-36 p-1.5 border-l border-gray-200 flex items-center"><select value={current} onChange={e => updateItem(item, "status", e.target.value)} className={`w-full text-xs font-bold rounded-lg border py-2 px-1.5 outline-none cursor-pointer ${current ? CONDITION_COLOR[current] : "bg-gray-50 text-gray-500"}`}>{CONDITION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
                            <div className="flex-1 p-1.5 flex items-center"><input type="text" value={checklist[item]?.notes || ""} onChange={e => updateItem(item, "notes", e.target.value)} placeholder="ملاحظات..." className="w-full text-xs p-1.5 border rounded-lg outline-none focus:border-blue-500" /></div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </form>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex gap-3 shrink-0">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100">إلغاء</button>
              <button form="inspection-form" type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl shadow-md flex justify-center items-center gap-2">{saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} حفظ واعتماد الاستمارة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
