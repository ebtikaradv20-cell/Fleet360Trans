"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import { 
  Fuel, 
  Plus, 
  Pencil, 
  Trash2, 
  Paperclip, 
  CheckCircle2, 
  ImageIcon 
} from "lucide-react";

const safeNum = (val: any) => { 
  if (val === null || val === undefined) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); 
  return isNaN(n) ? 0 : n; 
};

const Field = ({ label, children }: any) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-teal-500/50 outline-none";

const normalizeRecord = (r: any) => {
  const plate = r.plateNumber || r.plate_number || r.plate || "";
  const driver = r.driverName || r.driver_name || r.driver || "";
  const liters = safeNum(r.liters ?? r.litres ?? r.quantity ?? 0);
  const costPerLiter = safeNum(r.costPerLiter ?? r.cost_per_liter ?? r.price_per_liter ?? 0);
  let totalCost = safeNum(r.totalCost ?? r.total_cost ?? r.cost ?? r.amount ?? 0);
  if (!totalCost && liters && costPerLiter) {
    totalCost = liters * costPerLiter;
  }
  const odometer = safeNum(r.odometer ?? r.current_odometer ?? r.current_km ?? r.km ?? 0);
  const station = r.station || r.fuel_station || "";
  
  let fuelDate = r.fuelDate || r.fuel_date || r.date || "";
  if (fuelDate && typeof fuelDate === "string" && fuelDate.includes("T")) {
    fuelDate = fuelDate.split("T")[0];
  } else if (fuelDate && !isNaN(new Date(fuelDate).getTime())) {
    try {
      fuelDate = new Date(fuelDate).toISOString().split("T")[0];
    } catch {}
  }

  const invoiceUrl = r.invoiceUrl || r.invoice_url || "";
  const vehicleId = r.vehicleId ?? r.vehicle_id ?? null;

  return {
    ...r,
    id: r.id,
    vehicleId,
    vehicle_id: vehicleId,
    plateNumber: plate,
    plate_number: plate,
    driverName: driver,
    driver_name: driver,
    liters,
    litres: liters,
    costPerLiter,
    cost_per_liter: costPerLiter,
    totalCost,
    total_cost: totalCost,
    odometer,
    current_odometer: odometer,
    station,
    fuelDate,
    fuel_date: fuelDate,
    invoiceUrl,
    invoice_url: invoiceUrl,
    notes: r.notes || r.note || ""
  };
};

