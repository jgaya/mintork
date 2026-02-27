"use client"

import { useState } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import { useI18n } from "@/lib/i18n"

interface GalleryItemDef {
  src: string
  altKey: string
  titleKey: string
  categoryKey: string
}

const galleryDefs: GalleryItemDef[] = [
  {
    src: "/images/product-analytics.jpg",
    altKey: "analyticsAlt",
    titleKey: "analyticsTitle",
    categoryKey: "catAnalytics",
  },
  {
    src: "/images/product-copa.png",
    altKey: "cloudAlt",
    titleKey: "cloudTitle",
    categoryKey: "catInfrastructure",
  },
  {
    src: "/images/product-security.jpg",
    altKey: "securityAlt",
    titleKey: "securityTitle",
    categoryKey: "catSecurity",
  },
  {
    src: "/images/product-automation.jpg",
    altKey: "automationAlt",
    titleKey: "automationTitle",
    categoryKey: "catAutomation",
  },
  {
    src: "/images/product-collaboration.jpg",
    altKey: "collaborationAlt",
    titleKey: "collaborationTitle",
    categoryKey: "catCollaboration",
  },
  {
    src: "/images/product-devtools.jpg",
    altKey: "devtoolsAlt",
    titleKey: "devtoolsTitle",
    categoryKey: "catDevTools",
  },
]

export function GallerySection() {
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  const { t } = useI18n()

  // For gallery title reuse from products translations
  const titleFromProducts = (key: string) => t("products", key)

  return (
    <section id="gallery" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            {t("gallery", "label")}
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            {t("gallery", "title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            {t("gallery", "description")}
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {galleryDefs.map((item, index) => (
            <button
              key={item.src}
              onClick={() => setSelectedImage(index)}
              className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 transition-all duration-300 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={item.src}
                  alt={t("gallery", item.altKey)}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-background/0 transition-all duration-300 group-hover:bg-background/20" />
              </div>
              <div className="px-5 py-4 text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {t("gallery", item.categoryKey)}
                </span>
                <h3 className="mt-1 text-base font-semibold text-foreground">
                  {titleFromProducts(item.titleKey)}
                </h3>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedImage !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Viewing ${titleFromProducts(galleryDefs[selectedImage].titleKey)}`}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/80"
            aria-label="Close gallery viewer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative w-full max-w-5xl">
            <div className="relative aspect-video overflow-hidden rounded-xl border border-border">
              <Image
                src={galleryDefs[selectedImage].src}
                alt={t("gallery", galleryDefs[selectedImage].altKey)}
                fill
                className="object-cover"
              />
            </div>
            <div className="mt-4 text-center">
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                {t("gallery", galleryDefs[selectedImage].categoryKey)}
              </span>
              <h3 className="mt-1 text-xl font-bold text-foreground">
                {titleFromProducts(galleryDefs[selectedImage].titleKey)}
              </h3>
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() =>
                  setSelectedImage(
                    selectedImage > 0
                      ? selectedImage - 1
                      : galleryDefs.length - 1
                  )
                }
                className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
              >
                {t("gallery", "previous")}
              </button>
              <button
                onClick={() =>
                  setSelectedImage(
                    selectedImage < galleryDefs.length - 1
                      ? selectedImage + 1
                      : 0
                  )
                }
                className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
              >
                {t("gallery", "next")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
