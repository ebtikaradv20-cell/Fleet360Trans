"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  Loader2, 
  AlertCircle, 
  ShieldCheck,
  Code2
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/seed", { method: "POST" }).catch(() => {});
    const savedUsername = localStorage.getItem("fleet_remembered_username");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        if (rememberMe) {
          localStorage.setItem("fleet_remembered_username", username);
        } else {
          localStorage.removeItem("fleet_remembered_username");
        }
        router.push("/dashboard");
      } else {
        setError(data.error || "بيانات الدخول غير صحيحة، يرجى المحاولة مرة أخرى.");
      }
    } catch {
      setError("خطأ في الاتصال بالخادم، يرجى التأكد من الشبكة.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("لاسترجاع كلمة المرور، يرجى التواصل مع المسؤول الرئيسي (Admin) لإعادة ضبطها.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900" dir="rtl">
      
      {/* ── الخلفية المؤسسية والتأثيرات ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />
      
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[55%] rounded-full bg-orange-600 blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[55%] rounded-full bg-blue-600 blur-[130px]" />
      </div>

      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} 
      />

      <div className="relative z-10 w-full max-w-md px-6 my-8">
        
        {/* ── كارت تسجيل الدخول الزجاجي المؤسسي ── */}
        <div className="bg-slate-900/70 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-white/10 flex flex-col justify-between min-h-[580px]">
          <div>
            
            {/* اللوجو والعنوان */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <img 
                  src="/logo.png" 
                  alt="Fleet360 Logo" 
                  className="w-28 h-28 object-contain filter drop-shadow-lg" 
                  onError={(e) => { 
                    // في حالة عدم وجود صورة اللوجو يظهر الأيقونة المؤسسية البديلة
                    (e.target as HTMLElement).style.display = 'none'; 
                    const fallback = document.getElementById('logo-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }} 
                />
                <div id="logo-fallback" className="hidden w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 items-center justify-center text-white shadow-lg shadow-orange-500/30">
                  <ShieldCheck size={36} />
                </div>
              </div>

              <h1 className="text-3xl font-black text-white tracking-wider flex items-center justify-center gap-1">
                FLEET<span className="text-orange-500">360</span>
              </h1>
              <p className="text-blue-200/90 text-sm mt-1.5 font-medium">تطبيق إدارة الأسطول الشامل</p>
              <p className="text-orange-400 text-xs mt-1 font-bold tracking-wide">TRANSCAS / TAQA ARABIA</p>
            </div>

            {/* نموذج تسجيل الدخول */}
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* اسم المستخدم */}
              <div>
                <label className="block text-gray-300 text-xs font-bold mb-2">اسم المستخدم</label>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 start-0 flex items-center ps-3.5 text-gray-400">
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 ps-10 pe-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              {/* كلمة المرور */}
              <div>
                <label className="block text-gray-300 
