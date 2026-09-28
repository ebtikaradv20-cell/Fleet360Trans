"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ui/ExportExcelButton";
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  Search, 
  Save, 
  X, 
  Loader2,
  Box,
  DollarSign,
  Layers,
  MapPin,
  Truck
} from "lucide-react";

interface SparePart {
  id: number;
  partName: string;
  partNumber: string;
  category: string;
  quantity: number;
  minimumQuantity: number;
  unitPrice: number;
  supplier: string;
  location: string;
  status: string;
  notes: string;
  createdAt: string;
}

const emptyPart: Partial<SparePart> = {
  partName: "", 
  partNumber: "", 
  category: "", 
  quantity: 0,
  minimumQuantity: 5, 
  unitPrice: 0, 
  supplier: "", 
  location: "", 
  status: "available", 
  notes: ""
};

// ✅ مكون Field معزول خارج الصفحة لمنع فقدان التركيز عند الكتابة
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all";

export default function SparePartsPage() {
  const { lang, user } = useApp();
  const t = translations[lang];
  const [data, setData] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<SparePart>>(emptyPart);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("spare-parts:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`/api/spare-parts?${params}`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) {
      console.error("Failed to load spare parts:", error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/spare-parts/${editing.id}` : "/api/spare-parts";

      const payload = {
        ...editing,
        quantity: Number(editing.quantity) || 0,
        minimumQuantity: Number(editing.minimumQuantity) || 0,
        unitPrice: Number(editing.unitPrice) || 0,
      };

      const res = await fetch(url, { 
        method, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });

      if (res.ok) { 
        setModalOpen(false); 
        load(); 
      } else {
        const errData = await res.json();
        alert(errData.error || "حدث خطأ أثناء حفظ قطعة الغيار");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("تعذر الاتصال بالخادم، تأكد من سلامة الاتصال.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: SparePart) => {
    if (!confirm("هل أنت متأكد من حذف قطعة الغيار هذه؟")) return;
    try {
      await fetch(`/api/spare-parts/${row.id}`, { method: "DELETE" });
      load();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const openAdd = () => { setEditing(emptyPart); setIsEdit(false); setModalOpen(true); };
  const openEdit = (row: SparePart) => { setEditing({...row}); setIsEdit(true); setModalOpen(true); };
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : "-";

  // إحصائيات المخزون
  const lowStockItems = data.filter(r => (r.quantity || 0) <= (r.minimumQuantity || 0) || r.status === "out_of_stock");
  const totalStockValue = data.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);

  // تجهيز بيانات شيت الإكسيل بأسماء عربية
  const excelData = data.map((r) => ({
    "اسم القطعة": r.partName || "",
    "رقم القطعة (Part No)": r.partNumber || "",
    "الفئة": r.category || "غير محدد",
    "الكمية الحالية": r.quantity || 0,
    "الحد الأدنى": r.minimumQuantity || 0,
    "سعر الوحدة (ج.م)": r.unitPrice || 0,
    "إجمالي القيمة (ج.م)": (r.quantity || 0) * (r.unitPrice || 0),
    "المورد": r.supplier || "غير محدد",
    "الموقع بالمخزن": r.location || "غير محدد",
    "الحالة": r.status === "available" ? "متوفر" : r.status === "low" ? "مخزون منخفض" : "نفذ المخزون",
    "ملاحظات": r.notes || "",
    "تاريخ الإنشاء": r.createdAt || "",
  }));

  const columns = [
    { 
      key: "partName", 
      header: t.partName || "اسم القطعة", 
      render: (r: SparePart) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-blue-900 dark:text-blue-400">{r.partName}</span>
          {(r.quantity || 0) <= (r.minimumQuantity || 0) && (
            <AlertTriangle size={15} className="text-amber-500" title="مخزون منخفض" />
          )}
        </div>
      ) 
    },
    { key: "partNumber", header: t.partNumber || "رقم القطعة" },
    { 
      key: "category", 
      header: t.category || "الفئة",
      render: (r: SparePart) => (
        <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300">
          {r.category || "عام"}
        </span>
      )
    },
    { 
      key: "quantity", 
      header: t.quantity || "الكمية", 
      render: (r: SparePart) => {
        const isLow = (r.quantity || 0) <= (r.minimumQuantity || 0);
        return (
          <span className={`font-bold px-2 py-0.5 rounded ${isLow ? "text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400" : "text-gray-800 dark:text-gray-200"}`}>
            {(r.quantity || 0).toLocaleString()}
          </span>
        );
      }
    },
    { 
      key: "unitPrice", 
      header: t.unitPrice || "سعر الوحدة", 
      render: (r: SparePart) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          {(r.unitPrice || 0).toLocaleString()} ج.م
        </span>
      ) 
    },
    { 
      key: "status", 
      header: t.status || "الحالة", 
      render: (r: SparePart) => <StatusBadge status={r.status} /> 
    },
    { key: "location", header: t.location || "الموقع" },
    { key: "createdAt", header: t.createdAt, render: (r: SparePart) => formatDate(r.createdAt) },
  ];

  const categories = [...new Set(data.map(r => r.category).filter(Boolean))];

  return (
    <div className="w-full space-y-6">
      
      {/* ── كروت إحصائيات المخزون المؤسسية ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-blue-200 text-xs font-bold mb-1">إجمالي أصناف قطع الغيار</div>
              <div className="text-3xl font-black">{data.length} <span className="text-sm font-normal">صنف</span></div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
              <Box size={22} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-sky-600 to-cyan-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-cyan-100 text-xs font-bold mb-1">إجمالي قيمة المخزون</div>
              <div className="text-3xl font-black">{totalStockValue.toLocaleString()} <span className="text-sm font-normal">ج.م</span></div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-amber-100 text-xs font-bold mb-1">أصناف تحت الحد الأدنى</div>
              <div className="text-3xl font-black">{lowStockItems.length} <span className="text-sm font-normal">صنف يحتاج إعادة طلب</span></div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* ── إنذار النواقص المؤسسي ── */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-900/50 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="font-black text-amber-800 dark:text-amber-400 text-sm">
                تنبيه المخزون: هناك {lowStockItems.length} صنف وصل للحد الأدنى أو نفذ من المخزن!
              </div>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">يرجى التواصل مع الموردين لإصدار أوامر شراء جديدة</p>
            </div>
          </div>
        </div>
      )}

      {/* ── رأس الصفحة + زر الإكسيل السحري ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
            <Package size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">
              {lang === "ar" ? "مخزون قطع الغيار" : "Spare Parts Inventory"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              إجمالي {data.length} صنف مسجل بالنظام
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ExportExcelButton data={excelData} fileName="مخزون_قطع_الغيار" />

          <div className="relative">
            <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder={`${t.search || "بحث"}...`}
              className="border border-gray-200 dark:border-gray-700 rounded-xl ps-9 pe-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 w-44" 
            />
          </div>

          {canWrite && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-bold text-sm transition-all shadow-md"
            >
              <Plus size={18} />
              <span>{t.addSparePart || "إضافة قطعة"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── الفلاتر ── */}
      <FilterBar>
        <FilterSelect 
          label={t.status || "الحالة"} 
          value={statusFilter} 
          onChange={setStatusFilter} 
          options={[
            { value: "available", label: t.available || "متوفر" },
            { value: "low", label: lang === "ar" ? "مخزون منخفض" : "Low Stock" },
            { value: "out_of_stock", label: t.outOfStock || "نفذ المخزون" },
          ]} 
        />
        <FilterSelect 
          label={t.category || "الفئة"} 
          value={categoryFilter} 
          onChange={setCategoryFilter}
          options={categories.map(c => ({ value: c, label: c }))} 
        />
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

      {/* ── المودال المؤسسي ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? t.edit : (t.addSparePart || "إضافة قطعة غيار")} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t.partName || "اسم القطعة"}>
            <input className={inputClass} value={editing.partName || ""} onChange={e => setEditing({...editing, partName: e.target.value})} placeholder="مثال: تيل فرامل أمامي" />
          </Field>
          <Field label={t.partNumber || "رقم القطعة (Part No)"}>
            <input className={inputClass} value={editing.partNumber || ""} onChange={e => setEditing({...editing, partNumber: e.target.value})} placeholder="مثال: BP-9920" />
          </Field>
          <Field label={t.category || "الفئة"}>
            <input className={inputClass} value={editing.category || ""} onChange={e => setEditing({...editing, category: e.target.value})} placeholder="مثال: نظام الفرامل" />
          </Field>
          <Field label={t.quantity || "الكمية المتاحة"}>
            <input type="number" className={inputClass} value={editing.quantity || ""} onChange={e => setEditing({...editing, quantity: parseInt(e.target.value) || 0})} />
          </Field>
          <Field label={t.minimumQuantity || "الحد الأدنى للتنبيه"}>
            <input type="number" className={inputClass} value={editing.minimumQuantity || ""} onChange={e => setEditing({...editing, minimumQuantity: parseInt(e.target.value) || 0})} />
          </Field>
          <Field label={t.unitPrice || "سعر الوحدة (ج.م)"}>
            <input type="number" step="0.01" className={inputClass} value={editing.unitPrice || ""} onChange={e => setEditing({...editing, unitPrice: parseFloat(e.target.value) || 0})} />
          </Field>
          <Field label={t.supplier || "المورد"}>
            <input className={inputClass} value={editing.supplier || ""} onChange={e => setEditing({...editing, supplier: e.target.value})} placeholder="اسم الشركة الموردة" />
          </Field>
          <Field label={t.location || "الموقع بالمخزن"}>
            <input className={inputClass} value={editing.location || ""} onChange={e => setEditing({...editing, location: e.target.value})} placeholder="مثال: رف A-3" />
          </Field>
          <div className="col-span-2">
            <Field label={t.status || "الحالة التشغيلية"}>
              <select className={inputClass} value={editing.status || "available"} onChange={e => setEditing({...editing, status: e.target.value})}>
                <option value="available">{t.available || "متوفر"}</option>
                <option value="low">{lang === "ar" ? "مخزون منخفض" : "Low Stock"}</option>
                <option value="out_of_stock">{t.outOfStock || "نفذ المخزون"}</option>
              </select>
            </Field>
          </div>
          <div className="col-span-2">
            <Field label={t.notes || "ملاحظات وتفاصيل إضافية"}>
              <textarea className={inputClass} rows={2} value={editing.notes || ""} onChange={e => setEditing({...editing, notes: e.target.value})} />
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
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{t.save || "حفظ البيانات"}</span>
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
