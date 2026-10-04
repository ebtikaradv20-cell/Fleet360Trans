"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
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
  Pencil,
  Trash2,
  Paperclip,
  ImageIcon
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
  receivedBy: string;
  lifespanKm: number;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  invoiceUrl: string;
  notes: string;
  createdAt: string;
  is_deleted?: number;
}

interface Vehicle {
  id: number;
  plateNumber: string;
}

const MAINTENANCE_TYPES = [
  "تغيير زيت وفلاتر",
  "صيانة عفشة",
  "صيانة كاوتش",
  "كارتة",
  "صيانة ميكانيكا",
  "صيانة كهرباء",
  "سمكرة ودهان"
];

const WO_TEMPLATE_COLUMNS = [
  "رقم اللوحة",
  "اسم الصيانة",
  "الحالة",
  "الورشة",
  "الوصف",
  "التكلفة",
  "تاريخ البدء",
  "تاريخ الانتهاء",
  "الفني",
  "ملاحظات"
];

const emptyWO: Partial<WorkOrder> = {
  orderNumber: `WO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
  plateNumber: "",
  maintenanceType: "صيانة ميكانيكا",
  status: "in_progress",
  workshop: "",
  description: "",
  cost: 0,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  technicianName: "",
  receivedBy: "",
  invoiceUrl: "",
  notes: ""
};

const safeNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50";

export default function WorkOrdersPage() {
  const { user } = useApp();
  const [data, setData] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<WorkOrder>>(emptyWO);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ التصحيح الصارم: السماح بالوصول لكافة المديرين لزر الإضافة
  const canWrite =
    user?.role === "owner" ||
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.permissions?.includes("maintenance:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter && typeFilter !== "الكل") params.set("maintenanceType", typeFilter);
      if (statusFilter && statusFilter !== "الكل") params.set("status", statusFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/work-orders?${params}`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    load();
    fetch("/api/vehicles")
      .then((r) => r.json())
      .then((d) => setVehicles(Array.isArray(d) ? d : []));
  }, [load]);

  const activeOrders = data.filter(
    (r) => (r.is_deleted === 0 || !r.is_deleted) && r.status !== "deleted" && r.status !== "rejected"
  );
  const archivedOrders = data.filter((r) => r.is_deleted === 1 || r.status === "deleted" || r.status === "rejected");
  const displayData = activeTab === "active" ? activeOrders : archivedOrders;

  const filteredData = displayData.filter((r) => {
    const matchesSearch =
      (r.orderNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.plateNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.workshop || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "الكل" || r.maintenanceType === typeFilter;
    const matchesStatus = statusFilter === "الكل" || r.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalCost = activeOrders.reduce((acc, row) => acc + safeNum(row.cost), 0);
  const openOrdersCount = activeOrders.filter(
    (r) => r.status === "in_progress" || r.status === "pending" || r.status === "pending_approval"
  ).length;
  const completedOrdersCount = activeOrders.filter((r) => r.status === "completed").length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("حجم الملف يجب ألا يتجاوز 2 ميجابايت");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setEditing({ ...editing, invoiceUrl: evt.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...editing,
        vehicleId: Number(editing.vehicleId) || null,
        cost: safeNum(editing.cost),
        status: editing.status || "in_progress",
        startDate: editing.startDate || null,
        endDate: editing.endDate || null,
        invoiceUrl: editing.invoiceUrl || ""
      };
      const res = await fetch(isEdit ? `/api/work-orders/${editing.id}` : "/api/work-orders", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.success !== false) {
        if (resData.message) alert(resData.message);
        setModalOpen(false);
        load();
      } else {
        alert(resData.error || "حدث خطأ أثناء الحفظ");
      }
    } catch {
      alert("تعذر الاتصال بالخادم.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ الدالة المطورة وفق أعلى معايير البنية البرمجية لمعالجة الحذف
  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الصيانة نهائياً؟")) return;

    try {
      // 1. المحاولة الأولى: الحذف عبر المسار الديناميكي
      let res = await fetch(`/api/work-orders/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      let resData = await res.json().catch(() => ({}));

      // 2. المحاولة الثانية: إذا كان الـ API يعتمد Query Params أو Body
      if (res.status === 404 || res.status === 405) {
        res = await fetch(`/api/work-orders?id=${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
        resData = await res.json().catch(() => ({}));
      }

      // 3. المحاولة الثالثة: إذا رفضت قاعدة البيانات الحذف النهائي (Foreign Key) أو لم يتوفر مسار DELETE، تطبيق Soft Delete عبر PUT
      if (!res.ok && (res.status === 404 || res.status === 405 || res.status === 500 || res.status === 409)) {
        const currentOrder = data.find((item) => item.id === id);
        if (currentOrder) {
          const softDeleteRes = await fetch(`/api/work-orders/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...currentOrder,
              status: "deleted",
              is_deleted: 1
            })
          });
          const softData = await softDeleteRes.json().catch(() => ({}));

          if (softDeleteRes.ok && softData.success !== false) {
            setData((prev) =>
              prev.map((item) => (item.id === id ? { ...item, is_deleted: 1, status: "deleted" } : item))
            );
            alert("تم نقل أمر الصيانة إلى سجل المحذوفات والمرفوض بنجاح.");
            load();
            return;
          }
        }
      }

      // 4. تأكيد النجاح وتحديث واجهة المستخدم فورياً
      if (res.ok && resData.success !== false) {
        setData((prev) => prev.filter((item) => item.id !== id));
        alert(resData.message || "تم حذف أمر الصيانة بنجاح");
        load();
      } else {
        alert(resData.error || resData.message || "فشل حذف أمر الصيانة من الخادم. يرجى مراجعة صلاحيات النظام.");
      }
    } catch (error: any) {
      console.error("Delete operation failed:", error);
      alert("تعذر الاتصال بالخادم أثناء محاولة الحذف.");
    }
  };

  const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "-");

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">مكتمل</span>;
      case "in_progress":
        return <span className="px-2.5 py-1 bg-orange-100 text-orange-800 rounded-lg text-xs font-bold">قيد التنفيذ</span>;
      case "pending_approval":
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold animate-pulse">
            بانتظار الموافقة
          </span>
        );
      default:
        return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">معلق</span>;
    }
  };

  const excelData = filteredData.map((r) => ({
    "رقم الأمر": r.orderNumber,
    "رقم اللوحة": r.plateNumber,
    "نوع الصيانة": r.maintenanceType,
    "الحالة": r.status === "completed" ? "مكتمل" : r.status === "in_progress" ? "قيد التنفيذ" : "معلق",
    "الورشة / المركز": r.workshop || "",
    "التكلفة (ج.م)": safeNum(r.cost),
    "تاريخ البدء": r.startDate,
    "تاريخ الانتهاء": r.endDate,
    "الفني / المهندس": r.technicianName || "",
    "المستلم": r.receivedBy || ""
  }));

  const columns = [
    {
      key: "orderNumber",
      header: "رقم الأمر",
      render: (r: WorkOrder) => <span className="font-bold text-blue-900 dark:text-blue-400">{r.orderNumber}</span>
    },
    { key: "plateNumber", header: "اللوحة", render: (r: WorkOrder) => <span className="font-bold">{r.plateNumber}</span> },
    {
      key: "maintenanceType",
      header: "نوع الصيانة",
      render: (r: WorkOrder) => (
        <span className="px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-lg text-xs font-bold">
          {r.maintenanceType}
        </span>
      )
    },
    { key: "status", header: "الحالة", render: (r: WorkOrder) => renderStatusBadge(r.status) },
    { key: "workshop", header: "الورشة / المركز" },
    {
      key: "cost",
      header: "التكلفة",
      render: (r: WorkOrder) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">{safeNum(r.cost).toLocaleString()} ج.م</span>
      )
    },
    {
      key: "invoice",
      header: "المرفقات",
      render: (r: WorkOrder) =>
        r.invoiceUrl ? (
          <a
            href={r.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
          >
            <ImageIcon size={14} /> عرض
          </a>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
    },
    { key: "startDate", header: "تاريخ البدء", render: (r: WorkOrder) => formatDate(r.startDate) }
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* ── الكروت ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-blue-200 text-xs font-bold mb-1">إجمالي تكلفة الصيانة</div>
              <div className="text-3xl font-black">
                {totalCost.toLocaleString()} <span className="text-sm font-normal">ج.م</span>
              </div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl">
              <DollarSign size={22} />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-amber-100 text-xs font-bold mb-1">أوامر مفتوحة / قيد التنفيذ</div>
              <div className="text-3xl font-black">{openOrdersCount}</div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Clock size={22} />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-emerald-100 text-xs font-bold mb-1">صيانات مكتملة</div>
              <div className="text-3xl font-black">{completedOrdersCount}</div>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Wrench size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">أوامر الشغل والصيانة</h1>
            <p className="text-sm text-gray-500 mt-0.5">إجمالي {filteredData.length} أمر مطابق</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportExcelButton data={excelData} fileName="أوامر_الصيانة" dateColumnName="تاريخ البدء" />
          {/* ✅ زر الإضافة متاح حسب الصلاحيات الصحيحة */}
          {canWrite && (
            <button
              onClick={() => {
                setEditing(emptyWO);
                setIsEdit(false);
                setModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus size={18} />
              <span>إضافة صيانة</span>
            </button>
          )}
        </div>
      </div>

      {/* ── التبويبات ── */}
      <div className="flex gap-2 p-1.5 bg-white dark:bg-gray-900 rounded-xl w-fit border border-gray-200 dark:border-gray-800 shadow-sm mb-4">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "active" ? "bg-teal-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          الأوامر النشطة ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("archived")}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "archived" ? "bg-red-700 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          سجل المحذوفات والمرفوض ({archivedOrders.length})
        </button>
      </div>

      <FilterBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        showDateRange
      >
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">بحث:</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث..."
            className="border dark:border-gray-700 rounded-lg ps-7 pe-2 py-1.5 text-xs dark:bg-gray-800 dark:text-white outline-none w-32 focus:border-teal-500"
          />
        </div>
        <FilterSelect
          label="نوع الصيانة"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[{ value: "الكل", label: "الكل" }, ...MAINTENANCE_TYPES.map((t) => ({ value: t, label: t }))]}
        />
        <FilterSelect
          label="الحالة"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "الكل", label: "الكل" },
            { value: "in_progress", label: "قيد التنفيذ" },
            { value: "pending", label: "معلق" },
            { value: "completed", label: "مكتمل" }
          ]}
        />
      </FilterBar>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          onEdit={
            canWrite && activeTab === "active"
              ? (r) => {
                  setEditing(r);
                  setIsEdit(true);
                  setModalOpen(true);
                }
              : undefined
          }
          onDelete={
            activeTab === "active" &&
            (user?.role === "admin" || user?.role === "super_admin" || user?.role === "owner" || canWrite)
              ? (r) => handleDelete(r.id)
              : undefined
          }
        />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[95vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center bg-blue-900 text-white p-4 rounded-t-2xl shrink-0">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Wrench className="text-teal-400" /> {isEdit ? "تعديل أمر الصيانة" : "إضافة أمر صيانة جديد"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="hover:text-red-400">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="maintenance-form" onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <Field label="رقم الأمر">
                    <input
                      disabled
                      className={`${inputClass} bg-gray-200 dark:bg-gray-700 cursor-not-allowed font-bold`}
                      value={editing.orderNumber || ""}
                      readOnly
                    />
                  </Field>
                  <Field label="السيارة *">
                    <select
                      required
                      className={inputClass}
                      value={editing.plateNumber || ""}
                      onChange={(e) => {
                        const v = vehicles.find((v) => v.plateNumber === e.target.value);
                        setEditing({ ...editing, plateNumber: e.target.value, vehicleId: v?.id });
                      }}
                    >
                      <option value="">-- اختر --</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.plateNumber}>
                          {v.plateNumber}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="نوع الصيانة *">
                    <select
                      required
                      className={inputClass}
                      value={editing.maintenanceType || ""}
                      onChange={(e) => setEditing({ ...editing, maintenanceType: e.target.value })}
                    >
                      {MAINTENANCE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="الحالة التشغيلية">
                    <select
                      className={inputClass}
                      value={editing.status || "in_progress"}
                      onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                    >
                      <option value="in_progress">قيد التنفيذ</option>
                      <option value="pending">معلق</option>
                      <option value="completed">تمت الصيانة (مكتمل)</option>
                    </select>
                  </Field>
                  <Field label="اسم الورشة / المركز">
                    <input
                      className={inputClass}
                      value={editing.workshop || ""}
                      onChange={(e) => setEditing({ ...editing, workshop: e.target.value })}
                    />
                  </Field>
                  <Field label="إجمالي التكلفة (ج.م)">
                    <input
                      type="number"
                      step="0.01"
                      className={inputClass}
                      value={editing.cost || ""}
                      onChange={(e) => setEditing({ ...editing, cost: safeNum(e.target.value) })}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-blue-200 p-5 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-900/50">
                  <Field label="اسم الفني (المعالج)">
                    <input
                      className={inputClass}
                      value={editing.technicianName || ""}
                      onChange={(e) => setEditing({ ...editing, technicianName: e.target.value })}
                      placeholder="المهندس المسؤول"
                    />
                  </Field>
                  <Field label="اسم المستلم (مندوب الشركة)">
                    <input
                      className={inputClass}
                      value={editing.receivedBy || ""}
                      onChange={(e) => setEditing({ ...editing, receivedBy: e.target.value })}
                      placeholder="من استلم السيارة؟"
                    />
                  </Field>
                  <Field label="العمر الافتراضي (للقطعة/الصيانة)">
                    <input
                      type="number"
                      className={inputClass}
                      value={editing.lifespanKm || ""}
                      onChange={(e) => setEditing({ ...editing, lifespanKm: safeNum(e.target.value) })}
                      placeholder="بالكيلومتر (مثال 40000)"
                    />
                  </Field>
                  <Field label="تاريخ آخر صيانة سابقة">
                    <input
                      type="date"
                      className={inputClass}
                      value={editing.lastMaintenanceDate || ""}
                      onChange={(e) => setEditing({ ...editing, lastMaintenanceDate: e.target.value })}
                    />
                  </Field>
                  <Field label="تاريخ البدء (الحالي)">
                    <input
                      type="date"
                      required
                      className={inputClass}
                      value={editing.startDate || ""}
                      onChange={(e) => setEditing({ ...editing, startDate: e.target.value })}
                    />
                  </Field>
                  <Field label="تاريخ التغيير/الصيانة القادمة">
                    <input
                      type="date"
                      className={inputClass}
                      value={editing.nextMaintenanceDate || ""}
                      onChange={(e) => setEditing({ ...editing, nextMaintenanceDate: e.target.value })}
                    />
                  </Field>
                </div>

                <div className="col-span-1 md:col-span-3 p-4 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-teal-900 dark:text-teal-300">مرفقات الصيانة والفواتير</p>
                    <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                      ارفع صورة الفاتورة للرجوع إليها لاحقاً (صورة أو PDF بحد أقصى 2MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-colors whitespace-nowrap"
                  >
                    <Paperclip size={18} /> {editing.invoiceUrl ? "تغيير المرفق الحالي" : "إرفاق ملف / فاتورة"}
                  </button>
                  {editing.invoiceUrl && (
                    <a
                      href={editing.invoiceUrl}
                      target="_blank"
                      className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-2 rounded-lg hover:bg-emerald-200"
                    >
                      <CheckCircle2 size={14} /> تم الإرفاق بنجاح (معاينة)
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Field label="تفاصيل العطل والأعمال المطلوبة">
                    <textarea
                      className={inputClass}
                      rows={2}
                      value={editing.description || ""}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                      placeholder="ما هي الأعطال التي تم معالجتها؟"
                    />
                  </Field>
                </div>
              </form>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 dark:border-gray-700 dark:bg-gray-800 flex gap-3 shrink-0 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 bg-white border text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300"
              >
                إلغاء
              </button>
              <button
                form="maintenance-form"
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-md hover:bg-blue-800"
              >
                {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} حفظ أمر الصيانة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
