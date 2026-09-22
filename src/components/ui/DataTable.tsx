"use client";
import React, { ReactNode } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  extraActions?: (row: T) => ReactNode;
}

export default function DataTable<T extends { id?: number }>({ columns, data, loading, onEdit, onDelete, extraActions }: DataTableProps<T>) {
  const { lang } = useApp();
  const t = translations[lang];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-spin">⚙️</div>
          <div>{t.loading}</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <div className="text-5xl mb-3">📭</div>
          <div>{t.noData}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "linear-gradient(90deg, #1E3A8A, #1d4ed8)" }}>
            {columns.map(col => (
              <th key={col.key} className="px-4 py-3 text-start text-white font-semibold text-xs uppercase tracking-wider whitespace-nowrap" style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
            {(onEdit || onDelete || extraActions) && (
              <th className="px-4 py-3 text-start text-white font-semibold text-xs uppercase tracking-wider">{t.actions}</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-gray-700">
          {data.map((row, i) => (
            <tr key={row.id || i} className="bg-white dark:bg-gray-900 hover:bg-blue-50/50 dark:hover:bg-gray-800/50 transition-colors">
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
              {(onEdit || onDelete || extraActions) && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {extraActions?.(row)}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="px-3 py-1 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                      >
                        ✏️ {t.edit}
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (confirm(t.confirmDelete)) onDelete(row);
                        }}
                        className="px-3 py-1 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                      >
                        🗑️ {t.delete}
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
