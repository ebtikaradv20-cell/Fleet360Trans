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
  DollarSign, 
  Pencil, 
  Trash2 
} from "lucide-react";

const safeNum = (val: any) => { 
  if (val === null || val === undefined) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); 
  return isNaN(n) ? 0 : n; 
};

const Field = ({ label, children }: any) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-teal-500/50 outline-none";

const extractCleanPlate = (rawPlate: string, vehicleList: any[]) => {
  if (!rawPlate) return "";
  const cleanRaw = String(rawPlate).replace(/\s+/g, " ").trim();

  const exact = vehicleList.find(v => (v.plateNumber || v.plate_number || "").trim() === cleanRaw);
  if (exact) return exact.plateNumber || exact.plate_number;

  const matchedVehicle = vehicleList.find(v => {
    const vp = (v.plateNumber || v.plate_number || "").trim();
    return vp && (cleanRaw.includes(vp) || vp.includes(cleanRaw));
  });
  if (matchedVehicle) return matchedVehicle.plateNumber || matchedVehicle.plate_number;

  const digits = cleanRaw.replace(/[^0-9]/g, "");
  if (digits) {
    const digitMatch = vehicleList.find(v => {
      const vp = (v.plateNumber || v.plate_number || "");
      return vp.replace(/[^0-9]/g, "") === digits;
    });
    if (digitMatch) return digitMatch.plateNumber || digitMatch.plate_number;
  }

  return cleanRaw;
};

const normalizeOrder = (r: any) => {
  const plate = r.plateNumber || r.plate_number || r.vehiclePlate || r.plate || "";
  const model = r.vehicleModel || r.vehicle_model || r.model || "";
  const orderNumber = r.orderNumber || r.order_number || (r.id ? `WO-${r.id}` : "-");
  
  // استخراج ذكي لرقم SAP من الحقل أو الوصف أو الملاحظات
  let sap = r.sapNumber || r.sap_number || r.sapNo || r.sap_no || r.sap || r.sapOrderId || r["رقم SAP"] || r["رقم ساب"] || "";
  if (!sap && typeof r.description === "string") {
    const match = r.description.match(/SAP[:\s-]*([A-Za-z0-9-_]+)/i);
    if (match) sap = match[1];
  }
  if (!sap && typeof r.notes === "string") {
    const match = r.notes.match(/SAP[:\s-]*([A-Za-z0-9-_]+)/i);
    if (match) sap = match[1];
  }

  const maintType = r.maintenanceType || r.maintenance_type || r.type || r.serviceType || "صيانة عامة";
  const opType = r.operationType || r.operation_type || r.service_nature || "صيانة جديدة";
  const status = r.status || (r.isCompleted ? "completed" : "pending");
  const cost = safeNum(r.cost ?? r.total_cost ?? r.totalCost ?? r.amount);
  const approvalTo = r.approvedBy || r.approved_by || r.targetApproval || r.target_approval || "-";
  
  let startDate = r.startDate || r.start_date || r.date || (r.createdAt ? r.createdAt.slice(0, 10) : "");
  if (startDate && startDate.includes("T")) startDate = startDate.split("T")[0];

  return {
    ...r,
    id: r.id,
    orderNumber: String(orderNumber).startsWith("WO-WO-") ? String(orderNumber).replace("WO-WO-", "WO-") : orderNumber,
    plateNumber: plate,
    vehicleDisplay: model && !plate.includes(model) ? `${model} ${plate}` : plate,
    maintenanceType: maintType,
    operationType: opType,
    sapNumber: sap,
    targetApproval: approvalTo,
    status,
    cost,
    startDate,
    description: r.description || ""
  };
};

