"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { 
  Package, Search, Plus, Save, X, Loader2, Box, DollarSign, AlertTriangle 
} from "lucide-react";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";

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

  const canWrite = user?.role === "admin" || user?.permissions?.includes("spare-parts:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/spare-parts`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const uniqueCategories = ["الكل", ...Array.from(new Set(data.map(r => r.category).filter(Boolean)))];

  const filteredData = data.filter(r => {
    const matchesSearch = (r.partName || "").toLowerCase().includes(search.toLowerCase()) || (r.partNumber || "").toLowerCase().includes(search.toLowerCase()) || (r.supplier || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "الكل" || r.status === statusFilter;
    const matchesCat = categoryFilter === "الكل" || r.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCat;
  });

  const lowStockItems = filteredData.filter(r => safeNum(r.quantity) <= safeNum(r.minimumQuantity) || r.status === "out_of_stock");
  const totalStockValue = filteredData.reduce((sum, item) => sum + (safeNum(item.quantity) * safeNum(item.unitPrice)), 0);

  const mapRow = (row: Record<string, any>) => {
    const name = row["اسم القطعة"] || row["partName"] || "";
    if (!String(name).trim()) return null;
    let st = "available";
    if (row["الحالة"] === "مخزون منخفض") st = "low";
    if (row["الحالة"] === "نفذ المخزون") st = "out_of_stock";

    return {
      partName: String(name).trim(),
      partNumber: row["رقم القطعة"] || "",
      category: row["الفئة"] || "",
      quantity: safeNum(row["الكمية المتاحة"]),
      minimumQuantity: safeNum(row["الحد الأدنى"]),
      unitPrice: safeNum(row["سعر الوحدة"]),
      supplier: row["المورد"] || "",
      location: row["الموقع بالمخزن"] || "",
      status: st,
      notes: row["ملاحظات"] || "",
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
            if (res.ok) ok++; else failed++;
            continue;
          }
        }
        const res = await fetch("/api/spare-parts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) ok++; else failed++;
      } catch { failed++; }
    }
    await load();
    return { ok, failed };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = { ...editing, quantity: safeNum(editing.quantity), minimumQuantity: safeNum(editing.minimumQuantity), unitPrice: safeNum(editing.unitPrice) };
      const res = await fetch(isEdit ? `/api/spare-parts/${editing.id}` : "/api/spare-parts", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.success !== false) { setModalOpen(false); load(); } else { alert(resData.error || "حدث خطأ أثناء الحفظ"); }
    } catch { alert("تعذر الاتصال بالخادم."); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه القطعة؟")) return;
    await fetch(`/api/spare-parts/${id}`, { method: "DELETE" }); load();
  };

  const excelData = filteredData.map((r) => ({
    "اسم القطعة": r.partName, "رقم القطعة": r.partNumber, "الفئة": r.category, "الكمية المتاحة": safeNum(r.quantity),
    "الحد الأدنى": safeNum(r.minimumQuantity), "سعر الوحدة (ج.م)": safeNum(r.unitPrice), "المورد": r.supplier,
    "الموقع بالمخزن": r.location, "الحالة": r.status === "available" ? "متوفر" : r.status === "low" ? "منخفض" : "نفذ", "تاريخ الإضافة": r.createdAt
  }));

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-blue-200 text-xs font-bold mb-1">أصناف قطع الغيار</div><div className="text-3xl font-black">{data.length}</div></div><div className="p-2.5 bg-white/10 rounded-xl"><Box size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-sky-600 to-cyan-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-cyan-100 text-xs font-bold mb-1">إجمالي قيمة المخزون</div><div className="text-3xl font-black">{totalStockValue.toLocaleString()} <span className="text-sm">ج.م</span></div></div><div className="p-2.5 bg-white/10 rounded-xl"><DollarSign size={22} /></div></div></div>
        <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-amber-100 text-xs font-bold mb-1">أصناف تحت الحد الأدنى</div><div className="text-3xl font-black">{lowStockItems.length}</div></div><div className="p-2.5 bg-white/10 rounded-xl"><AlertTriangle size={22} /></div></div></div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Package size={24} /></div><div><h1 className="text-xl font-black text-gray-900">مخزون قطع الغيار</h1><p className="text-sm text-gray-500 mt-0.5">إجمالي {filteredData.length} صنف مطابق</p></div></div>
        <div className="flex items-center gap-3 flex-wrap">
          <ImportExcelButton templateColumns={TEMPLATE_COLUMNS} templateFileName="قالب_قطع_الغيار" mapRow={mapRow} onImport={handleImport} buttonText="استيراد" />
          <ExportExcelButton data={excelData} fileName="مخزون_القطع" dateColumnName="تاريخ الإضافة" />
          {canWrite && <button onClick={() => {setEditing(emptyPart); setIsEdit(false); setModalOpen(true);}} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md"><Plus size={18} /><span>إضافة قطعة</span></button>}
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className="block text-xs font-bold text-gray-700 mb-1.5">بحث شامل</label><div className="relative"><Search size={16} className="absolute inset-y-0 start-3 top-2.5 text-gray-400" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="w-full bg-gray-50 border border-gray-200 rounded-xl ps-9 pe-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1.5">الفئة</label><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none">{uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1.5">الحالة</label><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none"><option value="الكل">الكل</option><option value="available">متوفر</option><option value="low">مخزون منخفض</option><option value="out_of_stock">نفذ المخزون</option></select></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        {loading ? <div className="p-12 flex justify-center text-blue-800"><Loader2 className="animate-spin" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-sm">
                <tr><th className="p-4 border-l border-blue-600/50">القطعة</th><th className="p-4 border-l border-blue-600/50">رقم القطعة</th><th className="p-4 border-l border-blue-600/50">الفئة</th><th className="p-4 border-l border-blue-600/50">الكمية</th><th className="p-4 border-l border-blue-600/50">السعر</th><th className="p-4 border-l border-blue-600/50">الحالة</th><th className="p-4 text-center">الإجراءات</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.map((r, i) => {
                  const isLow = safeNum(r.quantity) <= safeNum(r.minimumQuantity);
                  return (
                  <tr key={r.id} className={`hover:bg-blue-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="p-4 font-black text-blue-900 flex items-center gap-2">{r.partName} {isLow && <AlertTriangle size={14} className="text-amber-500"/>}</td>
                    <td className="p-4 font-semibold text-gray-700">{r.partNumber || "-"}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-gray-200 rounded-md text-xs font-bold">{r.category || "عام"}</span></td>
                    <td className={`p-4 font-bold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>{safeNum(r.quantity)}</td>
                    <td className="p-4 font-bold text-emerald-600">{safeNum(r.unitPrice).toLocaleString()} ج.م</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${r.status === 'available' ? 'bg-emerald-100 text-emerald-700' : r.status === 'low' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{r.status === 'available' ? 'متوفر' : r.status === 'low' ? 'منخفض' : 'نفذ'}</span></td>
                    <td className="p-4 text-center flex justify-center gap-2">
                      <button onClick={() => {setEditing(r); setIsEdit(true); setModalOpen(true);}} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"><Wrench size={16}/></button>
                      <button onClick={() => handleDelete(r.id)} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"><X size={16}/></button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-5">
            <div className="flex justify-between items-center border-b pb-3"><h2 className="text-xl font-black text-blue-900 flex items-center gap-2"><Package/> {isEdit ? "تعديل القطعة" : "إضافة قطعة"}</h2><button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-800"><X size={20}/></button></div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="اسم القطعة *"><input required className={inputClass} value={editing.partName || ""} onChange={e => setEditing({...editing, partName: e.target.value})} /></Field>
                <Field label="رقم القطعة (Part No)"><input className={inputClass} value={editing.partNumber || ""} onChange={e => setEditing({...editing, partNumber: e.target.value})} /></Field>
                <Field label="الفئة"><input className={inputClass} value={editing.category || ""} onChange={e => setEditing({...editing, category: e.target.value})} /></Field>
                <Field label="المورد"><input className={inputClass} value={editing.supplier || ""} onChange={e => setEditing({...editing, supplier: e.target.value})} /></Field>
                <Field label="الكمية المتاحة"><input type="number" className={inputClass} value={editing.quantity || ""} onChange={e => setEditing({...editing, quantity: safeNum(e.target.value)})} /></Field>
                <Field label="الحد الأدنى للتنبيه"><input type="number" className={inputClass} value={editing.minimumQuantity || ""} onChange={e => setEditing({...editing, minimumQuantity: safeNum(e.target.value)})} /></Field>
                <Field label="سعر الوحدة (ج.م)"><input type="number" step="0.01" className={inputClass} value={editing.unitPrice || ""} onChange={e => setEditing({...editing, unitPrice: safeNum(e.target.value)})} /></Field>
                <Field label="الحالة التشغيلية"><select className={inputClass} value={editing.status || "available"} onChange={e => setEditing({...editing, status: e.target.value})}><option value="available">متوفر</option><option value="low">مخزون منخفض</option><option value="out_of_stock">نفذ المخزون</option></select></Field>
                <div className="col-span-2"><Field label="ملاحظات"><textarea className={inputClass} rows={2} value={editing.notes || ""} onChange={e => setEditing({...editing, notes: e.target.value})} /></Field></div>
              </div>
              <div className="flex gap-3 pt-5 border-t"><button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl hover:bg-gray-200">إلغاء</button><button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl flex justify-center items-center gap-2"><Save size={18}/> حفظ</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
