"use client";
import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { SearchCheck, Plus, X, Save, Loader2, Car, Calendar } from "lucide-react";
import ExportExcelButton from "@/components/ExportExcelButton";

const INSPECTION_CATEGORIES = [
  {
    title: "1. مستندات ومعلومات المركبة",
    items: ["رخصة السيارة", "التأمين", "جهاز التتبع / GPS", "مفتاح إضافي", "مطابقة بيانات السيارة"]
  },
  {
    title: "2. الفحص الخارجي",
    items: ["الصدام الأمامي", "الصدام الخلفي", "الكبوت", "السقف", "الأبواب", "المرايا الجانبية", "الزجاج الأمامي والخلفي", "الأنوار الخارجية", "الإطارات والجنوط", "الاستبن"]
  },
  {
    title: "3. الفحص الداخلي",
    items: ["المقاعد", "لوحة العدادات", "أحزمة الأمان", "التكييف", "الزجاج الكهربائي", "القفل المركزي", "البوق (الكلاكس)", "المساحات"]
  },
  {
    title: "4. الفحص الميكانيكي",
    items: ["المحرك", "الزيت", "المياه / سائل التبريد", "البطارية", "الفرامل", "العفشة", "ناقل الحركة (الفتيس)", "التسريب أسفل السيارة"]
  },
  {
    title: "5. الفحص الكهربائي والسلامة",
    items: ["الأنوار الداخلية", "إشارات الانعطاف", "حساسات / كاميرا خلفية", "طفاية الحريق", "مثلث التحذير", "عدة الإسعافات"]
  }
];

