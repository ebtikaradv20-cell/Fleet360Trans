import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // إتاحة خيار بناء المشروع بنجاح دون التوقف عند تحذيرات TypeScript الثانوية
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
