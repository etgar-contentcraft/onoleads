"use client";

/**
 * AdminLanguageContext — persists the admin UI language (he/en/ar) in localStorage.
 * Exposes `lang`, `setLang`, and `t()` translation function throughout the dashboard.
 */

import { createContext, useContext, useEffect, useState } from "react";
import { type AdminLang, type TranslationKey, createTranslator } from "@/lib/i18n/admin-translations";

const STORAGE_KEY = "onoleads_admin_lang";
const DEFAULT_LANG: AdminLang = "he";

interface AdminLanguageContextValue {
  lang: AdminLang;
  setLang: (lang: AdminLang) => void;
  /** Translate a UI key to the current admin language */
  t: (key: TranslationKey) => string;
  isRtl: boolean;
}

const AdminLanguageContext = createContext<AdminLanguageContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
  isRtl: true,
});

export function AdminLanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AdminLang>(DEFAULT_LANG);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AdminLang | null;
    if (stored && ["he", "en", "ar"].includes(stored)) {
      setLangState(stored);
    }
  }, []);

  const setLang = (next: AdminLang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const t = createTranslator(lang);
  const isRtl = lang === "he" || lang === "ar";

  return (
    <AdminLanguageContext.Provider value={{ lang, setLang, t, isRtl }}>
      {children}
    </AdminLanguageContext.Provider>
  );
}

export function useAdminLanguage() {
  return useContext(AdminLanguageContext);
}
