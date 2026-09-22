"use client";
import React, { ReactNode } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import * as XLSX from "xlsx";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon: string;
  onAdd?: () => void;
  addLabel?: string;
  data?: Record<string, unknown>[];
  exportFileName?: string;
  children?: ReactNode;
}

export default function PageHeader({ title, subtitle, icon, onAdd, addLabel, data, exportFileName, children }: PageHeaderProps) {
  const { lang } = useApp();
  const t = translations[lang];

  const handleExport = () => {
    if (!data || data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${exportFileName || title}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background: "linear-gradient(135deg, #1E3A8A, #1d4ed8)" }}>
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {children}
          {data && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-all shadow-sm"
            >
              📊 {t.exportExcel}
            </button>
          )}
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white shadow-sm transition-all hover:opacity-90"
              style={{ background: "linear-gradient(90deg, #F97316, #EA580C)" }}
            >
              ＋ {addLabel || t.add}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
