import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { translations, type TranslationSchema } from "../lib/i18n/translations";

type Locale = "pt-BR" | "en" | "es";

interface I18nCtx {
  locale: Locale;
  setLocale: (lang: Locale) => void;
  // Type-safe translation selector returning translation values
  t: <NS extends keyof TranslationSchema, K extends keyof TranslationSchema[NS]>(
    namespace: NS,
    key: K
  ) => any;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("delivery_os_lang") as Locale;
      if (["pt-BR", "en", "es"].includes(saved)) return saved;
    }
    return "pt-BR";
  });

  const setLocale = (lang: Locale) => {
    setLocaleState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("delivery_os_lang", lang);
    }
  };

  const t = <NS extends keyof TranslationSchema, K extends keyof TranslationSchema[NS]>(
    namespace: NS,
    key: K
  ): any => {
    const dict = translations[locale];
    const nsDict = dict[namespace];
    if (!nsDict) return String(key);
    return nsDict[key] || String(key);
  };

  return (
    <Ctx.Provider value={{ locale, setLocale, t }}>
      {children}
    </Ctx.Provider>
  );
}

export function useI18n() {
  const context = useContext(Ctx);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
