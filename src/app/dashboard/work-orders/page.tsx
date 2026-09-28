"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import { 
  Wrench, 
  Search, 
  Plus, 
  Save, 
  X, 
  Loader2, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
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
  cost: number;
  startDate: string;
  endDate: string;
  technicianName: string;
  notes: string;
  createdAt: string;
}

interface Vehicle { id: number; plateNumber: string; }

const emptyWO: Partial<WorkOrder> = {
  orderNumber: `WO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
  plateNumber: "", 
  maintenanceType: "preventive", 
  status: "pending",
  workshop: "", 
  description: "", 
  cost: 0, 
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "", 
  technicianName: "", 
  notes: ""
};

// ✅ مكون Field معزول خارج الصفحة لمنع فقدان التركيز عند الكتابة
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all";

export default function WorkOrdersPage() {
  const { lang, user } = useApp();
  const t = translations[lang];
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
  const [workshopFilter, setWorkshopFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("maintenance:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("maintenanceType", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (workshopFilter) params.set("workshop", workshopFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/work-orders?${params}`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) {
      console.error("Failed to load work orders:", error);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, workshopFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
  }, []);

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/work-orders/${editing.id}` : "/api/work-orders";
      
      const payload = {
        ...editing,
        vehicleId: Number(editing.vehicleId) || null,
        cost: Number(editing.cost) || 0,
        startDate: editing.startDate && editing.startDate.trim() !== "" ? editing.startDate : null,
        endDate: editing.endDate && editing.endDate.trim() !== "" ? editing.endDate : null,
      };

      const res = await fetch(url, { 
        method, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });

      if (res.ok) { 
        setModalOpen(false); 
        load(); 
      } else {
        const errData = await res.json();
        alert(errData.error || "حدث خطأ أثناء حفظ أمر الشغل");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("تعذر الاتصال بالخادم، تأكد من سلامة الاتصال.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: WorkOrder) => {
    if (!confirm("هل أنت متأكد من حذف أمر الشغل هذا؟")) return;
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

  const totalCost = data.reduce((s, r) => s + (r.cost || 0), 0);
  const openOrdersCount = data.filter(r => r.status !== "completed").length;
  const completedOrdersCount = data.filter(r => r.status === "completed").length;

  const workshops = [...new Set(data.map(r => r.workshop).filter(Boolean))];

  // تجهيز شيت إكسيل لأوامر الشغل
  const excelData = data.map((r) => ({
    "رقم أمر الشغل": r.orderNumber || "",
    "رقم اللوحة": r.plateNumber || "",
    "نوع الصيانة": r.maintenanceType === "preventive" ? "وقائية" : "طارئة",
    "الحالة": r.status === "completed" ? "مكتمل" : r.status === "in_progress" ? "قيد التنفيذ" : "معلق",
    "الورشة / المركز": r.workshop || "غير محدد",
    "الوصف": r.description || "",
    "التكلفة (ج.م)": r.cost || 0,
    "تاريخ البدء": r.startDate || "",
    "تاريخ الانتهاء": r.endDate || "",
    "الفني / المهندس": r.technicianName || "",
    "ملاحظات": r.notes || "",
    "تاريخ الإنشاء": r.createdAt || "",
  }));

  const columns = [
    { 
      key: "orderNumber", 
      header: t.orderNumber, 
      render: (r: WorkOrder) => <span className="font-bold text-blue-900 dark:text-blue-400">{r.orderNumber}</span> 
    },
    { key: "plateNumber", header: t.plateNumber },
    { 
      key: "maintenanceType", 
      header: t.maintenanceType, 
      render: (r: WorkOrder) => <StatusBadge status={r.maintenanceType} /> 
    },
    { 
      key: "status", 
      header: t.status, 
      render: (r: WorkOrder) => <StatusBadge status={r.status} /> 
    },
    { key: "workshop", header: t.workshop },
    { 
      key: "description", 
      header: lang === "ar" ? "الوصف" : "Description", 
      render: (r: WorkOrder) => (
        <span className="max-w-36 truncate block font-medium" title={r.description}>
          {r.description || "-"}
        </span>
      ) 
    },
    { 
      key: "cost", 
      header: t.cost, 
      render: (r: WorkOrder) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          {(r.cost || 0).toLocaleString()} ج.م
        </span>
      ) 
    },
    { key: "startDate", header: t.startDate, render: (r: WorkOrder) => formatDate(r.startDate) },
    { key: "technicianName", header: t.technician },
    { key: "createdAt", header: t.createdAt, render: (r: WorkOrder) => formatDate(r.createdAt) },
  ];

  return (
    <div className="w-full space-y-6">
      
      {/* ── كروت إحصائيات أوامر الشغل المؤسسية ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* إجمالي التكلفة */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-blue-200 text-xs font-bold mb-1">
                {lang === "ar" ? "إجمالي تكلفة الصيانة" : "Total Cost"}
              </div>
              <div className="text-3xl font-black">{totalCost.toLocaleString()} <span className="text-sm font-normal">ج.م</span></div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        {/* أوامر مفتوحة */}
        <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-amber-100 text-xs font-bold mb-1">
                {lang === "ar" ? "أوامر شغل مفتوحة" : "Open Orders"}
              </div>
              <div className="text-3xl font-black">{openOrdersCount} <span className="text-sm font-normal">أمر قيد التنفيذ</span></div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
              <Clock size={22} />
            </div>
          </div>
        </div>

        {/* أوامر مكتملة */}
        <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-emerald-100 text-xs font-bold mb-1">
                {lang === "ar" ? "أوامر صيانة مكتملة" : "Completed Orders"}
              </div>
              <div className="text-3xl font-black">{completedOrdersCount} <span className="text-sm font-normal">أمر منجز</span></div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

      </div>

      {/* ── رأس الصفحة المؤسسي + زر الإكسيل ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
            <Wrench size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">
              {lang === "ar" ? "أوامر الشغل والصيانة" : "Work Orders & Maintenance"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              إجمالي {data.length} أمر شغل مسجل بالنظام
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ExportExcelButton data={excelData} fileName="أوامر_الشغل_والصيانة" />

          <div className="relative">
            <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder={`${t.search || "بحث"}...`}
              className="border border-gray-200 dark:border-gray-700 rounded-xl ps-9 pe-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 w-44" 
            />
          </div>

          {canWrite && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-bold text-sm transition-all shadow-md"
            >
              <Plus size={18} />
              <span>{t.addWorkOrder || "إضافة أمر شغل"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── الفلاتر ── */}
      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <FilterSelect 
          label={t.maintenanceType} 
          value={typeFilter} 
          onChange={setTypeFilter} 
          options={[
            { value: "preventive", label: t.preventive || "وقائية" },
            { value: "emergency", label: t.emergency || "طارئة" },
          ]} 
        />
        <FilterSelect 
          label={t.status} 
          value={statusFilter} 
          onChange={setStatusFilter} 
          options={[
            { value: "pending", label: t.pending || "معلق" },
            { value: "in_progress", label: t.in_progress || "قيد التنفيذ" },
            { value: "completed", label: t.completed || "مكتمل" },
          ]} 
        />
        <FilterSelect 
          label={t.workshop} 
          value={workshopFilter} 
          onChange={setWorkshopFilter}
          options={workshops.map(w => ({ value: w, label: w }))} 
        />
      </FilterBar>

      {/* ── الجدول المؤسسي ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          onEdit={canWrite ? openEdit : undefined}
          onDelete={user?.role === "admin" ? handleDelete : undefined}
        />
      </div>

      {/* ── المودال المؤسسي ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? t.edit : t.addWorkOrder} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t.orderNumber}>
            <input className={inputClass} value={editing.orderNumber || ""} onChange={e => setEditing({...editing, orderNumber: e.target.value})} />
          </Field>

          <Field label={t.plateNumber}>
            <select 
              className={inputClass} 
              value={editing.plateNumber || ""}
              onChange={e => {
                const v = vehicles.find(v => v.plateNumber === e.target.value);
                setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id});
              }}
            >
              <option value="">-- {lang === "ar" ? "اختر السيارة" : "Select Vehicle"} --</option>
              {vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}
            </select>
          </Field>

          <Field label={t.maintenanceType}>
            <select className={inputClass} value={editing.maintenanceType || "preventive"} onChange={e => setEditing({...editing, maintenanceType: e.target.value})}>
              <option value="preventive">{t.preventive || "وقائية"}</option>
              <option value="emergency">{t.emergency || "طارئة"}</option>
            </select>
          </Field>

          <Field label={t.status}>
            <select className={inputClass} value={editing.status || "pending"} onChange={e => setEditing({...editing, status: e.target.value})}>
              <option value="pending">{t.pending || "معلق"}</option>
              <option value="in_progress">{t.in_progress || "قيد التنفيذ"}</option>
              <option value="completed">{t.completed || "مكتمل"}</option>
            </select>
          </Field>

          <Field label={t.workshop}>
            <input className={inputClass} value={editing.workshop || ""} onChange={e => setEditing({...editing, workshop: e.target.value})} placeholder="اسم الورشة / المركز" />
          </Field>

          <Field label={t.technician}>
            <input className={inputClass} value={editing.technicianName || ""} onChange={e => setEditing({...editing, technicianName: e.target.value})} placeholder="اسم المهندس / الفني" />
          </Field>

          <Field label={t.cost}>
            <input type="number" className={inputClass} value={editing.cost || ""} onChange={e => setEditing({...editing, cost: parseFloat(e.target.value) || 0})} />
          </Field>

          <div />

          <Field label={t.startDate}>
            <input type="date" className={inputClass} value={editing.startDate || ""} onChange={e => setEditing({...editing, startDate: e.target.value})} />
          </Field>

          <Field label={t.endDate}>
            <input type="date" className={inputClass} value={editing.endDate || ""} onChange={e => setEditing({...editing, endDate: e.target.value})} />
          </Field>

          <div className="col-span-2">
            <Field label={lang === "ar" ? "وصف الصيانة والعطل" : "Description"}>
              <textarea className={inputClass} rows={2} value={editing.description || ""} onChange={e => setEditing({...editing, description: e.target.value})} placeholder="تفاصيل العطل وأعمال الصيانة المطلوبة..." />
            </Field>
          </div>

          <div className="col-span-2">
            <Field label={t.notes}>
              <textarea className={inputClass} rows={2} value={editing.notes || ""} onChange={e => setEditing({...editing, notes: e.target.value})} />
            </Field>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold transition-all hover:opacity-90 disabled:opacity-50 bg-gradient-to-r from-[#F97316] to-[#EA580C] shadow-md"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{t.save || "حفظ أمر الشغل"}</span>
              </>
            )}
          </button>
          <button 
            onClick={() => setModalOpen(false)} 
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold transition-colors"
          >
            <X size={16} />
            <span>{t.cancel || "إلغاء"}</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
