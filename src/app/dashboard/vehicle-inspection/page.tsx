"use client";
import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { SearchCheck, Plus, X, Save, Loader2, Car, Calendar, Hash } from "lucide-react";
import ExportExcelButton from "@/components/ExportExcelButton";

// ... (تجاهلت الثوابت CONDITION_OPTIONS و INSPECTION_CATEGORIES للاختصار، احتفظ بها كما هي عندك)
const CONDITION_OPTIONS = [{ value: "", label: "— اختر —" }, { value: "excellent", label: "ممتاز" }, { value: "good", label: "جيد" }, { value: "average", label: "متوسط" }, { value: "poor", label: "سيء" }, { value: "none", label: "لا يوجد" }] as const;
const CONDITION_COLOR: Record<string, string> = { excellent: "bg-emerald-100 text-emerald-800", good: "bg-blue-100 text-blue-800", average: "bg-amber-100 text-amber-800", poor: "bg-red-100 text-red-800", none: "bg-gray-200 text-gray-700" };
const INSPECTION_CATEGORIES = [ { title: "1. مستندات ومعلومات المركبة", items: ["رخصة السيارة", "التأمين", "جهاز التتبع / GPS", "مفتاح إضافي", "مطابقة بيانات السيارة"] }, { title: "2. الفحص الخارجي", items: ["الصدام الأمامي", "الصدام الخلفي", "الكبوت", "السقف", "الأبواب", "المرايا الجانبية", "الزجاج الأمامي والخلفي", "الأنوار الخارجية", "الإطارات والجنوط", "الاستبن"] }, { title: "3. الفحص الداخلي", items: ["المقاعد", "لوحة العدادات", "أحزمة الأمان", "التكييف", "الزجاج الكهربائي", "القفل المركزي", "البوق (الكلاكس)", "المساحات"] }, { title: "4. الفحص الميكانيكي", items: ["المحرك", "الزيت", "المياه / سائل التبريد", "البطارية", "الفرامل", "العفشة", "ناقل الحركة (الفتيس)", "التسريب أسفل السيارة"] }, { title: "5. الفحص الكهربائي والسلامة", items: ["الأنوار الداخلية", "إشارات الانعطاف", "حساسات / كاميرا خلفية", "طفاية الحريق", "مثلث التحذير", "عدة الإسعافات"] } ];

export default function VehicleInspectionPage() {
  const { user } = useApp();
  const [data, setData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    plateNumber: "", vehicleId: null as number | null, vin: "", inspectionDate: new Date().toISOString().slice(0, 10),
    odometer: 0, branchName: "", driverName: "", inspectorName: user?.name || "فاحص النظام", exteriorNotes: "", generalNotes: ""
  });
  
  const [checklist, setChecklist] = useState<any>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vehicle-inspections");
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, []);

  const updateItem = (item: string, field: string, value: string) => { setChecklist((prev: any) => ({ ...prev, [item]: { ...prev[item], [field]: value } })); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/vehicle-inspections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formData, checklist }) });
      const resData = await res.json();
      if (res.ok) { setModalOpen(false); loadData(); } else { alert(resData.error || "فشل الحفظ."); }
    } catch { alert("خطأ اتصال."); } finally { setSaving(false); }
  };

  const excelData = data.map(r => ({ "رقم اللوحة": r.plate_number, "رقم الشاسيه": r.vin, "تاريخ الفحص": r.inspection_date, "قراءة العداد": r.odometer }));

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* ── اختصرت الهيدر والجدول للتركيز على المودال ── */}
      <div className="flex justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><h1 className="text-2xl font-black">تقارير فحص السيارات</h1><button onClick={() => {setFormData({...formData, plateNumber: "", vehicleId: null, vin: ""}); setModalOpen(true);}} className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold"><Plus size={18}/> إضافة فحص</button></div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-auto flex flex-col border border-gray-200">
            <div className="p-4 bg-blue-900 text-white flex justify-between rounded-t-xl"><h2 className="text-xl font-black">استمارة الفحص</h2><button onClick={() => setModalOpen(false)}><X/></button></div>
            <div className="p-6 overflow-y-auto">
              <form id="inspection-form" onSubmit={handleSave} className="space-y-6">
                
                {/* ✅ حقول السيارة متضمنة الشاسيه */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-5 rounded-xl border">
                  <div>
                    <label className="block text-xs font-bold mb-1">السيارة (اللوحة) *</label>
                    <select required className="w-full border rounded-lg py-2 px-3 text-sm" value={formData.plateNumber} 
                      onChange={(e) => { 
                        const v = vehicles.find((x) => x.plateNumber === e.target.value); 
                        setFormData({...formData, plateNumber: e.target.value, vehicleId: v?.id ?? null, vin: v?.vin || "", odometer: Number(v?.currentKm) || 0, driverName: v?.driverName || formData.driverName }); 
                      }}>
                      <option value="">-- اختر السيارة --</option>
                      {vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs font-bold mb-1">رقم الشاسيه (VIN)</label><div className="relative"><Hash className="absolute start-3 top-2.5 text-gray-400" size={16}/><input type="text" className="w-full border rounded-lg py-2 ps-9 pe-3 text-sm bg-gray-100 font-bold" value={formData.vin} readOnly placeholder="يُسحب تلقائياً" /></div></div>
                  <div><label className="block text-xs font-bold mb-1">عداد الكيلومترات</label><input type="number" className="w-full border rounded-lg py-2 px-3 text-sm" value={formData.odometer} onChange={e => setFormData({...formData, odometer: Number(e.target.value)})} /></div>
                  <div><label className="block text-xs font-bold mb-1">تاريخ الفحص</label><input type="date" required className="w-full border rounded-lg py-2 px-3 text-sm" value={formData.inspectionDate} onChange={e => setFormData({...formData, inspectionDate: e.target.value})} /></div>
                </div>

                {/* باقي بنود الفحص كما هي... */}
              </form>
            </div>
            <div className="p-4 bg-gray-50 flex gap-3 rounded-b-xl border-t"><button type="submit" form="inspection-form" className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl">{saving ? <Loader2 className="animate-spin" /> : "حفظ الاستمارة"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
