"use client"

import Link from "next/link"
import Image from "next/image"

import { useI18n } from "@/lib/i18n"

export function Footer() {
  const { t } = useI18n()

  const footerLinks = {
    [t("footer", "productsCategory")]: [
      { label: "Mintork Analytics", href: "#products" },
      { label: "CloudSync Pro", href: "#products" },
      { label: "SecureVault", href: "#products" },
      { label: "FlowEngine", href: "#products" },
      { label: "TeamHub", href: "#products" },
      { label: "DevForge", href: "#products" },
    ],
    [t("footer", "companyCategory")]: [
      { label: t("footer", "aboutUs"), href: "#about" },
      { label: t("footer", "careers"), href: "#" },
      { label: t("footer", "blog"), href: "#" },
      { label: t("footer", "press"), href: "#" },
    ],
    [t("footer", "resourcesCategory")]: [
      { label: t("footer", "documentation"), href: "#" },
      { label: t("footer", "apiReference"), href: "#" },
      { label: t("footer", "statusPage"), href: "#" },
      { label: t("footer", "community"), href: "#" },
    ],
    [t("footer", "legalCategory")]: [
      { label: t("footer", "privacyPolicy"), href: "#" },
      { label: t("footer", "termsOfService"), href: "#" },
      { label: t("footer", "security"), href: "#" },
      { label: t("footer", "compliance"), href: "#" },
    ],
  }

  return (
    <footer className="border-t border-border/50 bg-secondary/20">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid md:grid-cols-1 lg:grid-cols-1">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.jpg"
                alt="Mintork Soft"
                width={532}
                height={178}
                className="h-9 w-auto"
                priority
              />
            </Link>

          </div>
            <p className="mt-4  text-sm leading-relaxed text-muted-foreground"> 
              {/* max-w-sm */}
              {t("footer", "tagline")}
            </p>
          {/* {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-foreground">
                {category}
              </h4>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))} */}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Mintork Soft. {t("footer", "allRights")}
          </p>
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground/70 transition-colors hover:text-primary"
          >
            Panel Administrativo
          </Link>
        </div>
      </div>
    </footer>
  )
}
