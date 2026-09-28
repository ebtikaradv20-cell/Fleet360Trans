"use client";
import React from "react";
import { FileSpreadsheet } from "lucide-react";
import { exportToExcel } from "@/lib/excel";

interface ExportExcelButtonProps {
  data: any[];       // الداتا الخاصة بالقسم
  fileName: string;  // اسم الملف عند التحميل
}

export default function ExportExcelButton({ data, fileName }: ExportExcelButtonProps) {
  return (
    <button
      onClick={() => exportToExcel(data, fileName)}
      disabled={!data || data.length === 0}
      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      title="تصدير إلى Excel"
    >
      <FileSpreadsheet size={18} />
      <span>تصدير Excel</span>
    </button>
  );
}
