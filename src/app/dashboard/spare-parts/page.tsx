"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import { 
  Package, Search, Plus, Save, X, Loader2, Box, DollarSign, AlertTriangle, Wrench, Trash2 
} from "lucide-react";

interface SparePart {
  id: number; partName: string; partNumber: string; category: string;
  quantity: number; minimumQuantity: number; unitPrice: number;
  supplier: string; location: string; status: string; notes: string; createdAt: string;
}

const TEMPLATE_COLUMNS = ["اسم القطعة", "رقم القطعة", "الفئة", "الكمية المتاحة", "الحد الأدنى", "سعر الوحدة", "المورد", "الموقع بالمخزن", "الحالة", "ملاحظات"];

const emptyPart: Partial<SparePart> = { partName: "", partNumber: "", category: "", quantity: 0, minimumQuantity: 5, unitPrice: 0, supplier: "", location: "", status: "available", notes: "" };

const safeNum = (val: any): number => { if (val === null || val === undefined) return 0; const num = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(num) ? 0 : num; };
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (<div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>{children}</div>);
const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50";

export default function SparePartsPage() {
  const { user } = useApp();
  const [data, setData] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<SparePart>>(emptyPart);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [categoryFilter, setCategoryFilter] = useState("الكل");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("spare-parts:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "الكل") params.set("status", statusFilter);
      if (categoryFilter && categoryFilter !== "الكل") params.set("category", categoryFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/spare-parts?${params}`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [search, statusFilter, categoryFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const uniqueCategories = ["الكل", ...Array.from(new Set(data.map(r => r.category).filter(Boolean)))];
  const lowStockItems = data.filter(r => safeNum(r.quantity) <= safeNum(r.minimumQuantity) || r.status === "out_of_stock");
  const totalStockValue = data.reduce((sum, item) => sum + (safeNum(item.quantity) * safeNum(item.unitPrice)), 0);

  const mapRow = (row: Record<string, any>) => {
    const name = row["اسم القطعة"] || row["partName"] || "";
    if (!String(name).trim()) return null;
    let st = "available";
    if (row["الحالة"] === "مخزون منخفض") st = "low";
    if (row["الحالة"] === "نفذ المخزون") st = "out_of_stock";
    return {
      partName: String(name).trim(), partNumber: row["رقم القطعة"] || "", category: row["الفئة"] || "",
      quantity: safeNum(row["الكمية المتاحة"]), minimumQuantity: safeNum(row["الحد الأدنى"]), unitPrice: safeNum(row["سعر الوحدة"]),
      supplier: row["المورد"] || "", location: row["الموقع بالمخزن"] || "", status: st, notes: row["ملاحظات"] || "",
    };
  };

  const handleImport = async (rows: any[], mode: "append" | "upsert") => {
    let ok = 0; let failed = 0;
    for (const payload of rows) {
      try {
        if (mode === "upsert" && payload.partNumber) {
          const existing = data.find(v => v.partNumber === payload.partNumber);
          if (existing) {
            const res = await fetch(`/api/spare-parts/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (res.ok) ok++; else failed++; continue;
          }
        }
        const res = await fetch("/api/spare-parts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) ok++; else failed++;
      } catch { failed++; }
    }
    await load(); return { ok, failed };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = { ...editing, quantity: safeNum(editing.quantity), minimumQuantity: safeNum(editing.minimumQuantity), unitPrice: safeNum(editing.unitPrice) };
      const res = await fetch(isEdit ? `/api/spare-parts/${editing.id}` : "/api/spare-parts", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setModalOpen(false); load(); } else { alert("حدث خطأ أثناء الحفظ"); }
    } catch { alert("تعذر الاتصال بالخادم."); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه القطعة؟")) return;
    await fetch(`/api/spare-parts/${id}`, { method: "DELETE" }); load();
  };

  const excelData = data.map((r) => ({
    "اسم القطعة": r.partName, "رقم القطعة": r.partNumber, "الفئة": r.category, "الكمية المتاحة": safeNum(r.quantity),
    "الحد الأدنى": safeNum(r.minimumQuantity), "سعر الوحدة (ج.م)": safeNum(r.unitPrice), "المورد": r.supplier,
    "الموقع بالمخزن": r.location, "الحالة": r.status === "available" ? "متوفر" : r.status === "low" ? "منخفض" : "نفذ", "تاريخ الإضافة": r.createdAt
  }));

  const columns = [
    { key: "partName", header: "اسم القطعة", render: (r: SparePart) => <div className="flex items-center gap-2"><span className="font-bold text-blue-900 dark:text-blue-400">{r.partName}</span>{(safeNum(r.quantity) <= safeNum(r.minimumQuantity)) && <AlertTriangle size={15} className="text-amber-500" />}</div> },
    { key: "partNumber", header: "رقم القطعة" },
    { key: "category", header: "الفئة", render: (r: SparePart) => <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-semibold">{r.category || "عام"}</span> },
    { key: "quantity", header: "الكمية", render: (r: SparePart) => <span className={`font-bold px-2 py-0.5 rounded ${safeNum(r.quantity) <= safeNum(r.minimumQuantity) ? "text-red-600 bg-red-50 dark:bg-red-950/40" : ""}`}>{safeNum(r.quantity).toLocaleString()}</span> },
    { key: "unitPrice", header: "السعر", render: (r: SparePart) => <span className="font-bold text-emerald-600">{safeNum(r.unitPrice).toLocaleString()} ج.م</span> },
    { key: "status", header: "الحالة", render: (r: SparePart) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-blue-200 text-xs font-bold mb-1">أصناف قطع الغيار</div><div className="text-3xl font-black">{data.length}</div></div><div className="p-2.5 bg-white/10 rounded-xl"><Box size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-sky-600 to-cyan-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-cyan-100 text-xs font-bold mb-1">إجمالي قيمة المخزون</div><div className="text-3xl font-black">{totalStockValue.toLocaleString()} <span className="text-sm">ج.م</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><DollarSign size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-amber-100 text-xs font-bold mb-1">أصناف تحت الحد الأدنى</div><div className="text-3xl font-black">{lowStockItems.length}</div></div><div className="p-2.5 bg-white/10 rounded-xl"><AlertTriangle size={22} /></div></div></div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Package size={24} /></div><div><h1 className="text-xl font-black text-gray-900">مخزون قطع الغيار</h1><p className="text-sm text-gray-500 mt-0.5">إجمالي {data.length} صنف</p></div></div>
        <div className="flex items-center gap-3 flex-wrap">
          <ImportExcelButton templateColumns={TEMPLATE_COLUMNS} templateFileName="قالب_قطع_الغيار" mapRow={mapRow} onImport={handleImport} buttonText="استيراد" />
          <ExportExcelButton data={excelData} fileName="مخزون_القطع" dateColumnName="تاريخ الإضافة" />
          {canWrite && <button onClick={() => {setEditing(emptyPart); setIsEdit(false); setModalOpen(true);}} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md"><Plus size={18} /><span>إضافة قطعة</span></button>}
        </div>
      </div>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">بحث:</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="border dark:border-gray-700 rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:text-white focus:outline-none w-32 text-xs" />
        </div>
        <FilterSelect label="الفئة" value={categoryFilter} onChange={setCategoryFilter} options={uniqueCategories.map(c => ({ value: c, label: c }))} />
        <FilterSelect label="الحالة" value={statusFilter} onChange={setStatusFilter} options={[{ value: "الكل", label: "الكل" }, { value: "available", label: "متوفر" }, { value: "low", label: "مخزون منخفض" }, { value: "out_of_stock", label: "نفذ المخزون" }]} />
      </FilterBar>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <DataTable columns={columns} data={data} loading={loading} onEdit={canWrite ? (r) => {setEditing(r); setIsEdit(true); setModalOpen(true);} : undefined} onDelete={user?.role === "admin" ? (r) => handleDelete(r.id) : undefined} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? "تعديل القطعة" : "إضافة قطعة"} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="اسم القطعة *"><input required className={inputClass} value={editing.partName || ""} onChange={e => setEditing({...editing, partName: e.target.value})} /></Field>
            <Field label="رقم القطعة (Part No)"><input className={inputClass} value={editing.partNumber || ""} onChange={e => setEditing({...editing, partNumber: e.target.value})} /></Field>
            <Field label="الفئة"><input className={inputClass} value={editing.category || ""} onChange={e => setEditing({...editing, category: e.target.value})} /></Field>
            <Field label="الكمية المتاحة"><input type="number" className={inputClass} value={editing.quantity || ""} onChange={e => setEditing({...editing, quantity: safeNum(e.target.value)})} /></Field>
            <Field label="الحد الأدنى للتنبيه"><input type="number" className={inputClass} value={editing.minimumQuantity || ""} onChange={e => setEditing({...editing, minimumQuantity: safeNum(e.target.value)})} /></Field>
            <Field label="سعر الوحدة (ج.م)"><input type="number" step="0.01" className={inputClass} value={editing.unitPrice || ""} onChange={e => setEditing({...editing, unitPrice: safeNum(e.target.value)})} /></Field>
            <Field label="المورد"><input className={inputClass} value={editing.supplier || ""} onChange={e => setEditing({...editing, supplier: e.target.value})} /></Field>
            <Field label="الموقع بالمخزن"><input className={inputClass} value={editing.location || ""} onChange={e => setEditing({...editing, location: e.target.value})} /></Field>
            <div className="col-span-2">
              <Field label="الحالة التشغيلية">
                <select className={inputClass} value={editing.status || "available"} onChange={e => setEditing({...editing, status: e.target.value})}>
                  <option value="available">متوفر</option><option value="low">مخزون منخفض</option><option value="out_of_stock">نفذ المخزون</option>
                </select>
              </Field>
            </div>
            <div className="col-span-2"><Field label="ملاحظات وتفاصيل إضافية"><textarea className={inputClass} rows={2} value={editing.notes || ""} onChange={e => setEditing({...editing, notes: e.target.value})} /></Field></div>
          </div>
          <div className="flex gap-3 pt-5 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-700">إلغاء</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl flex justify-center items-center gap-2"><Save size={18}/> حفظ</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
