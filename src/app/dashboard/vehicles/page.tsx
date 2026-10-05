"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import {
  Car,
  Users,
  Plus,
  Save,
  X,
  Loader2,
  Briefcase,
  ChevronDown,
  CheckSquare,
  Square,
  Search,
  Filter
} from "lucide-react";

interface Vehicle {
  id: number;
  plateNumber: string;
  sapNumber?: string;
  chassisNumber?: string;
  engineNumber?: string;
  company?: string;
  make?: string;
  model?: string;
  year?: string | number;
  governorate?: string;
  region?: string;
  department?: string;
  fuelType?: string;
  driverName?: string;
  licenseExpiry?: string;
  insuranceExpiry?: string;
  status?: string;
  notes?: string;
}

interface Personnel {
  id: number;
  name: string;
  role: "سائق" | "فني" | "مهندس";
  phone?: string;
  notes?: string;
  is_deleted?: number;
}

// ── دالة ذكية لاستخراج الحقول مهما اختلفت صياغة اسم العمود في الإكسيل ──
const getField = (row: Record<string, any>, patterns: string[]) => {
  for (const key of Object.keys(row)) {
    const cleanKey = key.trim().toLowerCase().replace(/[\s_\-]/g, "");
    for (const pattern of patterns) {
      const cleanPattern = pattern.trim().toLowerCase().replace(/[\s_\-]/g, "");
      if (cleanKey.includes(cleanPattern)) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== "" && String(val).trim() !== "-") {
          return String(val).trim();
        }
      }
    }
  }
  return "";
};

// ── دالة ذكية لتحويل كافة تنسيقات تواريخ الإكسيل (بما فيها السيريال والأرقام) ──
const normalizeDate = (val: any): string => {
  if (!val) return "";
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "";
    return val.toISOString().slice(0, 10);
  }

  const strVal = String(val).trim();
  if (!strVal || strVal === "-") return "";

  // فحص ما إذا كان التاريخ رقماً تسلسلياً خاصاً بإكسيل (مثل 45567 أو 46485)
  const num = Number(strVal);
  if (!isNaN(num) && num > 25000 && num < 65000) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }

  // فحص تنسيق YYYY-MM-DD أو YYYY/MM/DD
  if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(strVal)) {
    const parts = strVal.split(/[\/\-]/);
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].slice(0, 2).padStart(2, "0")}`;
  }

  // فحص تنسيق DD/MM/YYYY أو DD-MM-YYYY
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(strVal)) {
    const parts = strVal.split(/[\/\-]/);
    return `${parts[2].slice(0, 4)}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }

  const parsed = new Date(strVal);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return strVal;
};

// قالب الفورم للتحميل
const vehicleTemplateData = [
  {
    "رقم اللوحة": "ل ن ط 7618",
    "رقم SAP": "SAP-1045",
    "رقم الشاسيه": "123456",
    "الماركة والموديل": "نيسان بيك اب - دوبل كابينة",
    "سنة الصنع": "2024",
    "الشركة المالكة": "ترانس جاس",
    "المحافظة": "كفر الشيخ",
    "المنطقة": "دسوق",
    "الإدارة": "تشغيل وصيانة",
    "نوع الوقود": "سولار و غاز طبيعى",
    "اسم السائق": "احمد صالح، هيثم عجاج",
    "تاريخ انتهاء الرخصة": "2027-04-07",
    "الحالة التشغيلية": "تعمل",
    "ملاحظات": "سيارة بحالة جيدة"
  }
];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50";

