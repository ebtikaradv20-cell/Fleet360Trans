"use client";
import React, { useRef, useState } from "react";
import { Upload, FileDown, Loader2, X, FileSpreadsheet } from "lucide-react";
import { readExcelFile, downloadExcelTemplate } from "@/lib/excel";

export type ImportMode = "append" | "upsert";

interface ImportExcelButtonProps {
  templateColumns: string[];
  templateFileName: string;
  sampleRow?: Record<string, any>;
  mapRow: (row: Record<string, any>) => any | null;
  onImport: (rows: any[], mode: ImportMode) => Promise<{ ok: number; failed: number }>;
  buttonText?: string;
}

export default function ImportExcelButton({ templateColumns, templateFileName, sampleRow, mapRow, onImport, buttonText = "استيراد Excel" }: ImportExcelButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ImportMode>("append");
  const [pendingRows, setPendingRows] = useState<any[]>([]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const raw = await readExcelFile(file);
      if (!raw.length) { alert("الملف فارغ!"); return; }
      const mapped = raw.map(mapRow).filter(Boolean);
      if (!mapped.length) { alert("تأكد أن أسماء الأعمدة مطابقة للقالب الرسمي."); return; }
      setPendingRows(mapped);
      setOpen(true);
    } catch (err) { alert("تعذر قراءة الملف."); } finally { setLoading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  const confirmImport = async () => {
    setLoading(true);
    try {
      const result = await onImport(pendingRows, mode);
      alert(`✅ تم الاستيراد بنجاح\nعدد الناجح: ${result.ok}\nعدد الفاشل: ${result.failed}`);
      setOpen(false); setPendingRows([]);
    } catch (err: any) { alert(err?.message || "فشل الاستيراد"); } finally { setLoading(false); }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => downloadExcelTemplate(templateColumns, templateFileName, sampleRow)} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors" title="تحميل قالب الإكسيل الرسمي"><FileDown size={16} /><span className="hidden sm:inline">قالب Excel</span></button>
        <button type="button" disabled={loading} onClick={() => inputRef.current?.click()} className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}<span>{buttonText}</span></button>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3"><h3 className="font-black flex items-center gap-2"><FileSpreadsheet className="text-blue-700" size={20} /> تأكيد استيراد Excel</h3><button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={20}/></button></div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 font-semibold">تم التعرف على <span className="font-black text-blue-800 text-base">{pendingRows.length}</span> صف جاهز للاستيراد.</p>
            <div className="space-y-3 mb-6">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"><input type="radio" checked={mode === "append"} onChange={() => setMode("append")} className="mt-1 accent-blue-900" /><div><div className="text-sm font-bold">إضافة جديدة فقط</div><div className="text-xs text-gray-500">يضيف كل الصفوف كعناصر جديدة</div></div></label>
              <label className="flex items-start gap-3 p-3 rounded-xl border border-orange-200 cursor-pointer hover:bg-orange-50/50"><input type="radio" checked={mode === "upsert"} onChange={() => setMode("upsert")} className="mt-1 accent-orange-500" /><div><div className="text-sm font-bold">تحديث الموجود + إضافة الجديد</div><div className="text-xs text-gray-500">تحديث السجلات بناءً على المفتاح الأساسي</div></div></label>
            </div>
            <button onClick={confirmImport} disabled={loading} className="w-full py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold flex items-center justify-center gap-2">{loading ? <Loader2 className="animate-spin"/> : <Upload/>} تنفيذ الاستيراد الآن</button>
          </div>
        </div>
      )}
    </>
  );
}