export default function WorkOrdersPage() {
  const { user } = useApp();
  const [data, setData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "deleted">("active");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>({});
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);

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
        fetch(`/api/work-orders?_t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()).catch(() => []),
        fetch("/api/vehicles").then(r => r.json()).catch(() => [])
      ]);

      const rawOrders = Array.isArray(resOrders) ? resOrders : (resOrders?.data || []);
      const rawVeh = Array.isArray(resVeh) ? resVeh : [];
      setData(rawOrders.map(normalizeOrder));
      setVehicles(rawVeh);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleImportOrders = async (importedRows: any[]) => {
    if (!importedRows || importedRows.length === 0) return;

    try {
      let count = 0;
      for (const row of importedRows) {
        let sap = "";
        for (const k of Object.keys(row)) {
          const lk = k.toLowerCase();
          if (lk.includes("sap") || lk.includes("ساب") || lk.includes("اوردر")) {
            sap = String(row[k] || "").trim();
            if (sap) break;
          }
        }

        const plate = String(
          row["رقم اللوحة"] || row["اللوحة"] || row["رقم العربية"] || row["العربية"] || row["plateNumber"] || ""
        ).trim();

        const maintType = String(row["نوع الصيانة"] || row["نوع الصيانه"] || row["الصيانة"] || row["maintenanceType"] || "صيانة عامة").trim();
        const costVal = safeNum(row["التكلفة"] || row["المبلغ"] || row["القيمة"] || row["التكلفة (ج.م)"] || row["cost"]);
        const rawDate = row["التاريخ"] || row["تاريخ الصيانة"] || row["startDate"] || new Date().toISOString().slice(0, 10);

        if (!plate) continue;

        await fetch("/api/work-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plateNumber: plate,
            sapNumber: sap,
            sap_number: sap,
            maintenanceType: maintType,
            cost: costVal,
            startDate: rawDate,
            operationType: "صيانة جديدة",
            status: "completed"
          })
        });
        count++;
      }

      alert(`تم استيراد وتحديث ${count} أمر صيانة بنجاح.`);
      loadData();
    } catch (err) {
      alert("حدث خطأ أثناء استيراد البيانات");
    }
  };

  const handleOpenEdit = (r: any) => {
    const matchedPlate = extractCleanPlate(r.plateNumber || r.vehicleDisplay, vehicles);
    setEditing({
      ...r,
      plateNumber: matchedPlate
    });
    setIsEdit(true);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...editing,
        id: editing.id,
        sapNumber: editing.sapNumber || "",
        sap_number: editing.sapNumber || "",
        plateNumber: editing.plateNumber || "",
        plate_number: editing.plateNumber || "",
        maintenanceType: editing.maintenanceType || "صيانة عامة",
        cost: safeNum(editing.cost),
        startDate: editing.startDate || new Date().toISOString().slice(0, 10),
        targetApproval: editing.targetApproval || "-",
        description: editing.description || ""
      };

      const res = await fetch("/api/work-orders", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // ✅ تحديث تفاؤلي فوري في الـ State يضمن ظهور التعديل ورقم SAP في الجدول لحظياً
        if (isEdit) {
          setData(prev => prev.map(item => {
            if (item.id === editing.id) {
              return normalizeOrder({
                ...item,
                ...payload,
                sapNumber: payload.sapNumber,
                sap_number: payload.sapNumber,
                cost: payload.cost,
                maintenanceType: payload.maintenanceType
              });
            }
            return item;
          }));
        }
        setModalOpen(false);
        loadData();
      } else {
        alert("حدث خطأ أثناء حفظ أمر الصيانة");
      }
    } catch {
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من حذف أمر الصيانة؟")) {
      await fetch(`/api/work-orders/${id}`, { method: "DELETE" });
      loadData();
    }
  };

  const filteredData = data.filter(r => {
    const isDeleted = r.isDeleted === 1 || r.is_deleted === 1 || r.status === "deleted";
    if (activeTab === "active" && isDeleted) return false;
    if (activeTab === "deleted" && !isDeleted) return false;

    const searchMatch = 
      !search || 
      String(r.orderNumber).toLowerCase().includes(search.toLowerCase()) ||
      String(r.plateNumber).toLowerCase().includes(search.toLowerCase()) ||
      String(r.maintenanceType).toLowerCase().includes(search.toLowerCase()) ||
      String(r.sapNumber).toLowerCase().includes(search.toLowerCase());

    const typeMatch = typeFilter === "الكل" || r.maintenanceType === typeFilter;
    const statusMatch = statusFilter === "الكل" || r.status === statusFilter;
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

  const totalCost = data.reduce((s, r) => s + safeNum(r.cost), 0);
  const activeOrdersCount = data.filter(r => !(r.isDeleted === 1 || r.is_deleted === 1)).length;
  const openOrdersCount = data.filter(r => r.status === "pending" || r.status === "open").length;

  return (
    <div className="w-full space-y-6" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-bold mb-1">إجمالي تكلفة الصيانة</p>
            <h3 className="text-2xl font-black">{totalCost.toLocaleString()} <span className="text-sm font-normal">ج.م</span></h3>
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
            <h3 className="text-2xl font-black">{activeOrdersCount}</h3>
          </div>
          <div className="p-3 bg-white/10 rounded-xl"><CheckCircle2 size={24} /></div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl"><Wrench size={24}/></div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">أوامر الشغل والصيانة</h1>
            <p className="text-xs text-gray-500 mt-0.5">إجمالي {filteredData.length} أمر مطابق</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ImportExcelButton 
            templateColumns={["رقم اللوحة", "نوع الصيانة", "التكلفة", "رقم SAP"]} 
            templateFileName="أوامر_الصيانة" 
            onImport={handleImportOrders} 
            buttonText="استيراد وتحديث الشيت" 
          />
          {canWrite && (
            <button 
              onClick={() => {
                setEditing({
                  startDate: new Date().toISOString().slice(0, 10),
                  operationType: "صيانة جديدة",
                  status: "completed",
                  cost: "",
                  plateNumber: ""
                });
                setIsEdit(false);
                setModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-colors cursor-pointer"
            >
              <Plus size={18}/> إضافة أمر صيانة
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => setActiveTab("active")} 
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${activeTab === "active" ? "bg-teal-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"}`}
        >
          الأوامر النشطة ({activeOrdersCount})
        </button>
        <button 
          onClick={() => setActiveTab("deleted")} 
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${activeTab === "deleted" ? "bg-red-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"}`}
        >
          سجل المحذوفات والمرفوض (0)
        </button>
      </div>

      <FilterBar dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} showDateRange>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500">بحث:</label>
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="بحث بالأمر، اللوحة، SAP..." 
            className="border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs outline-none w-44 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-teal-500/30" 
          />
        </div>

        <FilterSelect 
          label="نوع الصيانة" 
          value={typeFilter} 
          onChange={setTypeFilter} 
          options={[{value:"الكل", label:"الكل"}, ...[...new Set(data.map(d => d.maintenanceType).filter(Boolean))].map(x => ({value:x, label:x}))]} 
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

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
        <DataTable 
          columns={[
            { 
              key: "orderNumber", 
              header: "رقم الأمر", 
              render: (r: any) => (
                <span className="font-mono font-bold text-blue-900 dark:text-blue-300">
                  {r.orderNumber}
                </span>
              ) 
            },
            { 
              key: "vehicleDisplay", 
              header: "اللوحة", 
              render: (r: any) => (
                <span className="font-bold text-gray-900 dark:text-white">
                  {r.vehicleDisplay || r.plateNumber}
                </span>
              ) 
            },
            { 
              key: "maintenanceType", 
              header: "نوع الصيانة", 
              render: (r: any) => (
                <span className="bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 px-2.5 py-1 rounded-lg text-xs font-bold inline-block">
                  {r.maintenanceType}
                </span>
              ) 
            },
            { 
              key: "operationType", 
              header: "نوع العملية", 
              render: (r: any) => (
                <span className="bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 px-2.5 py-0.5 rounded-md text-xs font-bold inline-block">
                  {r.operationType}
                </span>
              ) 
            },
            { 
              key: "sapNumber", 
              header: "رقم SAP", 
              render: (r: any) => (
                r.sapNumber && r.sapNumber !== "-" ? (
                  <span className="font-mono font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-0.5 rounded border border-teal-200 dark:border-teal-800 text-xs">
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
              render: (r: any) => <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{r.targetApproval}</span> 
            },
            { 
              key: "cost", 
              header: "التكلفة", 
              render: (r: any) => (
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                  {safeNum(r.cost).toLocaleString()} ج.م
                </span>
              ) 
            },
            { 
              key: "startDate", 
              header: "التاريخ", 
              render: (r: any) => (
                <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                  {r.startDate || "-"}
                </span>
              ) 
            },
            {
              key: "actions",
              header: "إجراء",
              render: (r: any) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(r)}
                    className="flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-600 hover:text-white dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-600 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
                  >
                    <Pencil size={13} />
                    <span>تعديل</span>
                  </button>
                  {canWrite && (
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-600 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )
            }
          ]} 
          data={filteredData} 
          loading={loading} 
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? "تعديل أمر الشغل والصيانة" : "إضافة أمر صيانة جديد"} size="lg">
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          <Field label="السيارة / رقم اللوحة">
            <select
              required
              className={inputClass}
              value={editing.plateNumber || ""}
              onChange={(e) => setEditing({ ...editing, plateNumber: e.target.value })}
            >
              <option value="">-- اختر السيارة --</option>
              {editing.plateNumber && !vehicles.some(v => (v.plateNumber || v.plate_number) === editing.plateNumber) && (
                <option value={editing.plateNumber}>{editing.plateNumber}</option>
              )}
              {vehicles.map((v) => {
                const p = v.plateNumber || v.plate_number;
                return <option key={v.id || p} value={p}>{p}</option>;
              })}
            </select>
          </Field>

          <Field label="رقم SAP">
            <input
              type="text"
              className={inputClass}
              value={editing.sapNumber || ""}
              onChange={(e) => setEditing({ ...editing, sapNumber: e.target.value })}
              placeholder="مثال: SAP-9012"
            />
          </Field>

          <Field label="نوع الصيانة">
            <input
              type="text"
              required
              className={inputClass}
              value={editing.maintenanceType || ""}
              onChange={(e) => setEditing({ ...editing, maintenanceType: e.target.value })}
              placeholder="مثال: تجديد رخصة، ميكانيكا، كهرباء..."
            />
          </Field>

          <Field label="التكلفة (ج.م)">
            <input
              type="number"
              step="0.01"
              required
              className={inputClass}
              value={editing.cost !== undefined ? editing.cost : ""}
              onChange={(e) => setEditing({ ...editing, cost: e.target.value })}
              placeholder="0.00"
            />
          </Field>

          <Field label="تاريخ الصيانة">
            <input
              type="date"
              required
              className={inputClass}
              value={editing.startDate || ""}
              onChange={(e) => setEditing({ ...editing, startDate: e.target.value })}
            />
          </Field>

          <Field label="موجه للموافقة إلى">
            <input
              type="text"
              className={inputClass}
              value={editing.targetApproval || ""}
              onChange={(e) => setEditing({ ...editing, targetApproval: e.target.value })}
              placeholder="اسم المدير / المسؤول"
            />
          </Field>

          <div className="col-span-2">
            <Field label="الوصف والتفاصيل">
              <textarea
                rows={2}
                className={inputClass}
                value={editing.description || ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="تفاصيل الصيانة..."
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="col-span-2 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors cursor-pointer"
          >
            {saving ? "جاري الحفظ والتحديث..." : "حفظ بيانات الصيانة"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
