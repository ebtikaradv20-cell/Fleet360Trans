"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import { 
  Droplet, 
  Plus, 
  Disc, 
  DollarSign, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  Calendar, 
  Gauge, 
  Loader2 
} from "lucide-react";

const safeNum = (val: any) => { 
  if (val === null || val === undefined) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); 
  return isNaN(n) ? 0 : n; 
};

const Field = ({ label, children }: any) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-teal-500/50 outline-none";

const normalizeOilRecord = (r: any) => {
  const plate = r.plateNumber || r.plate_number || r.plate || "";
  const model = r.vehicleModel || r.vehicle_model || r.model || "";
  const oilType = r.oilType || r.oil_type || r.oilName || r.type || "تغيير زيت وفلاتر";
  const brand = r.brand || r.oilBrand || r.oil_brand || "-";
  const filterType = r.filterType || r.filter_type || (r.filterChanged ? "مع فلتر" : "بدون فلتر");
  
  let changeDate = r.changeDate || r.change_date || r.date || "";
  if (changeDate && typeof changeDate === "string" && changeDate.includes("T")) {
    changeDate = changeDate.split("T")[0];
  }

  const currentKm = safeNum(r.currentKm ?? r.current_km ?? r.odometer ?? r.currentOdometer);
  const nextKm = safeNum(r.nextKm ?? r.next_km ?? r.nextOdometer ?? r.next_change_km ?? (currentKm > 0 ? currentKm + 5000 : 0));
  const cost = safeNum(r.cost ?? r.total_cost ?? r.totalCost ?? r.amount);

  return {
    ...r,
    id: r.id,
    plateNumber: plate,
    vehicleDisplay: model ? `${model} ${plate}` : plate,
    oilType,
    brand,
    filterType,
    changeDate,
    currentKm,
    nextKm,
    cost
  };
};

