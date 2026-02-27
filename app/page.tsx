"use client"

import { I18nProvider } from "@/lib/i18n"
import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { ProductsSection } from "@/components/products-section"
import { AboutSection } from "@/components/about-section"
import { GallerySection } from "@/components/gallery-section"
import { ContactSection } from "@/components/contact-section"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <I18nProvider>
      <main>
        <Navbar />
        <HeroSection />
        {/* <ProductsSection /> */}
        <AboutSection />
        <GallerySection />
        <ContactSection />
        <Footer />
      </main>
    </I18nProvider>
  )
}
