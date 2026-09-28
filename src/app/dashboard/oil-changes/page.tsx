"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import { 
  Droplet, 
  AlertTriangle, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Save, 
  X, 
  Loader2,
  DollarSign
} from "lucide-react";

interface OilChange {
  id: number;
  vehicleId: number;
  plateNumber: string;
  changeDate: string;
  kmAtChange: number;
  oilType: string;
  oilBrand: string;
  filterChanged: boolean | number;
  airFilterChanged: boolean | number;
  fuelFilterChanged: boolean | number;
  nextChangeKm: number;
  nextChangeDate: string;
  alertKmBefore: number;
  alertDaysBefore: number;
  cost: number;
  technician: string;
  notes: string;
  createdAt: string;
  kmAlert?: boolean;
  dayAlert?: boolean;
  currentKm?: number;
}

interface Vehicle { 
  id: number; 
  plateNumber: string; 
  currentKm: number; 
}

const emptyChange: Partial<OilChange> = {
  plateNumber: "", 
  changeDate: new Date().toISOString().slice(0, 10), 
  kmAtChange: 0,
  oilType: "5W30", 
  oilBrand: "Shell", 
  filterChanged: true, 
  airFilterChanged: false,
  fuelFilterChanged: false, 
  nextChangeKm: 0, 
  nextChangeDate: "", 
  alertKmBefore: 500,
  alertDaysBefore: 7, 
  cost: 0, 
  technician: "", 
  notes: ""
};

// ✅ مكون Field معزول خارج الصفحة لمنع فقدان التركيز أثناء الكتابة
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all";

