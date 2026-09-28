"use client";
import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import ExportExcelButton from "@/components/ExportExcelButton";
import { Droplet, AlertTriangle } from "lucide-react";

export default function OilChangesPage() {
  const [data, setData] = useState<any[]>([]);
  const excelData = data.map(r => ({ "اللوحة": r.plateNumber, "الماركة": r.oilBrand }));

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Droplet size={24} /></div>
          <div><h1 className="text-xl font-black">سجلات تغيير الزيوت</h1></div>
        </div>
        <div className="flex items-center gap-3">
          <ExportExcelButton data={excelData} fileName="الزيوت" />
        </div>
      </div>
    </div>
  );
}
