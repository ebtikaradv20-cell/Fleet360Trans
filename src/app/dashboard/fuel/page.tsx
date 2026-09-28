"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import { Fuel, DollarSign, Droplets, Search, Save, X, Loader2 } from "lucide-react";

export default function FuelPage() {
  const { lang, user } = useApp();
  const [data, setData] = useState<any[]>([]);
  
  // داتا الإكسيل
  const excelData = data.map(r => ({ "رقم اللوحة": r.plateNumber, "التكلفة": r.totalCost }));

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Fuel size={24} /></div>
          <div><h1 className="text-xl font-black text-gray-900 dark:text-white">سجلات الوقود</h1></div>
        </div>
        <div className="flex items-center gap-3">
          <ExportExcelButton data={excelData} fileName="سجلات_الوقود" />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <DataTable columns={[]} data={data} loading={false} />
      </div>
    </div>
  );
}
