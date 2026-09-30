"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ExportExcelButton from "@/components/ExportExcelButton";
import { 
  Users, UserPlus, ShieldCheck, UserCheck, Lock, CheckCircle2, Save, X, Loader2, Network, ShieldAlert
} from "lucide-react";

interface User {
  id: number; username: string; name: string; role: string; permissions: string; tenantId: string; createdAt: string;
}

const ALL_PERMISSIONS = [
  { key: "vehicles:write", label: "إدارة السيارات" },
  { key: "fuel:write", label: "إدارة الوقود" },
  { key: "maintenance:write", label: "إدارة أوامر الشغل والصيانة" },
  { key: "oil-changes:write", label: "إدارة الزيوت والفلاتر" },
  { key: "spare-parts:write", label: "إدارة مخزون قطع الغيار" },
  { key: "inspections:write", label: "إدارة تقارير الفحص" },
];

const emptyUser = { username: "", name: "", role: "user", password: "", permissions: "[]", createNewBranch: false };

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>{children}</div>
);
const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all";

export default function UsersPage() {
  const { lang, user: currentUser } = useApp();
  const t = translations[lang];
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(emptyUser);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // ✅ السماح للمدير الرئيسي (super_admin) والمدير الفرعي (admin) بالوصول للصفحة
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-900/50">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">غير مصرح بالوصول</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">هذه الصفحة مخصصة لمديري النظام والفروع فقط.</p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = currentUser.role === "super_admin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (saving) return; setSaving(true);
    try {
      // ⚡ إذا لم يكن Super Admin، يُمنع من إعطاء صلاحيات أكبر من صلاحياته
      let finalPerms = selectedPerms;
      if (!isSuperAdmin) {
        const myPerms = currentUser.permissions || [];
        finalPerms = selectedPerms.filter(p => myPerms.includes(p));
      }

      const payload = { ...editing, permissions: JSON.stringify(finalPerms) };
      const res = await fetch(isEdit ? `/api/users/${editing.id}` : "/api/users", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const resData = await res.json().catch(()=>({}));
      if (res.ok) { setModalOpen(false); load(); } else { alert(resData.error || "خطأ بالحفظ"); }
    } catch { alert("خطأ اتصال"); } finally { setSaving(false); }
  };

  const handleDelete = async (row: User) => {
    if (row.id === currentUser?.userId) return alert("لا يمكنك حذف حسابك الخاص");
    if (confirm("حذف؟")) { await fetch(`/api/users/${row.id}`, { method: "DELETE" }); load(); }
  };

  const openAdd = () => { setEditing(emptyUser); setSelectedPerms([]); setIsEdit(false); setModalOpen(true); };

  const openEdit = (row: User) => {
    let perms: string[] = [];
    try { perms = JSON.parse(row.permissions || "[]"); } catch {}
    setEditing({ ...row, password: "" }); setSelectedPerms(perms); setIsEdit(true); setModalOpen(true);
  };

  const togglePerm = (key: string) => {
    // منع المدير الفرعي من اختيار صلاحية لا يملكها
    if (!isSuperAdmin && !currentUser.permissions.includes(key)) return;
    setSelectedPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  const excelData = data.map((u) => ({
    "اسم المستخدم": u.username, "الاسم الكامل": u.name, "الدور الوظيفي": u.role === "super_admin" ? "مدير رئيسي" : u.role === "admin" ? "مدير منطقة/فرع" : "مستخدم",
    "الفرع (Tenant)": u.tenantId, "الصلاحيات": u.role === "super_admin" ? "كاملة" : JSON.parse(u.permissions || "[]").length, "تاريخ الإنشاء": u.createdAt
  }));

  const columns = [
    { key: "name", header: "الاسم", render: (r: User) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm ${r.role === "super_admin" ? "bg-red-800" : r.role === "admin" ? "bg-blue-900" : "bg-orange-500"}`}>{r.name?.charAt(0)}</div>
          <span className="font-bold text-gray-900 dark:text-white">{r.name}</span>
        </div>
      )
    },
    { key: "username", header: "اسم الدخول", render: (r:User) => <span className="font-semibold text-gray-600">{r.username}</span> },
    { key: "role", header: "المستوى الإداري", render: (r: User) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${r.role === "super_admin" ? "bg-red-100 text-red-800 border border-red-200" : r.role === "admin" ? "bg-blue-50 text-blue-900 border border-blue-200" : "bg-orange-50 text-orange-700 border border-orange-200"}`}>
          {r.role === "super_admin" ? <><ShieldAlert size={14} /> مدير رئيسي (Super)</> : r.role === "admin" ? <><ShieldCheck size={14} /> مدير فرع / منطقة</> : <><UserCheck size={14} /> مستخدم عادي</>}
        </span>
      )
    },
    { key: "tenantId", header: "الفرع (Tenant)", render: (r:User) => <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-bold text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1 w-fit"><Network size={12}/> {r.tenantId === 'master' ? 'الإدارة المركزية' : r.tenantId}</span> },
    { key: "createdAt", header: "الإنشاء", render: (r: User) => r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "-" },
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3"><div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Users size={24} /></div><div><h1 className="text-xl font-black text-gray-900 dark:text-white">إدارة المستخدمين والفروع</h1><p className="text-sm text-gray-500 mt-0.5">إجمالي {data.length} مستخدم</p></div></div>
        <div className="flex items-center gap-3">
          <ExportExcelButton data={excelData} fileName="سجل_المستخدمين" />
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-bold text-sm shadow-md"><UserPlus size={18} /><span>إضافة حساب</span></button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable columns={columns} data={data} loading={loading} onEdit={openEdit} onDelete={isSuperAdmin ? handleDelete : undefined} />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3"><h2 className="text-xl font-black text-blue-900 dark:text-white flex items-center gap-2"><UserPlus size={22}/> {isEdit ? "تعديل المستخدم" : "إضافة حساب جديد"}</h2><button onClick={() => setModalOpen(false)}><X/></button></div>
            
            <div className="grid grid-cols-2 gap-4">
              <Field label="الاسم الكامل"><input className={inputClass} value={editing.name||""} onChange={e=>setEditing({...editing, name:e.target.value})} placeholder="الاسم للظهور" /></Field>
              <Field label="اسم الدخول (Username)"><input className={inputClass} value={editing.username||""} onChange={e=>setEditing({...editing, username:e.target.value})} placeholder="لغة إنجليزية فقط" /></Field>
              <Field label="كلمة المرور"><input type="password" placeholder={isEdit?"اتركه فارغاً للإبقاء":""} className={inputClass} value={editing.password||""} onChange={e=>setEditing({...editing, password:e.target.value})}/></Field>
              
              <Field label="المستوى الإداري">
                <select className={inputClass} value={editing.role||"user"} onChange={e=>setEditing({...editing, role:e.target.value})}>
                  {isSuperAdmin && <option value="super_admin">مدير رئيسي (Super Admin)</option>}
                  {isSuperAdmin && <option value="admin">مدير فرع / منطقة</option>}
                  <option value="user">مستخدم عادي</option>
                </select>
              </Field>

              {/* إنشاء فرع مستقل (للمدير الرئيسي فقط) */}
              {!isEdit && editing.role === "admin" && isSuperAdmin && (
                <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editing.createNewBranch} onChange={e=>setEditing({...editing, createNewBranch: e.target.checked})} className="w-5 h-5 accent-red-600" />
                    <span className="font-bold text-red-800 text-sm">تأسيس داتا مستقلة لهذا الفرع (فصل البيانات 100%)</span>
                  </label>
                  <p className="text-xs text-red-600 mt-1 font-semibold">بمجرد التفعيل، سيصبح اسم الدخول (Username) هو كود الفرع الجديد ولن يرى سيارات وفواتير المركز الرئيسي.</p>
                </div>
              )}

              {/* الصلاحيات التفصيلية */}
              {editing.role !== "super_admin" && (
                <div className="col-span-2 mt-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">أذونات وصلاحيات الإضافة والتعديل:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ALL_PERMISSIONS.map(p => {
                      const isAllowedByParent = isSuperAdmin || currentUser?.permissions?.includes(p.key);
                      const isChecked = selectedPerms.includes(p.key);
                      if (!isAllowedByParent) return null; // إخفاء الصلاحية إذا كان المنشئ لا يملكها

                      return (
                        <label key={p.key} className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${isChecked ? "border-orange-500 bg-orange-50/50 text-orange-900" : "border-gray-200 hover:bg-gray-50 text-gray-700"}`}>
                          <input type="checkbox" checked={isChecked} onChange={() => togglePerm(p.key)} className="w-4 h-4 rounded accent-orange-500" />
                          <span className="text-xs font-bold">{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-md">{saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} حفظ الحساب</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
