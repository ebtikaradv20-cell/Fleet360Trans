"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";

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
  partName: "", partNumber: "", category: "", quantity: 0,
  minimumQuantity: 5, unitPrice: 0, supplier: "", location: "", status: "available", notes: ""
};

// 1. عزل مكون Field خارج الصفحة لمنع فقدان التركيز
const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>{children}</div>
);

const inputClass = "w-full border dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function SparePartsPage() {
  const { lang, user } = useApp();
  const t = translations[lang];
  const [data, setData] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<SparePart>>(emptyPart);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false); // 2. حالة الحفظ لمنع التكرار
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

  // 3. معالجة الحفظ وتنظيف البيانات قبل إرسالها للـ API وتعديل العملة لمصر
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

  const columns = [
    { key: "partName", header: t.partName || "اسم القطعة", render: (r: SparePart) => <span className="font-bold text-blue-600 dark:text-blue-400">{r.partName}</span> },
    { key: "partNumber", header: t.partNumber || "رقم القطعة" },
    { key: "category", header: t.category || "الفئة" },
    { key: "quantity", header: t.quantity || "الكمية", render: (r: SparePart) => (
      <span className={r.quantity <= (r.minimumQuantity || 0) ? "text-red-500 font-bold" : ""}>
        {(r.quantity || 0).toLocaleString()}
      </span>
    )},
    { key: "unitPrice", header: t.unitPrice || "سعر الوحدة", render: (r: SparePart) => `${(r.unitPrice || 0).toLocaleString()} ج.م` }, // التعديل إلى الجنيه المصري
    { key: "status", header: t.status || "الحالة", render: (r: SparePart) => <StatusBadge status={r.status} /> },
    { key: "location", header: t.location || "الموقع" },
    { key: "createdAt", header: t.createdAt, render: (r: SparePart) => formatDate(r.createdAt) },
  ];

  const categories = [...new Set(data.map(r => r.category).filter(Boolean))];

  return (
    <div className="fade-in">
      <PageHeader
        title={lang === "ar" ? "مخزون قطع الغيار" : "Spare Parts Inventory"} icon="🔩"
        subtitle={lang === "ar" ? `إجمالي ${data.length} صنف` : `Total ${data.length} items`}
        onAdd={canWrite ? openAdd : undefined}
        addLabel={t.addSparePart || "إضافة قطعة"}
        data={data.map(r => ({ ...r }))}
        exportFileName="spare_parts"
      >
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`🔍 ${t.search}...`}
          className="border dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
      </PageHeader>

      <FilterBar>
        <FilterSelect label={t.status || "الحالة"} value={statusFilter} onChange={setStatusFilter} options={[
          { value: "available", label: t.available || "متوفر" },
          { value: "low", label: lang === "ar" ? "مخزون منخفض" : "Low Stock" },
          { value: "out_of_stock", label: t.outOfStock || "نفذ المخزون" },
        ]} />
        <FilterSelect label={t.category || "الفئة"} value={categoryFilter} onChange={setCategoryFilter}
          options={categories.map(c => ({ value: c, label: c }))} />
      </FilterBar>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <DataTable columns={columns} data={data} loading={loading}
          onEdit={canWrite ? openEdit : undefined}
          onDelete={user?.role === "admin" ? handleDelete : undefined}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? t.edit : (t.addSparePart || "إضافة قطعة غيار")} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t.partName || "اسم القطعة"}>
            <input className={inputClass} value={editing.partName || ""} onChange={e => setEditing({...editing, partName: e.target.value})} />
          </Field>
          <Field label={t.partNumber || "رقم القطعة"}>
            <input className={inputClass} value={editing.partNumber || ""} onChange={e => setEditing({...editing, partNumber: e.target.value})} />
          </Field>
          <Field label={t.category || "الفئة"}>
            <input className={inputClass} value={editing.category || ""} onChange={e => setEditing({...editing, category: e.target.value})} />
          </Field>
          <Field label={t.quantity || "الكمية"}>
            <input type="number" className={inputClass} value={editing.quantity || ""} onChange={e => setEditing({...editing, quantity: parseInt(e.target.value) || 0})} />
          </Field>
          <Field label={t.minimumQuantity || "الحد الأدنى"}>
            <input type="number" className={inputClass} value={editing.minimumQuantity || ""} onChange={e => setEditing({...editing, minimumQuantity: parseInt(e.target.value) || 0})} />
          </Field>
          <Field label={t.unitPrice || "سعر الوحدة (ج.م)"}>
            <input type="number" step="0.01" className={inputClass} value={editing.unitPrice || ""} onChange={e => setEditing({...editing, unitPrice: parseFloat(e.target.value) || 0})} />
          </Field>
          <Field label={t.supplier || "المورد"}>
            <input className={inputClass} value={editing.supplier || ""} onChange={e => setEditing({...editing, supplier: e.target.value})} />
          </Field>
          <Field label={t.location || "الموقع بالصالة"}>
            <input className={inputClass} value={editing.location || ""} onChange={e => setEditing({...editing, location: e.target.value})} />
          </Field>
          <Field label={t.status || "الحالة"}>
            <select className={inputClass} value={editing.status || "available"} onChange={e => setEditing({...editing, status: e.target.value})}>
              <option value="available">{t.available || "متوفر"}</option>
              <option value="low">{lang === "ar" ? "مخزون منخفض" : "Low Stock"}</option>
              <option value="out_of_stock">{t.outOfStock || "نفذ المخزون"}</option>
            </select>
          </Field>
          <div />
          <div className="col-span-2">
            <Field label={t.notes || "ملاحظات"}>
              <textarea className={inputClass} rows={2} value={editing.notes || ""} onChange={e => setEditing({...editing, notes: e.target.value})} />
            </Field>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50" 
            style={{ background: "linear-gradient(90deg, #F97316, #EA580C)" }}
          >
            {saving ? "⏳ جارِ الحفظ..." : `💾 ${t.save}`}
          </button>
          <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold">
            {t.cancel}
          </button>
        </div>
      </Modal>
    </div>
  );
}
