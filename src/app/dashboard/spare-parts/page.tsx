"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
// ✅ المسار المباشر المظبوط
import ExportExcelButton from "@/components/ExportExcelButton";
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  Search, 
  Save, 
  X, 
  Loader2,
  Box,
  DollarSign
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

  const lowStockItems = data.filter(r => (r.quantity || 0) <= (r.minimumQuantity || 0) || r.status === "out_of_stock");
  const totalStockValue = data.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);

  const excelData = data.map((r) => ({
    "اسم القطعة": r.partName || "",
    "رقم القطعة": r.partNumber || "",
    "الفئة": r.category || "غير محدد",
    "الكمية الحالية": r.quantity || 0,
    "الحد الأدنى": r.minimumQuantity || 0,
    "سعر الوحدة (ج.م)": r.unitPrice || 0,
    "إجمالي القيمة (ج.م)": (r.quantity || 0) * (r.unitPrice || 0),
    "المورد": r.supplier || "غير محدد",
    "الموقع بالمخزن": r.location || "غير محدد",
    "الحالة": r.status === "available" ? "متوفر" : r.status === "low" ? "مخزون منخفض" : "نفذ المخزون",
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
    { key: "category", header: t.category || "الفئة" },
    { 
      key: "quantity", 
      header: t.quantity || "الكمية", 
      render: (r: SparePart) => (
        <span className={`font-bold px-2 py-0.5 rounded ${(r.quantity || 0) <= (r.minimumQuantity || 0) ? "text-red-600 bg-red-50 dark:bg-red-950/40" : "text-gray-800 dark:text-gray-200"}`}>
          {(r.quantity || 0).toLocaleString()}
        </span>
      )
    },
    { key: "unitPrice", header: t.unitPrice || "سعر الوحدة", render: (r: SparePart) => `${(r.unitPrice || 0).toLocaleString()} ج.م` },
    { key: "status", header: t.status || "الحالة", render: (r: SparePart) => <StatusBadge status={r.status} /> },
    { key: "location", header: t.location || "الموقع" },
    { key: "createdAt", header: t.createdAt, render: (r: SparePart) => formatDate(r.createdAt) },
  ];

  const categories = [...new Set(data.map(r => r.category).filter(Boolean))];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Package size={24} /></div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">مخزون قطع الغيار</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">إجمالي {data.length} صنف</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ExportExcelButton data={excelData} fileName="مخزون_قطع_الغيار" />
          {canWrite && (
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[#F97316] text-white rounded-xl font-bold text-sm shadow-md">
              <Plus size={18} /><span>إضافة قطعة</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable columns={columns} data={data} loading={loading} onEdit={canWrite ? openEdit : undefined} onDelete={user?.role === "admin" ? handleDelete : undefined} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? t.edit : "إضافة قطعة غيار"} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم القطعة"><input className={inputClass} value={editing.partName || ""} onChange={e => setEditing({...editing, partName: e.target.value})} /></Field>
          <Field label="رقم القطعة"><input className={inputClass} value={editing.partNumber || ""} onChange={e => setEditing({...editing, partNumber: e.target.value})} /></Field>
          <Field label="الفئة"><input className={inputClass} value={editing.category || ""} onChange={e => setEditing({...editing, category: e.target.value})} /></Field>
          <Field label="الكمية"><input type="number" className={inputClass} value={editing.quantity || ""} onChange={e => setEditing({...editing, quantity: parseInt(e.target.value) || 0})} /></Field>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-bold bg-orange-500 hover:bg-orange-600">
            {saving ? "جاري الحفظ..." : "حفظ البيانات"}
          </button>
          <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700">إلغاء</button>
        </div>
      </Modal>
    </div>
  );
}
