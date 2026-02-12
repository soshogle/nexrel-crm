"use client";

import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { LANDING_LANGUAGE_CHANGE_EVENT } from "@/hooks/use-landing-language";

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
];

export function LanguageSwitcher() {
  const [language, setLanguage] = useState(languages[0]);

  useEffect(() => {
    const saved = localStorage.getItem("soshogle_language");
    const existing = languages.find((lang) => lang.code === saved);
    if (existing) {
      setLanguage(existing);
    }
  }, []);

  const changeLanguage = (langCode: string) => {
    const next = languages.find((lang) => lang.code === langCode) || languages[0];
    setLanguage(next);
    localStorage.setItem("soshogle_language", next.code);
    window.dispatchEvent(new CustomEvent(LANDING_LANGUAGE_CHANGE_EVENT, { detail: { code: next.code } }));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">
            {language.flag} {language.name}
          </span>
          <span className="sm:hidden">{language.flag}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`cursor-pointer ${language.code === lang.code ? "bg-accent" : ""}`}
          >
            <span className="mr-2 text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
