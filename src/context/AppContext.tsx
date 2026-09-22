"use client";
import React, {
  createContext, useContext, useState, useEffect, ReactNode,
} from "react";
import type { Language } from "@/lib/i18n";

interface User {
  userId?: number;
  id?: number;
  username: string;
  name: string;
  role: string;
  permissions: string[];
}

interface AppContextType {
  lang: Language;
  setLang: (l: Language) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  user: User | null;
  setUser: (u: User | null) => void;
  isRTL: boolean;
}

const AppContext = createContext<AppContextType>({
  lang: "ar",
  setLang: () => {},
  darkMode: false,
  toggleDarkMode: () => {},
  user: null,
  setUser: () => {},
  isRTL: true,
});

/** Apply dark class + dir to <html> immediately (no flash) */
function applyTheme(dark: boolean, lang: Language) {
  const root = document.documentElement;
  if (dark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.setAttribute("dir",  lang === "ar" ? "rtl" : "ltr");
  root.setAttribute("lang", lang);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("ar");
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  /* Read saved preferences once on mount */
  useEffect(() => {
    const savedLang = (localStorage.getItem("fleet360_lang") as Language) || "ar";
    const savedDark = localStorage.getItem("fleet360_dark") === "true";
    setLangState(savedLang);
    setDarkMode(savedDark);
    applyTheme(savedDark, savedLang);
    setMounted(true);
  }, []);

  /* Keep <html> in sync whenever lang or darkMode changes */
  useEffect(() => {
    if (mounted) applyTheme(darkMode, lang);
  }, [darkMode, lang, mounted]);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem("fleet360_lang", l);
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("fleet360_dark", String(next));
  };

  return (
    <AppContext.Provider
      value={{ lang, setLang, darkMode, toggleDarkMode, user, setUser, isRTL: lang === "ar" }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
