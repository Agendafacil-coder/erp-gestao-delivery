import React, { createContext, useContext, useState, type ReactNode } from "react";
import { translations, type TranslationSchema } from "../lib/i18n/translations";

type Locale = "pt-BR" | "en" | "es";

const LOCALE_KEY = "delivery_os_locale_default";
const LEGACY_KEY = "delivery_os_lang";

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "pt-BR";
  const saved =
    (localStorage.getItem(LOCALE_KEY) as Locale) ||
    (localStorage.getItem(LEGACY_KEY) as Locale);
  if (["pt-BR", "en", "es"].includes(saved)) return saved;
  return "pt-BR";
}

interface I18nCtx {
  locale: Locale;
  defaultLocale: Locale;
  setLocale: (lang: Locale) => void;
  t: <NS extends keyof TranslationSchema, K extends keyof TranslationSchema[NS]>(
    namespace: NS,
    key: K,
  ) => any;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const setLocale = (lang: Locale) => {
    setLocaleState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCALE_KEY, lang);
      localStorage.setItem(LEGACY_KEY, lang);
    }
  };

  const t = <NS extends keyof TranslationSchema, K extends keyof TranslationSchema[NS]>(
    namespace: NS,
    key: K,
  ): any => {
    const dict = translations[locale];
    const nsDict = dict[namespace];
    if (!nsDict) return String(key);
    return nsDict[key] || String(key);
  };

  return (
    <Ctx.Provider value={{ locale, defaultLocale: locale, setLocale, t }}>
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
