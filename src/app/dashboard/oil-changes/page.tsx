"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import FilterBar from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import {
  Droplets,
  CircleDot,
  Plus,
  Save,
  X,
  Loader2,
  DollarSign,
  Gauge,
  Calendar,
  Wrench,
  CheckCircle2
} from "lucide-react";

interface OilChange {
  id: number;
  vehicleId?: number;
  plateNumber: string;
  oilType: string;
  oilBrand?: string;
  filterChanged: boolean | number | string;
  changeDate: string;
  odometerAtChange: number | string;
  nextChangeKm: number | string;
  cost: number | string;
  workshop?: string;
  notes?: string;
  is_deleted?: number;
}

interface Tire {
  id: number;
  vehicleId?: number;
  plateNumber: string;
  brand: string;
  size: string;
  tireCount?: number | string;
  installDate: string;
  odometerAtInstall: number | string;
  nextChangeKm: number | string;
  cost: number | string;
  notes?: string;
  is_deleted?: number;
}

interface Vehicle {
  id: number;
  plateNumber: string;
}

const safeNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50";

export default function OilAndTiresPage() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<"oil" | "tires">("oil");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── بيانات وسجلات الزيوت ──
  const [oilChanges, setOilChanges] = useState<OilChange[]>([]);
  const [oilModalOpen, setOilModalOpen] = useState(false);
  const [editingOil, setEditingOil] = useState<Partial<OilChange>>({
    plateNumber: "",
    oilType: "زيت 10,000 كم",
    oilBrand: "",
    filterChanged: true,
    changeDate: new Date().toISOString().slice(0, 10),
    odometerAtChange: 0,
    nextChangeKm: 0,
    cost: 0,
    workshop: "",
    notes: ""
  });

  // ── بيانات وسجلات الكاوتش ──
  const [tires, setTires] = useState<Tire[]>([]);
  const [tireModalOpen, setTireModalOpen] = useState(false);
  const [editingTire, setEditingTire] = useState<Partial<Tire>>({
    plateNumber: "",
    brand: "",
    size: "",
    tireCount: 4,
    installDate: new Date().toISOString().slice(0, 10),
    odometerAtInstall: 0,
    nextChangeKm: 0,
    cost: 0,
    notes: ""
  });

  const [isEdit, setIsEdit] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite =
    user?.role === "owner" ||
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.permissions?.includes("maintenance:write");

  // ── جلب البيانات من السيرفر ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [oilRes, tireRes, vehRes] = await Promise.all([
        fetch("/api/oil-changes").catch(() => null),
        fetch("/api/tires").catch(() => null),
        fetch("/api/vehicles").catch(() => null)
      ]);

      if (oilRes && oilRes.ok) {
        const oilData = await oilRes.json();
        const rawOil = Array.isArray(oilData) ? oilData : oilData.data || [];
        setOilChanges(
          rawOil.map((item: any) => ({
            ...item,
            plateNumber: item.plateNumber || item.plate_number || "",
            oilType: item.oilType || item.oil_type || "زيت محرك",
            oilBrand: item.oilBrand || item.oil_brand || "",
            filterChanged: item.filterChanged ?? item.filter_changed ?? true,
            changeDate: item.changeDate || item.change_date || "",
            odometerAtChange: item.odometerAtChange || item.odometer_at_change || 0,
            nextChangeKm: item.nextChangeKm || item.next_change_km || 0,
            cost: item.cost || 0
          }))
        );
      }

      if (tireRes && tireRes.ok) {
        const tireData = await tireRes.json();
        const rawTires = Array.isArray(tireData) ? tireData : tireData.data || [];
        setTires(
          rawTires.map((item: any) => ({
            ...item,
            plateNumber: item.plateNumber || item.plate_number || "",
            brand: item.brand || "",
            size: item.size || "",
            tireCount: item.tireCount || item.tire_count || 4,
            installDate: item.installDate || item.install_date || item.installation_date || "",
            odometerAtInstall: item.odometerAtInstall || item.odometer_at_install || 0,
            nextChangeKm: item.nextChangeKm || item.next_change_km || 0,
            cost: item.cost || 0
          }))
        );
      }

      if (vehRes && vehRes.ok) {
        const vehData = await vehRes.json();
        setVehicles(Array.isArray(vehData) ? vehData : vehData.data || []);
      }
    } catch (err) {
      console.error("Error loading oil and tires data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── دالة حذف الكاوتش (مؤمنة بالكامل مع Fallback مزدوج وتحديث فوري) ──
  const handleDeleteTire = async (id: number) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف سجل الكاوتش هذا نهائياً؟")) return;

    try {
      // 1. المحاولة عبر المسار الديناميكي
      let res = await fetch(`/api/tires/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      let resData = await res.json().catch(() => ({}));

      // 2. إذا أعاد السيرفر 404 أو 405، نجرب مسار Query Param
      if (res.status === 404 || res.status === 405) {
        res = await fetch(`/api/tires?id=${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
        resData = await res.json().catch(() => ({}));
      }

      if (res.ok && resData.success !== false) {
        // تحديث محلي فوري لإخفاء الصف من الجدول مباشرة
        setTires((prev) => prev.filter((item) => item.id !== id));
        alert(resData.message || "تم حذف سجل الكاوتش بنجاح");
        loadData();
      } else {
        alert(resData.error || "فشل حذف سجل الكاوتش من الخادم.");
      }
    } catch (err) {
      console.error("Delete tire error:", err);
      alert("تعذر الاتصال بالخادم لإتمام عملية الحذف.");
    }
  };

  // ── دالة حذف الزيوت ──
  const handleDeleteOil = async (id: number) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف سجل تغيير الزيت هذا؟")) return;

    try {
      let res = await fetch(`/api/oil-changes/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      let resData = await res.json().catch(() => ({}));

      if (res.status === 404 || res.status === 405) {
        res = await fetch(`/api/oil-changes?id=${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
        resData = await res.json().catch(() => ({}));
      }

      if (res.ok && resData.success !== false) {
        setOilChanges((prev) => prev.filter((item) => item.id !== id));
        alert(resData.message || "تم حذف سجل تغيير الزيت بنجاح");
        loadData();
      } else {
        alert(resData.error || "فشل حذف سجل الزيت من الخادم.");
      }
    } catch (err) {
      console.error("Delete oil error:", err);
      alert("تعذر الاتصال بالخادم لإتمام عملية الحذف.");
    }
  };

  // ── حفظ وتعديل الزيوت ──
  const handleSaveOil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...editingOil,
        vehicleId: Number(editingOil.vehicleId) || null,
        cost: safeNum(editingOil.cost),
        odometerAtChange: safeNum(editingOil.odometerAtChange),
        nextChangeKm: safeNum(editingOil.nextChangeKm),
        filterChanged: Boolean(editingOil.filterChanged)
      };

      const res = await fetch(isEdit ? `/api/oil-changes/${editingOil.id}` : "/api/oil-changes", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success !== false) {
        alert(data.message || "تم حفظ بيانات تغيير الزيت بنجاح");
        setOilModalOpen(false);
        loadData();
      } else {
        alert(data.error || "حدث خطأ أثناء الحفظ");
      }
    } catch {
      alert("تعذر الاتصال بالخادم.");
    } finally {
      setSaving(false);
    }
  };

  // ── حفظ وتعديل الكاوتش ──
  const handleSaveTire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...editingTire,
        vehicleId: Number(editingTire.vehicleId) || null,
        cost: safeNum(editingTire.cost),
        tireCount: Number(editingTire.tireCount) || 4,
        odometerAtInstall: safeNum(editingTire.odometerAtInstall),
        nextChangeKm: safeNum(editingTire.nextChangeKm)
      };

      const res = await fetch(isEdit ? `/api/tires/${editingTire.id}` : "/api/tires", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success !== false) {
        alert(data.message || "تم حفظ بيانات الكاوتش بنجاح");
        setTireModalOpen(false);
        loadData();
      } else {
        alert(data.error || "حدث خطأ أثناء الحفظ");
      }
    } catch {
      alert("تعذر الاتصال بالخادم.");
    } finally {
      setSaving(false);
    }
  };

  // ── التصفية والحسابات الإجمالية ──
  const activeOilList = oilChanges.filter((item) => !item.is_deleted);
  const activeTiresList = tires.filter((item) => !item.is_deleted);

  const filteredOil = activeOilList.filter((item) => {
    const matchesSearch =
      (item.plateNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.oilType || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.oilBrand || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.workshop || "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const filteredTires = activeTiresList.filter((item) => {
    const matchesSearch =
      (item.plateNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.brand || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.size || "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const totalOilCost = activeOilList.reduce((acc, curr) => acc + safeNum(curr.cost), 0);
  const totalTiresCost = activeTiresList.reduce((acc, curr) => acc + safeNum(curr.cost), 0);
  const grandTotalCost = totalOilCost + totalTiresCost;

  const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "-");

  // ── تجهيز بيانات الإكسل ──
  const excelOilData = filteredOil.map((r) => ({
    "رقم اللوحة": r.plateNumber,
    "نوع الزيت": r.oilType,
    "الماركة": r.oilBrand || "-",
    "تغيير الفلتر": r.filterChanged ? "نعم" : "لا",
    "تاريخ التغيير": r.changeDate,
    "قراءة العداد الحالية": safeNum(r.odometerAtChange),
    "العداد القادم": safeNum(r.nextChangeKm),
    "التكلفة (ج.م)": safeNum(r.cost),
    "الورشة / المركز": r.workshop || "-",
    "ملاحظات": r.notes || ""
  }));

  const excelTiresData = filteredTires.map((r) => ({
    "رقم اللوحة": r.plateNumber,
    "ماركة الكاوتش": r.brand,
    "المقاس": r.size,
    "العدد": safeNum(r.tireCount) || 4,
    "تاريخ التركيب": r.installDate,
    "قراءة العداد عند التركيب": safeNum(r.odometerAtInstall),
    "التغيير القادم عند (كم)": safeNum(r.nextChangeKm),
    "التكلفة (ج.م)": safeNum(r.cost),
    "ملاحظات": r.notes || ""
  }));

  // ── أعمدة الجداول ──
  const oilColumns = [
    {
      key: "plateNumber",
      header: "رقم اللوحة",
      render: (r: OilChange) => <span className="font-black text-blue-900 dark:text-blue-400">{r.plateNumber}</span>
    },
    { key: "oilType", header: "نوع ومواصفة الزيت" },
    { key: "oilBrand", header: "الماركة", render: (r: OilChange) => r.oilBrand || "-" },
    {
      key: "filterChanged",
      header: "الفلتر",
      render: (r: OilChange) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-bold ${
            r.filterChanged ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"
          }`}
        >
          {r.filterChanged ? "تم التغيير" : "بدون فلتر"}
        </span>
      )
    },
    { key: "changeDate", header: "تاريخ التغيير", render: (r: OilChange) => formatDate(r.changeDate) },
    {
      key: "odometerAtChange",
      header: "العداد عند التغيير",
      render: (r: OilChange) => `${safeNum(r.odometerAtChange).toLocaleString()} كم`
    },
    {
      key: "nextChangeKm",
      header: "الغيّار القادم",
      render: (r: OilChange) => (
        <span className="font-bold text-teal-600 dark:text-teal-400">
          {safeNum(r.nextChangeKm).toLocaleString()} كم
        </span>
      )
    },
    {
      key: "cost",
      header: "التكلفة",
      render: (r: OilChange) => (
        <span className="font-black text-emerald-600 dark:text-emerald-400">
          {safeNum(r.cost).toLocaleString()} ج.م
        </span>
      )
    }
  ];

  const tireColumns = [
    {
      key: "plateNumber",
      header: "رقم اللوحة",
      render: (r: Tire) => <span className="font-black text-blue-900 dark:text-blue-400">{r.plateNumber}</span>
    },
    {
      key: "brand",
      header: "ماركة الإطار",
      render: (r: Tire) => <span className="font-bold text-gray-900 dark:text-white">{r.brand}</span>
    },
    {
      key: "size",
      header: "المقاس",
      render: (r: Tire) => (
        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs border border-gray-300 dark:border-gray-700">
          {r.size}
        </span>
      )
    },
    { key: "tireCount", header: "العدد", render: (r: Tire) => safeNum(r.tireCount) || 4 },
    { key: "installDate", header: "تاريخ التركيب", render: (r: Tire) => formatDate(r.installDate) },
    {
      key: "odometerAtInstall",
      header: "العداد عند التركيب",
      render: (r: Tire) => `${safeNum(r.odometerAtInstall).toLocaleString()} كم`
    },
    {
      key: "nextChangeKm",
      header: "التغيير القادم",
      render: (r: Tire) => (
        <span className="font-bold text-amber-600 dark:text-amber-400">
          {safeNum(r.nextChangeKm).toLocaleString()} كم
        </span>
      )
    },
    {
      key: "cost",
      header: "التكلفة",
      render: (r: Tire) => (
        <span className="font-black text-emerald-600 dark:text-emerald-400">
          {safeNum(r.cost).toLocaleString()} ج.م
        </span>
      )
    }
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* ── كروت الإحصائيات العلوية ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-blue-200 text-xs font-bold mb-1">إجمالي تكاليف الزيوت والكاوتش</div>
              <div className="text-3xl font-black">
                {grandTotalCost.toLocaleString()} <span className="text-sm font-normal">ج.م</span>
              </div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl">
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-700 to-teal-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-teal-100 text-xs font-bold mb-1">سجلات تغيير الزيت</div>
              <div className="text-3xl font-black">{activeOilList.length}</div>
              <div className="text-[11px] text-teal-200 mt-1">
                التكلفة: {totalOilCost.toLocaleString()} ج.م
              </div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Droplets size={22} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-slate-200 text-xs font-bold mb-1">سجلات الإطارات (الكاوتش)</div>
              <div className="text-3xl font-black">{activeTiresList.length}</div>
              <div className="text-[11px] text-slate-300 mt-1">
                التكلفة: {totalTiresCost.toLocaleString()} ج.م
              </div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl">
              <CircleDot size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* ── شريط الإجراءات والتبويبات ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            {activeTab === "oil" ? <Droplets size={24} /> : <CircleDot size={24} />}
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">
              {activeTab === "oil" ? "إدارة الزيوت والفلاتر" : "إدارة الإطارات (الكاوتش)"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              عرض {activeTab === "oil" ? filteredOil.length : filteredTires.length} سجل مطابق
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ExportExcelButton
            data={activeTab === "oil" ? excelOilData : excelTiresData}
            fileName={activeTab === "oil" ? "سجلات_تغيير_الزيوت" : "سجلات_الكاوتش"}
          />

          {canWrite && (
            <button
              onClick={() => {
                setIsEdit(false);
                if (activeTab === "oil") {
                  setEditingOil({
                    plateNumber: "",
                    oilType: "زيت 10,000 كم",
                    oilBrand: "",
                    filterChanged: true,
                    changeDate: new Date().toISOString().slice(0, 10),
                    odometerAtChange: 0,
                    nextChangeKm: 0,
                    cost: 0,
                    workshop: "",
                    notes: ""
                  });
                  setOilModalOpen(true);
                } else {
                  setEditingTire({
                    plateNumber: "",
                    brand: "",
                    size: "",
                    tireCount: 4,
                    installDate: new Date().toISOString().slice(0, 10),
                    odometerAtInstall: 0,
                    nextChangeKm: 0,
                    cost: 0,
                    notes: ""
                  });
                  setTireModalOpen(true);
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus size={18} />
              <span>{activeTab === "oil" ? "إضافة غيار زيت" : "إضافة أمر كاوتش"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── التبديل بين الزيوت والكاوتش ── */}
      <div className="flex gap-2 p-1.5 bg-white dark:bg-gray-900 rounded-xl w-fit border border-gray-200 dark:border-gray-800 shadow-sm">
        <button
          onClick={() => setActiveTab("oil")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
            activeTab === "oil" ? "bg-teal-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Droplets size={16} />
          <span>الزيوت والفلاتر ({activeOilList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("tires")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
            activeTab === "tires" ? "bg-slate-800 text-white shadow-md" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <CircleDot size={16} />
          <span>الكاوتش والإطارات ({activeTiresList.length})</span>
        </button>
      </div>

      {/* ── الفلتر والبحث ── */}
      <FilterBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        showDateRange
      >
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">بحث:</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باللوحة أو النوع..."
            className="border dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs dark:bg-gray-800 dark:text-white outline-none w-44 focus:border-teal-500"
          />
        </div>
      </FilterBar>

      {/* ── جدول البيانات مع الحذف الفوري ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        {activeTab === "oil" ? (
          <DataTable
            columns={oilColumns}
            data={filteredOil}
            loading={loading}
            onEdit={
              canWrite
                ? (r: OilChange) => {
                    setEditingOil(r);
                    setIsEdit(true);
                    setOilModalOpen(true);
                  }
                : undefined
            }
            onDelete={
              canWrite || user?.role === "admin" || user?.role === "super_admin" || user?.role === "owner"
                ? (r: OilChange) => handleDeleteOil(r.id)
                : undefined
            }
          />
        ) : (
          <DataTable
            columns={tireColumns}
            data={filteredTires}
            loading={loading}
            onEdit={
              canWrite
                ? (r: Tire) => {
                    setEditingTire(r);
                    setIsEdit(true);
                    setTireModalOpen(true);
                  }
                : undefined
            }
            onDelete={
              canWrite || user?.role === "admin" || user?.role === "super_admin" || user?.role === "owner"
                ? (r: Tire) => handleDeleteTire(r.id)
                : undefined
            }
          />
        )}
      </div>

      {/* ── نافذة إضافة / تعديل غيار الزيت ── */}
      {oilModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center bg-teal-700 text-white p-4 rounded-t-2xl shrink-0">
              <h2 className="text-lg font-black flex items-center gap-2">
                <Droplets size={20} />
                {isEdit ? "تعديل سجل غيار الزيت" : "إضافة غيار زيت جديد"}
              </h2>
              <button onClick={() => setOilModalOpen(false)} className="hover:text-red-300">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveOil} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="السيارة *">
                  <select
                    required
                    className={inputClass}
                    value={editingOil.plateNumber || ""}
                    onChange={(e) => {
                      const v = vehicles.find((v) => v.plateNumber === e.target.value);
                      setEditingOil({ ...editingOil, plateNumber: e.target.value, vehicleId: v?.id });
                    }}
                  >
                    <option value="">-- اختر السيارة --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.plateNumber}>
                        {v.plateNumber}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="نوع ومواصفة الزيت *">
                  <input
                    required
                    className={inputClass}
                    value={editingOil.oilType || ""}
                    onChange={(e) => setEditingOil({ ...editingOil, oilType: e.target.value })}
                    placeholder="مثال: زيت 10,000 كم تخليقي"
                  />
                </Field>

                <Field label="ماركة الزيت">
                  <input
                    className={inputClass}
                    value={editingOil.oilBrand || ""}
                    onChange={(e) => setEditingOil({ ...editingOil, oilBrand: e.target.value })}
                    placeholder="مثال: شيل، موبيل، توتال"
                  />
                </Field>

                <Field label="تاريخ التغيير *">
                  <input
                    required
                    type="date"
                    className={inputClass}
                    value={editingOil.changeDate || ""}
                    onChange={(e) => setEditingOil({ ...editingOil, changeDate: e.target.value })}
                  />
                </Field>

                <Field label="قراءة العداد عند التغيير (كم) *">
                  <input
                    required
                    type="number"
                    className={inputClass}
                    value={editingOil.odometerAtChange || ""}
                    onChange={(e) =>
                      setEditingOil({ ...editingOil, odometerAtChange: safeNum(e.target.value) })
                    }
                  />
                </Field>

                <Field label="قراءة العداد للغيّار القادم (كم) *">
                  <input
                    required
                    type="number"
                    className={inputClass}
                    value={editingOil.nextChangeKm || ""}
                    onChange={(e) => setEditingOil({ ...editingOil, nextChangeKm: safeNum(e.target.value) })}
                  />
                </Field>

                <Field label="التكلفة الإجمالية (ج.م) *">
                  <input
                    required
                    type="number"
                    step="0.01"
                    className={inputClass}
                    value={editingOil.cost || ""}
                    onChange={(e) => setEditingOil({ ...editingOil, cost: safeNum(e.target.value) })}
                  />
                </Field>

                <Field label="الورشة / المركز">
                  <input
                    className={inputClass}
                    value={editingOil.workshop || ""}
                    onChange={(e) => setEditingOil({ ...editingOil, workshop: e.target.value })}
                  />
                </Field>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <input
                  type="checkbox"
                  id="filterChanged"
                  checked={Boolean(editingOil.filterChanged)}
                  onChange={(e) => setEditingOil({ ...editingOil, filterChanged: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <label htmlFor="filterChanged" className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  تم تغيير فلتر الزيت مع هذه الصيانة
                </label>
              </div>

              <Field label="ملاحظات">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={editingOil.notes || ""}
                  onChange={(e) => setEditingOil({ ...editingOil, notes: e.target.value })}
                />
              </Field>

              <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setOilModalOpen(false)}
                  className="flex-1 py-2.5 bg-white border text-gray-700 font-bold rounded-xl hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl flex justify-center items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  <span>{isEdit ? "تحديث السجل" : "حفظ الغيار"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── نافذة إضافة / تعديل الكاوتش ── */}
      {tireModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center bg-slate-800 text-white p-4 rounded-t-2xl shrink-0">
              <h2 className="text-lg font-black flex items-center gap-2">
                <CircleDot size={20} />
                {isEdit ? "تعديل سجل الكاوتش" : "إضافة أمر كاوتش جديد"}
              </h2>
              <button onClick={() => setTireModalOpen(false)} className="hover:text-red-300">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveTire} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="السيارة *">
                  <select
                    required
                    className={inputClass}
                    value={editingTire.plateNumber || ""}
                    onChange={(e) => {
                      const v = vehicles.find((v) => v.plateNumber === e.target.value);
                      setEditingTire({ ...editingTire, plateNumber: e.target.value, vehicleId: v?.id });
                    }}
                  >
                    <option value="">-- اختر السيارة --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.plateNumber}>
                        {v.plateNumber}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="ماركة الإطار *">
                  <input
                    required
                    className={inputClass}
                    value={editingTire.brand || ""}
                    onChange={(e) => setEditingTire({ ...editingTire, brand: e.target.value })}
                    placeholder="مثال: بريدجستون، ميشلان، هانكوك"
                  />
                </Field>

                <Field label="مقاس الإطار *">
                  <input
                    required
                    className={inputClass}
                    value={editingTire.size || ""}
                    onChange={(e) => setEditingTire({ ...editingTire, size: e.target.value })}
                    placeholder="مثال: 205/55 R16"
                  />
                </Field>

                <Field label="عدد الإطارات *">
                  <input
                    required
                    type="number"
                    min="1"
                    className={inputClass}
                    value={editingTire.tireCount || 4}
                    onChange={(e) => setEditingTire({ ...editingTire, tireCount: Number(e.target.value) })}
                  />
                </Field>

                <Field label="تاريخ التركيب *">
                  <input
                    required
                    type="date"
                    className={inputClass}
                    value={editingTire.installDate || ""}
                    onChange={(e) => setEditingTire({ ...editingTire, installDate: e.target.value })}
                  />
                </Field>

                <Field label="العداد عند التركيب (كم) *">
                  <input
                    required
                    type="number"
                    className={inputClass}
                    value={editingTire.odometerAtInstall || ""}
                    onChange={(e) =>
                      setEditingTire({ ...editingTire, odometerAtInstall: safeNum(e.target.value) })
                    }
                  />
                </Field>

                <Field label="التغيير القادم عند (كم) *">
                  <input
                    required
                    type="number"
                    className={inputClass}
                    value={editingTire.nextChangeKm || ""}
                    onChange={(e) => setEditingTire({ ...editingTire, nextChangeKm: safeNum(e.target.value) })}
                    placeholder="مثال: 50,000 كم"
                  />
                </Field>

                <Field label="إجمالي التكلفة (ج.م) *">
                  <input
                    required
                    type="number"
                    step="0.01"
                    className={inputClass}
                    value={editingTire.cost || ""}
                    onChange={(e) => setEditingTire({ ...editingTire, cost: safeNum(e.target.value) })}
                  />
                </Field>
              </div>

              <Field label="ملاحظات">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={editingTire.notes || ""}
                  onChange={(e) => setEditingTire({ ...editingTire, notes: e.target.value })}
                />
              </Field>

              <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setTireModalOpen(false)}
                  className="flex-1 py-2.5 bg-white border text-gray-700 font-bold rounded-xl hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex justify-center items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  <span>{isEdit ? "تحديث السجل" : "حفظ أمر الكاوتش"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
