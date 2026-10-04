"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ExportExcelButton from "@/components/ExportExcelButton";
import { Users, UserPlus, ShieldCheck, UserCheck, Lock, Save, X, Loader2, Network, ShieldAlert } from "lucide-react";

interface User { id: number; username: string; name: string; role: string; permissions: string; tenantId: string; createdAt: string; }

const ALL_PERMISSIONS = [
  { key: "vehicles:write", label: "إدارة السيارات" }, { key: "fuel:write", label: "إدارة الوقود" },
  { key: "maintenance:write", label: "إدارة أوامر الشغل" }, { key: "oil-changes:write", label: "إدارة الزيوت" },
  { key: "spare-parts:write", label: "إدارة المخزون" }, { key: "inspections:write", label: "إدارة الفحص" },
];

const emptyUser = { username: "", name: "", role: "user", password: "", permissions: "[]", createNewBranch: false };
const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all";

export default function UsersPage() {
  const { user: currentUser } = useApp();
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(emptyUser);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const hasAccess = currentUser?.role === "owner" || currentUser?.role === "super_admin" || currentUser?.role === "admin";
  const isOwner = currentUser?.role === "owner";
  
  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch("/api/users"); const d = await res.json(); setData(Array.isArray(d) ? d : []); } 
    catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { if (hasAccess) load(); }, [hasAccess, load]);

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white border border-gray-200 rounded-2xl shadow-sm w-full max-w-md">
          <Lock size={40} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-black text-gray-900 mb-2">غير مصرح بالوصول</h2>
          <p className="text-sm text-gray-500">هذه الصفحة مخصصة للمديرين ومالك النظام فقط.</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (saving) return; setSaving(true);
    try {
      const payload = { ...editing, permissions: JSON.stringify(selectedPerms) };
      const res = await fetch(isEdit ? `/api/users/${editing.id}` : "/api/users", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const resData = await res.json().catch(()=>({}));
      if (res.ok) { setModalOpen(false); load(); } else { alert(resData.error || "خطأ بالحفظ"); }
    } catch { alert("خطأ اتصال"); } finally { setSaving(false); }
  };

  const handleDelete = async (row: User) => {
    if (row.id === currentUser?.userId) return alert("لا يمكنك حذف حسابك!");
    if (confirm("حذف؟")) { await fetch(`/api/users/${row.id}`, { method: "DELETE" }); load(); }
  };

  const togglePerm = (key: string) => setSelectedPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  const excelData = data.map((u) => ({"اسم المستخدم": u.username, "الاسم الكامل": u.name, "الدور": u.role, "الفرع/المنطقة": u.tenantId}));

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3"><div className="p-3 bg-teal-50 text-teal-600 rounded-xl"><Users size={24} /></div><div><h1 className="text-xl font-black text-gray-900">إدارة المستخدمين والفروع</h1><p className="text-sm text-gray-500">إجمالي {data.length} مستخدم</p></div></div>
        <div className="flex gap-3"><ExportExcelButton data={excelData} fileName="المستخدمين" /><button onClick={() => {setEditing(emptyUser); setSelectedPerms([]); setIsEdit(false); setModalOpen(true);}} className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-bold"><UserPlus size={18}/>إضافة حساب</button></div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <DataTable columns={[
          { key: "name", header: "الاسم", render: (r:User) => <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${r.role === "owner" ? "bg-black" : r.role === "super_admin" ? "bg-red-800" : "bg-teal-600"}`}>{r.name.charAt(0)}</div><span className="font-bold">{r.name}</span></div> },
          { key: "username", header: "اسم الدخول", render: (r:User) => <span className="font-bold text-gray-600">{r.username}</span> },
          { key: "role", header: "الدور", render: (r:User) => <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${r.role === "owner" ? "bg-black text-white" : r.role === "super_admin" ? "bg-red-100 text-red-800" : "bg-teal-50 text-teal-700"}`}>{r.role === "owner" ? "المالك (Owner)" : r.role === "super_admin" ? "مدير رئيسي" : "مستخدم"}</span> },
          { key: "tenantId", header: "المنطقة (Tenant)", render: (r:User) => <span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-bold flex items-center gap-1"><Network size={12}/> {r.tenantId === 'master' ? 'الإدارة الرئيسية' : r.tenantId}</span> }
        ]} data={data} loading={loading} onEdit={r => {setEditing({...r, password:""}); setSelectedPerms(JSON.parse(r.permissions||"[]")); setIsEdit(true); setModalOpen(true);}} onDelete={handleDelete} />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-xl border border-gray-200">
            <div className="flex justify-between items-center border-b pb-3"><h2 className="text-xl font-black text-blue-900 flex items-center gap-2"><UserPlus size={22}/> {isEdit ? "تعديل مستخدم" : "حساب جديد"}</h2><button onClick={() => setModalOpen(false)}><X/></button></div>
            
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold mb-1">الاسم الكامل</label><input className={inputClass} value={editing.name||""} onChange={e=>setEditing({...editing, name:e.target.value})}/></div>
              <div><label className="block text-xs font-bold mb-1">اسم الدخول</label><input className={inputClass} value={editing.username||""} onChange={e=>setEditing({...editing, username:e.target.value})}/></div>
              <div><label className="block text-xs font-bold mb-1">كلمة المرور</label><input type="password" placeholder={isEdit?"للبقاء فارغاً":""} className={inputClass} value={editing.password||""} onChange={e=>setEditing({...editing, password:e.target.value})}/></div>
              <div>
                <label className="block text-xs font-bold mb-1">المستوى</label>
                <select className={inputClass} value={editing.role||"user"} onChange={e=>setEditing({...editing, role:e.target.value})}>
                  {isOwner && <option value="owner">المالك (Owner)</option>}
                  {(isOwner || currentUser?.role === "super_admin") && <option value="super_admin">مدير رئيسي</option>}
                  {(isOwner || currentUser?.role === "super_admin") && <option value="admin">مدير فرع</option>}
                  <option value="user">مستخدم عادي</option>
                </select>
              </div>

              {!isEdit && editing.role === "admin" && (
                <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editing.createNewBranch} onChange={e=>setEditing({...editing, createNewBranch: e.target.checked})} className="w-5 h-5 accent-red-600" />
                    <span className="font-bold text-red-800 text-sm">تأسيس داتا مستقلة لهذا الفرع 100%</span>
                  </label>
                </div>
              )}

              {editing.role !== "owner" && editing.role !== "super_admin" && (
                <div className="col-span-2 mt-2 pt-3 border-t border-gray-100">
                  <label className="block text-xs font-bold text-gray-700 mb-2">أذونات وصلاحيات الإضافة:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ALL_PERMISSIONS.map(p => {
                      const myPerms = currentUser?.permissions || [];
                      const isAllowed = isOwner || currentUser?.role === "super_admin" || myPerms.includes(p.key);
                      if (!isAllowed) return null;
                      
                      return (
                        <label key={p.key} className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${selectedPerms.includes(p.key) ? "border-teal-500 bg-teal-50 text-teal-900" : "border-gray-200 hover:bg-gray-50 text-gray-700"}`}>
                          <input type="checkbox" checked={selectedPerms.includes(p.key)} onChange={() => togglePerm(p.key)} className="w-4 h-4 rounded accent-teal-600" />
                          <span className="text-xs font-bold">{p.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl hover:bg-gray-200">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl flex justify-center items-center gap-2">{saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} حفظ الحساب</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
