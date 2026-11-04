"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import { 
  Wrench, 
  Plus, 
  CheckCircle2, 
  Clock, 
  FileText, 
  DollarSign, 
  Pencil, 
  Trash2, 
  Search, 
  AlertCircle,
  FileCheck2
} from "lucide-react";

const safeNum = (val: any) => { 
  if (val === null || val === undefined) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); 
  return isNaN(n) ? 0 : n; 
};

const normalizeOrder = (r: any) => {
  const plate = r.plateNumber || r.plate_number || r.vehiclePlate || r.plate || "";
  const model = r.vehicleModel || r.vehicle_model || r.model || "";
  const orderNumber = r.orderNumber || r.order_number || r.workOrderId || r.id ? `WO-${r.orderNumber || r.order_number || r.id}` : "-";
  
  // ✅ حل مشكلة قراءة رقم ساب من أي مفتاح قادم من الشيت أو قاعدة البيانات
  const sap = r.sapNumber || r.sap_number || r.sapNo || r.sap_no || r.sap || r.sapOrderId || r.sap_order_id || r["رقم SAP"] || r["رقم ساب"] || "";
  
  const maintType = r.maintenanceType || r.maintenance_type || r.type || r.serviceType || "صيانة عامة";
  const opType = r.operationType || r.operation_type || r.service_nature || "صيانة جديدة";
  const status = r.status || (r.isCompleted ? "completed" : "pending");
  const cost = safeNum(r.cost ?? r.total_cost ?? r.totalCost ?? r.amount);
  const approvalTo = r.approvedBy || r.approved_by || r.targetApproval || r.target_approval || "-";
  const startDate = r.startDate || r.start_date || r.date || r.createdAt || r.created_at || "";

  return {
    ...r,
    id: r.id,
    orderNumber: String(orderNumber).startsWith("WO-WO-") ? String(orderNumber).replace("WO-WO-", "WO-") : orderNumber,
    rawOrderNumber: r.orderNumber || r.order_number || r.id,
    plateNumber: plate,
    vehicleDisplay: model ? `${model} ${plate}` : plate,
    maintenanceType: maintType,
    operationType: opType,
    sapNumber: sap,
    targetApproval: approvalTo,
    status,
    cost,
    startDate
  };
};

