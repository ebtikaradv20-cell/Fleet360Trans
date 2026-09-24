"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";

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
  plateNumber: "", maintenanceType: "preventive", status: "pending",
  workshop: "", description: "", cost: 0, startDate: new Date().toISOString().slice(0, 10),
  endDate: "", technicianName: "", notes: ""
};

export default function WorkOrdersPage() {
  const { lang, user } = useApp();
  const t = translations[lang];
  const [data, setData] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<WorkOrder>>(emptyWO);
  const [isEdit, setIsEdit] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [workshopFilter, setWorkshopFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("maintenance:write");

  const load = useCallback(async () => {
    setLoading(true);
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
    setLoading(false);
  }, [search, typeFilter, statusFilter, workshopFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
  }, []);

  const handleSave = async () => {
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `/api/work-orders/${editing.id}` : "/api/work-orders";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
    if (res.ok) { setModalOpen(false); load(); }
  };

  const handleDelete = async (row: WorkOrder) => {
    await fetch(`/api/work-orders/${row.id}`, { method: "DELETE" });
    load();
  };

  const openAdd = () => { setEditing({...emptyWO, orderNumber: `WO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`}); setIsEdit(false); setModalOpen(true); };
  const openEdit = (row: WorkOrder) => { setEditing(row); setIsEdit(true); setModalOpen(true); };
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : "-";

  const totalCost = data.reduce((s, r) => s + (r.cost || 0), 0);
  const workshops = [...new Set(data.map(r => r.workshop).filter(Boolean))];

  const columns = [
    { key: "orderNumber", header: t.orderNumber, render: (r: WorkOrder) => <span className="font-bold text-blue-600 dark:text-blue-400">{r.orderNumber}</span> },
    { key: "plateNumber", header: t.plateNumber },
    { key: "maintenanceType", header: t.maintenanceType, render: (r: WorkOrder) => <StatusBadge status={r.maintenanceType} /> },
    { key: "status", header: t.status, render: (r: WorkOrder) => <StatusBadge status={r.status} /> },
    { key: "workshop", header: t.workshop },
    { key: "description", header: lang === "ar" ? "الوصف" : "Description", render: (r: WorkOrder) => <span className="max-w-32 truncate block" title={r.description}>{r.description}</span> },
    { key: "cost", header: t.cost, render: (r: WorkOrder) => <span className="font-bold text-green-600 dark:text-green-400">{(r.cost || 0).toLocaleString()} ج.م</span> },
    { key: "startDate", header: t.startDate, render: (r: WorkOrder) => formatDate(r.startDate) },
    { key: "technicianName", header: t.technician },
    { key: "createdAt", header: t.createdAt, render: (r: WorkOrder) => formatDate(r.createdAt) },
  ];

  const inputClass = "w-full border dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>{children}</div>
  );

  return (
    <div className="fade-in">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-4 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400">{lang === "ar" ? "إجمالي التكلفة" : "Total Cost"}</div>
          <div className="text-2xl font-black text-green-600">{totalCost.toLocaleString()} ج.م</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-4 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400">{lang === "ar" ? "أوامر مفتوحة" : "Open Orders"}</div>
          <div className="text-2xl font-black text-orange-500">{data.filter(r => r.status !== "completed").length}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-4 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400">{lang === "ar" ? "مكتملة" : "Completed"}</div>
          <div className="text-2xl font-black text-blue-600">{data.filter(r => r.status === "completed").length}</div>
        </div>
      </div>

      <PageHeader title={lang === "ar" ? "أوامر الشغل والصيانة" : "Work Orders & Maintenance"} icon="🔧"
        subtitle={lang === "ar" ? `${data.length} أمر شغل` : `${data.length} work orders`}
        onAdd={canWrite ? openAdd : undefined} addLabel={t.addWorkOrder}
        data={data.map(r => ({ ...r }))} exportFileName="work_orders"
      >
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`🔍 ${t.search}...`}
          className="border dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
      </PageHeader>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <FilterSelect label={t.maintenanceType} value={typeFilter} onChange={setTypeFilter} options={[
          { value: "preventive", label: t.preventive },
          { value: "emergency", label: t.emergency },
        ]} />
        <FilterSelect label={t.status} value={statusFilter} onChange={setStatusFilter} options={[
          { value: "pending", label: t.pending },
          { value: "in_progress", label: t.in_progress },
          { value: "completed", label: t.completed },
        ]} />
        <FilterSelect label={t.workshop} value={workshopFilter} onChange={setWorkshopFilter}
          options={workshops.map(w => ({ value: w, label: w }))} />
      </FilterBar>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <DataTable columns={columns} data={data} loading={loading}
          onEdit={canWrite ? openEdit : undefined}
          onDelete={user?.role === "admin" ? handleDelete : undefined}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? t.edit : t.addWorkOrder} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t.orderNumber}>
            <input className={inputClass} value={editing.orderNumber || ""} onChange={e => setEditing({...editing, orderNumber: e.target.value})} />
          </Field>
          <Field label={t.plateNumber}>
            <select className={inputClass} value={editing.plateNumber || ""}
              onChange={e => {
                const v = vehicles.find(v => v.plateNumber === e.target.value);
                setEditing({...editing, plateNumber: e.target.value, vehicleId: v?.id});
              }}>
              <option value="">-- {lang === "ar" ? "اختر" : "Select"} --</option>
              {vehicles.map(v => <option key={v.id} value={v.plateNumber}>{v.plateNumber}</option>)}
            </select>
          </Field>
          <Field label={t.maintenanceType}>
            <select className={inputClass} value={editing.maintenanceType || "preventive"} onChange={e => setEditing({...editing, maintenanceType: e.target.value})}>
              <option value="preventive">{t.preventive}</option>
              <option value="emergency">{t.emergency}</option>
            </select>
          </Field>
          <Field label={t.status}>
            <select className={inputClass} value={editing.status || "pending"} onChange={e => setEditing({...editing, status: e.target.value})}>
              <option value="pending">{t.pending}</option>
              <option value="in_progress">{t.in_progress}</option>
              <option value="completed">{t.completed}</option>
            </select>
          </Field>
          <Field label={t.workshop}>
            <input className={inputClass} value={editing.workshop || ""} onChange={e => setEditing({...editing, workshop: e.target.value})} />
          </Field>
          <Field label={t.technician}>
            <input className={inputClass} value={editing.technicianName || ""} onChange={e => setEditing({...editing, technicianName: e.target.value})} />
          </Field>
          <Field label={t.cost}>
            <input type="number" className={inputClass} value={editing.cost || ""} onChange={e => setEditing({...editing, cost: parseFloat(e.target.value)})} />
          </Field>
          <div />
          <Field label={t.startDate}>
            <input type="date" className={inputClass} value={editing.startDate || ""} onChange={e => setEditing({...editing, startDate: e.target.value})} />
          </Field>
          <Field label={t.endDate}>
            <input type="date" className={inputClass} value={editing.endDate || ""} onChange={e => setEditing({...editing, endDate: e.target.value})} />
          </Field>
          <div className="col-span-2">
            <Field label={lang === "ar" ? "الوصف" : "Description"}>
              <textarea className={inputClass} rows={2} value={editing.description || ""} onChange={e => setEditing({...editing, description: e.target.value})} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label={t.notes}>
              <textarea className={inputClass} rows={2} value={editing.notes || ""} onChange={e => setEditing({...editing, notes: e.target.value})} />
            </Field>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-white font-semibold" style={{ background: "linear-gradient(90deg, #F97316, #EA580C)" }}>
            💾 {t.save}
          </button>
          <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold">
            {t.cancel}
          </button>
        </div>
      </Modal>
    </div>
  );
}
