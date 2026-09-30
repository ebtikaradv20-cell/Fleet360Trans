"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ExportExcelButton from "@/components/ExportExcelButton";
import { Users, UserPlus, ShieldCheck, UserCheck, Lock, CheckCircle2, Save, X, Loader2, Network } from "lucide-react";

interface User {
  id: number; username: string; name: string; role: string; permissions: string; tenantId: string; createdAt: string;
}

const ALL_PERMISSIONS = [
  { key: "vehicles:write", label: "إدارة السيارات" }, { key: "fuel:write", label: "إدارة الوقود" },
  { key: "maintenance:write", label: "إدارة الصيانة" }, { key: "inventory:write", label: "إدارة المخزون" }
];

const emptyUser = { username: "", name: "", role: "user", password: "", permissions: "[]", createNewBranch: false };
const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/50";

export default function UsersPage() {
  const { user: currentUser } = useApp();
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(emptyUser);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border"><Lock size={32} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-black">غير مصرح بالوصول</h2><p className="text-xs text-gray-500">هذه الصفحة مخصصة لمديري النظام فقط.</p>
        </div>
      </div>
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch("/api/users"); const d = await res.json(); setData(Array.isArray(d) ? d : []); } 
    catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (saving) return; setSaving(true);
    try {
      const payload = { ...editing, permissions: JSON.stringify(selectedPerms) };
      const res = await fetch(isEdit ? `/api/users/${editing.id}` : "/api/users", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const errData = await res.json().catch(()=>({}));
      if (res.ok) { setModalOpen(false); load(); } else { alert(errData.error || "خطأ بالحفظ"); }
    } catch { alert("خطأ اتصال"); } finally { setSaving(false); }
  };

  const handleDelete = async (row: User) => {
    if (row.id === currentUser?.userId) return alert("لا يمكنك حذف حسابك!");
    if (confirm("حذف؟")) { await fetch(`/api/users/${row.id}`, { method: "DELETE" }); load(); }
  };

  const excelData = data.map((u) => ({
    "الاسم الكامل": u.name, "اسم المستخدم": u.username, "الدور": u.role === "admin" ? "مدير فرع" : "مستخدم", "الفرع/المنطقة (Tenant)": u.tenantId
  }));

  return (
    <div className="w-full space-y-6" dir="rtl">
      <div className="flex justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-100 text-orange-500 rounded-xl"><Users size={24} /></div><div><h1 className="text-xl font-black">المستخدمون والمناطق</h1><p className="text-sm text-gray-500">إجمالي {data.length} مستخدم</p></div></div>
        <div className="flex gap-3"><ExportExcelButton data={excelData} fileName="المستخدمين" /><button onClick={() => {setEditing(emptyUser); setSelectedPerms([]); setIsEdit(false); setModalOpen(true);}} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold"><UserPlus size={18}/>إضافة</button></div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <DataTable columns={[
          { key: "name", header: "الاسم", render: (r:User) => <span className="font-bold">{r.name}</span> },
          { key: "username", header: "اليوزر" },
          { key: "role", header: "الدور", render: (r:User) => <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">{r.role === "admin" ? "مدير نظام" : "مستخدم"}</span> },
          { key: "tenantId", header: "بيانات المنطقة (الفرع)", render: (r:User) => <span className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1 w-fit"><Network size={12}/> {r.tenantId === 'master' ? 'الإدارة الرئيسية (Master)' : `فرع: ${r.tenantId}`}</span> }
        ]} data={data} loading={loading} onEdit={r => {setEditing({...r, password:""}); setSelectedPerms(JSON.parse(r.permissions||"[]")); setIsEdit(true); setModalOpen(true);}} onDelete={handleDelete} />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3"><h2 className="text-xl font-black">بيانات المستخدم</h2><button onClick={() => setModalOpen(false)}><X/></button></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold mb-1">الاسم الكامل</label><input className={inputClass} value={editing.name||""} onChange={e=>setEditing({...editing, name:e.target.value})}/></div>
              <div><label className="block text-xs font-bold mb-1">اسم المستخدم (Login)</label><input className={inputClass} value={editing.username||""} onChange={e=>setEditing({...editing, username:e.target.value})}/></div>
              <div><label className="block text-xs font-bold mb-1">كلمة المرور</label><input type="password" placeholder={isEdit?"اتركه فارغاً للإبقاء":""} className={inputClass} value={editing.password||""} onChange={e=>setEditing({...editing, password:e.target.value})}/></div>
              <div><label className="block text-xs font-bold mb-1">الدور الوظيفي</label><select className={inputClass} value={editing.role||"user"} onChange={e=>setEditing({...editing, role:e.target.value})}><option value="admin">مدير (Admin)</option><option value="user">مستخدم عادي</option></select></div>
              
              {/* ⚡ السر هنا: خيار إنشاء قاعدة بيانات منفصلة للفرع ⚡ */}
              {!isEdit && editing.role === "admin" && (
                <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editing.createNewBranch} onChange={e=>setEditing({...editing, createNewBranch: e.target.checked})} className="w-5 h-5 accent-red-600" />
                    <span className="font-bold text-red-800">إنشاء كمنطقة/فرع مستقل تماماً (داتا منفصلة 100%)</span>
                  </label>
                  <p className="text-xs text-red-600 mt-1">إذا تم التفعيل، هذا المدير لن يرى أي سيارات أو فواتير من الإدارة الرئيسية. سيبدأ بنسخة فارغة خاصة به.</p>
                </div>
              )}
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-blue-900 text-white font-bold rounded-xl mt-4">{saving ? <Loader2 className="animate-spin mx-auto"/> : "حفظ المستخدم"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
