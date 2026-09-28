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
  cost: number;
  startDate: string;
  endDate: string;
  technicianName: string;
  notes: string;
  createdAt: string;
}

interface Vehicle { id: number; plateNumber: string; }

// قائمة أسماء الصيانة الجديدة المعتمدة
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
  maintenanceType: "صيانة ميكانيكا", // القيمة الافتراضية
  status: "pending",
  workshop: "", 
  description: "", 
  cost: 0, 
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "", 
  technicianName: "", 
  notes: ""
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

  const canWrite = user?.role === "admin" || user?.permissions?.includes("maintenance:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("maintenanceType", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/work-orders?${params}`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) {
      console.error("Failed to load work orders:", error);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : []));
  }, []);

  // ✅ دالة الحفظ المحدثة لمعالجة التواريخ الفارغة ومنع الأخطاء
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
        cost: Number(editing.cost) || 0,
        // معالجة التواريخ لمنع خطأ قاعدة البيانات
        startDate: editing.startDate && editing.startDate.trim() !== "" ? editing.startDate : null,
        endDate: editing.endDate && editing.endDate.trim() !== "" ? editing.endDate : null,
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

  const totalCost = data.reduce((s, r) => s + (r.cost || 0), 0);
  const openOrdersCount = data.filter(r => r.status !== "completed").length;
  const completedOrdersCount = data.filter(r => r.status === "completed").length;

  const excelData = data.map((r) => ({
    "رقم أمر الشغل": r.orderNumber || "",
    "رقم اللوحة": r.plateNumber || "",
    "اسم الصيانة": r.maintenanceType || "",
    "الحالة": r.status === "completed" ? "مكتمل" : r.status === "in_progress" ? "قيد التنفيذ" : "معلق",
    "الورشة / المركز": r.workshop || "غير محدد",
    "وصف العطل": r.description || "",
    "التكلفة (ج.م)": r.cost || 0,
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
    { key: "cost", header: "التكلفة", render: (r: WorkOrder) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{(r.cost || 0).toLocaleString()} ج.م</span> },
    { key: "startDate", header: "تاريخ البدء", render: (r: WorkOrder) => 
