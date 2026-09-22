"use client";
import React from "react";
import { useApp } from "@/context/AppContext";

interface Props {
  size?: number;
  showText?: boolean;
  /** force a variant regardless of theme */
  variant?: "light" | "dark" | "auto";
}

export default function Fleet360Logo({ size = 40, showText = true, variant = "auto" }: Props) {
  const { darkMode } = useApp();

  /* In "auto" mode the car body colour flips with the theme so the logo
     stays readable on both dark and light backgrounds.
     light-mode sidebar → dark car body (#1E3A8A)
     dark-mode sidebar  → light car body (#93C5FD / white)          */
  const isDark = variant === "dark" || (variant === "auto" && darkMode);

  const carBody   = isDark ? "#93C5FD" : "#1E3A8A";
  const carRoof   = isDark ? "#BFDBFE" : "#1E40AF";
  const wheelRim  = isDark ? "#CBD5E1" : "#374151";
  const wheelHub  = isDark ? "#E2E8F0" : "#6B7280";
  const textColor = isDark ? "#FFFFFF" : "#1E3A8A";

  return (
    <div className="flex items-center gap-2 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer dashed circle – always orange */}
        <circle
          cx="50" cy="50" r="45"
          stroke="#F97316" strokeWidth="4" fill="none"
          strokeDasharray="200 50" strokeLinecap="round"
        />
        {/* Arrow tips */}
        <path d="M 88 35 L 95 28 L 88 21" stroke="#F97316" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M 12 65 L 5 72 L 12 79" stroke="#F97316" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round" fill="none"/>

        {/* Car body */}
        <rect x="20" y="48" width="60" height="22" rx="4" fill={carBody}/>
        <path d="M 30 48 L 38 35 L 62 35 L 70 48 Z" fill={carRoof}/>

        {/* Windows */}
        <path d="M 35 48 L 41 38 L 59 38 L 65 48 Z"
          fill={isDark ? "#1E3A8A" : "#93C5FD"} opacity="0.8"/>

        {/* Wheels */}
        <circle cx="32" cy="70" r="9" fill={wheelRim}/>
        <circle cx="32" cy="70" r="5" fill={wheelHub}/>
        <circle cx="68" cy="70" r="9" fill={wheelRim}/>
        <circle cx="68" cy="70" r="5" fill={wheelHub}/>

        {/* Speed lines – always orange */}
        <line x1="5"  y1="50" x2="18" y2="50" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="3"  y1="55" x2="16" y2="55" stroke="#F97316" strokeWidth="2"   strokeLinecap="round"/>
        <line x1="6"  y1="45" x2="17" y2="45" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>

      {showText && (
        <div>
          <div
            className="font-black text-xl tracking-wider leading-none"
            style={{ color: textColor }}
          >
            FLEET<span style={{ color: "#F97316" }}>360</span>
          </div>
          <div
            className="leading-none mt-0.5"
            style={{ fontSize: "9px", color: isDark ? "#94A3B8" : "#6B7280" }}
          >
            تطبيق إدارة الأسطول الشامل
          </div>
        </div>
      )}
    </div>
  );
}