export default function OilChangesPage() {
  const { lang, user } = useApp();
  const t = translations[lang];
  const [data, setData] = useState<OilChange[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<OilChange>>(emptyChange);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("oil-changes:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (vehicleFilter) params.set("vehicleId", vehicleFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/oil-changes?${params}`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) {
      console.error("Failed to load oil changes:", error);
    } finally {
      setLoading(false);
    }
  }, [vehicleFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/vehicles")
      .then((r) => r.json())
      .then((d) => setVehicles(Array.isArray(d) ? d : []));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    try {
      setSaving(true);
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/oil-changes/${editing.id}` : "/api/oil-changes";

      const payload = {
        ...editing,
        vehicleId: Number(editing.vehicleId) || null,
        kmAtChange: Number(editing.kmAtChange) || 0,
        nextChangeKm: Number(editing.nextChangeKm) || 0,
        alertKmBefore: Number(editing.alertKmBefore) || 0,
        alertDaysBefore: Number(editing.alertDaysBefore) || 0,
        cost: Number(editing.cost) || 0,
        filterChanged: editing.filterChanged ? 1 : 0,
        airFilterChanged: editing.airFilterChanged ? 1 : 0,
        fuelFilterChanged: editing.fuelFilterChanged ? 1 : 0,
        // ✅ معالجة التواريخ لمنع أخطاء PostgreSQL Syntax
        changeDate: editing.changeDate && editing.changeDate.trim() !== "" ? editing.changeDate : null,
        nextChangeDate: editing.nextChangeDate && editing.nextChangeDate.trim() !== "" ? editing.nextChangeDate : null,
      };

      const res = await fetch(url, { 
        method, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });

      const resData = await res.json().catch(() => ({}));

      if (res.ok && resData.error === undefined) { 
        setModalOpen(false); 
        load(); 
      } else {
        alert(resData.error || resData.message || "حدث خطأ أثناء حفظ سجل تغيير الزيوت");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("تعذر الاتصال بالخادم، تأكد من سلامة الاتصال.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: OilChange) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) return;
    try {
      await fetch(`/api/oil-changes/${row.id}`, { method: "DELETE" });
      load();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const openAdd = () => { setEditing(emptyChange); setIsEdit(false); setModalOpen(true); };
  const openEdit = (row: OilChange) => { setEditing({...row}); setIsEdit(true); setModalOpen(true); };
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : "-";

  const alertCount = data.filter(r => r.kmAlert || r.dayAlert).length;
  const totalCost = data.reduce((s, r) => s + (r.cost || 0), 0);

  // تجهيز شيت الإكسيل ببيانات مفصلة
  const excelData = data.map((r) => ({
    "رقم اللوحة": r.plateNumber || "",
    "تاريخ التغيير": r.changeDate || "",
    "العداد عند التغيير (كم)": r.kmAtChange || 0,
    "نوع الزيت": r.oilType || "",
    "ماركة الزيت": r.oilBrand || "",
    "فلتر الزيت": r.filterChanged ? "تم التغيير" : "لم يتغير",
    "فلتر الهواء": r.airFilterChanged ? "تم التغيير" : "لم يتغير",
    "فلتر الوقود": r.fuelFilterChanged ? "تم التغيير" : "لم يتغير",
    "التغيير القادم (كم)": r.nextChangeKm || 0,
    "تاريخ التغيير القادم": r.nextChangeDate || "",
    "التكلفة الإجمالية (ج.م)": r.cost || 0,
    "الفني المسؤول": r.technician || "",
    "ملاحظات": r.notes || "",
  }));

  const columns = [
    { 
      key: "plateNumber", 
      header: "رقم اللوحة", 
      render: (r: OilChange) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-blue-900 dark:text-blue-400">{r.plateNumber}</span>
          {(r.kmAlert || r.dayAlert) && (
            <AlertTriangle size={16} className="text-red-500 animate-pulse" title="يتطلب تغيير زيت فوري" />
          )}
        </div>
      )
    },
    { key: "changeDate", header: "تاريخ التغيير", render: (r: OilChange) => formatDate(r.changeDate) },
    { key: "kmAtChange", header: "العداد وقت التغيير", render: (r: OilChange) => `${(r.kmAtChange || 0).toLocaleString()} كم` },
    { key: "oilType", header: "نوع الزيت" },
    { key: "oilBrand", header: "ماركة الزيت" },
    { 
      key: "filterChanged", 
      header: "فلتر الزيت", 
      render: (r: OilChange) => (r.filterChanged === 1 || r.filterChanged === true) ? (
        <CheckCircle2 size={18} className="text-emerald-500 mx-auto" />
      ) : (
        <XCircle size={18} className="text-gray-300 dark:text-gray-600 mx-auto" />
      ) 
    },
    { 
      key: "nextChangeKm", 
      header: "التغيير القادم (كم)", 
      render: (r: OilChange) => (
        <div>
          <div className={`font-bold ${r.kmAlert ? "text-red-600 dark:text-red-400 font-black" : "text-gray-800 dark:text-gray-200"}`}>
            {(r.nextChangeKm || 0).toLocaleString()} كم
          </div>
          {r.currentKm !== undefined && (
            <div className="text-[11px] text-gray-400">
              الحالي: {(r.currentKm || 0).toLocaleString()} كم
            </div>
          )}
        </div>
      )
    },
    { 
      key: "nextChangeDate", 
      header: "تاريخ التغيير القادم", 
      render: (r: OilChange) => (
        <span className={r.dayAlert ? "text-red-600 dark:text-red-400 font-bold" : "text-gray-600 dark:text-gray-400"}>
          {formatDate(r.nextChangeDate)}
        </span>
      )
    },
    { 
      key: "cost", 
      header: "التكلفة", 
      render: (r: OilChange) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          {(r.cost || 0).toLocaleString()} ج.م
        </span>
      ) 
    },
  ];

  return (
    <div className="w-full space-y-6">
      
      {/* ── تنبيه الزيوت المتأخرة المؤسسي ── */}
      {alertCount > 0 && (
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50/80 dark:bg-red-950/30 dark:border-red-900/50 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-red-500 text-white rounded-xl shadow-md">
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className="font-black text-red-700 dark:text-red-400 text-sm">
                تنبيه صيانة عاجل: {alertCount} سيارات تجاوزت موعد تغيير الزيت أو اقتربت منه!
              </div>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">يرجى جدولة الصيانة الفورية للحفاظ على المحركات</p>
            </div>
          </div>
        </div>
      )}

      {/* ── رأس الصفحة المؤسسي + زر الإكسيل وزر الإضافة ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
            <Droplet size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">سجلات تغيير الزيوت والفلاتر</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              إجمالي {data.length} سجل مسجل بالأسطول • التكلفة: {totalCost.toLocaleString()} ج.م
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ExportExcelButton data={excelData} fileName="سجلات_تغيير_الزيوت" />

          {canWrite && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer"
            >
              <Plus size={18} />
              <span>إضافة سجل زيت</span>
            </button>
          )}
        </div>
      </div>

      {/* ── الفلاتر ── */}
      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">السيارة:</label>
          <select 
            value={vehicleFilter} 
            onChange={e => setVehicleFilter(e.target.value)}
            className="text-xs border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            <option value="">الكل / All</option>
            {vehicles.map(v => <option key={v.id} value={String(v.id)}>{v.plateNumber}</option>)}
          </select>
        </div>
      </FilterBar>

      {/* ── الجدول المؤسسي ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          onEdit={canWrite ? openEdit : undefined} 
          onDelete={user?.role === "admin" ? handleDelete : undefined}
        />
      </div>

      {/* ── المودال المؤسسي للإضافة والتعديل ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? "تعديل سجل الزيت" : "إضافة سجل تغيير زيت جديد"} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="رقم اللوحة *">
              <select 
                required
                className={inputClass} 
                value={editing.plateNumber || ""}
                onChange={e => {
                  const v = vehicles.find(v => v.plateNumber === e.target.value);
                  const currentKm = v?.currentKm || 0;
                  setEditing({
                    ...editing, 
                    plateNumber: e.target.value, 
                    vehicleId: v?.id, 
                    kmAtChange: currentKm,
                    nextChangeKm: currentKm + 5000 // افتراضي 5,000 كم
                  });
                }}
              >
                <option value="">-- اختر السيارة --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.plateNumber}>
                    {v.plateNumber} (العداد الحالي: {(v.currentKm || 0).toLocaleString()} كم)
                  </option>
                ))}
              </select>
            </Field>

            <Field label="تاريخ التغيير">
              <input type="date" className={inputClass} value={editing.changeDate || ""} onChange={e => setEditing({...editing, changeDate: e.target.value})} />
            </Field>

            <Field label="العداد وقت التغيير (كم) *">
              <input 
                type="number" 
                required
                className={inputClass} 
                value={editing.kmAtChange || ""} 
                onChange={e => {
                  const km = parseInt(e.target.value) || 0;
                  setEditing({...editing, kmAtChange: km, nextChangeKm: km + 5000});
                }} 
              />
            </Field>

            <Field label="نوع الزيت">
              <select className={inputClass} value={editing.oilType || "5W30"} onChange={e => setEditing({...editing, oilType: e.target.value})}>
                <option value="5W30">5W30 (موصى به)</option>
                <option value="10W40">10W40</option>
                <option value="0W20">0W20</option>
                <option value="15W40">15W40</option>
                <option value="20W50">20W50</option>
              </select>
            </Field>

            <Field label="ماركة الزيت">
              <input className={inputClass} value={editing.oilBrand || ""} onChange={e => setEditing({...editing, oilBrand: e.target.value})} placeholder="مثال: شيل / شل" />
            </Field>

            <Field label="إجمالي التكلفة (ج.م)">
              <input type="number" className={inputClass} value={editing.cost || ""} onChange={e => setEditing({...editing, cost: parseFloat(e.target.value) || 0})} />
            </Field>

            <Field label="التغيير القادم عند عداد (كم)">
              <input type="number" className={inputClass} value={editing.nextChangeKm || ""} onChange={e => setEditing({...editing, nextChangeKm: parseInt(e.target.value) || 0})} />
            </Field>

            <Field label="تاريخ التغيير القادم المتوقع">
              <input type="date" className={inputClass} value={editing.nextChangeDate || ""} onChange={e => setEditing({...editing, nextChangeDate: e.target.value})} />
            </Field>

            <Field label="التنبيه قبل (كيلومترات)">
              <input type="number" className={inputClass} value={editing.alertKmBefore || ""} onChange={e => setEditing({...editing, alertKmBefore: parseInt(e.target.value) || 0})} placeholder="مثال: 500 كم" />
            </Field>

            <Field label="الفني / المهندس المسؤول">
              <input className={inputClass} value={editing.technician || ""} onChange={e => setEditing({...editing, technician: e.target.value})} />
            </Field>

            {/* الفلاتر المستبدلة */}
            <div className="col-span-2 bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-wrap gap-6">
              {[
                { key: "filterChanged" as const, label: "تم تغيير فلتر الزيت" },
                { key: "airFilterChanged" as const, label: "تم تغيير فلتر الهواء" },
                { key: "fuelFilterChanged" as const, label: "تم تغيير فلتر الوقود" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={!!editing[key]} 
                    onChange={e => setEditing({...editing, [key]: e.target.checked})}
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500/50 border-gray-300 dark:border-gray-700" 
                  />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>

            <div className="col-span-2">
              <Field label="ملاحظات وتفاصيل إضافية">
                <textarea className={inputClass} rows={2} value={editing.notes || ""} onChange={e => setEditing({...editing, notes: e.target.value})} />
              </Field>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button 
              type="button" 
              onClick={() => setModalOpen(false)} 
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold transition-all hover:opacity-90 disabled:opacity-50 bg-blue-900 hover:bg-blue-800 shadow-md cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>حفظ سجل الزيت</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
