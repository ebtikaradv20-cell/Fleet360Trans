"use client";

import React from "react";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";

interface ExportExcelButtonProps {
  data: any[];
  fileName: string;
  buttonText?: string;
  dateColumnName?: string;
  className?: string;
}

export default function ExportExcelButton({
  data,
  fileName,
  buttonText = "تصدير Excel",
  className,
}: ExportExcelButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert("لا توجد بيانات متاحة للتصدير حالياً.");
      return;
    }

    try {
      const ws = XLSX.utils.json_to_sheet(data);

      // ضبط عرض الأعمدة تلقائياً ليكون شيت الإكسيل منسقاً
      const colWidths = Object.keys(data[0] || {}).map((key) => ({
        wch: Math.max(key.length * 2, 15)
      }));
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "البيانات");
      XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error("Export Error:", err);
      alert("حدث خطأ أثناء تصدير الملف.");
    }
  };

  const isTemplate = buttonText === "قالب Excel";

  // زر واحد فقط دون أي تكرار
  return (
    <button
      type="button"
      onClick={handleExport}
      className={
        className ||
        (isTemplate
          ? "flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
          : "flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer")
      }
    >
      <Download size={18} />
      <span>{buttonText}</span>
    </button>
  );
}
