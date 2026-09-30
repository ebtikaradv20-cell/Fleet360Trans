"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { User, Lock, Eye, EyeOff, LogIn, Loader2, AlertCircle, Code2 } from "lucide-react";

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
        body: JSON.stringify({ username, password }) 
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        if (rememberMe) localStorage.setItem("fleet_remembered_username", username);
        else localStorage.removeItem("fleet_remembered_username");
        router.push("/dashboard");
      } else { 
        setError(data.error || "بيانات غير صحيحة، يرجى المحاولة مرة أخرى."); 
      }
    } catch { 
      setError("خطأ في الاتصال بالخادم، يرجى التأكد من الشبكة."); 
    } finally { 
      setLoading(false); 
    }
  };

  // ✅ تعريف الدالة المفقودة التي تسببت في خطأ البناء
  const handleForgotPassword = (e: React.MouseEvent) => { 
    e.preventDefault(); 
    alert("لاسترجاع كلمة المرور، يرجى التواصل مع المسؤول الرئيسي (Admin) لإعادة ضبطها."); 
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#070e1d]" dir="rtl">
      
      {/* ── الخلفية بهوية TAQA Gas ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#040812] via-[#0b1528] to-[#040812]" />
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[55%] rounded-full bg-teal-500 blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[55%] rounded-full bg-orange-600 blur-[140px]" />
      </div>
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="relative z-10 w-full max-w-[420px] px-5 my-8">
        <div className="bg-[#0f172a]/90 backdrop-blur-3xl rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/5 flex flex-col justify-between min-h-[580px] relative overflow-hidden">
          
          {/* خط الإطار العلوي */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-teal-500 opacity-90" />

          <div>
            {/* اللوجو والعناوين */}
            <div className="flex flex-col items-center justify-center mb-10">
              <img 
                src="/logo.png" 
                alt="TAQA Gas Logo" 
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain -mb-6 drop-shadow-2xl transform hover:scale-105 transition-transform duration-500" 
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
              <h1 className="text-4xl font-black text-white tracking-tight leading-none z-10" dir="ltr">
                FLEET <span className="text-teal-400">360</span>
              </h1>
              <p className="text-gray-400 text-[11px] mt-1.5 font-medium z-10">تطبيق إدارة الأسطول الشامل</p>
              <p className="text-orange-500 text-[11px] mt-0.5 font-black tracking-widest uppercase z-10">Trans Gas / TAQA ARABIA</p>
            </div>

            {/* نموذج الدخول */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-gray-400 text-xs font-bold mb-1.5">اسم المستخدم</label>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-500"><User size={18} strokeWidth={2.5} /></span>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="أدخل اسم المستخدم" className="w-full bg-[#1e293b] border border-gray-700 rounded-xl py-3 ps-10 pe-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-bold" required />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-bold mb-1.5">كلمة المرور</label>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-500"><Lock size={18} strokeWidth={2.5} /></span>
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="أدخل كلمة المرور" className="w-full bg-[#1e293b] border border-gray-700 rounded-xl py-3 ps-10 pe-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-bold" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-0 inset-y-0 flex items-center pe-3 text-gray-500 hover:text-white transition-colors cursor-pointer">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded text-teal-500 focus:ring-teal-500 border-gray-600 bg-gray-800" />
                  <span className="text-gray-400 text-xs font-semibold group-hover:text-gray-200 transition-colors">تذكر بياناتي</span>
                </label>
                <button type="button" onClick={handleForgotPassword} className="text-orange-500 hover:text-orange-400 transition-colors text-xs font-bold">نسيت كلمة المرور؟</button>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs font-bold">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all shadow-lg disabled:opacity-70 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 mt-6 cursor-pointer">
                {loading ? <><Loader2 size={18} className="animate-spin" /><span>جاري التحقق...</span></> : <><LogIn size={18} /><span>تسجيل الدخول للنظام</span></>}
              </button>
            </form>
          </div>

          <div className="text-center mt-8 pt-5 border-t border-gray-800">
            <p className="text-gray-500 text-[10px] font-bold flex items-center justify-center gap-1.5 tracking-wide uppercase">
              <Code2 size={14} className="text-teal-600" />
              <span>Developed by Eng. Omar Abd Elhalim</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
