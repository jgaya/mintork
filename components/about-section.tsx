"use client"

import { Zap, Globe, HeartHandshake, TrendingUp } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import type { LucideIcon } from "lucide-react"

interface ValueDef {
  icon: LucideIcon
  titleKey: string
  descKey: string
}

const valueDefs: ValueDef[] = [
  { icon: Zap, titleKey: "innovationTitle", descKey: "innovationDesc" },
  { icon: Globe, titleKey: "globalTitle", descKey: "globalDesc" },
  { icon: HeartHandshake, titleKey: "partnershipTitle", descKey: "partnershipDesc" },
  { icon: TrendingUp, titleKey: "resultsTitle", descKey: "resultsDesc" },
]

export function AboutSection() {
  const { t } = useI18n()

  return (
    <section id="about" className="border-y border-border/50 bg-secondary/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              {t("about", "label")}
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              {t("about", "title")}
            </h2>
            <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
              {t("about", "p1")}
            </p>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              {t("about", "p2")}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {valueDefs.map((item) => (
              <div
                key={item.titleKey}
                className="rounded-xl border border-border/50 bg-card/60 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-primary/20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {t("about", item.titleKey)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t("about", item.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
