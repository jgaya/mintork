"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"

export function HeroSection() {
  const { t } = useI18n()

  const stats = [
    // { value: "500+", label: t("hero", "statClients") },
    { value: "99.9%", label: t("hero", "statUptime") },
    // { value: "50M+", label: t("hero", "statApi") },
    { value: "24/7", label: t("hero", "statSupport") },
  ]

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
      <Image
        src="/images/hero-bg.jpg"
        alt=""
        fill
        className="object-cover opacity-30"
        priority
      />
      <div className="absolute inset-0 bg-background/60" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {t("hero", "badge")}
        </div>

        <h1 className="mx-auto mt-8 max-w-4xl text-balance text-5xl font-bold leading-tight tracking-tight text-foreground md:text-7xl">
          {t("hero", "titleStart")}{" "}
          <span className="text-primary">{t("hero", "titleHighlight")}</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
          {t("hero", "description")}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild className="gap-2 text-base">
            <Link href="#contact">
              {t("hero", "contactSales")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          {/* <Button size="lg" variant="outline" asChild className="text-base">
            <Link href="#gallery">{t("hero", "viewProducts")}</Link>
          </Button> */}
        </div>

        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-8 md:grid-cols-2">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
