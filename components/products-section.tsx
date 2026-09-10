"use client"

import { BarChart3, Cloud, Shield, Workflow, Users, Code2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"
import type { LucideIcon } from "lucide-react"

interface ProductDef {
  icon: LucideIcon
  titleKey: string
  descKey: string
}

const productDefs: ProductDef[] = [
  { icon: Cloud, titleKey: "encuentroTitle", descKey: "encuentroDesc" },
  { icon: Cloud, titleKey: "cloudTitle", descKey: "cloudDesc" },
  { icon: Shield, titleKey: "securityTitle", descKey: "securityDesc" },
  { icon: Workflow, titleKey: "automationTitle", descKey: "automationDesc" },
  { icon: Users, titleKey: "collaborationTitle", descKey: "collaborationDesc" },
  { icon: Code2, titleKey: "devtoolsTitle", descKey: "devtoolsDesc" },
  { icon: BarChart3, titleKey: "analyticsTitle", descKey: "analyticsDesc" },

]

export function ProductsSection() {
  const { t } = useI18n()

  return (
    <section id="products" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            {t("products", "label")}
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            {t("products", "title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            {t("products", "description")}
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {productDefs.map((product) => (
            <Card
              key={product.titleKey}
              className="group border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card"
            >
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/20">
                  <product.icon className="h-6 w-6" />
                </div>
                <CardTitle className="mt-4 text-lg text-foreground">
                  {t("products", product.titleKey)}
                </CardTitle>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {t("products", product.descKey)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <button className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80">
                  {t("products", "learnMore")}
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    &rarr;
                  </span>
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
