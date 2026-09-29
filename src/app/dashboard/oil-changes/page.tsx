"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ExportExcelButton from "@/components/ExportExcelButton";
import { Droplet, AlertTriangle, Plus, Search, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function OilChangesPage() {
  const { lang, user } = useApp();
  const [data, setData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(vehicleFilter ? `/api/oil-changes?vehicleId=${vehicleFilter}` : `/api/oil-changes`);
    const d = await res.json();
    setData(Array.isArray(d) ? d : []);
    setLoading(false);
  }, [vehicleFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, []);

  const alertCount = data.filter(r => r.kmAlert || r.dayAlert).length;
  const totalCost = data.reduce((s, r) => s + (parseFloat(String(r.cost)) || 0), 0);

  const excelData = data.map((r) => ({
    "رقم اللوحة": r.plateNumber || "",
    "تاريخ التغيير": r.changeDate || "",
    "العداد عند التغيير (كم)": r.kmAtChange || 0,
    "نوع الزيت": r.oilType || "",
    "ماركة الزيت": r.oilBrand || "",
    "التغيير القادم (كم)": r.nextChangeKm || 0,
    "تاريخ التغيير القادم": r.nextChangeDate || "",
    "التكلفة الإجمالية (ج.م)": parseFloat(String(r.cost || 0)) || 0,
    "الفني المسؤول": r.technician || "",
    "ملاحظات": r.notes || "",
  }));

  const inputClass = "w-full border rounded-xl px-3 py-2 text-sm outline-none";
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (<div><label className="block text-xs font-bold mb-1.5">{label}</label>{children}</div>);

  return (
    <div className="w-full space-y-6" dir="rtl">
      {alertCount > 0 && (
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50 flex items-center gap-3.5"><div className="p-2.5 bg-red-500 text-white rounded-xl"><AlertTriangle size={22} /></div><div><div className="font-black text-red-700 text-sm">تنبيه صيانة عاجل: {alertCount} سيارات تجاوزت موعد تغيير الزيت!</div></div></div>
      )}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Droplet size={24} /></div><div><h1 className="text-xl font-black text-gray-900">تغيير الزيوت والفلاتر</h1><p className="text-sm text-gray-500 mt-0.5">التكلفة: {totalCost.toLocaleString()} ج.م</p></div></div>
        <div className="flex items-center gap-3">
          {/* ✅ زر التصدير الذكي هنا */}
          <ExportExcelButton data={excelData} fileName="سجلات_تغيير_الزيوت" dateColumnName="تاريخ التغيير" />
          <button onClick={() => {setEditing({}); setModalOpen(true);}} className="flex items-center gap-2 px-4 py-2 bg-[#F97316] text-white rounded-xl font-bold text-sm shadow-md"><Plus size={18} /><span>إضافة سجل زيت</span></button>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <DataTable columns={[
          { key: "plateNumber", header: "رقم اللوحة", render: (r:any) => <span className="font-bold text-blue-900">{r.plateNumber}</span> },
          { key: "changeDate", header: "التاريخ", render: (r:any) => r.changeDate ? new Date(r.changeDate).toLocaleDateString("en-GB") : "-" },
          { key: "kmAtChange", header: "العداد", render: (r:any) => `${r.kmAtChange} كم` },
          { key: "oilType", header: "نوع الزيت" },
          { key: "cost", header: "التكلفة", render: (r:any) => <span className="font-bold text-emerald-600">{(parseFloat(String(r.cost))||0).toLocaleString()} ج.م</span> },
        ]} data={data} loading={loading} />
      </div>
    </div>
  );
}
