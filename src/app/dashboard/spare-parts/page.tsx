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

export default function SparePartsPage() {
  const { lang, user } = useApp();
  const t = translations[lang];
  const [data, setData] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<SparePart>>(emptyPart);
  const [isEdit, setIsEdit] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("inventory:write");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    const res = await fetch(`/api/spare-parts?${params}`);
    const d = await res.json();
    // Auto-update status based on quantity
    const processed = (Array.isArray(d) ? d : []).map((p: SparePart) => ({
      ...p,
      status: p.quantity === 0 ? "out_of_stock" : p.quantity <= p.minimumQuantity ? "low" : "available"
    }));
    setData(processed);
    setLoading(false);
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const body = { ...editing,
      status: (editing.quantity || 0) === 0 ? "out_of_stock" : (editing.quantity || 0) <= (editing.minimumQuantity || 5) ? "low" : "available"
    };
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `/api/spare-parts/${editing.id}` : "/api/spare-parts";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { setModalOpen(false); load(); }
  };

  const handleDelete = async (row: SparePart) => {
    await fetch(`/api/spare-parts/${row.id}`, { method: "DELETE" });
    load();
  };

  const openAdd = () => { setEditing(emptyPart); setIsEdit(false); setModalOpen(true); };
  const openEdit = (row: SparePart) => { setEditing(row); setIsEdit(true); setModalOpen(true); };
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : "-";

  const categories = [...new Set(data.map(r => r.category).filter(Boolean))];
  const totalValue = data.reduce((s, r) => s + ((r.quantity || 0) * (r.unitPrice || 0)), 0);

  const columns = [
    { key: "partName", header: t.partName, render: (r: SparePart) => <span className="font-semibold text-gray-800 dark:text-white">{r.partName}</span> },
    { key: "partNumber", header: t.partNumber },
    { key: "category", header: t.category },
    { key: "quantity", header: t.quantity, render: (r: SparePart) => (
      <span className={`font-bold ${r.quantity === 0 ? "text-red-500" : r.quantity <= r.minimumQuantity ? "text-yellow-500" : "text-green-600"}`}>
        {r.quantity}
      </span>
    )},
    { key: "minimumQuantity", header: t.minimumQuantity },
    { key: "unitPrice", header: t.unitPrice, render: (r: SparePart) => `${(r.unitPrice || 0).toLocaleString()} ر.س` },
    { key: "status", header: t.status, render: (r: SparePart) => <StatusBadge status={r.status} /> },
    { key: "supplier", header: t.supplier },
    { key: "location", header: lang === "ar" ? "الموقع" : "Location" },
    { key: "createdAt", header: t.createdAt, render: (r: SparePart) => formatDate(r.createdAt) },
  ];

  const inputClass = "w-full border dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>{children}</div>
  );

  return (
    <div className="fade-in">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-4 shadow-sm">
          <div className="text-sm text-gray-500">{lang === "ar" ? "إجمالي قيمة المخزون" : "Total Inventory Value"}</div>
          <div className="text-2xl font-black text-blue-600">{totalValue.toLocaleString()} ر.س</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-4 shadow-sm">
          <div className="text-sm text-gray-500">{lang === "ar" ? "قطع منخفضة" : "Low Stock"}</div>
          <div className="text-2xl font-black text-yellow-500">{data.filter(r => r.status === "low").length}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-4 shadow-sm">
          <div className="text-sm text-gray-500">{lang === "ar" ? "نفذت" : "Out of Stock"}</div>
          <div className="text-2xl font-black text-red-500">{data.filter(r => r.status === "out_of_stock").length}</div>
        </div>
      </div>

      <PageHeader title={lang === "ar" ? "المخزون وقطع الغيار" : "Inventory & Spare Parts"} icon="📦"
        subtitle={lang === "ar" ? `${data.length} قطعة` : `${data.length} parts`}
        onAdd={canWrite ? openAdd : undefined} addLabel={t.addSparePart}
        data={data.map(r => ({ ...r }))} exportFileName="spare_parts"
      >
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`🔍 ${t.search}...`}
          className="border dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
      </PageHeader>

      <FilterBar>
        <FilterSelect label={t.status} value={statusFilter} onChange={setStatusFilter} options={[
          { value: "available", label: t.available },
          { value: "low", label: t.low },
          { value: "out_of_stock", label: t.out_of_stock },
        ]} />
        <FilterSelect label={t.category} value={categoryFilter} onChange={setCategoryFilter}
          options={categories.map(c => ({ value: c, label: c }))} />
      </FilterBar>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <DataTable columns={columns} data={data} loading={loading}
          onEdit={canWrite ? openEdit : undefined}
          onDelete={user?.role === "admin" ? handleDelete : undefined}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? t.edit : t.addSparePart} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t.partName}>
            <input className={inputClass} value={editing.partName || ""} onChange={e => setEditing({...editing, partName: e.target.value})} />
          </Field>
          <Field label={t.partNumber}>
            <input className={inputClass} value={editing.partNumber || ""} onChange={e => setEditing({...editing, partNumber: e.target.value})} />
          </Field>
          <Field label={t.category}>
            <input className={inputClass} value={editing.category || ""} onChange={e => setEditing({...editing, category: e.target.value})} />
          </Field>
          <Field label={t.supplier}>
            <input className={inputClass} value={editing.supplier || ""} onChange={e => setEditing({...editing, supplier: e.target.value})} />
          </Field>
          <Field label={t.quantity}>
            <input type="number" className={inputClass} value={editing.quantity || ""} onChange={e => setEditing({...editing, quantity: parseInt(e.target.value)})} />
          </Field>
          <Field label={t.minimumQuantity}>
            <input type="number" className={inputClass} value={editing.minimumQuantity || ""} onChange={e => setEditing({...editing, minimumQuantity: parseInt(e.target.value)})} />
          </Field>
          <Field label={t.unitPrice}>
            <input type="number" className={inputClass} value={editing.unitPrice || ""} onChange={e => setEditing({...editing, unitPrice: parseFloat(e.target.value)})} />
          </Field>
          <Field label={lang === "ar" ? "الموقع" : "Location"}>
            <input className={inputClass} value={editing.location || ""} onChange={e => setEditing({...editing, location: e.target.value})} />
          </Field>
          <div className="col-span-2">
            <Field label={t.notes}>
              <textarea className={inputClass} rows={2} value={editing.notes || ""} onChange={e => setEditing({...editing, notes: e.target.value})} />
            </Field>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-white font-semibold" style={{ background: "linear-gradient(90deg, #F97316, #EA580C)" }}>
            💾 {t.save}
          </button>
          <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold">
            {t.cancel}
          </button>
        </div>
      </Modal>
    </div>
  );
}
