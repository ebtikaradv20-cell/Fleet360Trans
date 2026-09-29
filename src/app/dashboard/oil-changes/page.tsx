"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FilterBar, { FilterSelect } from "@/components/ui/FilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import ImportExcelButton from "@/components/ImportExcelButton";
import StatusBadge from "@/components/ui/StatusBadge";
import { 
  Droplet, AlertTriangle, Plus, Search, CheckCircle2, XCircle, Save, X, Loader2, DollarSign, Wrench, Trash2, Box, Package
} from "lucide-react";

// --- Helpers ---
const safeNum = (val: any) => { const n = parseFloat(String(val).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const Field = ({ label, children }: any) => (<div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>{children}</div>);
const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50";
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

export default function OilsAndPartsPage() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<"oils" | "parts">("oils");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canWrite = user?.role === "admin" || user?.permissions?.includes("oil-changes:write");

  // --- States for Oils ---
  const [oilsData, setOilsData] = useState<any[]>([]);
  const [oilModal, setOilModal] = useState(false);
  const [editOil, setEditOil] = useState<any>({});
  const [oilLifespan, setOilLifespan] = useState<number>(5000);
  const [oilSearch, setOilSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("الكل");

  // --- States for Parts ---
  const [partsData, setPartsData] = useState<any[]>([]);
  const [partModal, setPartModal] = useState(false);
  const [editPart, setEditPart] = useState<any>({});
  const [partSearch, setPartSearch] = useState("");
  const [catFilter, setCatFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, pRes] = await Promise.all([fetch(`/api/oil-changes`), fetch(`/api/spare-parts`)]);
      const oData = await oRes.json();
      const pData = await pRes.json();
      setOilsData(Array.isArray(oData) ? oData : []);
      setPartsData(Array.isArray(pData) ? pData : []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); fetch("/api/vehicles").then(r => r.json()).then(d => setVehicles(Array.isArray(d) ? d : [])); }, [loadData]);

  // --- Filtered Data ---
  const filteredOils = oilsData.filter(r => (r.plateNumber || "").toLowerCase().includes(oilSearch.toLowerCase()) && (vehicleFilter === "الكل" || r.plateNumber === vehicleFilter));
  const filteredParts = partsData.filter(r => (r.partName || "").toLowerCase().includes(partSearch.toLowerCase()) && (catFilter === "الكل" || r.category === catFilter) && (statusFilter === "الكل" || r.status === statusFilter));

  const totalOilCost = filteredOils.reduce((sum, r) => sum + safeNum(r.cost), 0);
  const oilAlertCount = filteredOils.filter(r => r.kmAlert || r.dayAlert).length;
  
  const totalStockValue = filteredParts.reduce((sum, r) => sum + (safeNum(r.quantity) * safeNum(r.unitPrice)), 0);
  const lowStockCount = filteredParts.filter(r => safeNum(r.quantity) <= safeNum(r.minimumQuantity)).length;

  // --- Save Handlers ---
  const handleSaveOil = async (e: React.FormEvent) => {
    e.preventDefault(); if (saving) return; setSaving(true);
    try {
      const p = { ...editOil, kmAtChange: safeNum(editOil.kmAtChange), nextChangeKm: safeNum(editOil.nextChangeKm), cost: safeNum(editOil.cost), filterChanged: editOil.filterChanged ? 1 : 0, airFilterChanged: editOil.airFilterChanged ? 1 : 0, fuelFilterChanged: editOil.fuelFilterChanged ? 1 : 0 };
      await fetch(editOil.id ? `/api/oil-changes/${editOil.id}` : "/api/oil-changes", { method: editOil.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      setOilModal(false); loadData();
    } catch { alert("خطأ بالخادم"); } finally { setSaving(false); }
  };

  const handleSavePart = async (e: React.FormEvent) => {
    e.preventDefault(); if (saving) return; setSaving(true);
    try {
      const p = { ...editPart, quantity: safeNum(editPart.quantity), minimumQuantity: safeNum(editPart.minimumQuantity), unitPrice: safeNum(editPart.unitPrice) };
      await fetch(editPart.id ? `/api/spare-parts/${editPart.id}` : "/api/spare-parts", { method: editPart.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      setPartModal(false); loadData();
    } catch { alert("خطأ بالخادم"); } finally { setSaving(false); }
  };

  const delAPI = async (type: string, id: number) => { if(confirm("حذف نهائي؟")) { await fetch(`/api/${type}/${id}`, {method: "DELETE"}); loadData(); } };

  // --- Excel Prep ---
  const oilExcel = filteredOils.map(r => ({ "اللوحة": r.plateNumber, "التاريخ": r.changeDate, "العداد": r.kmAtChange, "الزيت": r.oilType, "فلتر زيت": r.filterChanged ? "نعم":"لا", "فلتر هواء": r.airFilterChanged ? "نعم":"لا", "فلتر وقود": r.fuelFilterChanged ? "نعم":"لا", "التغيير القادم": r.nextChangeKm, "التكلفة": r.cost, "الفني": r.technician, "ملاحظات": r.notes }));
  const partExcel = filteredParts.map(r => ({ "القطعة": r.partName, "رقم القطعة": r.partNumber, "الفئة": r.category, "الكمية": r.quantity, "الحد الأدنى": r.minimumQuantity, "السعر": r.unitPrice, "المورد": r.supplier, "الحالة": r.status === "available" ? "متوفر" : r.status === "low" ? "منخفض" : "نفذ", "الموقع": r.location }));

  return (
    <div className="w-full space-y-6" dir="rtl">
      
      {/* ── التبويبات العلوية المؤسسية ── */}
      <div className="flex gap-2 p-1.5 bg-white dark:bg-gray-900 rounded-2xl w-fit border border-gray-200 dark:border-gray-800 shadow-sm mx-auto sm:mx-0">
        <button onClick={() => setActiveTab("oils")} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "oils" ? "bg-blue-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-100 