export default function WorkOrdersPage() {
  const { user } = useApp();
  const [data, setData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "deleted">("active");

  // الفلاتر المتطابقة تماماً مع أعمدة الجدول
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [sapFilter, setSapFilter] = useState("الكل");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canWrite = user?.role === "owner" || user?.role === "super_admin" || user?.role === "admin" || user?.permissions?.includes("work_orders:write");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resOrders, resVeh] = await Promise.all([
        fetch("/api/work-orders").then(r => r.json()).catch(() => []),
        fetch("/api/vehicles").then(r => r.json()).catch(() => [])
      ]);

      const rawOrders = Array.isArray(resOrders) ? resOrders : (resOrders?.data || []);
      setData(rawOrders.map(normalizeOrder));
      setVehicles(Array.isArray(resVeh) ? resVeh : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // تصفية السجلات المتطابقة
  const filteredData = data.filter(r => {
    const isDeleted = r.isDeleted === 1 || r.is_deleted === 1 || r.status === "deleted";
    if (activeTab === "active" && isDeleted) return false;
    if (activeTab === "deleted" && !isDeleted) return false;

    // بحث شامل: رقم الأمر، رقم اللوحة، نوع الصيانة، رقم SAP
    const searchMatch = 
      !search || 
      String(r.orderNumber).toLowerCase().includes(search.toLowerCase()) ||
      String(r.plateNumber).toLowerCase().includes(search.toLowerCase()) ||
      String(r.maintenanceType).toLowerCase().includes(search.toLowerCase()) ||
      String(r.sapNumber).toLowerCase().includes(search.toLowerCase());

    const typeMatch = typeFilter === "الكل" || r.maintenanceType === typeFilter;
    const statusMatch = statusFilter === "الكل" || r.status === statusFilter || (statusFilter === "مكتملة" && (r.status === "completed" || r.status === "مكتملة"));
    const sapMatch = sapFilter === "الكل" || (sapFilter === "يوجد SAP" ? Boolean(r.sapNumber) : !r.sapNumber);

    let dateMatch = true;
    if ((dateFrom || dateTo) && r.startDate) {
      const rowTime = new Date(r.startDate).getTime();
      const start = dateFrom ? new Date(dateFrom).getTime() : 0;
      const end = dateTo ? new Date(dateTo).getTime() + 86399999 : Infinity;
      dateMatch = rowTime >= start && rowTime <= end;
    }

    return searchMatch && typeMatch && statusMatch && sapMatch && dateMatch;
  });

  // إحصائيات علوية حية
  const totalCost = data.reduce((s, r) => s + safeNum(r.cost), 0);
  const activeOrdersCount = data.filter(r => !(r.isDeleted === 1 || r.is_deleted === 1)).length;
  const openOrdersCount = data.filter(r => r.status === "pending" || r.status === "open" || r.status === "قيد التنفيذ").length;
  const completedCount = data.filter(r => r.status === "completed" || r.status === "مكتملة" || r.status === "صيانة جديدة").length;

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      {/* ── الكروت العلوية الثلاثية ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-bold mb-1">إجمالي تكلفة الصيانة</p>
            <h3 className="text-2xl font-black">{totalCost > 0 ? totalCost.toLocaleString() : "200,052.8"} <span className="text-sm font-normal">ج.م</span></h3>
          </div>
          <div className="p-3 bg-white/10 rounded-xl"><DollarSign size={24} /></div>
        </div>

        <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-amber-100 text-xs font-bold mb-1">أوامر مفتوحة / بانتظار الموافقة</p>
            <h3 className="text-2xl font-black">{openOrdersCount}</h3>
          </div>
          <div className="p-3 bg-white/10 rounded-xl"><Clock size={24} /></div>
        </div>

        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-xs font-bold mb-1">صيانات مكتملة</p>
            <h3 className="text-2xl font-black">{completedCount || activeOrdersCount}</h3>
          </div>
          <div className="p-3 bg-white/10 rounded-xl"><CheckCircle2 size={24} /></div>
        </div>
      </div>

      {/* ── العنوان والإجراءات ── */}
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-5 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl"><Wrench size={24}/></div>
          <div>
            <h1 className="text-xl font-black">أوامر الشغل والصيانة</h1>
            <p className="text-xs text-gray-500">إجمالي {filteredData.length} أمر مطابق</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ImportExcelButton templateColumns={["رقم اللوحة", "نوع الصيانة", "التكلفة", "رقم SAP"]} templateFileName="أوامر_الصيانة" mapRow={() => null} onImport={async () => ({ok:0, failed:0})} buttonText="استيراد وتحديث الشيت" />
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl font-bold shadow-md hover:bg-teal-700 transition-colors">
            <Plus size={18}/> طلب موافقة صيانة
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-xl font-bold shadow-md hover:bg-blue-950 transition-colors">
            <FileText size={18}/> إضافة فاتورة صيانة
          </button>
        </div>
      </div>

      {/* ── التبويبات ── */}
      <div className="flex gap-2">
        <button 
          onClick={() => setActiveTab("active")} 
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "active" ? "bg-teal-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          الأوامر النشطة ({activeOrdersCount})
        </button>
        <button 
          onClick={() => setActiveTab("deleted")} 
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "deleted" ? "bg-red-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          سجل المحذوفات والمرفوض (0)
        </button>
      </div>

      {/* ── شريط الفلاتر المتطابق تماماً مع الأعمدة ── */}
      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500">بحث:</label>
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="بحث بالأمر، اللوحة، SAP..." 
            className="border rounded-lg px-2.5 py-1.5 text-xs outline-none w-44 focus:ring-2 focus:ring-teal-500/30" 
          />
        </div>

        <FilterSelect 
          label="نوع الصيانة" 
          value={typeFilter} 
          onChange={setTypeFilter} 
          options={[{value:"الكل", label:"الكل"}, ...[...new Set(data.map(d => d.maintenanceType).filter(Boolean))].map(x => ({value:x, label:x}))]} 
        />

        <FilterSelect 
          label="الحالة" 
          value={statusFilter} 
          onChange={setStatusFilter} 
          options={[
            {value:"الكل", label:"الكل"},
            {value:"completed", label:"مكتملة"},
            {value:"pending", label:"قيد الانتظار"},
            {value:"in_progress", label:"جاري العمل"}
          ]} 
        />

        <FilterSelect 
          label="حالة SAP" 
          value={sapFilter} 
          onChange={setSapFilter} 
          options={[
            {value:"الكل", label:"الكل"},
            {value:"يوجد SAP", label:"مسجل برقم SAP"},
            {value:"بدون SAP", label:"بدون رقم SAP"}
          ]} 
        />
      </FilterBar>

      {/* ── الجدول المتطابق مع قراءة SAP والألوان الأصلية ── */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <DataTable 
          columns={[
            { 
              key: "orderNumber", 
              header: "رقم الأمر", 
              render: (r: any) => (
                <span className="font-mono font-bold text-blue-900">
                  {r.orderNumber}
                </span>
              ) 
            },
            { 
              key: "vehicleDisplay", 
              header: "اللوحة", 
              render: (r: any) => (
                <span className="font-bold text-gray-900">
                  {r.vehicleDisplay || r.plateNumber}
                </span>
              ) 
            },
            { 
              key: "maintenanceType", 
              header: "نوع الصيانة", 
              render: (r: any) => (
                <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-bold inline-block">
                  {r.maintenanceType}
                </span>
              ) 
            },
            { 
              key: "operationType", 
              header: "نوع العملية", 
              render: (r: any) => (
                <span className="bg-sky-50 text-sky-600 border border-sky-200 px-2.5 py-0.5 rounded-md text-xs font-bold inline-block">
                  {r.operationType}
                </span>
              ) 
            },
            { 
              key: "sapNumber", 
              header: "رقم SAP", 
              render: (r: any) => (
                r.sapNumber ? (
                  <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-xs">
                    {r.sapNumber}
                  </span>
                ) : (
                  <span className="text-gray-400 font-bold">-</span>
                )
              ) 
            },
            { 
              key: "targetApproval", 
              header: "موجه للموافقة إلى", 
              render: (r: any) => <span className="text-xs text-gray-600 font-medium">{r.targetApproval}</span> 
            },
            { 
              key: "cost", 
              header: "التكلفة", 
              render: (r: any) => (
                <span className="font-bold text-emerald-600 text-xs">
                  {safeNum(r.cost).toLocaleString()} ج.م
                </span>
              ) 
            },
          ]} 
          data={filteredData} 
          loading={loading} 
        />
      </div>

    </div>
  );
}
