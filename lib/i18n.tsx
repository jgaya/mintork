"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export type Locale = "en" | "es"

type Translations = {
  [section: string]: {
    [key: string]: string | string[]
  }
}

const translations: Record<Locale, Translations> = {
  en: {
    nav: {
      products: "Products",
      about: "About",
      gallery: "Gallery",
      contact: "Contact",
      getStarted: "Get Started",
    },
    hero: {
      badge: "Enterprise Software Solutions",
      titleStart: "Build the Future with",
      titleHighlight: "Mintork Soft",
      description:
        "Empower your organization with cutting-edge software solutions. From analytics to security, we deliver enterprise-grade tools that scale with your ambitions.",
      contactSales: "Contact Us",
      viewProducts: "View Products",
      statClients: "Clients",
      statUptime: "Uptime",
      statApi: "API Calls / Day",
      statSupport: "Support",
    },
    products: {
      label: "Our Products",
      title: "Software That Drives Results",
      description:
        "A comprehensive suite of enterprise tools designed to transform every layer of your business operations.",
      learnMore: "Learn more",
      analyticsTitle: "Mintork Analytics",
      analyticsDesc:
        "Real-time data analytics and business intelligence platform with customizable dashboards and predictive insights.",
      cloudTitle: "Copa Center Padel",
      cloudDesc:
        "Unified cloud infrastructure management for multi-cloud environments with automated scaling and monitoring.",
      securityTitle: "SecureVault",
      securityDesc:
        "Enterprise-grade cybersecurity suite with AI-powered threat detection, compliance management, and zero-trust architecture.",
      automationTitle: "FlowEngine",
      automationDesc:
        "Visual workflow automation builder with 200+ integrations, enabling teams to streamline complex business processes.",
      collaborationTitle: "TeamHub",
      collaborationDesc:
        "All-in-one project management and collaboration platform with real-time communication and resource planning.",
      devtoolsTitle: "DevForge",
      devtoolsDesc:
        "Complete developer toolkit with API management, CI/CD pipelines, and integrated monitoring for modern engineering teams.",
    },
    about: {
      label: "About Mintork Soft",
      title: "Trusted by Industry Leaders Worldwide",
      p1: "Founded in 2018, Mintork Soft has grown from a small engineering team into a global provider of enterprise software solutions. We combine deep technical expertise with a relentless focus on usability to create tools that teams actually love using.",
      p2: "Our mission is simple: empower organizations with software that eliminates complexity and accelerates growth. From startups to Fortune 500 companies, we deliver results at every scale.",
      innovationTitle: "Innovation First",
      innovationDesc:
        "We push the boundaries of technology to deliver solutions that stay ahead of industry trends.",
      globalTitle: "Global Scale",
      globalDesc:
        "Infrastructure deployed across 30+ regions to serve enterprises wherever they operate.",
      partnershipTitle: "Client Partnership",
      partnershipDesc:
        "Every engagement is a partnership. We succeed when your business thrives.",
      resultsTitle: "Proven Results",
      resultsDesc:
        "Our clients see an average 40% improvement in operational efficiency within the first year.",
    },
    gallery: {
      label: "Product Gallery",
      title: "See Our Solutions in Action",
      description:
        "Explore screenshots of our enterprise software suite and discover how our products can transform your workflows.",
      previous: "Previous",
      next: "Next",
      analyticsAlt: "Mintork Analytics dashboard showing real-time data visualization",
      cloudAlt: "Copa Center Padel organizer showing cloud management interface",
      securityAlt: "SecureVault cybersecurity threat detection dashboard",
      automationAlt: "FlowEngine workflow automation visual builder",
      collaborationAlt: "TeamHub project management and collaboration interface",
      devtoolsAlt: "DevForge developer tools and API management platform",
      catAnalytics: "Analytics",
      catInfrastructure: "Sports Division",
      catSecurity: "Security",
      catAutomation: "Automation",
      catCollaboration: "Collaboration",
      catDevTools: "Developer Tools",
    },
    contact: {
      label: "Contact Us",
      title: "Let's Start a Conversation",
      description:
        "Ready to transform your business? Fill out the form below and our team will get back to you within 24 hours.",
      firstName: "First Name",
      lastName: "Last Name",
      workEmail: "Work Email",
      company: "Company",
      productInterest: "Product Interest",
      selectProduct: "Select a product",
      generalInquiry: "General Inquiry",
      message: "Message",
      messagePlaceholder: "Tell us about your project and requirements...",
      sendInquiry: "Send Inquiry",
      thankYou: "Thank You!",
      thankYouMsg:
        "Your inquiry has been received. A member of our team will reach out to you within 24 hours to discuss your needs.",
      sendAnother: "Send Another Message",
      getInTouch: "Get in Touch",
      getInTouchDesc:
        "Our sales and support teams are available around the clock to help you find the right solution.",
      email: "Email",
      phone: "Phone",
      office: "Office",
      enterpriseSupport: "Enterprise Support",
      enterpriseSupportDesc: "Already a customer? Access dedicated support through your enterprise portal or reach us at",
    },
    footer: {
      productsCategory: "Products",
      companyCategory: "Company",
      resourcesCategory: "Resources",
      legalCategory: "Legal",
      aboutUs: "About Us",
      careers: "Careers",
      blog: "Blog",
      press: "Press",
      documentation: "Documentation",
      apiReference: "API Reference",
      statusPage: "Status Page",
      community: "Community",
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service",
      security: "Security",
      compliance: "Compliance",
      tagline:
        "Enterprise software solutions that empower organizations to build, scale, and secure their digital infrastructure.",
      allRights: "All rights reserved.",
    },
  },
  es: {
    nav: {
      products: "Productos",
      about: "Nosotros",
      gallery: "Galeria",
      contact: "Contacto",
      getStarted: "Comenzar",
    },
    hero: {
      badge: "Soluciones de Software",
      titleStart: "Construye el Futuro con",
      titleHighlight: "Mintork Soft",
      description:
        "Potencia tu negocio con soluciones de software de vanguardia. Desde analitycs hasta seguridad, ofrecemos herramientas de nivel empresarial que escalan con tus ambiciones.",
      contactSales: "Contactenos",
      viewProducts: "Ver Productos",
      statClients: "Clientes",
      statUptime: "Disponibilidad",
      statApi: "Llamadas API / Dia",
      statSupport: "Soporte",
    },
    products: {
      label: "Nuestros Productos",
      title: "Software Que Impulsa Resultados",
      description:
        "Un conjunto integral de herramientas empresariales disenadas para transformar cada capa de sus operaciones comerciales.",
      learnMore: "Saber mas",
      analyticsTitle: "Mintork Analytics",
      analyticsDesc:
        "Plataforma de analitica de datos en tiempo real e inteligencia empresarial con paneles personalizables e informacion predictiva.",
      cloudTitle: "Copa Center Padel",
      cloudDesc:
        "Gestion unificada de infraestructura en la nube para entornos multi-nube con escalado automatico y monitoreo.",
      securityTitle: "SecureVault",
      securityDesc:
        "Suite de ciberseguridad de nivel empresarial con deteccion de amenazas impulsada por IA, gestion de cumplimiento y arquitectura de confianza cero.",
      automationTitle: "FlowEngine",
      automationDesc:
        "Constructor visual de automatizacion de flujos de trabajo con mas de 200 integraciones, permitiendo a los equipos optimizar procesos complejos.",
      collaborationTitle: "TeamHub",
      collaborationDesc:
        "Plataforma integral de gestion de proyectos y colaboracion con comunicacion en tiempo real y planificacion de recursos.",
      devtoolsTitle: "DevForge",
      devtoolsDesc:
        "Kit completo de herramientas para desarrolladores con gestion de API, pipelines CI/CD y monitoreo integrado para equipos de ingenieria modernos.",
    },
    about: {
      label: "Acerca de Mintork Soft",
      title: "Confianza de Lideres de la Industria en Todo el Mundo",
      p1: "Fundada en 2018, Mintork Soft ha crecido de un pequeno equipo de ingenieria a un proveedor global de soluciones de software empresarial. Combinamos una profunda experiencia tecnica con un enfoque implacable en la usabilidad para crear herramientas que los equipos realmente disfrutan usar.",
      p2: "Nuestra mision es simple: empoderar a las organizaciones con software que elimina la complejidad y acelera el crecimiento. Desde startups hasta empresas Fortune 500, entregamos resultados a cualquier escala.",
      innovationTitle: "Innovacion Primero",
      innovationDesc:
        "Empujamos los limites de la tecnologia para ofrecer soluciones que se mantienen a la vanguardia de las tendencias de la industria.",
      globalTitle: "Escala Global",
      globalDesc:
        "Infraestructura desplegada en mas de 30 regiones para servir a empresas donde sea que operen.",
      partnershipTitle: "Alianza con el Cliente",
      partnershipDesc:
        "Cada compromiso es una alianza. Tenemos exito cuando tu negocio prospera.",
      resultsTitle: "Resultados Comprobados",
      resultsDesc:
        "Nuestros clientes ven en promedio un 40% de mejora en la eficiencia operativa durante el primer año.",
    },
    gallery: {
      label: "Galeria de Productos",
      title: "Vea Nuestras Soluciones en Accion",
      description:
        "Explore capturas de pantalla de nuestra suite de software empresarial y descubra como nuestros productos pueden transformar sus flujos de trabajo.",
      previous: "Anterior",
      next: "Siguiente",
      analyticsAlt: "Panel de Mintork Analytics mostrando visualizacion de datos en tiempo real",
      cloudAlt: "Organizador de la Copa Center Padel mostrando gestion en la nube",
      securityAlt: "Panel de deteccion de amenazas de ciberseguridad SecureVault",
      automationAlt: "Constructor visual de automatizacion de flujos FlowEngine",
      collaborationAlt: "Interfaz de gestion de proyectos y colaboracion TeamHub",
      devtoolsAlt: "Plataforma de herramientas para desarrolladores y gestion de API DevForge",
      catAnalytics: "Analitica",
      catInfrastructure: "Division Deportiva",
      catSecurity: "Seguridad",
      catAutomation: "Automatizacion",
      catCollaboration: "Colaboracion",
      catDevTools: "Herramientas de Desarrollo",
    },
    contact: {
      label: "Contactenos",
      title: "Iniciemos una Conversacion",
      description:
        "Listo para transformar su negocio? Complete el formulario a continuacion y nuestro equipo se comunicara con usted dentro de las 24 horas.",
      firstName: "Nombre",
      lastName: "Apellido",
      workEmail: "Correo Corporativo",
      company: "Empresa",
      productInterest: "Producto de Interes",
      selectProduct: "Seleccionar un producto",
      generalInquiry: "Consulta General",
      message: "Mensaje",
      messagePlaceholder: "Cuentenos sobre su proyecto y requisitos...",
      sendInquiry: "Enviar Consulta",
      thankYou: "Gracias!",
      thankYouMsg:
        "Su consulta ha sido recibida. Un miembro de nuestro equipo se comunicara con usted dentro de las 24 horas para discutir sus necesidades.",
      sendAnother: "Enviar Otro Mensaje",
      getInTouch: "Ponte en Contacto",
      getInTouchDesc:
        "Nuestros equipos de ventas y soporte estan disponibles las 24 horas del dia para ayudarle a encontrar la solucion adecuada.",
      email: "Correo",
      phone: "Telefono",
      office: "Oficina",
      enterpriseSupport: "Soporte Empresarial",
      enterpriseSupportDesc: "Ya es cliente? Acceda al soporte dedicado a traves de su portal empresarial o contactenos en",
    },
    footer: {
      productsCategory: "Productos",
      companyCategory: "Empresa",
      resourcesCategory: "Recursos",
      legalCategory: "Legal",
      aboutUs: "Sobre Nosotros",
      careers: "Carreras",
      blog: "Blog",
      press: "Prensa",
      documentation: "Documentacion",
      apiReference: "Referencia de API",
      statusPage: "Estado del Servicio",
      community: "Comunidad",
      privacyPolicy: "Politica de Privacidad",
      termsOfService: "Terminos de Servicio",
      security: "Seguridad",
      compliance: "Cumplimiento",
      tagline:
        "Soluciones de software empresarial que empoderan a las organizaciones para construir, escalar y asegurar su infraestructura digital.",
      allRights: "Todos los derechos reservados.",
    },
  },
}

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (section: string, key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("es")

  const t = useCallback(
    (section: string, key: string): string => {
      const value = translations[locale]?.[section]?.[key]
      if (typeof value === "string") return value
      return key
    },
    [locale]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error("useI18n must be used within I18nProvider")
  return context
}
