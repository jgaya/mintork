"use client"

import { useState } from "react"
import { Mail, MapPin, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/lib/i18n"

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false)
  const { t } = useI18n()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section id="contact" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            {t("contact", "label")}
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            {t("contact", "title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            {t("contact", "description")}
          </p>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-primary/30 bg-primary/5 p-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-foreground">
                  {t("contact", "thankYou")}
                </h3>
                <p className="mt-3 max-w-md text-muted-foreground leading-relaxed">
                  {t("contact", "thankYouMsg")}
                </p>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => setSubmitted(false)}
                >
                  {t("contact", "sendAnother")}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t("contact", "firstName")}</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      required
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t("contact", "lastName")}</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      required
                      className="bg-secondary/50"
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("contact", "workEmail")}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@company.com"
                      required
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">{t("contact", "company")}</Label>
                    <Input
                      id="company"
                      placeholder="Acme Inc."
                      className="bg-secondary/50"
                    />
                  </div>
                </div>

                {/* <div className="space-y-2">
                  <Label htmlFor="interest">{t("contact", "productInterest")}</Label>
                  <Select>
                    <SelectTrigger id="interest" className="bg-secondary/50">
                      <SelectValue placeholder={t("contact", "selectProduct")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analytics">Mintork Analytics</SelectItem>
                      <SelectItem value="cloudsync">CloudSync Pro</SelectItem>
                      <SelectItem value="securevault">SecureVault</SelectItem>
                      <SelectItem value="flowengine">FlowEngine</SelectItem>
                      <SelectItem value="teamhub">TeamHub</SelectItem>
                      <SelectItem value="devforge">DevForge</SelectItem>
                      <SelectItem value="general">{t("contact", "generalInquiry")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}

                <div className="space-y-2">
                  <Label htmlFor="message">{t("contact", "message")}</Label>
                  <Textarea
                    id="message"
                    placeholder={t("contact", "messagePlaceholder")}
                    rows={5}
                    required
                    className="bg-secondary/50 resize-none"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full text-base sm:w-auto">
                  {t("contact", "sendInquiry")}
                </Button>
              </form>
            )}
          </div>

          <div className="space-y-8 lg:col-span-2">
            <div className="rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-foreground">
                {t("contact", "getInTouch")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("contact", "getInTouchDesc")}
              </p>

              <div className="mt-6 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("contact", "email")}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      contact@mintorksoft.com
                    </p>
                  </div>
                </div>

                {/* <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("contact", "phone")}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      +1 (555) 234-5678
                    </p>
                  </div>
                </div> */}

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("contact", "office")}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Tandil, BA 7000
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-foreground">
                {t("contact", "enterpriseSupport")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("contact", "enterpriseSupportDesc")}{" "}
                <span className="text-primary">support@mintorksoft.com</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
