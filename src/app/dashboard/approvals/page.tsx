"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { ShieldCheck, Check, X, Loader2, Clock, AlertTriangle } from "lucide-react";
import DataTable from "@/components/ui/DataTable";

export default function ApprovalsPage() {
  const { user } = useApp();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/approvals");
      const data = await res.json();
      setApprovals(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadApprovals(); }, [loadApprovals]);

  const handleAction = async (id: number, action: "approve" | "reject") => {
    if (!confirm(`هل أنت متأكد من ${action === "approve" ? "قبول" : "رفض"} هذا الطلب؟`)) return;
    setProcessing(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action === "approve" ? "approved" : "rejected" })
      });
      if (res.ok) {
        loadApprovals();
      } else {
        const err = await res.json();
        alert(err.error || "حدث خطأ");
      }
    } catch (e) {
      alert("تعذر الاتصال بالخادم");
    } finally {
      setProcessing(null);
    }
  };

  const columns = [
    { key: "moduleName", header: "القسم", render: (r:any) => <span className="font-bold text-blue-900">{r.module_name === 'vehicles' ? 'السيارات' : r.module_name}</span> },
    { key: "requestType", header: "نوع الطلب", render: (r:any) => <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${r.request_type === 'delete' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{r.request_type === 'delete' ? 'طلب حذف' : 'تعديل/إضافة'}</span> },
    { key: "notes", header: "التفاصيل", render: (r:any) => <span className="text-gray-600 font-semibold">{r.notes || "-"}</span> },
    { key: "requestedBy", header: "مقدم الطلب", render: (r:any) => <span className="font-bold">{r.requested_by}</span> },
    { key: "createdAt", header: "التاريخ", render: (r:any) => new Date(r.created_at).toLocaleDateString("en-GB") },
    { key: "status", header: "الحالة", render: (r:any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}`}>
          {r.status === 'pending' ? 'قيد الانتظار' : r.status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}
        </span>
      ) 
    },
    { key: "actions", header: "قرار المدير", render: (r:any) => (
      r.status === 'pending' && user?.role === 'super_admin' ? (
        <div className="flex gap-2 justify-center">
          <button onClick={() => handleAction(r.id, "approve")} disabled={processing === r.id} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg flex items-center gap-1 transition-colors">
            {processing === r.id ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
          </button>
          <button onClick={() => handleAction(r.id, "reject")} disabled={processing === r.id} className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex items-center gap-1 transition-colors">
            {processing === r.id ? <Loader2 size={16} className="animate-spin"/> : <X size={16}/>}
          </button>
        </div>
      ) : <span className="text-gray-400 text-xs">مغلق</span>
    )},
  ];

  if (user?.role === "user") {
    return <div className="p-12 text-center font-bold text-red-500">غير مصرح لك بدخول هذه الصفحة</div>;
  }

  return (
    <div className="w-full space-y-6" dir="rtl">
      <div className="flex items-center gap-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="p-3 bg-blue-900 text-white rounded-xl shadow-md"><ShieldCheck size={26} /></div>
        <div><h1 className="text-2xl font-black text-gray-900">مركز الموافقات (Approval Center)</h1><p className="text-sm text-gray-500 mt-0.5">إدارة طلبات الحذف والتعديل المعلقة</p></div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        {loading ? <div className="p-12 flex justify-center text-blue-800"><Loader2 className="animate-spin" size={32}/></div> : (
          <DataTable columns={columns} data={approvals} loading={false} />
        )}
      </div>
    </div>
  );
}
