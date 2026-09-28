"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ui/ExportExcelButton";
import { 
  Fuel, 
  DollarSign, 
  Droplets, 
  Search, 
  Save, 
  X,
  Loader2
} from "lucide-react";

interface FuelRecord {
  id: number;
  vehicleId: number;
  plateNumber: string;
  driverName: string;
  liters: number;
  costPerLiter: number;
  totalCost: number;
  odometer: number;
  station: string;
  fuelDate: string;
  notes: string;
  createdAt: string;
}

interface Vehicle { 
  id: number; 
  plateNumber: string; 
  driverName: string; 
}

const emptyRecord: Partial<FuelRecord> = {
  plateNumber: "", 
  driverName: "", 
  liters: 0, 
  costPerLiter: 2.5, 
  totalCost: 0,
  odometer: 0, 
  station: "", 
  fuelDate: new Date().toISOString().slice(0, 10), 
  notes: ""
};

// ✅ مكون Field خارج الصفحة (يمنع فقدان التركيز)
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all";

export default function FuelPage() {
  const { lang, user } = useApp();
  const t = translations[lang];
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("fuel:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (driverFilter) params.set("driver", driverFilter);
      if (stationFilter) params.set("station", stationFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/fuel?${params}`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) {
      console.error("Failed to load fuel records:", error);
    } finally {
      setLoading(false);
    }
  }, [search, driverFilter, stationFilter, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/vehicles")
      .then((r) => r.json())
      .then((d) => setVehicles(Array.isArray(d) ? d : []));
  }, []);

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/fuel/${editing.id}` : "/api/fuel";

      const payload = {
        ...editing,
        vehicleId: Number(editing.vehicleId) || null,
        liters: Number(editing.liters) || 0,
        costPerLiter: Number(editing.costPerLiter) || 0,
        totalCost: Number(editing.totalCost) || 0,
        odometer: Number(editing.odometer) || 0,
        fuelDate: editing.fuelDate && editing.fuelDate.trim() !== "" ? editing.fuelDate : null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        load();
      } else {
        const errData = await res.json();
        alert(errData.error || "حدث خطأ أثناء حفظ سجل الوقود");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("تعذر الاتصال بالخادم، تأكد من سلامة الاتصال.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: FuelRecord) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
    try {
      await fetch(`/api/fuel/${row.id}`, { method: "DELETE" });
      load();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const openAdd = () => {
    setEditing(emptyRecord);
    setIsEdit(false);
    setModalOpen(true);
  };

  const openEdit = (row: FuelRecord) => {
    setEditing({ ...row });
    setIsEdit(true);
    setModalOpen(true);
  };

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : "-";

  const totalCost = data.reduce((s, r) => s + (r.totalCost || 0), 0);
  const totalLiters = data.reduce((s, r) => s + (r.liters || 0), 0);

  // تجهيز بيانات الإكسيل بعناوين عربية
  const excelData = data.map((r) => ({
    "رقم اللوحة": r.plateNumber || "",
    "اسم السائق": r.driverName || "",
    "اللترات": r.liters || 0,
    "سعر اللتر": r.costPerLiter || 0,
    "التكلفة الإجمالية": r.totalCost || 0,
    "العداد (كم)": r.odometer || 0,
    "المحطة": r.station || "",
    "تاريخ التزود": r.fuelDate || "",
    "ملاحظات": r.notes || "",
    "تاريخ الإنشاء": r.createdAt || "",
  }));

  const columns = [
    {
      key: "plateNumber",
      header: t.plateNumber,
      render: (r: FuelRecord) => (
        <span className="font-bold text-blue-900 dark:text-blue-400">{r.plateNumber}</span>
      ),
    },
    { key: "driverName", header: t.driverName },
    {
      key: "liters",
      header: t.liters,
      render: (r: FuelRecord) => (
        <span className="font-semibold text-sky-600 dark:text-sky-400">{r.liters} L</span>
      ),
    },
    {
      key: "costPerLiter",
      header: t.costPerLiter,
      render: (r: FuelRecord) => `${r.costPerLiter} ج.م`,
    },
    {
      key: "totalCost",
      header: t.totalCost,
      render: (r: FuelRecord) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          {r.totalCost?.toLocaleString()} ج.م
        </span>
      ),
    },
    {
      key: "odometer",
      header: t.odometer,
      render: (r: FuelRecord) => `${(r.odometer || 0).toLocaleString()} كم`,
    },
    { key: "station", header: t.station },
    {
      key: "fuelDate",
      header: t.fuelDate,
      render: (r: FuelRecord) => formatDate(r.fuelDate),
    },
    {
      key: "createdAt",
      header: t.createdAt,
      render: (r: FuelRecord) => formatDate(r.createdAt),
    },
  ];

  const drivers = [...new Set(vehicles.map((v) => v.driverName).filter(Boolean))];
  const stations = [...new Set(data.map((r) => r.station).filter(Boolean))];

  return (
    <div className="w-full space-y-6">
      
      {/* ── كروت الملخص المؤسسية (أزرق مدرج) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-blue-200 text-xs font-bold mb-1">
                {lang === "ar" ? "إجمالي تكلفة الوقود" : "Total Fuel Cost"}
              </div>
              <div className="text-3xl font-black">{totalCost.toLocaleString()} <span className="text-sm font-medium">ج.م</span></div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-sky-600 to-cyan-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-cyan-100 text-xs font-bold mb-1">
                {lang === "ar" ? "إجمالي اللترات المستهلكة" : "Total Liters"}
              </div>
              <div className="text-3xl font-black">{totalLiters.toLocaleString()} <span className="text-sm font-medium">L</span></div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
              <Droplets size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* ── رأس الصفحة + زر الإكسيل + زر الإضافة ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
            <Fuel size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">
              {lang === "ar" ? "سجلات الوقود" : "Fuel Records"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {data.length} {lang === "ar" ? "سجل مسجل" : "records"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* زر الإكسيل */}
          <ExportExcelButton data={excelData} fileName="سجلات_الوقود" />

          {/* البحث */}
          <div className="relative">
            <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "ar" ? "بحث..." : "Search..."}
              className="border border-gray-200 dark:border-gray-700 rounded-xl ps-9 pe-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 w-44"
            />
          </div>

          {/* زر الإضافة */}
          {canWrite && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-bold text-sm transition-all shadow-md"
            >
              <Fuel size={16} />
              <span>{t.addFuelRecord || "إضافة سجل وقود"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── الفلاتر ── */}
      <FilterBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        showDateRange
      >
        <FilterSelect
          label={t.driverName}
          value={driverFilter}
          onChange={setDriverFilter}
          options={drivers.map((d) => ({ value: d, label: d }))}
        />
        <FilterSelect
          label={t.station}
          value={stationFilter}
          onChange={setStationFilter}
          options={stations.map((s) => ({ value: s, label: s }))}
        />
      </FilterBar>

      {/* ── الجدول ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          onEdit={canWrite ? openEdit : undefined}
          onDelete={user?.role === "admin" ? handleDelete : undefined}
        />
      </div>

      {/* ── المودال المؤسسي ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEdit ? t.edit : t.addFuelRecord}
        size="md"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label={t.plateNumber}>
            <select
              className={inputClass}
              value={editing.plateNumber || ""}
              onChange={(e) => {
                const v = vehicles.find((v) => v.plateNumber === e.target.value);
                setEditing({
                  ...editing,
                  plateNumber: e.target.value,
                  vehicleId: v?.id,
                  driverName: v?.driverName || editing.driverName,
                });
              }}
            >
              <option value="">-- {lang === "ar" ? "اختر" : "Select"} --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.plateNumber}>
                  {v.plateNumber}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.driverName}>
            <input
              className={inputClass}
              value={editing.driverName || ""}
              onChange={(e) => setEditing({ ...editing, driverName: e.target.value })}
            />
          </Field>

          <Field label={t.liters}>
            <input
              type="number"
              className={inputClass}
              value={editing.liters || ""}
              onChange={(e) => {
                const liters = parseFloat(e.target.value) || 0;
                setEditing({
                  ...editing,
                  liters,
                  totalCost: liters * (editing.costPerLiter || 0),
                });
              }}
            />
          </Field>

          <Field label={t.costPerLiter}>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={editing.costPerLiter || ""}
              onChange={(e) => {
                const cpl = parseFloat(e.target.value) || 0;
                setEditing({
                  ...editing,
                  costPerLiter: cpl,
                  totalCost: (editing.liters || 0) * cpl,
                });
              }}
            />
          </Field>

          <Field label={t.totalCost}>
            <input
              type="number"
              className={`${inputClass} bg-gray-100 dark:bg-gray-900 cursor-not-allowed`}
              value={editing.totalCost || ""}
              readOnly
            />
          </Field>

          <Field label={t.odometer}>
            <input
              type="number"
              className={inputClass}
              value={editing.odometer || ""}
              onChange={(e) =>
                setEditing({ ...editing, odometer: parseInt(e.target.value) || 0 })
              }
            />
          </Field>

          <Field label={t.station}>
            <input
              className={inputClass}
              value={editing.station || ""}
              onChange={(e) => setEditing({ ...editing, station: e.target.value })}
            />
          </Field>

          <Field label={t.fuelDate}>
            <input
              type="date"
              className={inputClass}
              value={editing.fuelDate || ""}
              onChange={(e) => setEditing({ ...editing, fuelDate: e.target.value })}
            />
          </Field>

          <div className="col-span-2">
            <Field label={t.notes}>
              <textarea
                className={inputClass}
                rows={2}
                value={editing.notes || ""}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
            </Field>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold transition-all hover:opacity-90 disabled:opacity-50 bg-gradient-to-r from-[#F97316] to-[#EA580C] shadow-md"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>جارِ الحفظ...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{t.save || "حفظ"}</span>
              </>
            )}
          </button>
          <button
            onClick={() => setModalOpen(false)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold transition-colors"
          >
            <X size={16} />
            <span>{t.cancel || "إلغاء"}</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
