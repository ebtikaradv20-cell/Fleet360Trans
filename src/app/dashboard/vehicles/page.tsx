"use client";
import React, { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, Car, Filter, X, Calendar, Fuel, Building2, User, Gauge } from "lucide-react";
import ExportExcelButton from "@/components/ExportExcelButton";

interface Vehicle {
  id: number; plate_number: string; brand: string; model: string; year: number; department: string; driver_name: string; status: string; current_km: number; license_expiry?: string; fuel_type?: string; insurance_expiry?: string;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("الكل");
  const [selectedBrand, setSelectedBrand] = useState("الكل");
  const [selectedDept, setSelectedDept] = useState("الكل");
  const [selectedFuel, setSelectedFuel] = useState("الكل");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    plate_number: "", brand: "", model: "", year: new Date().getFullYear(), department: "", driver_name: "", status: "active", current_km: 0, license_expiry: "", fuel_type: "بنزين",
  });

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/vehicles");
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : (data.vehicles || []));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const uniqueStatuses = ["الكل", ...Array.from(new Set(vehicles.map(v => v.status || "active")))];
  const uniqueBrands = ["الكل", ...Array.from(new Set(vehicles.map(v => v.brand || "غير محدد")))];
  const uniqueDepts = ["الكل", ...Array.from(new Set(vehicles.map(v => v.department || "غير محدد")))];
  const uniqueFuels = ["الكل", ...Array.from(new Set(vehicles.map(v => v.fuel_type || "بنزين")))];

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = (v.plate_number || "").toLowerCase().includes(search.toLowerCase()) || (v.brand || "").toLowerCase().includes(search.toLowerCase()) || (v.department || "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (selectedStatus === "الكل" || v.status === selectedStatus) && (selectedBrand === "الكل" || v.brand === selectedBrand) && (selectedDept === "الكل" || v.department === selectedDept) && (selectedFuel 
