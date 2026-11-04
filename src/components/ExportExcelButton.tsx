"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportToExcel } from "@/lib/excel";

interface ExportExcelButtonProps {
  data: any[];
  fileName?: string;
  buttonText?: string;
  dateColumnName?: string;
  className?: string;
}

export default function ExportExcelButton({
  data,
  fileName = "قالب_الأسطول_الشامل",
  buttonText = "تحميل قالب",
  className,
}: ExportExcelButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!data || data.length === 0) {
      alert("لا توجد بيانات متاحة لتصديرها حالياً.");
      return;
    }

    setLoading(true);
    try {
      await exportToExcel(data, fileName);
    } catch (err: any) {
      console.error("Export Excel Error:", err);
      alert("حدث خطأ أثناء تحميل الملف: " + (err?.message || "يرجى المحاولة مرة أخرى"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleExport}
      className={
        className ||
        "flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
      }
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
      <span>{loading ? "جاري تجهيز الملف..." : buttonText}</span>
    </button>
  );
}
