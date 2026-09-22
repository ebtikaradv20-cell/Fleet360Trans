"use client";
import React, { ReactNode } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";

interface FilterBarProps {
  children: ReactNode;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (v: string) => void;
  onDateToChange?: (v: string) => void;
  showDateRange?: boolean;
}

export default function FilterBar({ children, dateFrom, dateTo, onDateFromChange, onDateToChange, showDateRange }: FilterBarProps) {
  const { lang } = useApp();
  const t = translations[lang];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-4 mb-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">🔽 {t.filter}:</span>
        {children}
        {showDateRange && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">{t.from}:</label>
              <input
                type="date"
                value={dateFrom || ""}
                onChange={e => onDateFromChange?.(e.target.value)}
                className="text-xs border dark:border-gray-700 rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">{t.to}:</label>
              <input
                type="date"
                value={dateTo || ""}
                onChange={e => onDateToChange?.(e.target.value)}
                className="text-xs border dark:border-gray-700 rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}:</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-xs border dark:border-gray-700 rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-24"
      >
        <option value="">الكل / All</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
