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
  
  const [checklist, setChecklist] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vehicle-parts");
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/vehicle-parts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, checklist })
      });
      const resData = await res.json().catch(() => ({}));

      if (res.ok && resData.success !== false) { 
        setModalOpen(false); 
        loadData(); 
      } else { 
        alert(resData.error || "فشل الحفظ. تأكد من اختيار السيارة."); 
      }
    } catch (err) { 
      alert("خطأ في الاتصال بالخادم."); 
    } finally { 
      setSaving(false); 
    }
  };

  const openAdd = () => {
    setFormData({ ...formData, plateNumber: "", vehicleId: null, odometer: 0, exteriorNotes: "", generalNotes: "" });
    setChecklist({});
    setModalOpen(true);
  };

  const excelData = data.map(r => ({
    "رقم اللوحة": r.plateNumber,
    "تاريخ الفحص": r.inspectionDate ? new Date(r.inspectionDate).toLocaleDateString("en-GB") : "",
    "قراءة العداد": r.odometer,
    "اسم الفرع": r.branchName,
    "اسم السائق": r.driverName,
    "اسم الفاحص": r.inspectorName,
    "ملاحظات عامة": r.generalNotes,
  }));

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      {/* ── رأس الصفحة ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl"><SearchCheck size={26} /></div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">استمارات تقارير فحص السيارات</h1>
            <p className="text-sm text-gray-500 mt-0.5">إجمالي <span className="font-bold text-gray-900 dark:text-white">{data.length}</span> تقرير فحص مسجل</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ExportExcelButton data={excelData} fileName="تقارير_الفحص_الشامل" />
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer">
            <Plus size={18} /><span>إضافة تقرير فحص</span>
          </button>
        </div>
      </div>

      {/* ── جدول التقارير ── */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center gap-3 text-blue-800 font-bold"><Loader2 className="animate-spin" /> جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-sm">
                <tr>
                  <th className="p-4 font-bold border-l border-blue-600/50">رقم اللوحة</th>
                  <th className="p-4 font-bold border-l border-blue-600/50">تاريخ الفحص</th>
                  <th className="p-4 font-bold border-l border-blue-600/50">اسم السائق</th>
                  <th className="p-4 font-bold border-l border-blue-600/50">اسم الفاحص</th>
                  <th className="p-4 font-bold border-l border-blue-600/50">الفرع التابع</th>
                  <th className="p-4 font-bold border-l border-blue-600/50">قراءة العداد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map((r, i) => (
                  <tr key={r.id || i} className={`hover:bg-blue-50/50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="p-4 font-black text-blue-900 border-l border-gray-100">{r.plateNumber}</td>
                    <td className="p-4 text-gray-700 font-semibold border-l border-gray-100">{r.inspectionDate ? new Date(r.inspectionDate).toLocaleDateString("en-GB") : "-"}</td>
                    <td className="p-4 font-bold text-gray-800 border-l border-gray-100">{r.driverName || "-"}</td>
                    <td className="p-4 font-bold text-gray-800 border-l border-gray-100">{r.inspectorName || "-"}</td>
                    <td className="p-4 text-gray-600 border-l border-gray-100">{r.branchName || "-"}</td>
                    <td className="p-4 text-orange-600 font-bold border-l border-gray-100">{Number(r.odometer || 0).toLocaleString()} كم</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length === 0 && <div className="p-10 text-center text-gray-500 font-bold">لا توجد تقارير فحص مسجلة حالياً.</div>}
          </div>
        )}
      </div>

      {/* ── استمارة الفحص المنبثقة (Modal) ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-auto flex flex-col max-h-full">
            
            <div className="flex justify-between items-center bg-blue-900 text-white p-4 rounded-t-xl shrink-0">
              <h2 className="text-xl font-black flex items-center gap-2"><SearchCheck /> استمارة فحص سيارة (Vehicle Inspection Report)</h2>
              <button onClick={() => setModalOpen(false)} className="hover:text-red-400 transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto">
              <form id="inspection-form" onSubmit={handleSave} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ الفحص</label>
                    <div className="relative"><Calendar className="absolute start-3 top-2.5 text-gray-400" size={16}/><input type="date" required className="w-full border rounded-lg py-2 ps-9 pe-3 text-sm outline-none focus:border-blue-500" value={formData.inspectionDate} onChange={e => setFormData({...formData, inspectionDate: e.target.value})} /></div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">بيانات السيارة (رقم اللوحة) *</label>
                    <div className="relative"><Car className="absolute start-3 top-2.5 text-gray-400" size={16}/><select required className="w-full border rounded-lg py-2 ps-9 pe-3 text-sm outline-none focus:border-blue-500" value={formData.plateNumber} onChange={e => { const v = vehicles.find(x => x.plateNumber === e.target.value); setFormData({...formData, plateNumber: e.target.value, vehicleId: v?.id, driverName: v?.driverName || formData.driverName}); }}><option value="">-- اختر السيارة --</option>{vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}</select></div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">عداد الكيلومترات</label>
                    <input type="number" required className="w-full border rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-500" value={formData.odometer} onChange={e => setFormData({...formData, odometer: Number(e.target.value)})} />
                  </div>
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">اسم الفرع التابع له</label><input type="text" className="w-full border rounded-lg py-2 px-3 text-sm outline-none" value={formData.branchName} onChange={e => setFormData({...formData, branchName: e.target.value})} placeholder="مثال: فرع دسوق" /></div>
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">اسم السائق</label><input type="text" className="w-full border rounded-lg py-2 px-3 text-sm outline-none" value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">اسم الفاحص</label><input type="text" required className="w-full border rounded-lg py-2 px-3 text-sm outline-none" value={formData.inspectorName} onChange={e => setFormData({...formData, inspectorName: e.target.value})} /></div>
                </div>

                <div className="border border-blue-900 rounded-xl overflow-hidden">
                  <div className="bg-blue-900 text-white flex text-sm font-bold text-center">
                    <div className="flex-1 py-3 border-l border-white/20">البند</div>
                    <div className="w-16 py-3 border-l border-white/20">صح</div>
                    <div className="w-16 py-3">غلط</div>
                  </div>
                  
                  {INSPECTION_CATEGORIES.map((cat, cIdx) => (
                    <div key={cIdx}>
                      <div className="bg-gray-200 text-gray-800 font-bold py-2 px-4 text-sm border-y border-gray-300">
                        {cat.title}
                      </div>
                      {cat.items.map((item, iIdx) => (
                        <div key={item} className="flex border-b border-gray-100 hover:bg-gray-50 transition-colors text-sm">
                          <div className="flex-1 py-2 px-4 text-gray-700 font-semibold border-l border-gray-200 flex items-center justify-between">
                            <span>{item}</span>
                            <span className="text-xs text-gray-400 font-bold w-6 text-center">{iIdx + 1}</span>
                          </div>
                          <div className="w-16 flex items-center justify-center border-l border-gray-200">
                            <input type="radio" name={item} checked={checklist[item] === "pass"} onChange={() => setChecklist({...checklist, [item]: "pass"})} className="w-5 h-5 accent-emerald-500 cursor-pointer" />
                          </div>
                          <div className="w-16 flex items-center justify-center">
                            <input type="radio" name={item} checked={checklist[item] === "fail"} onChange={() => setChecklist({...checklist, [item]: "fail"})} className="w-5 h-5 accent-red-500 cursor-pointer" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 bg-gray-100 p-2 rounded-t-lg border border-gray-200 border-b-0">ملاحظات الفحص الخارجي</label>
                    <textarea rows={3} className="w-full border border-gray-200 rounded-b-lg p-3 text-sm outline-none focus:border-blue-500" placeholder="سجل صدمات أو خدوش بالسيارة..." value={formData.exteriorNotes} onChange={e => setFormData({...formData, exteriorNotes: e.target.value})}></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-800 bg-gray-100 p-2 rounded-t-lg border border-gray-200 border-b-0">ملاحظات عامة</label>
                    <textarea rows={3} className="w-full border border-gray-200 rounded-b-lg p-3 text-sm outline-none focus:border-blue-500" placeholder="ملاحظات أخرى..." value={formData.generalNotes} onChange={e => setFormData({...formData, generalNotes: e.target.value})}></textarea>
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex gap-3 shrink-0">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 shadow-sm">إلغاء</button>
              <button form="inspection-form" type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md flex justify-center items-center gap-2 cursor-pointer">
                {saving ? <Loader2 className="animate-spin"/> : <Save/>} حفظ واعتماد استمارة الفحص
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
