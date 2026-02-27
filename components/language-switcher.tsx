"use client"

import { useI18n, type Locale } from "@/lib/i18n"

const languages: { code: Locale; label: string; flag: string }[] = [
  {
    code: "en",
    label: "English",
    flag: "/images/united-states.png",
  },
  {
    code: "es",
    label: "Espanol",
    flag: "/images/spain.png",
  },
]

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-secondary/50 p-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLocale(lang.code)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all ${
            locale === lang.code
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={`Switch language to ${lang.label}`}
          aria-pressed={locale === lang.code}
        >
          <span className="text-base leading-none" role="img" aria-hidden="true">
            <img src={lang.flag} alt={lang.label} className="w-4 h-4" />
          </span>
          <span className="hidden sm:inline">{lang.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  )
}
