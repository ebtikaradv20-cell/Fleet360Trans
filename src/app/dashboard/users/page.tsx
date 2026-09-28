"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ExportExcelButton from "@/components/ExportExcelButton";
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  CheckCircle2, 
  Save, 
  X, 
  Loader2 
} from "lucide-react";

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  permissions: string;
  createdAt: string;
}

const ALL_PERMISSIONS = [
  { key: "vehicles:read", label: "عرض السيارات / View Vehicles" },
  { key: "vehicles:write", label: "إدارة السيارات / Manage Vehicles" },
  { key: "fuel:read", label: "عرض الوقود / View Fuel" },
  { key: "fuel:write", label: "إدارة الوقود / Manage Fuel" },
  { key: "maintenance:read", label: "عرض الصيانة / View Maintenance" },
  { key: "maintenance:write", label: "إدارة الصيانة / Manage Maintenance" },
  { key: "inventory:read", label: "عرض المخزون / View Inventory" },
  { key: "inventory:write", label: "إدارة المخزون / Manage Inventory" },
];

const emptyUser = { username: "", name: "", role: "user", password: "", permissions: "[]" };

// ✅ مكون Field معزول خارج الصفحة لمنع فقدان التركيز عند الكتابة
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all";

export default function UsersPage() {
  const { lang, user: currentUser } = useApp();
  const t = translations[lang];
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<typeof emptyUser & { id?: number }>(emptyUser);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // شاشة حظر الوصول المؤسسية لغير المديرين
  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-900/50">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">
            {lang === "ar" ? "غير مصرح بالوصول" : "Access Denied"}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {lang === "ar"
              ? "هذه الصفحة مخصصة لمديري النظام فقط. يرجى التواصل مع مسؤول الأسطول للحصول على الصلاحيات المطلوبة."
              : "This section is restricted to System Administrators only."}
          </p>
        </div>
      </div>
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const payload = { ...editing, permissions: JSON.stringify(selectedPerms) };
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/users/${editing.id}` : "/api/users";
      
      const res = await fetch(url, { 
        method, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });

      if (res.ok) { 
        setModalOpen(false); 
        load(); 
      } else {
        const errData = await res.json();
        alert(errData.error || "حدث خطأ أثناء حفظ المستخدم");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("تعذر الاتصال بالخادم، تأكد من سلامة الاتصال.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: User) => {
    if (row.id === currentUser?.userId) return alert(lang === "ar" ? "لا يمكنك حذف حسابك الخاص" : "Cannot delete your own account");
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;
    try {
      await fetch(`/api/users/${row.id}`, { method: "DELETE" });
      load();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const openAdd = () => {
    setEditing(emptyUser);
    setSelectedPerms([]);
    setIsEdit(false);
    setModalOpen(true);
  };

  const openEdit = (row: User) => {
    let perms: string[] = [];
    try { perms = JSON.parse(row.permissions || "[]"); } catch { perms = []; }
    setEditing({ ...row, password: "" });
    setSelectedPerms(perms);
    setIsEdit(true);
    setModalOpen(true);
  };

  const togglePerm = (key: string) => {
    setSelectedPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : "-";

  // تجهيز شيت الإكسيل ببيانات المستخدمين
  const excelData = data.map((u) => {
    let permsCount = 0;
    try { permsCount = JSON.parse(u.permissions || "[]").length; } catch {}
    return {
      "اسم المستخدم": u.username || "",
      "الاسم الكامل": u.name || "",
      "الدور الوظيفي": u.role === "admin" ? "مدير النظام" : "مستخدم",
      "الصلاحيات": u.role === "admin" ? "صلاحيات كاملة" : `${permsCount} صلاحيات`,
      "تاريخ الإنشاء": u.createdAt || "",
    };
  });

  const columns = [
    { 
      key: "name", 
      header: lang === "ar" ? "الاسم الكامل" : "Name", 
      render: (r: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm bg-gradient-to-tr from-blue-900 to-blue-700">
            {r.name?.charAt(0) || "U"}
          </div>
          <span className="font-bold text-gray-900 dark:text-white">{r.name}</span>
        </div>
      )
    },
    { key: "username", header: t.username },
    { 
      key: "role", 
      header: t.role, 
      render: (r: User) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
          r.role === "admin" 
            ? "bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800" 
            : "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200 dark:border-orange-800"
        }`}>
          {r.role === "admin" ? (
            <>
              <ShieldCheck size={14} className="text-blue-600 dark:text-blue-400" />
              <span>{t.admin || "مدير النظام"}</span>
            </>
          ) : (
            <>
              <UserCheck size={14} className="text-orange-500" />
              <span>{t.user || "مستخدم"}</span>
            </>
          )}
        </span>
      )
    },
    { 
      key: "permissions", 
      header: t.permissions, 
      render: (r: User) => {
        let perms: string[] = [];
        try { perms = JSON.parse(r.permissions || "[]"); } catch {}
        return r.role === "admin" ? (
          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold inline-flex items-center gap-1">
            <CheckCircle2 size={14} />
            <span>{lang === "ar" ? "صلاحيات كاملة" : "Full Access"}</span>
          </span>
        ) : (
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            {perms.length} {lang === "ar" ? "صلاحيات" : "permissions"}
          </span>
        );
      }
    },
    { key: "createdAt", header: t.createdAt, render: (r: User) => formatDate(r.createdAt) },
  ];

  return (
    <div className="w-full space-y-6">
      
      {/* ── رأس الصفحة المؤسسي + زر الإكسيل ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">
              {lang === "ar" ? "إدارة المستخدمين والأذونات" : "User Management"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              إجمالي {data.length} مستخدم مسجل بالنظام
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ExportExcelButton data={excelData} fileName="سجل_مستخدمين_النظام" />

          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-bold text-sm transition-all shadow-md"
          >
            <UserPlus size={18} />
            <span>{lang === "ar" ? "إضافة مستخدم" : "Add User"}</span>
          </button>
        </div>
      </div>

      {/* ── جدول المستخدمين المؤسسي ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          onEdit={openEdit} 
          onDelete={handleDelete}
        />
      </div>

      {/* ── المودال المؤسسي ── */}
      <Modal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)}
        title={isEdit ? (lang === "ar" ? "تعديل بيانات المستخدم" : "Edit User") : (lang === "ar" ? "إضافة مستخدم جديد للنظام" : "Add New User")} 
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label={lang === "ar" ? "الاسم الكامل" : "Full Name"}>
            <input className={inputClass} value={editing.name || ""} onChange={e => setEditing({...editing, name: e.target.value})} placeholder="الاسم واللقب" />
          </Field>

          <Field label={t.username}>
            <input className={inputClass} value={editing.username || ""} onChange={e => setEditing({...editing, username: e.target.value})} placeholder="اسم تسجيل الدخول" />
          </Field>

          <Field label={t.password}>
            <input 
              type="password" 
              className={inputClass} 
              value={editing.password || ""} 
              onChange={e => setEditing({...editing, password: e.target.value})}
              placeholder={isEdit ? (lang === "ar" ? "اتركه فارغاً للإبقاء" : "Leave blank to keep") : "كلمة السر"} 
            />
          </Field>

          <Field label={t.role}>
            <select className={inputClass} value={editing.role || "user"} onChange={e => setEditing({...editing, role: e.target.value})}>
              <option value="admin">{t.admin || "مدير النظام (كامل الصلاحيات)"}</option>
              <option value="user">{t.user || "مستخدم (صلاحيات محدودة)"}</option>
            </select>
          </Field>

          {editing.role === "user" && (
            <div className="col-span-2 space-y-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                {t.permissions || "أذونات وصلاحيات الوصول"}:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {ALL_PERMISSIONS.map(p => {
                  const isChecked = selectedPerms.includes(p.key);
                  return (
                    <label 
                      key={p.key} 
                      className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                        isChecked
                          ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-900 dark:text-orange-300"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => togglePerm(p.key)} 
                        className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500/50 border-gray-300 dark:border-gray-700" 
                      />
                      <span className="text-xs font-semibold">{p.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold transition-all hover:opacity-90 disabled:opacity-50 bg-gradient-to-r from-[#F97316] to-[#EA580C] shadow-md"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{t.save || "حفظ البيانات"}</span>
              </>
            )}
          </button>
          <button 
            onClick={() => setModalOpen(false)} 
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold transition-colors"
          >
            <X size={16} />
            <span>{t.cancel || "إلغاء"}</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
