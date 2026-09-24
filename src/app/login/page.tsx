"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto seed on first load & check remembered username
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
        
        // معالجة تذكر البيانات
        if (rememberMe) {
          localStorage.setItem("fleet_remembered_username", username);
        } else {
          localStorage.removeItem("fleet_remembered_username");
        }

        router.push("/dashboard");
      } else {
        setError(data.error || "بيانات الدخول غير صحيحة");
      }
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("لاسترجاع كلمة المرور، يرجى التواصل مع المسؤول الرئيسي (Admin) لإعادة ضبطها إلى القيمة الافتراضية.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" dir="rtl">
      {/* Background */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #1d4ed8 50%, #0284C7 100%)" }} />
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full" style={{ background: "#F97316", filter: "blur(80px)" }} />
        <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full" style={{ background: "#F97316", filter: "blur(60px)" }} />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
        backgroundSize: "50px 50px"
      }} />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img 
                src="/logo.png" 
                alt="Fleet360 Logo" 
                className="w-16 h-16 object-contain rounded-2xl shadow-md bg-white/20 p-1"
                onError={(e) => {
                  // Fallback if image path differs
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <h1 className="text-4xl font-black text-white tracking-wider">FLEET<span style={{ color: "#F97316" }}>360</span></h1>
            <p className="text-blue-200 text-sm mt-1">تطبيق إدارة الأسطول الشامل</p>
            <p className="text-blue-300 text-xs mt-1">TRANSCAS / TAQA ARABIA</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-blue-200 text-sm mb-2 font-medium">اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-blue-200 text-sm mb-2 font-medium">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm font-medium"
                required
              />
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between text-sm py-1">
              <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
                <span className="text-blue-200 font-medium">تذكر بياناتي</span>
              </label>

              <button
                onClick={handleForgotPassword}
                className="text-orange-300 hover:text-orange-400 transition text-xs font-semibold underline"
              >
                نسيت كلمة المرور؟
              </button>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 text-red-200 text-sm text-center">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 mt-4 disabled:opacity-70 shadow-lg"
              style={{ background: "linear-gradient(90deg, #F97316, #EA580C)" }}
            >
              {loading ? "جاري الدخول..." : "🚀 تسجيل الدخول"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
