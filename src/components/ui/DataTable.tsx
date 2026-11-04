"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

export interface Column<T = any> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  pageSize?: number;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  onRowClick,
  pageSize = 10,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // إعادة ضبط الصفحة إلى 1 عند تغير البيانات أو التصفية
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-teal-600 dark:text-teal-400">
        <Loader2 size={36} className="animate-spin mb-3" />
        <p className="text-sm font-bold">جاري تحميل البيانات...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">
        <p className="text-sm font-medium">لا توجد بيانات مطابقة لعرضها حالياً.</p>
      </div>
    );
  }

  // حسابات الترقيم (Pagination)
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, data.length);
  const currentData = data.slice(startIndex, endIndex);

  // إنشاء أرقام الصفحات المعروضة
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="w-full flex flex-col" dir="rtl">
      {/* ── الجدول ── */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-blue-950 text-white text-xs font-black">
              {columns.map((col) => (
                <th key={col.key} className="py-3.5 px-4 whitespace-nowrap">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs font-medium">
            {currentData.map((row, idx) => (
              <tr
                key={row.id || idx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors ${
                  onRowClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60" : ""
                } ${idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/30"}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="py-3.5 px-4 whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key] ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── شريط ترقيم الصفحات (Pagination Bar) ── */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs">
          <div className="text-gray-500 dark:text-gray-400 font-bold">
            عرض <span className="text-gray-900 dark:text-white">{startIndex + 1}</span> إلى{" "}
            <span className="text-gray-900 dark:text-white">{endIndex}</span> من إجمالي{" "}
            <span className="text-teal-600 dark:text-teal-400 font-black">{data.length}</span> سجل
          </div>

          <div className="flex items-center gap-1.5 select-none">
            {/* زر الصفحة السابقة */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>

            {/* أرقام الصفحات 1، 2، 3... */}
            {getPageNumbers().map((num, i) =>
              num === "..." ? (
                <span key={`dots-${i}`} className="px-2 text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${num}`}
                  onClick={() => setCurrentPage(num as number)}
                  className={`min-w-[32px] h-8 px-2 rounded-lg font-bold transition-all ${
                    currentPage === num
                      ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                      : "border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {num}
                </button>
              )
            )}

            {/* زر الصفحة التالية */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