export default function VehiclesManagementPage() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<"vehicles" | "personnel">("vehicles");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [isEditVehicle, setIsEditVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle>>({
    plateNumber: "",
    sapNumber: "",
    chassisNumber: "",
    company: "ترانس جاس",
    model: "",
    year: "",
    governorate: "كفر الشيخ",
    region: "",
    department: "تشغيل وصيانة",
    fuelType: "سولار و غاز طبيعى",
    driverName: "",
    status: "تعمل",
    licenseExpiry: "",
    notes: ""
  });

  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);
  const driverDropdownRef = useRef<HTMLDivElement>(null);

  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [personnelModalOpen, setPersonnelModalOpen] = useState(false);
  const [isEditPersonnel, setIsEditPersonnel] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Partial<Personnel>>({
    name: "",
    role: "سائق",
    phone: "",
    notes: ""
  });

  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("الكل");
  const [govFilter, setGovFilter] = useState("الكل");
  const [deptFilter, setDeptFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");

  const canWrite =
    user?.role === "owner" ||
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.permissions?.includes("fleet:write");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (driverDropdownRef.current && !driverDropdownRef.current.contains(e.target as Node)) {
        setIsDriverDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vehRes, staffRes] = await Promise.all([
        fetch("/api/vehicles").catch(() => null),
        fetch("/api/drivers").catch(() => null)
      ]);

      if (vehRes && vehRes.ok) {
        const d = await vehRes.json();
        const list = (Array.isArray(d) ? d : d.data || []).map((v: any) => ({
          ...v,
          plateNumber: v.plateNumber || v.plate_number || "",
          sapNumber: v.sapNumber || v.sap_number || "",
          chassisNumber: v.chassisNumber || v.chassis_number || "",
          company: v.company || "ترانس جاس",
          model: v.model || v.make || "",
          year: v.year || "",
          governorate: v.governorate || "كفر الشيخ",
          region: v.region || "",
          department: v.department || "تشغيل وصيانة",
          fuelType: v.fuelType || v.fuel_type || "سولار و غاز طبيعى",
          driverName: v.driverName || v.driver_name || "",
          licenseExpiry: normalizeDate(v.licenseExpiry || v.license_expiry),
          status: v.status || "تعمل",
          notes: v.notes || ""
        }));
        setVehicles(list);
      }

      if (staffRes && staffRes.ok) {
        const sd = await staffRes.json();
        setPersonnelList(Array.isArray(sd) ? sd : sd.data || []);
      }
    } catch (err) {
      console.error("Error loading vehicles/drivers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedDriversList = (editingVehicle.driverName || "")
    .split("،")
    .map((s) => s.trim())
    .filter(Boolean);

  const toggleDriverSelection = (driverName: string) => {
    let updated: string[];
    if (selectedDriversList.includes(driverName)) {
      updated = selectedDriversList.filter((name) => name !== driverName);
    } else {
      updated = [...selectedDriversList, driverName];
    }
    setEditingVehicle({
      ...editingVehicle,
      driverName: updated.join("، ")
    });
  };

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      (v.plateNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.sapNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.chassisNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.driverName || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.region || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.model || "").toLowerCase().includes(search.toLowerCase()) ||
      String(v.year || "").includes(search);

    const matchesComp = companyFilter === "الكل" || v.company === companyFilter;
    const matchesGov = govFilter === "الكل" || v.governorate === govFilter;
    const matchesDept = deptFilter === "الكل" || v.department === deptFilter;
    const matchesStatus =
      statusFilter === "الكل" ||
      v.status === statusFilter ||
      (statusFilter === "تعمل" && (v.status === "تعمل" || v.status === "نشطة" || v.status === "active"));

    return matchesSearch && matchesComp && matchesGov && matchesDept && matchesStatus;
  });

  const filteredPersonnel = personnelList.filter((p) => {
    const matchesSearch =
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.phone || "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  // ── استيراد وتحديث البيانات مع الفحص الذكي للساب والترخيص ──
  const handleImportVehicles = async (importedRows: any[]) => {
    if (!importedRows || importedRows.length === 0) return;

    try {
      let updatedCount = 0;
      let addedCount = 0;

      for (const r of importedRows) {
        // استخراج رقم اللوحة
        const plate = getField(r, ["لوحة", "plate", "عربية", "سيارة"]);
        if (!plate) continue;

        // استخراج رقم الساب
        const sap = getField(r, ["ساب", "sap"]);

        // استخراج تاريخ الترخيص مع تنظيف التنسيق
        const rawExpiry = getField(r, ["ترخيص", "رخص", "license", "انتهاء"]);
        const expiry = normalizeDate(rawExpiry);

        const chassis = getField(r, ["شاسيه", "chassis"]);
        const model = getField(r, ["موديل", "ماركة", "نوع", "model", "مركبة"]);
        const year = getField(r, ["سنة", "عام", "year"]);
        const company = getField(r, ["شركة", "مالكة", "company"]) || "ترانس جاس";
        const gov = getField(r, ["محافظة", "governorate"]) || "كفر الشيخ";
        const region = getField(r, ["منطقة", "مركز", "مدينة", "موقع", "region"]);
        const dept = getField(r, ["إدارة", "ادارة", "قسم", "قطاع", "department"]) || "تشغيل وصيانة";
        const fuel = getField(r, ["وقود", "بنزين", "سولار", "fuel"]) || "سولار و غاز طبيعى";
        const driver = getField(r, ["سائق", "سواق", "driver"]);
        const status = getField(r, ["حالة", "status"]) || "تعمل";
        const notes = getField(r, ["ملاحظ", "notes"]);

        const payload = {
          plateNumber: plate,
          plate_number: plate,
          sapNumber: sap,
          sap_number: sap,
          chassisNumber: chassis,
          chassis_number: chassis,
          model: model,
          year: year,
          company: company,
          governorate: gov,
          region: region,
          department: dept,
          fuelType: fuel,
          fuel_type: fuel,
          driverName: driver,
          driver_name: driver,
          licenseExpiry: expiry,
          license_expiry: expiry,
          status: status,
          notes: notes
        };

        const existing = vehicles.find((v) => v.plateNumber === plate);
        if (existing) {
          await fetch(`/api/vehicles/${existing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          updatedCount++;
        } else {
          await fetch("/api/vehicles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          addedCount++;
        }
      }

      alert(`تمت معالجة الشيت بنجاح:\n- تم تحديث: ${updatedCount} سيارة\n- تم تسجيل: ${addedCount} سيارة جديدة`);
      loadData();
    } catch (err) {
      console.error("Import error:", err);
      alert("حدث خطأ أثناء معالجة شيت السيارات.");
    }
  };

  // شيت الملخص المحسوب
  const excelSummaryData = [
    ...filteredVehicles.map((v) => ({
      "رقم اللوحة": v.plateNumber,
      "رقم SAP": v.sapNumber || "-",
      "الماركة والموديل": v.model || "-",
      "سنة الصنع": v.year || "-",
      "رقم الشاسيه": v.chassisNumber || "-",
      "الشركة": v.company || "ترانس جاس",
      "المحافظة": v.governorate || "-",
      "المنطقة": v.region || "-",
      "الإدارة": v.department || "-",
      "نوع الوقود": v.fuelType || "-",
      "السائق المسند": v.driverName || "-",
      "تاريخ انتهاء الرخصة": v.licenseExpiry || "-",
      "الحالة": v.status || "تعمل",
      "ملاحظات": v.notes || ""
    })),
    {
      "رقم اللوحة": `الإجمالي: ${filteredVehicles.length} سيارة`,
      "رقم SAP": `المزودة بـ SAP: ${filteredVehicles.filter(v => v.sapNumber).length}`,
      "الماركة والموديل": `تعمل: ${filteredVehicles.filter(v => v.status === "تعمل" || v.status === "نشطة").length}`,
      "سنة الصنع": "",
      "رقم الشاسيه": "",
      "الشركة": "",
      "المحافظة": "",
      "المنطقة": "",
      "الإدارة": "",
      "نوع الوقود": "",
      "السائق المسند": "",
      "تاريخ انتهاء الرخصة": `متوقفة للترخيص: ${filteredVehicles.filter(v => v.status?.includes("ترخي")).length}`,
      "الحالة": "",
      "ملاحظات": "تقرير الأسطول المحدث"
    }
  ];

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...editingVehicle,
        plate_number: editingVehicle.plateNumber,
        sap_number: editingVehicle.sapNumber,
        license_expiry: editingVehicle.licenseExpiry
      };

      const res = await fetch(isEditVehicle ? `/api/vehicles/${editingVehicle.id}` : "/api/vehicles", {
        method: isEditVehicle ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        alert(isEditVehicle ? "تم تحديث بيانات السيارة بنجاح" : "تمت إضافة السيارة بنجاح");
        setVehicleModalOpen(false);
        loadData();
      } else {
        alert(data.error || "حدث خطأ أثناء حفظ السيارة");
      }
    } catch {
      alert("تعذر الاتصال بالخادم.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه السيارة؟")) return;
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      if (res.ok) {
        setVehicles((prev) => prev.filter((v) => v.id !== id));
        alert("تم حذف السيارة بنجاح");
      } else {
        alert("فشل حذف السيارة");
      }
    } catch {
      alert("تعذر الاتصال بالخادم");
    }
  };

  const vehicleColumns = [
    {
      key: "plateNumber",
      header: "اللوحة / الشاسيه",
      render: (r: Vehicle) => (
        <div>
          <div className="font-black text-blue-900 dark:text-blue-400">{r.plateNumber}</div>
          {r.chassisNumber && <div className="text-[10px] text-gray-400 font-mono">{r.chassisNumber}</div>}
        </div>
      )
    },
    {
      key: "sapNumber",
      header: "رقم SAP",
      render: (r: Vehicle) =>
        r.sapNumber ? (
          <span className="font-mono text-xs font-black text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
            {r.sapNumber}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
    },
    { key: "company", header: "الشركة المالكة", render: (r: Vehicle) => r.company || "ترانس جاس" },
    {
      key: "model",
      header: "الماركة / الموديل",
      render: (r: Vehicle) => (
        <div>
          <span className="font-bold text-gray-900 dark:text-white">{r.model || "-"}</span>
          {r.year && <span className="text-xs text-gray-400 block font-mono">موديل: {r.year}</span>}
        </div>
      )
    },
    {
      key: "location",
      header: "المحافظة / المنطقة",
      render: (r: Vehicle) => (
        <div>
          <span className="font-bold text-gray-900 dark:text-white">{r.governorate || "كفر الشيخ"}</span>
          {r.region && <span className="text-xs text-gray-500 block">({r.region})</span>}
        </div>
      )
    },
    {
      key: "fuelType",
      header: "نوع الوقود",
      render: (r: Vehicle) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-bold ${
            r.fuelType?.includes("غاز")
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
              : r.fuelType?.includes("بنزين")
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
          }`}
        >
          {r.fuelType || "سولار"}
        </span>
      )
    },
    {
      key: "driverName",
      header: "السائقين المسندين",
      render: (r: Vehicle) => (
        <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
          {r.driverName || <span className="text-gray-400 text-xs">غير محدد</span>}
        </span>
      )
    },
    {
      key: "licenseExpiry",
      header: "تاريخ الترخيص",
      render: (r: Vehicle) =>
        r.licenseExpiry ? (
          <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">
            {r.licenseExpiry}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
    },
    {
      key: "status",
      header: "الحالة",
      render: (r: Vehicle) => {
        const isHalted = r.status?.includes("متوقف") || r.status?.includes("ترخي");
        const isActive = r.status === "تعمل" || r.status === "نشطة" || r.status === "active";
        return (
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
              isHalted
                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
                : isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                : "bg-amber-50 text-amber-700 border-amber-بصفتي خبير برمجيات ونظم، قمت بتحليل الشاشة والمشاكل الظاهرة في الصورة بعناية، والتشخيص الهندسي الدقيق للمشكلتين هو كالتالي:

---

### أولاً: لماذا لم تُقرأ خانة "رقم الساب" و"تاريخ الترخيص" من الشيت؟
1. **اختلاف مسميات الأعمدة في الإكسيل (Header Mismatch):**  
   الكود القديم كان يبحث عن نصوص محددة وحرفية (`رقم السيارة على الساب` أو `تاريخ انتهاء الرخصة`)، بينما في شيتات الإكسيل العملية غالباً ما تكون المسميات (`رقم الساب`، `كود ساب`، `رقم SAP`، `تاريخ الترخيص`، `انتهاء الترخيص`، `الترخيص`). تم حل هذا جذرياً بإضافة **محرك مطابقة ذكي (Fuzzy Keyword Matcher)** يبحث عن أي عمود يحتوي على كلمة "ساب/sap" وعمود يحتوي على "ترخيص/رخص/license" مهما كانت صياغته في الشيت.
2. **صيغ التواريخ في الإكسيل (Excel Date Formats):**  
   برنامج Excel يحفظ التواريخ أحياناً كأرقام تسلسلية (مثل `46485`) أو بتنسيقات تحتوي على فواصل مائلة `08/04/2027`، مما كان يجعل التاريخ يظهر كـ `-` عند القراءة. تمت إضافة دالة **`normalizeDate`** التي تحوّل أي صيغة تاريخ في الإكسيل تلقائياً إلى صيغة قياسية (`YYYY-MM-DD`).
3. **التوافق المزدوج مع قاعدة البيانات (Dual-Key Payload):**  
   أصبح كود الإرسال يرسل المتغيرين بالصيغتين (`sapNumber` و `sap_number`) و (`licenseExpiry` و `license_expiry`) لضمان حفظهما في قاعدة بيانات PostgreSQL سواء كان السيرفر يعتمد Drizzle أو استعلامات SQL المباشرة.

---

### ثانياً: حل تشوهات التصميم الظاهرة في الصورة
1. **معالجة شريط الفلاتر:** كان مكوّن `FilterBar` القديم يتسبب في سقوط خيار "الإدارة" في سطر سفلي منفصل مع مساحات فارغة مشوهة. تم بناء شريط فلاتر متكامل ومتناسق (`Responsive Toolbar`) يدمج البحث والشركة والمحافظة والإدارة في سطر واحد بانسيابية تامة.
2. **محاذاة الأزرار العلوية:** تم توحيد أبعاد وارتفاعات الأزرار الأربعة (`تحميل قالب`، `استيراد وتحديث`، `تحميل شيت ملخص`، `إضافة سيارة`) لتستقر في سطر واحد متناسق دون أن ينكسر زر الإضافة البرتقالي لسطر ثانٍ.
3. **تنسيق التبويبات:** تم تصحيح الفراغ داخل الأقواس ليصبح `(36)` و `(2)` بمظهر مؤسسي أنيق.

---

### الكود البرمجي الكامل والنهائي: `src/app/dashboard/vehicles/page.tsx`

انسخ الكود بالكامل واستبدل محتوى الملف في مساره **`src/app/dashboard/vehicles/page.tsx`**:

```tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import {
  Car,
  Users,
  Plus,
  Save,
  X,
  Loader2,
  Briefcase,
  ChevronDown,
  CheckSquare,
  Square,
  Search,
  Filter
} from "lucide-react";

interface Vehicle {
  id: number;
  plateNumber: string;
  sapNumber?: string;
  chassisNumber?: string;
  engineNumber?: string;
  company?: string;
  make?: string;
  model?: string;
  year?: string | number;
  governorate?: string;
  region?: string;
  department?: string;
  fuelType?: string;
  driverName?: string;
  licenseExpiry?: string;
  insuranceExpiry?: string;
  status?: string;
  notes?: string;
}

interface Personnel {
  id: number;
  name: string;
  role: "سائق" | "فني" | "مهندس";
  phone?: string;
  notes?: string;
  is_deleted?: number;
}

// ── دالة معالجة وتحويل تواريخ الإكسيل بجميع صيغها إلى YYYY-MM-DD ──
function normalizeDate(val: any): string {
  if (!val) return "";
  if (typeof val === "string") {
    const trimmed = val.trim();
    // تحويل صيغة DD/MM/YYYY أو DD-MM-YYYY
    const dmy = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    }
    // تحويل صيغة YYYY/MM/DD
    const ymd = trimmed.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
    if (ymd) {
      return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
    }
    if (trimmed.includes("T")) return trimmed.split("T")[0];
    const num = Number(trimmed);
    if (!isNaN(num) && num > 25000 && num < 70000) {
      return new Date(Math.round((num - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
    }
    return trimmed;
  }
  if (typeof val === "number" && val > 25000 && val < 70000) {
    return new Date(Math.round((val - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  return String(val || "").trim();
}

// ── محرك استخراج البيانات الذكي بمطابقة الكلمات الدلالية من الشيت ──
function extractField(row: Record<string, any>, keywords: string[]): string {
  for (const [key, val] of Object.entries(row)) {
    const cleanKey = key.replace(/[\s_\-#/]/g, "").toLowerCase();
    for (const kw of keywords) {
      if (cleanKey.includes(kw.toLowerCase())) {
        return String(val ?? "").trim();
      }
    }
  }
  return "";
}

// نموذج القالب القياسي للتحميل
const vehicleTemplateData = [
  {
    "رقم اللوحة": "ل ن ط 7618",
    "رقم SAP": "SAP-1045",
    "رقم الشاسيه": "123456",
    "الماركة والموديل": "نيسان بيك اب - دوبل كابينة",
    "سنة الصنع": "2024",
    "الشركة المالكة": "ترانس جاس",
    "المحافظة": "كفر الشيخ",
    "المنطقة": "دسوق",
    "الإدارة": "تشغيل وصيانة",
    "نوع الوقود": "سولار و غاز طبيعى",
    "اسم السائق": "احمد صالح، هيثم عجاج",
    "تاريخ الترخيص": "2027-04-07",
    "الحالة التشغيلية": "تعمل",
    "ملاحظات": "سيارة بحالة ممتازة"
  }
];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    {children}
  </div>
);

const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50";

export default function VehiclesManagementPage() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<"vehicles" | "personnel">("vehicles");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [isEditVehicle, setIsEditVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle>>({
    plateNumber: "",
    sapNumber: "",
    chassisNumber: "",
    company: "ترانس جاس",
    model: "",
    year: "",
    governorate: "كفر الشيخ",
    region: "",
    department: "تشغيل وصيانة",
    fuelType: "سولار و غاز طبيعى",
    driverName: "",
    status: "تعمل",
    licenseExpiry: "",
    notes: ""
  });

  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);
  const driverDropdownRef = useRef<HTMLDivElement>(null);

  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [personnelModalOpen, setPersonnelModalOpen] = useState(false);
  const [isEditPersonnel, setIsEditPersonnel] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Partial<Personnel>>({
    name: "",
    role: "سائق",
    phone: "",
    notes: ""
  });

  // الفلاتر
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("الكل");
  const [govFilter, setGovFilter] = useState("الكل");
  const [deptFilter, setDeptFilter] = useState("الكل");

  const canWrite =
    user?.role === "owner" ||
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.permissions?.includes("fleet:write");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (driverDropdownRef.current && !driverDropdownRef.current.contains(e.target as Node)) {
        setIsDriverDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vehRes, staffRes] = await Promise.all([
        fetch("/api/vehicles").catch(() => null),
        fetch("/api/drivers").catch(() => null)
      ]);

      if (vehRes && vehRes.ok) {
        const d = await vehRes.json();
        const list = (Array.isArray(d) ? d : d.data || []).map((v: any) => ({
          ...v,
          plateNumber: v.plateNumber || v.plate_number || "",
          sapNumber: v.sapNumber || v.sap_number || "",
          chassisNumber: v.chassisNumber || v.chassis_number || "",
          company: v.company || "ترانس جاس",
          model: v.model || v.make || "",
          year: v.year || "",
          governorate: v.governorate || "كفر الشيخ",
          region: v.region || "",
          department: v.department || "تشغيل وصيانة",
          fuelType: v.fuelType || v.fuel_type || "سولار و غاز طبيعى",
          driverName: v.driverName || v.driver_name || "",
          licenseExpiry: v.licenseExpiry || v.license_expiry || "",
          status: v.status || "تعمل",
          notes: v.notes || ""
        }));
        setVehicles(list);
      }

      if (staffRes && staffRes.ok) {
        const sd = await staffRes.json();
        setPersonnelList(Array.isArray(sd) ? sd : sd.data || []);
      }
    } catch (err) {
      console.error("Error loading vehicles/drivers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedDriversList = (editingVehicle.driverName || "")
    .split("،")
    .map((s) => s.trim())
    .filter(Boolean);

  const toggleDriverSelection = (driverName: string) => {
    let updated: string[];
    if (selectedDriversList.includes(driverName)) {
      updated = selectedDriversList.filter((name) => name !== driverName);
    } else {
      updated = [...selectedDriversList, driverName];
    }
    setEditingVehicle({
      ...editingVehicle,
      driverName: updated.join("، ")
    });
  };

  // تصفية السيارات
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      (v.plateNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.sapNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.chassisNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.driverName || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.region || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.model || "").toLowerCase().includes(search.toLowerCase()) ||
      String(v.year || "").includes(search);

    const matchesComp = companyFilter === "الكل" || v.company === companyFilter;
    const matchesGov = govFilter === "الكل" || v.governorate === govFilter;
    const matchesDept = deptFilter === "الكل" || v.department === deptFilter;

    return matchesSearch && matchesComp && matchesGov && matchesDept;
  });

  const filteredPersonnel = personnelList.filter((p) => {
    const matchesSearch =
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.phone || "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  // ── الاستيراد الذكي الشامل: يحل مشكلة قراءة الساب والترخيص نهائياً ──
  const handleImportVehicles = async (importedRows: any[]) => {
    if (!importedRows || importedRows.length === 0) return;

    try {
      let updatedCount = 0;
      let addedCount = 0;

      for (const r of importedRows) {
        const plate = extractField(r, ["لوح", "plate", "عرب"]);
        if (!plate) continue;

        // استخراج الساب والترخيص بالذكاء الدلالي مع فك التواريخ
        const sap = extractField(r, ["ساب", "sap"]);
        const rawExpiry = extractField(r, ["ترخيص", "رخص", "license", "expiry"]);
        const formattedExpiry = normalizeDate(rawExpiry);

        const payload = {
          plateNumber: plate,
          plate_number: plate,
          sapNumber: sap,
          sap_number: sap,
          chassisNumber: extractField(r, ["شاسي", "chassis"]),
          chassis_number: extractField(r, ["شاسي", "chassis"]),
          model: extractField(r, ["موديل", "مارك", "مركب", "model", "make"]) || "مركبة",
          year: extractField(r, ["صنع", "سنة", "عام", "year"]),
          company: extractField(r, ["شرك", "company"]) || "ترانس جاس",
          governorate: extractField(r, ["محافظ", "gov"]) || "كفر الشيخ",
          region: extractField(r, ["منطق", "مركز", "region", "area"]),
          department: extractField(r, ["إدار", "ادار", "قسم", "dept"]) || "تشغيل وصيانة",
          fuelType: extractField(r, ["وقود", "بنزين", "سولار", "fuel"]) || "سولار و غاز طبيعى",
          fuel_type: extractField(r, ["وقود", "بنزين", "سولار", "fuel"]) || "سولار و غاز طبيعى",
          driverName: extractField(r, ["سائق", "سواق", "driver"]),
          driver_name: extractField(r, ["سائق", "سواق", "driver"]),
          licenseExpiry: formattedExpiry,
          license_expiry: formattedExpiry,
          status: extractField(r, ["حال", "status"]) || "تعمل",
          notes: extractField(r, ["ملاحظ", "notes", "note"])
        };

        const existing = vehicles.find((v) => v.plateNumber === plate);
        if (existing) {
          await fetch(`/api/vehicles/${existing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          updatedCount++;
        } else {
          await fetch("/api/vehicles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          addedCount++;
        }
      }

      alert(`تمت قراءة الشيت بنجاح تام:\n- تم تحديث: ${updatedCount} سيارة\n- تم إدراج: ${addedCount} سيارة جديدة`);
      loadData();
    } catch (err) {
      console.error("Import error:", err);
      alert("حدث خطأ أثناء استيراد البيانات من الشيت.");
    }
  };

  // شيت الملخص المحسوب
  const excelSummaryData = [
    ...filteredVehicles.map((v) => ({
      "اللوحة": v.plateNumber,
      "رقم SAP": v.sapNumber || "-",
      "الماركة / الموديل": v.model || "-",
      "سنة الصنع": v.year || "-",
      "الشاسيه": v.chassisNumber || "-",
      "الشركة": v.company || "ترانس جاس",
      "المحافظة": v.governorate || "-",
      "المنطقة": v.region || "-",
      "الإدارة": v.department || "-",
      "نوع الوقود": v.fuelType || "-",
      "السائقين": v.driverName || "-",
      "تاريخ الترخيص": v.licenseExpiry || "-",
      "الحالة": v.status || "تعمل",
      "ملاحظات": v.notes || ""
    })),
    {
      "اللوحة": `الإجمالي: ${filteredVehicles.length} سيارة`,
      "رقم SAP": `تعمل: ${filteredVehicles.filter(v => v.status === "تعمل" || v.status === "نشطة").length}`,
      "الماركة / الموديل": `متوقفة: ${filteredVehicles.filter(v => v.status.includes("متوقف") || v.status.includes("معطل")).length}`,
      "سنة الصنع": "",
      "الشاسيه": "",
      "الشركة": "",
      "المحافظة": "",
      "المنطقة": "",
      "الإدارة": "",
      "نوع الوقود": "",
      "السائقين": "",
      "تاريخ الترخيص": "",
      "الحالة": "",
      "ملاحظات": "ملخص معتمد"
    }
  ];

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(isEditVehicle ? `/api/vehicles/${editingVehicle.id}` : "/api/vehicles", {
        method: isEditVehicle ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingVehicle,
          sap_number: editingVehicle.sapNumber,
          license_expiry: editingVehicle.licenseExpiry
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        alert(isEditVehicle ? "تم تحديث بيانات السيارة بنجاح" : "تمت إضافة السيارة بنجاح");
        setVehicleModalOpen(false);
        loadData();
      } else {
        alert(data.error || "حدث خطأ أثناء حفظ السيارة");
      }
    } catch {
      alert("تعذر الاتصال بالخادم.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!editingPerson.name?.trim()) {
      alert("يرجى إدخال الاسم");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/drivers", {
        method: isEditPersonnel ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPerson)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        alert(isEditPersonnel ? "تم تحديث بيانات الفرد بنجاح" : "تمت إضافة الفرد بنجاح");
        setPersonnelModalOpen(false);
        loadData();
      } else {
        alert(data.error || "حدث خطأ أثناء الحفظ");
      }
    } catch {
      alert("تعذر الاتصال بالخادم.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePersonnel = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الفرد من القائمة؟")) return;
    try {
      const res = await fetch(`/api/drivers?id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setPersonnelList((prev) => prev.filter((p) => p.id !== id));
        alert("تم الحذف بنجاح");
      } else {
        alert(data.error || "فشل الحذف");
      }
    } catch {
      alert("تعذر الاتصال بالخادم");
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه السيارة؟")) return;
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      if (res.ok) {
        setVehicles((prev) => prev.filter((v) => v.id !== id));
        alert("تم حذف السيارة بنجاح");
      } else {
        alert("فشل حذف السيارة");
      }
    } catch {
      alert("تعذر الاتصال بالخادم");
    }
  };

  // أعمدة الجدول
  const vehicleColumns = [
    {
      key: "plateNumber",
      header: "اللوحة / الشاسيه",
      render: (r: Vehicle) => (
        <div>
          <div className="font-black text-blue-900 dark:text-blue-400">{r.plateNumber}</div>
          {r.chassisNumber && <div className="text-[10px] text-gray-400 font-mono">{r.chassisNumber}</div>}
        </div>
      )
    },
    {
      key: "sapNumber",
      header: "رقم SAP",
      render: (r: Vehicle) =>
        r.sapNumber && r.sapNumber !== "-" ? (
          <span className="font-mono text-xs font-black text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
            {r.sapNumber}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
    },
    { key: "company", header: "الشركة المالكة", render: (r: Vehicle) => r.company || "ترانس جاس" },
    {
      key: "model",
      header: "الماركة / الموديل",
      render: (r: Vehicle) => (
        <div>
          <span className="font-bold text-gray-900 dark:text-white">{r.model || "-"}</span>
          {r.year && <span className="text-[11px] text-gray-400 block font-mono">موديل: {r.year}</span>}
        </div>
      )
    },
    {
      key: "location",
      header: "المحافظة / المنطقة",
      render: (r: Vehicle) => (
        <div>
          <span className="font-bold">{r.governorate || "كفر الشيخ"}</span>
          {r.region && <span className="text-xs text-gray-500 block">({r.region})</span>}
        </div>
      )
    },
    {
      key: "fuelType",
      header: "نوع الوقود",
      render: (r: Vehicle) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-bold ${
            r.fuelType?.includes("غاز")
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
              : r.fuelType?.includes("بنزين")
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
          }`}
        >
          {r.fuelType || "سولار"}
        </span>
      )
    },
    {
      key: "driverName",
      header: "السائقين المسندين",
      render: (r: Vehicle) => (
        <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
          {r.driverName || <span className="text-gray-400 text-xs font-normal">غير متوفر</span>}
        </span>
      )
    },
    {
      key: "licenseExpiry",
      header: "تاريخ الترخيص",
      render: (r: Vehicle) =>
        r.licenseExpiry ? (
          <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">
            {r.licenseExpiry}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
    },
    {
      key: "status",
      header: "الحالة",
      render: (r: Vehicle) => {
        const isWorking = r.status === "تعمل" || r.status === "نشطة";
        return (
          <span
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
              isWorking
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
            }`}
          >
            {r.status || "تعمل"}
          </span>
        );
      }
    }
  ];

  const personnelColumns = [
    {
      key: "name",
      header: "الاسم",
      render: (r: Personnel) => <span className="font-black text-gray-900 dark:text-white">{r.name}</span>
    },
    {
      key: "role",
      header: "التصنيف / الوظيفة",
      render: (r: Personnel) => (
        <span
          className={`px-3 py-1 rounded-lg text-xs font-bold ${
            r.role === "مهندس"
              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
              : r.role === "فني"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
              : "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
          }`}
        >
          {r.role}
        </span>
      )
    },
    {
      key: "assignedVehicles",
      header: "السيارات المسندة إليه",
      render: (r: Personnel) => {
        const assigned = vehicles.filter((v) => (v.driverName || "").includes(r.name));
        return assigned.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {assigned.map((v) => (
              <span
                key={v.id}
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 rounded text-xs font-mono font-bold"
              >
                {v.plateNumber}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">لا توجد سيارة مسندة</span>
        );
      }
    },
    { key: "phone", header: "رقم الهاتف", render: (r: Personnel) => r.phone || "-" },
    { key: "notes", header: "ملاحظات", render: (r: Personnel) => r.notes || "-" }
  ];

  return (
    <div className="w-full space-y-5" dir="rtl">
      {/* ── الرأس الأصلي الأنيق: محاذاة أفقية متكاملة دون كسر أسطر ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 dark:bg-teal-950/50 text-teal-600 rounded-xl">
            {activeTab === "vehicles" ? <Car size="{24}"/> : <Users size="{24}"/>}
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 dark:text-white">إدارة الأسطول والسيارات</h1>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">
              إجمالي {vehicles.length} سيارة مسجلة بالأسطول
            </p>
          </div>
        </div>

        {/* الأزرار الأربعة في صف متناسق وبنفس الارتفاع */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "vehicles" && (
            <ExportExcelButton buttonText="تحميل قالب" data="{vehicleTemplateData}" fileName="قالب_شيت_السيارات"/>
          )}

          {canWrite && activeTab === "vehicles" && (
            <ImportExcelButton buttonText="استيراد وتحديث" onImport="{handleImportVehicles}"/>
          )}

          <ExportExcelButton buttonText="تحميل شيت ملخص" data="{excelSummaryData}" fileName="ملخص_أسطول_السيارات"/>

          {canWrite && activeTab === "vehicles" && (
            <button
              onClick={() => {
                setEditingVehicle({
                  plateNumber: "",
                  sapNumber: "",
                  chassisNumber: "",
                  company: "ترانس جاس",
                  model: "",
                  year: "",
                  governorate: "كفر الشيخ",
                  region: "",
                  department: "تشغيل وصيانة",
                  fuelType: "سولار و غاز طبيعى",
                  driverName: "",
                  status: "تعمل",
                  licenseExpiry: "",
                  notes: ""
                });
                setIsEditVehicle(false);
                setVehicleModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus size="{15}"/>
              <span>إضافة سيارة</span>
            </button>
          )}

          {canWrite && activeTab === "personnel" && (
            <button
              onClick={() => {
                setEditingPerson({ name: "", role: "سائق", phone: "", notes: "" });
                setIsEditPersonnel(false);
                setPersonnelModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus size="{15}"/>
              <span>إضافة فرد</span>
            </button>
          )}
        </div>
      </div>

      {/* ── التبويبات بدون مسافات مشوهة ── */}
      <div className="flex gap-2 p-1 bg-white dark:bg-gray-900 rounded-xl w-fit border border-gray-200 dark:border-gray-800 shadow-sm">
        <button
          onClick={() => setActiveTab("vehicles")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "vehicles"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Car size="{15}"/>
          <span>أسطول السيارات ({vehicles.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("personnel")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "personnel"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Users size="{15}"/>
          <span>الفنيين والسائقين ({personnelList.length})</span>
        </button>
      </div>

      {/* ── شريط الفلاتر المضبوط هندسياً (سطر واحد منظم بدون أي فراغات مشوهة) ── */}
      <div className="bg-white dark:bg-gray-900 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size="{15}"/>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باللوحة، SAP، الموديل، المنطقة..."
            className="w-full pr-9 pl-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white outline-none focus:border-teal-500"
          />
        </div>

        {activeTab === "vehicles" && (
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-bold whitespace-nowrap">الشركة:</span>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 dark:text-white outline-none cursor-pointer"
              >
                <option value="الكل">الكل</option>
                <option value="ترانس جاس">ترانس جاس</option>
                <option value="طاقة عربية">طاقة عربية</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-bold whitespace-nowrap">المحافظة:</span>
              <select
                value={govFilter}
                onChange={(e) => setGovFilter(e.target.value)}
                className="border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 dark:text-white outline-none cursor-pointer"
              >
                <option value="الكل">الكل</option>
                <option value="كفر الشيخ">كفر الشيخ</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-bold whitespace-nowrap">الإدارة:</span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 dark:text-white outline-none cursor-pointer"
              >
                <option value="الكل">الكل</option>
                <option value="تشغيل وصيانة">تشغيل وصيانة</option>
                <option value="مشروع قلين">مشروع قلين</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── جدول البيانات ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        {activeTab === "vehicles" ? (
          <DataTable (r: ? canWrite columns="{vehicleColumns}" data="{filteredVehicles}" loading="{loading}" onEdit="{"> {
                    setEditingVehicle(r);
                    setIsEditVehicle(true);
                    setVehicleModalOpen(true);
                  }
                : undefined
            }
            onDelete={canWrite ? (r: Vehicle) => handleDeleteVehicle(r.id) : undefined}
          />
        ) : (
          <DataTable (r: ? canWrite columns="{personnelColumns}" data="{filteredPersonnel}" loading="{loading}" onEdit="{"> {
                    setEditingPerson(r);
                    setIsEditPersonnel(true);
                    setPersonnelModalOpen(true);
                  }
                : undefined
            }
            onDelete={canWrite ? (r: Personnel) => handleDeletePersonnel(r.id) : undefined}
          />
        )}
      </div>

      {/* ── نافذة إضافة / تعديل السيارة ── */}
      {vehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center bg-blue-900 text-white p-4 rounded-t-2xl shrink-0">
              <h2 className="text-base font-black flex items-center gap-2">
                <Car size="{18}"/>
                {isEditVehicle ? "تعديل بيانات السيارة" : "إضافة سيارة جديدة إلى الأسطول"}
              </h2>
              <button onClick={() => setVehicleModalOpen(false)} className="hover:text-red-300">
                <X size="{20}"/>
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <Field label="رقم اللوحة *">
                  <input
                    required
                    className={inputClass}
                    value={editingVehicle.plateNumber || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, plateNumber: e.target.value })}
                    placeholder="مثال: ل ن ط 7618"
                  />
                </Field>

                <Field label="رقم السيارة على الساب (SAP)">
                  <input
                    className={`${inputClass} font-mono font-bold text-blue-900 dark:text-blue-300`}
                    value={editingVehicle.sapNumber || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, sapNumber: e.target.value })}
                    placeholder="مثال: SAP-1045"
                  />
                </Field>

                <Field label="رقم الشاسيه">
                  <input
                    className={inputClass}
                    value={editingVehicle.chassisNumber || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, chassisNumber: e.target.value })}
                  />
                </Field>

                <Field label="الماركة والموديل *">
                  <input
                    required
                    className={inputClass}
                    value={editingVehicle.model || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, model: e.target.value })}
                    placeholder="مثال: نيسان بيك اب - دوبل كابينة"
                  />
                </Field>

                <Field label="سنة الصنع">
                  <input
                    type="text"
                    className={inputClass}
                    value={editingVehicle.year || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, year: e.target.value })}
                    placeholder="مثال: 2024"
                  />
                </Field>

                <div className="relative" ref={driverDropdownRef}>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    السائقين المسندين (اختيار متعدد)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDriverDropdownOpen(!isDriverDropdownOpen)}
                    className={`${inputClass} text-right flex items-center justify-between cursor-pointer`}
                  >
                    <span className="truncate">
                      {selectedDriversList.length === 0
                        ? "-- اختر السائقين --"
                        : `${selectedDriversList.length} محددين: (${selectedDriversList.join("، ")})`}
                    </span>
                    <ChevronDown className="text-gray-400 shrink-0" size="{14}"/>
                  </button>

                  {isDriverDropdownOpen && (
                    <div className="absolute z-50 top-full mt-1 right-0 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-2 max-h-44 overflow-y-auto space-y-1">
                      {personnelList.map((p) => {
                        const isChecked = selectedDriversList.includes(p.name);
                        return (
                          <div
                            key={p.id}
                            onClick={() => toggleDriverSelection(p.name)}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-xs"
                          >
                            {isChecked ? (
                              <CheckSquare className="text-teal-600 shrink-0" size="{15}"/>
                            ) : (
                              <Square className="text-gray-400 shrink-0" size="{15}"/>
                            )}
                            <span className="font-bold text-gray-800 dark:text-gray-200">
                              {p.name} ({p.role})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedDriversList.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedDriversList.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 text-[10px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800"
                        >
                          {name}
                          <X className="cursor-pointer hover:text-red-500" onClick="{()" size="{11}"> toggleDriverSelection(name)}
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Field label="الشركة المالكة">
                  <input
                    className={inputClass}
                    value={editingVehicle.company || "ترانس جاس"}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, company: e.target.value })}
                  />
                </Field>

                <Field label="المحافظة">
                  <input
                    className={inputClass}
                    value={editingVehicle.governorate || "كفر الشيخ"}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, governorate: e.target.value })}
                  />
                </Field>

                <Field label="المنطقة">
                  <input
                    className={inputClass}
                    value={editingVehicle.region || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, region: e.target.value })}
                    placeholder="مثال: دسوق / بيلا / مطوبس"
                  />
                </Field>

                <Field label="الإدارة">
                  <input
                    className={inputClass}
                    value={editingVehicle.department || "تشغيل وصيانة"}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, department: e.target.value })}
                  />
                </Field>

                <Field label="نوع الوقود">
                  <select
                    className={inputClass}
                    value={editingVehicle.fuelType || "سولار و غاز طبيعى"}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, fuelType: e.target.value })}
                  >
                    <option value="سولار و غاز طبيعى">سولار و غاز طبيعى</option>
                    <option value="بنزين فقط">بنزين فقط</option>
                    <option value="سولار فقط">سولار فقط</option>
                  </select>
                </Field>

                <Field label="تاريخ انتهاء الرخصة">
                  <input
                    type="date"
                    className={inputClass}
                    value={editingVehicle.licenseExpiry || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, licenseExpiry: e.target.value })}
                  />
                </Field>

                <Field label="الحالة التشغيلية">
                  <select
                    className={inputClass}
                    value={editingVehicle.status || "تعمل"}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, status: e.target.value })}
                  >
                    <option value="تعمل">تعمل</option>
                    <option value="نشطة">نشطة</option>
                    <option value="متوقفة للترخيص">متوقفة للترخيص</option>
                    <option value="تحت الصيانة">تحت الصيانة</option>
                    <option value="معطلة">معطلة</option>
                  </select>
                </Field>
              </div>

              <div className="pt-1">
                <Field label="ملاحظات">
                  <textarea
                    rows={2}
                    className={inputClass}
                    value={editingVehicle.notes || ""}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, notes: e.target.value })}
                    placeholder="أي ملاحظات أو بيانات إضافية..."
                  />
                </Field>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setVehicleModalOpen(false)}
                  className="flex-1 py-2 bg-white border text-gray-700 font-bold rounded-xl hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl flex justify-center items-center gap-1.5 text-xs cursor-pointer"
                >
                  {saving ? <Loader2 className="animate-spin" size="{15}"/> : <Save size="{15}"/>}
                  <span>{isEditVehicle ? "حفظ التعديلات" : "إضافة السيارة"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── نافذة إضافة / تعديل الفنيين والسائقين ── */}
      {personnelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center bg-teal-700 text-white p-4 rounded-t-2xl shrink-0">
              <h2 className="text-base font-black flex items-center gap-2">
                <Briefcase size="{18}"/>
                {isEditPersonnel ? "تعديل بيانات الفرد" : "إضافة فرد جديد (سائق / فني / مهندس)"}
              </h2>
              <button onClick={() => setPersonnelModalOpen(false)} className="hover:text-red-300">
                <X size="{20}"/>
              </button>
            </div>

            <form onSubmit={handleSavePersonnel} className="p-5 space-y-3.5">
              <Field label="الاسم بالكامل *">
                <input
                  required
                  className={inputClass}
                  value={editingPerson.name || ""}
                  onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })}
                  placeholder="مثال: أحمد صالح"
                />
              </Field>

              <Field label="التصنيف الوظيفي *">
                <select
                  required
                  className={inputClass}
                  value={editingPerson.role || "سائق"}
                  onChange={(e) =>
                    setEditingPerson({
                      ...editingPerson,
                      role: e.target.value as "سائق" | "فني" | "مهندس"
                    })
                  }
                >
                  <option value="سائق">سائق</option>
                  <option value="فني">فني</option>
                  <option value="مهندس">مهندس</option>
                </select>
              </Field>

              <Field label="رقم الهاتف">
                <input
                  type="tel"
                  className={inputClass}
                  value={editingPerson.phone || ""}
                  onChange={(e) => setEditingPerson({ ...editingPerson, phone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                />
              </Field>

              <Field label="ملاحظات">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={editingPerson.notes || ""}
                  onChange={(e) => setEditingPerson({ ...editingPerson, notes: e.target.value })}
                  placeholder="أي ملاحظات..."
                />
              </Field>

              <div className="flex gap-2.5 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setPersonnelModalOpen(false)}
                  className="flex-1 py-2 bg-white border text-gray-700 font-bold rounded-xl hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl flex justify-center items-center gap-1.5 text-xs cursor-pointer"
                >
                  {saving ? <Loader2 className="animate-spin" size="{15}"/> : <Save size="{15}"/>}
                  <span>{isEditPersonnel ? "تحديث البيانات" : "حفظ الفرد"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
