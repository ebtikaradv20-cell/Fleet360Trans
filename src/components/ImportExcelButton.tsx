"use client";

import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Loader2 } from "lucide-react";

interface ImportExcelButtonProps {
  onImport: (data: any[]) => void | Promise<void>;
  buttonText?: string;
  className?: string;
}

export default function ImportExcelButton({
  onImport,
  buttonText = "استيراد بيانات وتحديث",
  className,
}: ImportExcelButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      // قراءة البايتات مع تفعيل معالجة التواريخ وحساب المعادلات
      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
        cellNF: false,
        cellText: false,
      });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        alert("ملف الإكسيل لا يحتوي على أوراق عمل صالحة.");
        return;
      }

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      // raw: false لضمان حساب أي معادلات إكسيل واستخراج ناتجها الفعلي
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, {
        defval: "",
        raw: false,
        dateNF: "yyyy-mm-dd",
      });

      if (!rawRows || rawRows.length === 0) {
        alert("الملف فارغ ولا يحتوي على بيانات.");
        return;
      }

      // تنظيف أسماء الأعمدة من المسافات الزائدة وضبط القيم
      const cleanedData = rawRows.map((row) => {
        const cleanRow: Record<string, any> = {};
        for (const key of Object.keys(row)) {
          const cleanKey = key.trim();
          let val = row[key];
          if (typeof val === "string") val = val.trim();
          cleanRow[cleanKey] = val;
        }
        return cleanRow;
      });

      await onImport(cleanedData);
    } catch (err: any) {
      console.error("Excel Read Error:", err);
      alert("خطأ أثناء قراءة الشيت: " + (err?.message || "يرجى التأكد من اختيار ملف بصيغة .xlsx صالحة"));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="inline-block">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />
      <button
        type="button"
        disabled={loading}
        onClick={() => fileInputRef.current?.click()}
        className={
          className ||
          "flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
        }
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        <span>{loading ? "جاري الاستيراد والتحديث..." : buttonText}</span>
      </button>
    </div>
  );
}
