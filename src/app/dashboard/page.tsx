"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import { 
  Wrench, Search, Plus, Save, X, Loader2, DollarSign, Clock, CheckCircle2 
} from "lucide-react";

interface WorkOrder {
  id: number;
  orderNumber: string;
  vehicleId: number;
  plateNumber: string;
  maintenanceType: string;
  status: string;
  workshop: string;
  description: string;
  cost: number | string;
  startDate: string;
  endDate: string;
  technicianName: string;
  notes: string;
  createdAt: string;
}

interface Vehicle { id: number; plateNumber: string; }

const MAINTENANCE_TYPES = [
  "تغيير زيت وفلاتر",
  "صيانة عفشة",
  "صيانة كاوتش",
  "كارتة",
  "صيانة ميكانيكا",
  "صيانة كهرباء"
];

const emptyWO: Partial<WorkOrder> = {
  orderNumber: `WO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
  plateNumber: "", 
  maintenanceType: "صيانة ميكانيكا",
  status: "pending",
  workshop: "", 
  description: "", 
  cost: 0, 
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "", 
  technicianName: "", 
  notes: ""
};

// 🔴 دالة الأمان الحاسبة: تحول أي نص إلى رقم صريح 100% لمنع الدمج النصي
const safeNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all";

export default function WorkOrdersPage() {
  const { lang, user } = useApp();
  const t = translations[lang] || translations["ar"];
  const [data, setData] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<WorkOrder>>(emptyWO);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("maintenance:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/work-orders`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) {
      console.error("Failed to load work orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
  }, []);

  const filteredData = data.filter(r => {
    const matchesSearch = 
      (r.orderNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.plateNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.workshop || "").toLowerCase().includes(search.toLowerCase());
      
    const matchesType = !typeFilter || r.maintenanceType === typeFilter;
    const matchesStatus = !statusFilter || r.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // ✅ الجمع الرياضي الصارم
  const totalCost = filteredData.reduce((acc, row) => acc + safeNum(row.cost), 0);
  const openOrdersCount = filteredData.filter(r => r.status !== "completed").length;
  const completedOrdersCount = filteredData.filter(r => r.status === "completed").length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    try {
      setSaving(true);
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/work-orders/${editing.id}` : "/api/work-orders";
      
      const payload = {
        ...editing,
        vehicleId: Number(editing.vehicleId) || null,
        cost: safeNum(editing.cost),
        startDate: editing.startDate && String(editing.startDate).trim() !== "" ? editing.startDate : null,
        endDate: editing.endDate && String(editing.endDate).trim() !== "" ? editing.endDate : null,
      };

      const res = await fetch(url, { 
        method, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });

      const resData = await res.json().catch(() => ({}));

      if (res.ok && resData.success !== false) { 
        setModalOpen(false); 
        load(); 
      } else {
        alert(resData.error || resData.message || "حدث خطأ أثناء حفظ أمر الشغل");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("تعذر الاتصال بالخادم، تأكد من سلامة الاتصال.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: WorkOrder) => {
    if (!confirm("هل أنت متأكد من حذف أمر الشغل هذا نهائياً؟")) return;
    try {
      await fetch(`/api/work-orders/${row.id}`, { method: "DELETE" });
      load();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const openAdd = () => { 
    setEditing({
      ...emptyWO, 
      orderNumber: `WO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`
    }); 
    setIsEdit(false); 
    setModalOpen(true); 
  };

  const openEdit = (row: WorkOrder) => { setEditing(row); setIsEdit(true); setModalOpen(true); };
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : "-";

  const excelData = filteredData.map((r) => ({
    "رقم أمر الشغل": r.orderNumber || "",
    "رقم اللوحة": r.plateNumber || "",
    "اسم الصيانة": r.maintenanceType || "",
    "الحالة": r.status === "completed" ? "مكتمل" : r.status === "in_progress" ? "قيد التنفيذ" : "معلق",
    "الورشة / المركز": r.workshop || "",
    "الوصف": r.description || "",
    "التكلفة (ج.م)": safeNum(r.cost),
    "تاريخ البدء": r.startDate || "",
    "تاريخ الانتهاء": r.endDate || "",
    "الفني / المهندس": r.technicianName || "",
  }));

  const columns = [
    { key: "orderNumber", header: "رقم الأمر", render: (r: WorkOrder) => <span className="font-bold text-blue-900 dark:text-blue-400">{r.orderNumber}</span> },
    { key: "plateNumber", header: "اللوحة" },
    { key: "maintenanceType", header: "اسم الصيانة", render: (r: WorkOrder) => <span className="px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-lg text-xs font-bold">{r.maintenanceType}</span> },
    { key: "status", header: "الحالة", render: (r: WorkOrder) => <StatusBadge status={r.status} /> },
    { key: "workshop", header: "الورشة" },
    { key: "description", header: "الوصف", render: (r: WorkOrder) => <span className="max-w-[120px] truncate block font-medium" title={r.description}>{r.description || "-"}</span> },
    { key: "cost", header: "التكلفة", render: (r: WorkOrder) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{safeNum(r.cost).toLocaleString()} ج.م</span> },
    { key: "startDate", header: "تاريخ البدء", render: (r: WorkOrder) => formatDate(r.startDate) },
  ];

  return (
    <div className="w-full space-y-6">
      
      {/* كروت إحصائيات أوامر الشغل */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-blue-200 text-xs font-bold mb-1">إجمالي تكلفة الصيانة</div>
              <div className="text-3xl font-black">{totalCost.toLocaleString()} <span className="text-sm font-normal">ج.م</span></div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm"><DollarSign size={22} /></div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-amber-100 text-xs font-bold mb-1">أوامر شغل مفتوحة</div>
              <div className="text-3xl font-black">{openOrdersCount} <span className="text-sm font-normal">أمر قيد التنفيذ</span></div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm"><Clock size={22} /></div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-emerald-100 text-xs font-bold mb-1">أوامر صيانة مكتملة</div>
              <div className="text-3xl font-black">{completedOrdersCount} <span className="text-sm font-normal">أمر منجز</span></div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm"><CheckCircle2 size={22} /></div>
          </div>
        </div>
      </div>

      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Wrench size={24} /></div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">أوامر الشغل والصيانة</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">إجمالي {filteredData.length} أمر شغل مسجل</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ExportExcelButton data={excelData} fileName="أوامر_الشغل" />

          <div className="relative">
            <Search size={16} className="absolute inset-y-0 start-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
              className="border border-gray-200 dark:border-gray-700 rounded-xl ps-9 pe-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500/50 w-44 outline-none"
            />
          </div>

          {canWrite && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer"
            >
              <Plus size={18} />
              <span>إضافة أمر شغل</span>
            </button>
          )}
        </div>
      </div>

      {/* الفلاتر */}
      <FilterBar>
        <FilterSelect label="اسم الصيانة" value={typeFilter} onChange={setTypeFilter} options={MAINTENANCE_TYPES.map((t) => ({ value: t, label: t }))} />
        <FilterSelect label="الحالة" value={statusFilter} onChange={setStatusFilter} options={[{ value: "pending", label: "معلق" }, { value: "in_progress", label: "قيد التنفيذ" }, { value: "completed", label: "مكتمل" }]} />
      </FilterBar>

      {/* الجدول */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable columns={columns} data={filteredData} loading={loading} onEdit={canWrite ? openEdit : undefined} onDelete={user?.role === "admin" ? handleDelete : undefined} />
      </div>

      {/* المودال */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? "تعديل أمر الشغل" : "إضافة أمر شغل جديد"} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="رقم الأمر">
              <input disabled className={`${inputClass} bg-gray-100 dark:bg-gray-800/50 cursor-not-allowed`} value={editing.orderNumber || ""} readOnly />
            </Field>

            <Field label="رقم اللوحة *">
              <select 
                required 
                className={inputClass} 
                value={editing.plateNumber || ""}
                onChange={e => {
                  const v = vehicles.find(v => v.plateNumber === e.target.value);
                  setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id});
                }}
              >
                <option value="">-- اختر السيارة --</option>
                {vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}
              </select>
            </Field>

            <Field label="اسم الصيانة *">
              <select required className={inputClass} value={editing.maintenanceType || ""} onChange={e => setEditing({...editing, maintenanceType: e.target.value})}>
                {MAINTENANCE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </Field>

            <Field label="الحالة">
              <select className={inputClass} value={editing.status || "pending"} onChange={e => setEditing({...editing, status: e.target.value})}>
                <option value="pending">معلق</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="completed">مكتمل</option>
              </select>
            </Field>

            <Field label="الورشة / المركز"><input className={inputClass} value={editing.workshop || ""} onChange={e => setEditing({...editing, workshop: e.target.value})} /></Field>
            <Field label="الفني / المهندس"><input className={inputClass} value={editing.technicianName || ""} onChange={e => setEditing({...editing, technicianName: e.target.value})} /></Field>

            <Field label="إجمالي التكلفة (ج.م)"><input type="number" step="0.01" className={inputClass} value={editing.cost || ""} onChange={e => setEditing({...editing, cost: safeNum(e.target.value)})} /></Field>
            <div />

            <Field label="تاريخ البدء"><input type="date" className={inputClass} value={editing.startDate || ""} onChange={e => setEditing({...editing, startDate: e.target.value})} /></Field>
            <Field label="تاريخ الانتهاء"><input type="date" className={inputClass} value={editing.endDate || ""} onChange={e => setEditing({...editing, endDate: e.target.value})} /></Field>

            <div className="col-span-2"><Field label="وصف الصيانة والعطل"><textarea className={inputClass} rows={2} value={editing.description || ""} onChange={e => setEditing({...editing, description: e.target.value})} /></Field></div>
            <div className="col-span-2"><Field label="ملاحظات"><textarea className={inputClass} rows={2} value={editing.notes || ""} onChange={e => setEditing({...editing, notes: e.target.value})} /></Field></div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition-colors">إلغاء</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-md transition-all cursor-pointer">
              {saving ? <Loader2 className="animate-spin" size={18}/> : "حفظ أمر الشغل"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