export default function FuelPage() {
  const { user } = useApp();
  const [data, setData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>({});
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [search, setSearch] = useState("");
  const [driverFilter, setDriverFilter] = useState("الكل");
  const [stationFilter, setStationFilter] = useState("الكل");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canWrite = user?.role === "owner" || user?.role === "super_admin" || user?.role === "admin" || user?.permissions?.includes("fuel:write");

  const load = useCallback(async () => {
    setLoading(true);
    try { 
      const res = await fetch("/api/fuel"); 
      const d = await res.json(); 
      const rawRows = Array.isArray(d) ? d : (d.data && Array.isArray(d.data) ? d.data : []);
      setData(rawRows.map(normalizeRecord)); 
    } 
    catch (e) {
      console.error("Error loading fuel data:", e);
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { 
    load(); 
    fetch("/api/vehicles")
      .then(r => r.json())
      .then(d => {
        const raw = Array.isArray(d) ? d : [];
        setVehicles(raw.map((v: any) => ({
          ...v,
          plateNumber: v.plateNumber || v.plate_number || v.plate || "",
          driverName: v.driverName || v.driver_name || v.driver || "",
        })));
      })
      .catch(() => {});
  }, [load]);

  const filteredData = data.filter(r => {
    const plate = (r.plateNumber || r.plate_number || "").toLowerCase();
    const driver = (r.driverName || r.driver_name || "").toLowerCase();
    const sMatch = plate.includes(search.toLowerCase()) || driver.includes(search.toLowerCase());
    const dMatch = driverFilter === "الكل" || (r.driverName || r.driver_name) === driverFilter;
    const stMatch = stationFilter === "الكل" || (r.station || "") === stationFilter;
    let dateMatch = true;
    const rowDateStr = r.fuelDate || r.fuel_date;
    if ((dateFrom || dateTo) && rowDateStr) {
      const rowDate = new Date(rowDateStr).getTime();
      const start = dateFrom ? new Date(dateFrom).getTime() : 0;
      const end = dateTo ? new Date(dateTo).getTime() + 86399999 : Infinity;
      dateMatch = rowDate >= start && rowDate <= end;
    }
    return sMatch && dMatch && stMatch && dateMatch;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("الحد الأقصى 2 ميجابايت."); return; }
    const reader = new FileReader();
    reader.onload = (evt) => { 
      setEditing({ 
        ...editing, 
        invoiceUrl: evt.target?.result as string,
        invoice_url: evt.target?.result as string 
      }); 
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setSaving(true);
    try {
      const l = safeNum(editing.liters);
      const c = safeNum(editing.costPerLiter);
      const tot = safeNum(editing.totalCost) || (l * c);
      const odo = safeNum(editing.odometer);
      const pNum = editing.plateNumber || editing.plate_number || "";
      const dName = editing.driverName || editing.driver_name || "";
      const vId = Number(editing.vehicleId || editing.vehicle_id) || null;
      const fDate = editing.fuelDate || editing.fuel_date || new Date().toISOString().slice(0, 10);
      const inv = editing.invoiceUrl || editing.invoice_url || "";

      const payload = { 
        ...editing,
        vehicleId: vId,
        vehicle_id: vId,
        plateNumber: pNum,
        plate_number: pNum,
        driverName: dName,
        driver_name: dName,
        liters: l, 
        costPerLiter: c, 
        cost_per_liter: c,
        totalCost: tot, 
        total_cost: tot,
        odometer: odo, 
        fuelDate: fDate,
        fuel_date: fDate,
        station: editing.station || "",
        invoiceUrl: inv,
        invoice_url: inv,
        notes: editing.notes || ""
      };

      const res = await fetch(isEdit ? `/api/fuel/${editing.id}` : "/api/fuel", { 
        method: isEdit ? "PUT" : "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });

      if (res.ok) { 
        setModalOpen(false); 
        load(); 
      } else { 
        alert("خطأ بالحفظ"); 
      }
    } catch { 
      alert("خطأ اتصال"); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: number) => { 
    if (confirm("هل أنت متأكد من حذف هذا السجل؟")) { 
      await fetch(`/api/fuel/${id}`, { method: "DELETE" }); 
      load(); 
    } 
  };

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl"><Fuel/></div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">سجلات الوقود</h1>
        </div>
        <div className="flex items-center gap-3">
          <ImportExcelButton templateColumns={["رقم اللوحة", "اللترات", "السعر"]} templateFileName="الوقود" mapRow={() => null} onImport={async () => {return {ok:0, failed:0}}} buttonText="استيراد" />
          <ExportExcelButton 
            data={filteredData.map(r => ({
              "رقم اللوحة": r.plateNumber,
              "السائق": r.driverName,
              "اللترات": r.liters,
              "سعر اللتر": r.costPerLiter,
              "الإجمالي (ج.م)": r.totalCost,
              "العداد (كم)": r.odometer,
              "المحطة": r.station,
              "تاريخ التزود": r.fuelDate
            }))} 
            fileName="الوقود" 
            dateColumnName="تاريخ التزود" 
          />
          {canWrite && (
            <button 
              onClick={() => {
                setEditing({
                  fuelDate: new Date().toISOString().slice(0, 10),
                  fuel_date: new Date().toISOString().slice(0, 10),
                  liters: "",
                  costPerLiter: "",
                  totalCost: "",
                  odometer: ""
                }); 
                setIsEdit(false); 
                setModalOpen(true);
              }} 
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl font-bold shadow-md hover:bg-teal-700 transition-colors cursor-pointer"
            >
              <Plus size={18}/>إضافة وقود
            </button>
          )}
        </div>
      </div>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500">بحث:</label>
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="بحث..." 
            className="border dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs outline-none w-32 dark:bg-gray-800 dark:text-white" 
          />
        </div>
        <FilterSelect 
          label="السائق" 
          value={driverFilter} 
          onChange={setDriverFilter} 
          options={[{value:"الكل", label:"الكل"}, ...[...new Set(data.map(d => d.driverName || d.driver_name).filter(Boolean))].map(x => ({value:x, label:x}))]} 
        />
        <FilterSelect 
          label="المحطة" 
          value={stationFilter} 
          onChange={setStationFilter} 
          options={[{value:"الكل", label:"الكل"}, ...[...new Set(data.map(d => d.station).filter(Boolean))].map(x => ({value:x, label:x}))]} 
        />
      </FilterBar>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable 
          columns={[
            { 
              key: "plateNumber", 
              header: "اللوحة", 
              render: (r: any) => (
                <span className="font-bold text-blue-900 dark:text-blue-300">
                  {r.plateNumber || r.plate_number || "-"}
                </span>
              ) 
            },
            { 
              key: "liters", 
              header: "اللترات", 
              render: (r: any) => (
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  {safeNum(r.liters ?? r.litres)} L
                </span>
              ) 
            },
            { 
              key: "totalCost", 
              header: "الإجمالي", 
              render: (r: any) => (
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {safeNum(r.totalCost ?? r.total_cost).toLocaleString()} ج.م
                </span>
              ) 
            },
            { 
              key: "odometer", 
              header: "العداد", 
              render: (r: any) => `${safeNum(r.odometer ?? r.current_odometer).toLocaleString()} كم` 
            },
            { 
              key: "invoiceUrl", 
              header: "المرفقات", 
              render: (r: any) => {
                const inv = r.invoiceUrl || r.invoice_url;
                return inv ? (
                  <a href={inv} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors">
                    <ImageIcon size={14} /> عرض
                  </a>
                ) : (
                  <span className="text-gray-400">-</span>
                );
              } 
            },
            { 
              key: "fuelDate", 
              header: "التاريخ", 
              render: (r: any) => {
                const rawDate = r.fuelDate || r.fuel_date;
                if (!rawDate) return "-";
                const d = new Date(rawDate);
                return isNaN(d.getTime()) ? String(rawDate).slice(0, 10) : d.toLocaleDateString("en-GB");
              } 
            },
            {
              key: "actions",
              header: "إجراء",
              render: (r: any) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditing(normalizeRecord(r));
                      setIsEdit(true);
                      setModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-600 hover:text-white dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-600 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
                  >
                    <Pencil size={13} />
                    <span>تعديل</span>
                  </button>
                  {canWrite && (
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-600 px-2 py-1.5 rounded-lg border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )
            }
          ]} 
          data={filteredData} 
          loading={loading} 
        />
      </div>
      
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="سجل الوقود" size="lg">
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
           <Field label="السيارة">
             <select 
               required 
               className={inputClass} 
               value={editing.plateNumber || editing.plate_number || ""} 
               onChange={e => {
                 const selectedPlate = e.target.value;
                 const v = vehicles.find(x => (x.plateNumber || x.plate_number) === selectedPlate); 
                 setEditing({
                   ...editing, 
                   plateNumber: selectedPlate, 
                   plate_number: selectedPlate,
                   vehicleId: v?.id || null, 
                   vehicle_id: v?.id || null,
                   driverName: v?.driverName || v?.driver_name || ""
                 });
               }}
             >
               <option value="">--اختر--</option>
               {vehicles.map(v => {
                 const p = v.plateNumber || v.plate_number;
                 return <option key={v.id || p} value={p}>{p}</option>;
               })}
             </select>
           </Field>

           <Field label="اللترات">
             <input 
               type="number" 
               step="0.01" 
               className={inputClass} 
               value={editing.liters !== undefined && editing.liters !== null ? editing.liters : ""} 
               onChange={e => {
                 const l = safeNum(e.target.value); 
                 const c = safeNum(editing.costPerLiter);
                 setEditing({
                   ...editing, 
                   liters: e.target.value, 
                   totalCost: l > 0 && c > 0 ? (l * c).toFixed(2) : editing.totalCost
                 });
               }} 
             />
           </Field>

           <Field label="سعر اللتر">
             <input 
               type="number" 
               step="0.01" 
               className={inputClass} 
               value={editing.costPerLiter !== undefined && editing.costPerLiter !== null ? editing.costPerLiter : ""} 
               onChange={e => {
                 const c = safeNum(e.target.value); 
                 const l = safeNum(editing.liters);
                 setEditing({
                   ...editing, 
                   costPerLiter: e.target.value, 
                   totalCost: l > 0 && c > 0 ? (l * c).toFixed(2) : editing.totalCost
                 });
               }} 
             />
           </Field>

           <Field label="الإجمالي">
             <input 
               disabled 
               className={`${inputClass} bg-gray-100 dark:bg-gray-900 font-bold text-teal-600`} 
               value={editing.totalCost !== undefined && editing.totalCost !== null ? editing.totalCost : ""}
             />
           </Field>

           <Field label="العداد (كم)">
             <input 
               type="number" 
               required 
               className={inputClass} 
               value={editing.odometer !== undefined && editing.odometer !== null ? editing.odometer : ""} 
               onChange={e => setEditing({ ...editing, odometer: e.target.value })} 
             />
           </Field>

           <Field label="التاريخ">
             <input 
               type="date" 
               className={inputClass} 
               value={editing.fuelDate || editing.fuel_date || ""} 
               onChange={e => setEditing({ ...editing, fuelDate: e.target.value, fuel_date: e.target.value })} 
             />
           </Field>
           
           <div className="col-span-2 p-4 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-800 flex justify-between items-center gap-4">
             <div><p className="text-sm font-bold text-teal-900 dark:text-teal-300">مرفق الفاتورة/البون</p></div>
             <input type="file" ref={fileInputRef} accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
             <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-teal-700 cursor-pointer">
               <Paperclip size={16} /> {editing.invoiceUrl ? "تغيير المرفق" : "إرفاق بون/فاتورة"}
             </button>
             {editing.invoiceUrl && <span className="text-xs font-bold text-emerald-600"><CheckCircle2 size={14} className="inline"/> تم الإرفاق</span>}
           </div>

           <button type="submit" disabled={saving} className="col-span-2 py-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl font-bold transition-colors cursor-pointer">
             {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
           </button>
        </form>
      </Modal>
    </div>
  );
}
