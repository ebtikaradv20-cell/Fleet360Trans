"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { ShieldCheck, Check, X, Loader2, AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
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
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadApprovals(); }, [loadApprovals]);

  const handleAction = async (id: number, action: "approve" | "reject") => {
    if (!confirm(`هل أنت متأكد من ${action === "approve" ? "الموافقة على" : "رفض"} هذا الطلب؟`)) return;
    setProcessing(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action === "approve" ? "approved" : "rejected" })
      });
      const resData = await res.json();
      if (res.ok) {
        loadApprovals();
      } else {
        alert(resData.error || "حدث خطأ أثناء معالجة الطلب");
      }
    } catch (e) {
      alert("تعذر الاتصال بالخادم");
    } finally {
      setProcessing(null);
    }
  };

  const isSuperAdmin = user?.role === "super_admin";

  const columns = [
    { key: "module_name", header: "القسم", render: (r:any) => <span className="font-bold text-blue-900">{r.module_name === 'vehicles' ? 'السيارات' : r.module_name}</span> },
    { key: "request_type", header: "نوع الطلب", render: (r:any) => <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${r.request_type === 'delete' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{r.request_type === 'delete' ? 'طلب حذف نهائي' : 'تعديل/إضافة'}</span> },
    { key: "notes", header: "التفاصيل", render: (r:any) => <span className="text-gray-700 font-semibold">{r.notes || "-"}</span> },
    { key: "requested_by", header: "مقدم الطلب", render: (r:any) => <span className="font-bold text-gray-900">{r.requested_by}</span> },
    { key: "created_at", header: "تاريخ الطلب", render: (r:any) => <span className="text-xs text-gray-500 font-bold">{new Date(r.created_at).toLocaleString("en-GB")}</span> },
    { key: "status", header: "حالة الطلب", render: (r:any) => (
        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 w-fit mx-auto ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}`}>
          {r.status === 'pending' ? <><Clock size={12}/> قيد الانتظار</> : r.status === 'approved' ? <><CheckCircle2 size={12}/> تمت الموافقة</> : <><XCircle size={12}/> مرفوض</>}
        </span>
      ) 
    },
    { key: "actions", header: "القرار الإداري", render: (r:any) => (
      r.status === 'pending' && isSuperAdmin ? (
        <div className="flex gap-2 justify-center">
          <button onClick={() => handleAction(r.id, "approve")} disabled={processing === r.id} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg flex items-center gap-1 transition-colors" title="موافقة">
            {processing === r.id ? <Loader2 size={16} className="animate-spin"/> : <Check size={18}/>}
          </button>
          <button onClick={() => handleAction(r.id, "reject")} disabled={processing === r.id} className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex items-center gap-1 transition-colors" title="رفض">
            {processing === r.id ? <Loader2 size={16} className="animate-spin"/> : <X size={18}/>}
          </button>
        </div>
      ) : <span className="text-gray-400 text-xs font-bold">{r.approved_by ? `بواسطة: ${r.approved_by}` : "-"}</span>
    )},
  ];

  if (!user || user.role === "user") {
    return <div className="flex flex-col items-center justify-center h-64 text-red-500 font-bold"><AlertCircle size={40} className="mb-2"/> غير مصرح لك بدخول هذه الصفحة</div>;
  }

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      {/* ── رأس الصفحة ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl"><ShieldCheck size={26} /></div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">مركز الاعتمادات والموافقات</h1>
            <p className="text-sm text-gray-500 mt-0.5">مراجعة طلبات مديري الفروع المعلقة للبت فيها</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center text-blue-800 dark:text-blue-400"><Loader2 className="animate-spin" size={32}/></div>
        ) : (
          <DataTable columns={columns} data={approvals} loading={false} />
        )}
      </div>

    </div>
  );
}