export default function VehicleInspectionPage() {
  const { user } = useApp();
  const [data, setData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    plateNumber: "", vehicleId: null as number | null, inspectionDate: new Date().toISOString().slice(0, 10),
    odometer: 0, branchName: "", driverName: "", inspectorName: user?.name || "فاحص النظام",
    exteriorNotes: "", generalNotes: ""
  });
  
  // الكيان الجديد لحفظ البيانات الإضافية لكل بند
  const [checklist, setChecklist] = useState<Record<string, { status: string; date: string; notes: string }>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vehicle-inspections");
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, []);

  // دالة تحديث بند محدد
  const updateItem = (item: string, field: "status" | "date" | "notes", value: string) => {
    setChecklist(prev => ({
      ...prev,
      [item]: { ...prev[item], [field]: value }
    }));
  };

  // الدالة السحرية: جلب تواريخ الصيانة التلقائية عند اختيار السيارة
  const fetchVehicleHistoryAndAutoFill = async (vehicleId: number) => {
    try {
      // نجلب آخر تغييرات الزيت
      const oilRes = await fetch(`/api/oil-changes?vehicleId=${vehicleId}`);
      const oilData = await oilRes.json();
      const latestOil = Array.isArray(oilData) && oilData.length > 0 ? oilData[0] : null;

      // نجلب أوامر الشغل
      const woRes = await fetch(`/api/work-orders?vehicleId=${vehicleId}`);
      const woData = await woRes.json();
      const woArray = Array.isArray(woData) ? woData : [];

      const latestTires = woArray.find((w: any) => w.maintenanceType === "صيانة كاوتش");
      const latestSuspension = woArray.find((w: any) => w.maintenanceType === "صيانة عفشة");
      const latestEngine = woArray.find((w: any) => w.maintenanceType === "صيانة ميكانيكا");

      // تعبئة البيانات تلقائياً
      setChecklist(prev => {
        const next = { ...prev };
        if (latestOil?.changeDate) {
          next["الزيت"] = { ...next["الزيت"], date: latestOil.changeDate.slice(0, 10), notes: "تم السحب تلقائياً من سجلات الزيوت" };
        }
        if (latestTires?.startDate) {
          next["الإطارات والجنوط"] = { ...next["الإطارات والجنوط"], date: latestTires.startDate.slice(0, 10), notes: "سُحبت من أوامر الشغل" };
        }
        if (latestSuspension?.startDate) {
          next["العفشة"] = { ...next["العفشة"], date: latestSuspension.startDate.slice(0, 10), notes: "سُحبت من أوامر الشغل" };
        }
        if (latestEngine?.startDate) {
          next["المحرك"] = { ...next["المحرك"], date: latestEngine.startDate.slice(0, 10), notes: "سُحبت من أوامر الشغل" };
        }
        return next;
      });
    } catch (error) { console.error(error); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/vehicle-inspections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, checklist })
      });
      if (res.ok) { setModalOpen(false); loadData(); }
      else { alert("فشل الحفظ."); }
    } catch (err) { alert("خطأ اتصال."); } finally { setSaving(false); }
  };

  const openAdd = () => {
    setFormData({ ...formData, plateNumber: "", vehicleId: null, odometer: 0, exteriorNotes: "", generalNotes: "" });
    setChecklist({});
    setModalOpen(true);
  };

  const excelData = data.map(r => ({
    "رقم اللوحة": r.plate_number,
    "تاريخ الفحص": r.inspection_date ? new Date(r.inspection_date).toLocaleDateString("en-GB") : "",
    "قراءة العداد": r.odometer,
    "الفرع": r.branch_name,
    "السائق": r.driver_name,
    "الفاحص": r.inspector_name,
  }));

  return (
    <div className="w-full space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl"><SearchCheck size={26} /></div>
          <div><h1 className="text-2xl font-black text-gray-900 dark:text-white">تقارير فحص السيارات</h1><p className="text-sm text-gray-500 mt-0.5">إجمالي {data.length} تقرير</p></div>
        </div>
        <div className="flex items-center gap-3">
          <ExportExcelButton data={excelData} fileName="تقارير_الفحص" />
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md transition-all"><Plus size={18} /><span>إضافة فحص</span></button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? <div className="p-12 text-center text-blue-600"><Loader2 className="animate-spin mx-auto"/></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-sm">
                <tr><th className="p-4 border-l border-blue-600/50">اللوحة</th><th className="p-4 border-l border-blue-600/50">التاريخ</th><th className="p-4 border-l border-blue-600/50">السائق</th><th className="p-4 border-l border-blue-600/50">الفرع</th><th className="p-4">العداد</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {data.map((r, i) => (
                  <tr key={r.id || i} className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/20 ${i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800/50"}`}>
                    <td className="p-4 font-black text-blue-900 dark:text-blue-400 border-l border-gray-100 dark:border-gray-800">{r.plate_number}</td>
                    <td className="p-4 font-semibold text-gray-700 dark:text-gray-300 border-l border-gray-100 dark:border-gray-800">{r.inspection_date ? new Date(r.inspection_date).toLocaleDateString("en-GB") : "-"}</td>
                    <td className="p-4 font-bold border-l border-gray-100 dark:border-gray-800 dark:text-gray-200">{r.driver_name}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 border-l border-gray-100 dark:border-gray-800">{r.branch_name}</td>
                    <td className="p-4 text-orange-600 dark:text-orange-400 font-bold">{Number(r.odometer).toLocaleString()} كم</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl my-auto flex flex-col max-h-full border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center bg-blue-900 text-white p-4 rounded-t-xl shrink-0">
              <h2 className="text-xl font-black flex items-center gap-2"><SearchCheck /> استمارة فحص سيارة (Inspection Report)</h2>
              <button onClick={() => setModalOpen(false)} className="hover:text-red-400 transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto">
              <form id="inspection-form" onSubmit={handleSave} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">السيارة *</label>
                    <div className="relative"><Car className="absolute start-3 top-2.5 text-gray-400" size={16}/>
                      <select required className="w-full border dark:border-gray-700 dark:bg-gray-800 rounded-lg py-2 ps-9 pe-3 text-sm outline-none focus:border-blue-500" value={formData.plateNumber} 
                        onChange={e => { 
                          const v = vehicles.find(x => x.plateNumber === e.target.value); 
                          setFormData({...formData, plateNumber: e.target.value, vehicleId: v?.id, driverName: v?.driverName || formData.driverName});
                          if (v?.id) fetchVehicleHistoryAndAutoFill(v.id); // ⚡ جلب التواريخ السابقة تلقائياً!
                        }}>
                        <option value="">-- اختر السيارة --</option>
                        {vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">عداد الكيلومترات</label><input type="number" required className="w-full border dark:border-gray-700 dark:bg-gray-800 rounded-lg py-2 px-3 text-sm outline-none" value={formData.odometer} onChange={e => setFormData({...formData, odometer: Number(e.target.value)})} /></div>
                  <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">تاريخ الفحص</label><div className="relative"><Calendar className="absolute start-3 top-2.5 text-gray-400" size={16}/><input type="date" required className="w-full border dark:border-gray-700 dark:bg-gray-800 rounded-lg py-2 ps-9 pe-3 text-sm outline-none" value={formData.inspectionDate} onChange={e => setFormData({...formData, inspectionDate: e.target.value})} /></div></div>
                  <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الفرع</label><input type="text" className="w-full border dark:border-gray-700 dark:bg-gray-800 rounded-lg py-2 px-3 text-sm outline-none" value={formData.branchName} onChange={e => setFormData({...formData, branchName: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">السائق</label><input type="text" className="w-full border dark:border-gray-700 dark:bg-gray-800 rounded-lg py-2 px-3 text-sm outline-none" value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الفاحص</label><input type="text" required className="w-full border dark:border-gray-700 dark:bg-gray-800 rounded-lg py-2 px-3 text-sm outline-none" value={formData.inspectorName} onChange={e => setFormData({...formData, inspectorName: e.target.value})} /></div>
                </div>

                {/* ── شبكة الفحص الشاملة (متوافقة مع الدارك مود و 4 أعمدة) ── */}
                <div className="border border-blue-900 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-blue-900 text-white flex text-sm font-bold text-center items-center">
                    <div className="flex-1 py-3 border-l border-white/20">البند</div>
                    <div className="w-14 sm:w-16 py-3 border-l border-white/20">صح</div>
                    <div className="w-14 sm:w-16 py-3 border-l border-white/20">غلط</div>
                    <div className="w-32 sm:w-40 py-3 border-l border-white/20">تاريخ آخر تغيير</div>
                    <div className="flex-1 py-3 hidden sm:block">ملاحظات</div>
                  </div>
                  
                  {INSPECTION_CATEGORIES.map((cat, cIdx) => (
                    <div key={cIdx}>
                      <div className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white font-black py-2.5 px-4 text-sm border-y border-gray-300 dark:border-gray-700 shadow-inner">
                        {cat.title}
                      </div>
                      {cat.items.map((item, iIdx) => (
                        <div key={item} className="flex border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm items-stretch">
                          {/* البند */}
                          <div className="flex-1 py-3 px-3 text-gray-800 dark:text-gray-200 font-bold border-l border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-900">
                            <span>{item}</span>
                            <span className="text-[10px] text-gray-400 font-black w-5 text-center bg-gray-100 dark:bg-gray-800 rounded-full">{iIdx + 1}</span>
                          </div>
                          {/* صح */}
                          <div className="w-14 sm:w-16 flex items-center justify-center border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                            <input type="radio" name={item} checked={checklist[item]?.status === "pass"} onChange={() => updateItem(item, "status", "pass")} className="w-5 h-5 accent-emerald-500 cursor-pointer" />
                          </div>
                          {/* غلط */}
                          <div className="w-14 sm:w-16 flex items-center justify-center border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                            <input type="radio" name={item} checked={checklist[item]?.status === "fail"} onChange={() => updateItem(item, "status", "fail")} className="w-5 h-5 accent-red-500 cursor-pointer" />
                          </div>
                          {/* التاريخ */}
                          <div className="w-32 sm:w-40 p-1.5 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center">
                            <input type="date" value={checklist[item]?.date || ""} onChange={(e) => updateItem(item, "date", e.target.value)} className="w-full text-xs p-1 border dark:border-gray-700 dark:bg-gray-800 rounded outline-none focus:border-blue-500 text-gray-700 dark:text-gray-200 font-semibold" />
                          </div>
                          {/* الملاحظات */}
                          <div className="flex-1 p-1.5 bg-white dark:bg-gray-900 hidden sm:flex items-center">
                            <input type="text" value={checklist[item]?.notes || ""} onChange={(e) => updateItem(item, "notes", e.target.value)} placeholder="ملاحظات..." className="w-full text-xs p-1.5 border dark:border-gray-700 dark:bg-gray-800 rounded outline-none focus:border-blue-500 text-gray-700 dark:text-gray-200" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </form>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-xl flex gap-3 shrink-0">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">إلغاء</button>
              <button form="inspection-form" type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl hover:bg-blue-800 shadow-md flex justify-center items-center gap-2">
                {saving ? <Loader2 className="animate-spin"/> : <Save/>} حفظ واعتماد الاستمارة الشاملة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