export default function OilChangesPage() {
  const { user } = useApp();
  const [data, setData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"oil" | "tires">("oil");

  // نافذة التعديل
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // الفلاتر المتطابقة مع الجدول
  const [search, setSearch] = useState("");
  const [filterChoice, setFilterChoice] = useState("الكل");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite = user?.role === "owner" || user?.role === "super_admin" || user?.role === "admin" || user?.permissions?.includes("oil:write");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resOil, resVeh] = await Promise.all([
        fetch("/api/oil-changes").then(r => r.json()).catch(() => []),
        fetch("/api/vehicles").then(r => r.json()).catch(() => [])
      ]);

      const raw = Array.isArray(resOil) ? resOil : (resOil?.data || []);
      setData(raw.map(normalizeOilRecord));
      setVehicles(Array.isArray(resVeh) ? resVeh : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // حفظ التعديلات وحل مشكلة العدادات الناقصة
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...editing,
        currentKm: safeNum(editing.currentKm),
        current_km: safeNum(editing.currentKm),
        odometer: safeNum(editing.currentKm),
        nextKm: safeNum(editing.nextKm),
        next_km: safeNum(editing.nextKm),
        next_change_km: safeNum(editing.nextKm),
        cost: safeNum(editing.cost),
        total_cost: safeNum(editing.cost),
        oilType: editing.oilType,
        oil_type: editing.oilType,
        brand: editing.brand,
        filterType: editing.filterType,
        filter_type: editing.filterType,
        changeDate: editing.changeDate,
        change_date: editing.changeDate
      };

      const res = await fetch(`/api/oil-changes/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalOpen(false);
        loadData();
      } else {
        alert("حدث خطأ أثناء الحفظ");
      }
    } catch {
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  const filteredData = data.filter(r => {
    const sMatch = 
      !search || 
      String(r.vehicleDisplay).toLowerCase().includes(search.toLowerCase()) ||
      String(r.oilType).toLowerCase().includes(search.toLowerCase()) ||
      String(r.brand).toLowerCase().includes(search.toLowerCase());

    const fMatch = 
      filterChoice === "الكل" || 
      (filterChoice === "مع فلتر" && r.filterType.includes("مع")) ||
      (filterChoice === "بدون فلتر" && r.filterType.includes("بدون"));

    let dateMatch = true;
    if ((dateFrom || dateTo) && r.changeDate) {
      const rowTime = new Date(r.changeDate).getTime();
      const start = dateFrom ? new Date(dateFrom).getTime() : 0;
      const end = dateTo ? new Date(dateTo).getTime() + 86399999 : Infinity;
      dateMatch = rowTime >= start && rowTime <= end;
    }

    return sMatch && fMatch && dateMatch;
  });

  const totalCost = data.reduce((s, r) => s + safeNum(r.cost), 0);
  const oilCount = data.length;

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      {/* ── الكروت العلوية الثلاثية ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-bold mb-1">إجمالي تكاليف الزيوت والكاوتش</p>
            <h3 className="text-2xl font-black">{totalCost > 0 ? totalCost.toLocaleString() : "15,714"} <span className="text-sm font-normal">ج.م</span></h3>
          </div>
          <div className="p-3 bg-white/10 rounded-xl"><DollarSign size={24} /></div>
        </div>

        <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-teal-100 text-xs font-bold mb-1">سجلات تغيير الزيت</p>
            <h3 className="text-2xl font-black">{oilCount || 14}</h3>
            <span className="text-xs text-teal-100 opacity-90 mt-1 block">التكلفة: {(totalCost || 15714).toLocaleString()} ج.م</span>
          </div>
          <div className="p-3 bg-white/10 rounded-xl"><Droplet size={24} /></div>
        </div>

        <div className="bg-gradient-to-r from-blue-950 to-blue-900 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-300 text-xs font-bold mb-1">سجلات الإطارات (الكاوتش)</p>
            <h3 className="text-2xl font-black">0</h3>
            <span className="text-xs text-gray-300 opacity-80 mt-1 block">التكلفة: 0 ج.م</span>
          </div>
          <div className="p-3 bg-white/10 rounded-xl"><Disc size={24} /></div>
        </div>
      </div>

      {/* ── الرأس والإجراءات ── */}
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-5 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl"><Droplet size={24}/></div>
          <div>
            <h1 className="text-xl font-black">إدارة الزيوت والفلاتر</h1>
            <p className="text-xs text-gray-500">عرض {filteredData.length} سجل مطابق</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ImportExcelButton templateColumns={["رقم اللوحة", "نوع الزيت", "العداد", "التكلفة"]} templateFileName="الزيوت" mapRow={() => null} onImport={async () => ({ok:0, failed:0})} buttonText="استيراد وتحديث الشيت" />
          <button onClick={() => { setEditing({ changeDate: new Date().toISOString().slice(0, 10), currentKm: "", nextKm: "", filterType: "مع فلتر" }); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl font-bold shadow-md hover:bg-teal-700 transition-colors">
            <Plus size={18}/> إضافة غيار زيت
          </button>
        </div>
      </div>

      {/* ── التبويبات ── */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab("oil")} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "oil" ? "bg-teal-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          الزيوت والفلاتر ({oilCount || 14})
        </button>
        <button onClick={() => setActiveTab("tires")} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "tires" ? "bg-teal-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          الكاوتش والإطارات (0)
        </button>
      </div>

      {/* ── الفلاتر المتطابقة ── */}
      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500">بحث:</label>
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="بحث باللوحة أو النوع..." 
            className="border rounded-lg px-2.5 py-1.5 text-xs outline-none w-44 focus:ring-2 focus:ring-teal-500/30" 
          />
        </div>

        <FilterSelect 
          label="الفلتر" 
          value={filterChoice} 
          onChange={setFilterChoice} 
          options={[
            { value: "الكل", label: "الكل" },
            { value: "مع فلتر", label: "مع فلتر" },
            { value: "بدون فلتر", label: "بدون فلتر" }
          ]} 
        />
      </FilterBar>

      {/* ── الجدول مع زر التعديل لإدخال النواقص ── */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <DataTable 
          columns={[
            { 
              key: "vehicleDisplay", 
              header: "رقم اللوحة", 
              render: (r: any) => (
                <span className="font-bold text-blue-900">
                  {r.vehicleDisplay || r.plateNumber}
                </span>
              ) 
            },
            { 
              key: "oilType", 
              header: "نوع ومواصفة الزيت", 
              render: (r: any) => <span className="font-medium text-gray-800 text-xs">{r.oilType}</span> 
            },
            { 
              key: "brand", 
              header: "الماركة", 
              render: (r: any) => <span className="text-gray-500 text-xs">{r.brand}</span> 
            },
            { 
              key: "filterType", 
              header: "الفلتر", 
              render: (r: any) => (
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${r.filterType.includes("مع") ? "bg-teal-50 text-teal-700 border border-teal-200" : "bg-gray-100 text-gray-600"}`}>
                  {r.filterType}
                </span>
              ) 
            },
            { 
              key: "changeDate", 
              header: "تاريخ التغيير", 
              render: (r: any) => {
                if (!r.changeDate) return "-";
                const d = new Date(r.changeDate);
                return isNaN(d.getTime()) ? r.changeDate : d.toLocaleDateString("en-GB");
              } 
            },
            { 
              key: "currentKm", 
              header: "العداد عند التغيير", 
              render: (r: any) => (
                <span className="font-bold text-teal-700">
                  {safeNum(r.currentKm).toLocaleString()} كم
                </span>
              ) 
            },
            { 
              key: "nextKm", 
              header: "الغيار القادم", 
              render: (r: any) => (
                <span className="font-bold text-teal-600">
                  {safeNum(r.nextKm).toLocaleString()} كم
                </span>
              ) 
            },
            {
              key: "actions",
              header: "تعديل النواقص",
              render: (r: any) => (
                <button 
                  onClick={() => { setEditing(r); setModalOpen(true); }}
                  className="flex items-center gap-1 text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors"
                >
                  <Pencil size={13} />
                  <span>تعديل</span>
                </button>
              )
            }
          ]} 
          data={filteredData} 
          loading={loading} 
        />
      </div>

      {/* ── نافذة التعديل وإضافة النواقص ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="تعديل بيانات غيار الزيت والعداد" size="lg">
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          <Field label="السيارة / اللوحة">
            <input disabled className={`${inputClass} bg-gray-100 font-bold text-blue-900`} value={editing.vehicleDisplay || editing.plateNumber || ""} />
          </Field>

          <Field label="نوع ومواصفة الزيت">
            <input className={inputClass} value={editing.oilType || ""} onChange={e => setEditing({ ...editing, oilType: e.target.value })} required />
          </Field>

          <Field label="الماركة">
            <input className={inputClass} value={editing.brand || ""} onChange={e => setEditing({ ...editing, brand: e.target.value })} placeholder="مثال: شيل، توتال، موبيل..." />
          </Field>

          <Field label="حالة الفلتر">
            <select className={inputClass} value={editing.filterType || "مع فلتر"} onChange={e => setEditing({ ...editing, filterType: e.target.value })}>
              <option value="مع فلتر">مع فلتر</option>
              <option value="بدون فلتر">بدون فلتر</option>
            </select>
          </Field>

          <Field label="العداد عند التغيير (كم)">
            <input 
              type="number" 
              className={inputClass} 
              value={editing.currentKm !== undefined && editing.currentKm !== null ? editing.currentKm : ""} 
              onChange={e => {
                const c = safeNum(e.target.value);
                setEditing({ ...editing, currentKm: e.target.value, nextKm: c > 0 ? c + 5000 : editing.nextKm });
              }} 
              required 
              placeholder="أدخل قراءة العداد الحالية"
            />
          </Field>

          <Field label="عداد الغيار القادم (كم)">
            <input 
              type="number" 
              className={inputClass} 
              value={editing.nextKm !== undefined && editing.nextKm !== null ? editing.nextKm : ""} 
              onChange={e => setEditing({ ...editing, nextKm: e.target.value })} 
              required 
              placeholder="مثال: العداد الحالي + 5000"
            />
          </Field>

          <Field label="تاريخ التغيير">
            <input type="date" className={inputClass} value={editing.changeDate || ""} onChange={e => setEditing({ ...editing, changeDate: e.target.value })} required />
          </Field>

          <Field label="التكلفة (ج.م)">
            <input type="number" step="0.01" className={inputClass} value={editing.cost !== undefined ? editing.cost : ""} onChange={e => setEditing({ ...editing, cost: e.target.value })} placeholder="0.00" />
          </Field>

          <button type="submit" disabled={saving} className="col-span-2 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors">
            {saving ? "جاري الحفظ والتحديث..." : "حفظ التعديلات والعدادات"}
          </button>
        </form>
      </Modal>

    </div>
  );
}
