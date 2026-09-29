"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { 
  Wrench, Search, Plus, Save, X, Loader2, DollarSign, Clock, CheckCircle2 
} from "lucide-react";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";

interface WorkOrder {
  id: number; orderNumber: string; vehicleId: number; plateNumber: string;
  maintenanceType: string; status: string; workshop: string; description: string;
  cost: number | string; startDate: string; endDate: string; technicianName: string;
  notes: string; createdAt: string;
}

const MAINTENANCE_TYPES = ["تغيير زيت وفلاتر", "صيانة عفشة", "صيانة كاوتش", "كارتة", "صيانة ميكانيكا", "صيانة كهرباء"];

const WO_TEMPLATE_COLUMNS = [
  "رقم اللوحة", "اسم الصيانة", "الحالة", "الورشة", "الوصف", "التكلفة", "تاريخ البدء", "تاريخ الانتهاء", "الفني", "ملاحظات"
];

const emptyWO: Partial<WorkOrder> = {
  orderNumber: `WO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
  plateNumber: "", maintenanceType: "صيانة ميكانيكا", status: "pending", workshop: "", description: "", cost: 0, 
  startDate: new Date().toISOString().slice(0, 10), endDate: "", technicianName: "", notes: ""
};

const safeNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : num;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>{children}</div>
);
const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50";

export default function WorkOrdersPage() {
  const { user } = useApp();
  const [data, setData] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<WorkOrder>>(emptyWO);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // ── الفلاتر الحديثة ──
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");

  const canWrite = user?.role === "admin" || user?.permissions?.includes("maintenance:write");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/work-orders`);
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, []);

  // ── التصفية الحية ──
  const filteredData = data.filter(r => {
    const matchesSearch = 
      (r.orderNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.plateNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.workshop || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.technicianName || "").toLowerCase().includes(search.toLowerCase());
      
    const matchesType = typeFilter === "الكل" || r.maintenanceType === typeFilter;
    const matchesStatus = statusFilter === "الكل" || r.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const totalCost = filteredData.reduce((acc, row) => acc + safeNum(row.cost), 0);
  const openOrdersCount = filteredData.filter(r => r.status !== "completed").length;
  const completedOrdersCount = filteredData.filter(r => r.status === "completed").length;

  // ── دوال الإكسيل (تصدير واستيراد) ──
  const mapWORow = (row: Record<string, any>) => {
    const plate = row["رقم اللوحة"] || row["plateNumber"] || "";
    if (!String(plate).trim()) return null;

    let status = "pending";
    if (row["الحالة"] === "مكتمل") status = "completed";
    if (row["الحالة"] === "قيد التنفيذ") status = "in_progress";

    const sDate = row["تاريخ البدء"] ? new Date(row["تاريخ البدء"]) : null;
    const eDate = row["تاريخ الانتهاء"] ? new Date(row["تاريخ الانتهاء"]) : null;

    return {
      plateNumber: String(plate).trim(),
      maintenanceType: row["اسم الصيانة"] || "صيانة ميكانيكا",
      status: status,
      workshop: row["الورشة"] || "",
      description: row["الوصف"] || "",
      cost: safeNum(row["التكلفة"]),
      startDate: sDate && !isNaN(sDate.getTime()) ? sDate.toISOString().slice(0, 10) : null,
      endDate: eDate && !isNaN(eDate.getTime()) ? eDate.toISOString().slice(0, 10) : null,
      technicianName: row["الفني"] || "",
      notes: row["ملاحظات"] || "",
    };
  };

  const handleImport = async (rows: any[], mode: "append" | "upsert") => {
    let ok = 0; let failed = 0;
    for (const payload of rows) {
      try {
        const res = await fetch("/api/work-orders", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        if (res.ok) ok++; else failed++;
      } catch { failed++; }
    }
    await load();
    return { ok, failed };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = { ...editing, vehicleId: Number(editing.vehicleId) || null, cost: safeNum(editing.cost), startDate: editing.startDate && String(editing.startDate).trim() !== "" ? editing.startDate : null, endDate: editing.endDate && String(editing.endDate).trim() !== "" ? editing.endDate : null };
      const res = await fetch(isEdit ? `/api/work-orders/${editing.id}` : "/api/work-orders", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.success !== false) { setModalOpen(false); load(); } 
      else { alert(resData.error || "حدث خطأ أثناء الحفظ"); }
    } catch (error) { alert("تعذر الاتصال بالخادم."); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف أمر الشغل؟")) return;
    await fetch(`/api/work-orders/${id}`, { method: "DELETE" }); load();
  };

  const excelData = filteredData.map((r) => ({
    "رقم الأمر": r.orderNumber, "رقم اللوحة": r.plateNumber, "اسم الصيانة": r.maintenanceType,
    "الحالة": r.status === "completed" ? "مكتمل" : r.status === "in_progress" ? "قيد التنفيذ" : "معلق",
    "الورشة": r.workshop, "الوصف": r.description, "التكلفة": safeNum(r.cost),
    "تاريخ البدء": r.startDate, "تاريخ الانتهاء": r.endDate, "الفني": r.technicianName,
  }));

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* ── الكروت ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden"><div className="flex justify-between items-start relative z-10"><div><div className="text-blue-200 text-xs font-bold mb-1">إجمالي 
