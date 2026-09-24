"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/dashboard/vehicles");
        router.refresh();
      } else {
        setError(data.error || "فشل تسجيل الدخول، تأكد من البيانات.");
        setLoading(false);
      }
    } catch {
      setError("حدث خطأ في الاتصال بالخادم.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700 p-4">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">⚙️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fleet360</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">تطبيق إدارة الأسطول الشامل</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              placeholder="admin@fleet360.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50"
          >
            {loading ? "جاري تسجيل الدخول..." : "دخول النظام"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-400 border-t pt-4">
          Architected & Developed by <span className="font-bold text-blue-600">Omar Abd Elhalim</span>
        </div>
      </div>
    </div>
  );
}
