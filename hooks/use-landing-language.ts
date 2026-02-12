"use client";

import { useState, useEffect } from "react";
import { LANDING_LANG_MAP } from "@/lib/landing-language";

export const LANDING_LANGUAGE_CHANGE_EVENT = "soshogle:language-change";

export function useLandingLanguage(): string {
  const [lang, setLang] = useState<string>("English");

  useEffect(() => {
    const updateFromStorage = () => {
      const saved = localStorage.getItem("soshogle_language");
      const name = saved ? (LANDING_LANG_MAP[saved] ?? "English") : "English";
      setLang(name);
    };

    updateFromStorage();

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ code: string }>).detail;
      const name = detail?.code ? (LANDING_LANG_MAP[detail.code] ?? "English") : "English";
      setLang(name);
    };

    window.addEventListener(LANDING_LANGUAGE_CHANGE_EVENT, handler);
    return () => window.removeEventListener(LANDING_LANGUAGE_CHANGE_EVENT, handler);
  }, []);

  return lang;
}
