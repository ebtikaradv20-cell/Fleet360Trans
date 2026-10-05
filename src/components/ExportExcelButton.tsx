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
  templateColumns,
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
      // 1. قراءة الملف كنظام مصفوفة بايتات ArrayBuffer المعتمد لجميع المتصفحات
      const arrayBuffer = await file.arrayBuffer();

      const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
        type: "array",
        cellDates: true,
        cellNF: false,
        cellText: false,
      });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("ملف الإكسيل لا يحتوي على صفحات عمل صالحة.");
      }

      // 2. قراءة أول صفحة عمل في الشيت
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        defval: "",
        raw: false,
      });

      if (!rawJson || rawJson.length === 0) {
        throw new Error("الملف فارغ أو لا يحتوي على صفوف بيانات.");
      }

      // 3. تنظيف المسافات الزائدة من أسماء الأعمدة لتفادي أخطاء التطابق
      const cleanedJson = rawJson.map((row) => {
        const cleanRow: Record<string, any> = {};
        Object.keys(row).forEach((key) => {
          const trimmedKey = key.trim();
          cleanRow[trimmedKey] =
            typeof row[key] === "string" ? row[key].trim() : row[key];
        });
        return cleanRow;
      });

      // 4. تمرير البيانات المجهزة لدالة المعالجة
      await onImport(cleanedJson);
    } catch (error: any) {
      console.error("Excel Import Error:", error);
      alert(
        error?.message ||
          "حدث خطأ أثناء قراءة الملف. يرجى التأكد من اختيار ملف بصيغة .xlsx أو .xls صالحة."
      );
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative inline-block">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
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
