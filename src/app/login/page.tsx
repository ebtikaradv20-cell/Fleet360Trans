"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import Fleet360Logo from "@/components/Fleet360Logo";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto seed on first load
  useEffect(() => {
    fetch("/api/seed", { method: "POST" }).catch(() => {});
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
              <Fleet360Logo size5={64} showText={false} />
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
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ focusRingColor: "#F97316" } as React.CSSProperties}
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
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 text-red-200 text-sm text-center">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 mt-6 disabled:opacity-70"
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
