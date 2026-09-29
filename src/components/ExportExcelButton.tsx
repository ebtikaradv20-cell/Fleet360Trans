"use client";
import React, { useState } from "react";
import { FileSpreadsheet, Download, X } from "lucide-react";
import { exportToExcel } from "@/lib/excel";

interface ExportExcelButtonProps {
  data: any[];
  fileName: string;
  dateColumnName?: string; // اسم العمود الذي يحتوي على التاريخ في بياناتك (مثل "تاريخ الإنشاء" أو "تاريخ التزود")
}

export default function ExportExcelButton({ data, fileName, dateColumnName = "تاريخ الإنشاء" }: ExportExcelButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleExport = () => {
    let finalData = data;

    // فلترة بالتواريخ إذا قام المستخدم بتحديدها
    if (startDate || endDate) {
      finalData = data.filter((row) => {
        const rowDateVal = row[dateColumnName];
        if (!rowDateVal) return true; // إذا لم يكن هناك تاريخ اتركه

        const rDate = new Date(rowDateVal).getTime();
        const sDate = startDate ? new Date(startDate).getTime() : 0;
        const eDate = endDate ? new Date(endDate).getTime() : Infinity;

        return rDate >= sDate && rDate <= eDate;
      });
    }

    exportToExcel(finalData, fileName);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={!data || data.length === 0}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileSpreadsheet size={18} />
        <span>تصدير Excel</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 dark:border-gray-800 pb-3">
              <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600" />
                <span>خيارات تصدير Excel</span>
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                سيتم تصدير البيانات. يمكنك تحديد نطاق زمني للفلترة (اختياري):
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">من تاريخ</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:border-emerald-500" />
              </div>
            </div>

            <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer">
              <Download size={18} />
              <span>تحميل شيت الإكسيل</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
