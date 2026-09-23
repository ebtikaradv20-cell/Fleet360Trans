"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { translations } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";

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

// 1. عزل مكون Field خارج الصفحة لمنع فقدان التركيز
const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>{children}</div>
);

const inputClass = "w-full border dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function UsersPage() {
  const { lang, user: currentUser } = useApp();
  const t = translations[lang];
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<typeof emptyUser & { id?: number }>(emptyUser);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false); // 2. حالة الحفظ لمنع التكرار

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <div className="text-gray-500 dark:text-gray-400">{lang === "ar" ? "غير مصرح لك بالوصول لهذه الصفحة" : "Access Denied"}</div>
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

  // 3. معالجة الحفظ بشكل آمن مع تفعيل حالة الـ saving
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

  const columns = [
    { key: "name", header: lang === "ar" ? "الاسم" : "Name", render: (r: User) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: r.role === "admin" ? "#1E3A8A" : "#F97316" }}>
          {r.name?.charAt(0) || "U"}
        </div>
        <span className="font-semibold">{r.name}</span>
      </div>
    )},
    { key: "username", header: t.username },
    { key: "role", header: t.role, render: (r: User) => (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${r.role === "admin" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"}`}>
        {r.role === "admin" ? "👑 " + t.admin : "👤 " + t.user}
      </span>
    )},
    { key: "permissions", header: t.permissions, render: (r: User) => {
      let perms: string[] = [];
      try { perms = JSON.parse(r.permissions || "[]"); } catch {}
      return r.role === "admin"
        ? <span className="text-green-600 dark:text-green-400 text-xs font-medium">✅ {lang === "ar" ? "صلاحيات كاملة" : "Full Access"}</span>
        : <span className="text-xs text-gray-500">{perms.length} {lang === "ar" ? "صلاحيات" : "permissions"}</span>;
    }},
    { key: "createdAt", header: t.createdAt, render: (r: User) => formatDate(r.createdAt) },
  ];

  return (
    <div className="fade-in">
      <PageHeader title={lang === "ar" ? "إدارة المستخدمين" : "User Management"} icon="👥"
        subtitle={lang === "ar" ? `${data.length} مستخدم` : `${data.length} users`}
        onAdd={openAdd} addLabel={lang === "ar" ? "إضافة مستخدم" : "Add User"}
      />

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <DataTable columns={columns} data={data} loading={loading}
          onEdit={openEdit} onDelete={handleDelete}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={isEdit ? (lang === "ar" ? "تعديل المستخدم" : "Edit User") : (lang === "ar" ? "إضافة مستخدم جديد" : "Add New User")} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Field label={lang === "ar" ? "الاسم الكامل" : "Full Name"}>
            <input className={inputClass} value={editing.name || ""} onChange={e => setEditing({...editing, name: e.target.value})} />
          </Field>
          <Field label={t.username}>
            <input className={inputClass} value={editing.username || ""} onChange={e => setEditing({...editing, username: e.target.value})} />
          </Field>
          <Field label={t.password}>
            <input type="password" className={inputClass} value={editing.password || ""} onChange={e => setEditing({...editing, password: e.target.value})}
              placeholder={isEdit ? (lang === "ar" ? "اتركه فارغاً للإبقاء" : "Leave blank to keep") : ""} />
          </Field>
          <Field label={t.role}>
            <select className={inputClass} value={editing.role || "user"} onChange={e => setEditing({...editing, role: e.target.value})}>
              <option value="admin">👑 {t.admin}</option>
              <option value="user">👤 {t.user}</option>
            </select>
          </Field>

          {editing.role === "user" && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.permissions}:</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map(p => (
                  <label key={p.key} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    selectedPerms.includes(p.key)
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}>
                    <input type="checkbox" checked={selectedPerms.includes(p.key)} onChange={() => togglePerm(p.key)} className="w-4 h-4 rounded" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50" 
            style={{ background: "linear-gradient(90deg, #F97316, #EA580C)" }}
          >
            {saving ? "⏳ جارِ الحفظ..." : `💾 ${t.save}`}
          </button>
          <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold">
            {t.cancel}
          </button>
        </div>
      </Modal>
    </div>
  );
}
