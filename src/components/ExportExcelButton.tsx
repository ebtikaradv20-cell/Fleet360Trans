"use client";

import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Loader2 } from "lucide-react";

interface ImportExcelButtonProps {
  onImport: (data: any[]) => void | Promise<void>;
  templateColumns?: string[];
  buttonText?: string;
  className?: string;
}

export default function ImportExcelButton({
  onImport,
  buttonText = "استيراد وتحديث الشيت",
  className,
}: ImportExcelButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      // قراءة آمنة لملفات الإكسيل المضغوطة بكافة المتصفحات
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
        type: "array",
        cellDates: true,
      });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        alert("ملف الإكسيل لا يحتوي على أوراق عمل صالحة.");
        return;
      }

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, {
        defval: "",
      });

      if (!rawRows || rawRows.length === 0) {
        alert("الملف فارغ ولا يحتوي على أي بيانات.");
        return;
      }

      // تنظيف المسافات من أسماء الحقول لضمان قراءة الشيت دون أخطاء
      const cleanedData = rawRows.map((row) => {
        const cleanRow: Record<string, any> = {};
        Object.keys(row).forEach((key) => {
          cleanRow[key.trim()] = typeof row[key] === "string" ? row[key].trim() : row[key];
        });
        return cleanRow;
      });

      await onImport(cleanedData);
    } catch (err: any) {
      console.error("Excel Read Error:", err);
      alert("حدث خطأ أثناء قراءة الملف: " + (err?.message || "يرجى اختيار ملف .xlsx صالح"));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative inline-block">
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
          "flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
        }
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
        <span>{loading ? "جاري قراءة الشيت..." : buttonText}</span>
      </button>
    </div>
  );
}
