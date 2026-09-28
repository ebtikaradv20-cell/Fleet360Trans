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
        <div className="bg-slate-900/70 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-white/10 flex flex-col justify-between min-h-[580px]">
          <div>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                  <ShieldCheck size={36} />
                </div>
              </div>

              <h1 className="text-3xl font-black text-white tracking-wider flex items-center justify-center gap-1">
                FLEET<span className="text-orange-500">360</span>
              </h1>
              <p className="text-blue-200/90 text-sm mt-1.5 font-medium">تطبيق إدارة الأسطول الشامل</p>
              <p className="text-orange-400 text-xs mt-1 font-bold tracking-wide">TRANSCAS / TAQA ARABIA</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-xs font-bold mb-2">اسم المستخدم</label>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 start-0 flex items-center ps-3.5 text-gray-400">
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 ps-10 pe-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-bold mb-2">كلمة المرور</label>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 start-0 flex items-center ps-3.5 text-gray-400">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 ps-10 pe-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-0 inset-y-0 flex items-center pe-3.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500/50 border-white/20 bg-black/20"
                  />
                  <span className="text-gray-300 font-semibold">تذكر بياناتي</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-orange-400 hover:text-orange-300 transition text-xs font-bold underline"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-orange-500/25 disabled:opacity-70 disabled:cursor-not-allowed bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 mt-4 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>جاري التحقق...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>تسجيل الدخول الآمن</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-center mt-8 pt-4 border-t border-white/10">
            <p className="text-gray-400 text-xs font-semibold flex items-center justify-center gap-1.5 tracking-wide">
              <Code2 size={14} className="text-orange-500" />
              <span>Developed by Eng. Omar Abd Elhalim</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
