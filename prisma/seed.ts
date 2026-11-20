import { PrismaClient, Role, ProjectStatus, TransactionType, PaymentMethod, TransactionStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Mintork Finance database (ARS)...')

  // 1. Admin User
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mintork.com' },
    update: {},
    create: {
      name: 'Administrador Mintork',
      email: 'admin@mintork.com',
      passwordHash,
      role: Role.ADMIN,
    },
  })

  // 2. Categories
  const categoriesData = [
    // Ingresos (INCOME)
    { name: 'Cobro de Proyecto', type: TransactionType.INCOME, color: '#10b981' },
    { name: 'Abono / Mantenimiento Mensual', type: TransactionType.INCOME, color: '#14b8a6' },
    { name: 'Consultoría y Desarrollo', type: TransactionType.INCOME, color: '#06b6d4' },
    { name: 'Otros Ingresos', type: TransactionType.INCOME, color: '#3b82f6' },
    // Gastos (EXPENSE)
    { name: 'Infraestructura / Cloud', type: TransactionType.EXPENSE, color: '#f59e0b' },
    { name: 'Sueldos y Honorarios', type: TransactionType.EXPENSE, color: '#ef4444' },
    { name: 'Licencias de Software', type: TransactionType.EXPENSE, color: '#8b5cf6' },
    { name: 'Marketing y Publicidad', type: TransactionType.EXPENSE, color: '#ec4899' },
    { name: 'Impuestos y Contabilidad', type: TransactionType.EXPENSE, color: '#6366f1' },
    { name: 'Gastos Operativos / Oficina', type: TransactionType.EXPENSE, color: '#64748b' },
  ]

  const categoryMap: Record<string, number> = {}
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: { type: cat.type, color: cat.color },
      create: cat,
    })
    categoryMap[cat.name] = created.id
  }

  // 2.5 Billing Config (Tarifa por persona inscripta)
  await prisma.billingConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      pricePerPlayer: 1300,
      autoSyncOnPlaying: true,
    },
  })

  // 3. Projects (asegurar los 4 schemas de torneos + proyectos existentes)
  const existingProjects = await prisma.project.findMany()
  let projects = existingProjects

  if (existingProjects.length === 0) {
    const initialProjects = [
      {
        name: 'Mintork Analytics',
        clientName: 'Producto Interno / SaaS',
        description: 'Plataforma BI y analítica empresarial.',
        status: ProjectStatus.ACTIVE,
        budget: 6000000,
        startDate: new Date('2026-05-01T00:00:00Z'),
      },
      {
        name: 'FlowEngine',
        clientName: 'Cliente Corporativo Sur',
        description: 'Automatización de flujos empresariales a medida.',
        status: ProjectStatus.COMPLETED,
        budget: 2800000,
        startDate: new Date('2026-03-01T00:00:00Z'),
        endDate: new Date('2026-09-30T00:00:00Z'),
      },
    ]

    for (const proj of initialProjects) {
      await prisma.project.create({ data: proj })
    }
  }

  const tournamentProjects = [
    {
      name: 'Copa Center Padel',
      aliases: ['Copa Center Padel', 'Center Padel'],
      clientName: 'Center Padel Club',
      description: 'Plataforma de gestión y torneos en la nube para Copa Center Padel.',
      status: ProjectStatus.ACTIVE,
      budget: 4500000,
      startDate: new Date('2026-06-01T00:00:00Z'),
      dbSchema: 'padel',
    },
    {
      name: 'Encuentro Padel Azul',
      aliases: ['Encuentro Padel Azul', 'Encuentro Padel'],
      clientName: 'Encuentro Padel',
      description: 'Sistema organizador de torneos y rankings para Encuentro Padel Azul.',
      status: ProjectStatus.ACTIVE,
      budget: 3200000,
      startDate: new Date('2026-07-15T00:00:00Z'),
      dbSchema: 'encuentro',
    },
    {
      name: 'La Pista Padel',
      aliases: ['La Pista Padel', 'La Pista'],
      clientName: 'La Pista Padel',
      description: 'Organizador de torneos y eventos para La Pista.',
      status: ProjectStatus.ACTIVE,
      budget: 2500000,
      startDate: new Date('2026-08-01T00:00:00Z'),
      dbSchema: 'lapista',
    },
    {
      name: 'BYB Padel',
      aliases: ['BYB Padel', 'ByB'],
      clientName: 'ByB Padel',
      description: 'Organizador de torneos y eventos para ByB.',
      status: ProjectStatus.ACTIVE,
      budget: 2500000,
      startDate: new Date('2026-08-01T00:00:00Z'),
      dbSchema: 'byb',
    },
  ]

  for (const tp of tournamentProjects) {
    const existing = await prisma.project.findFirst({
      where: {
        OR: [{ dbSchema: tp.dbSchema }, { name: { in: tp.aliases } }],
      },
    })
    if (existing) {
      if (!existing.dbSchema) {
        await prisma.project.update({
          where: { id: existing.id },
          data: { dbSchema: tp.dbSchema },
        })
      }
    } else {
      await prisma.project.create({
        data: {
          name: tp.name,
          clientName: tp.clientName,
          description: tp.description,
          status: tp.status,
          budget: tp.budget,
          startDate: tp.startDate,
          dbSchema: tp.dbSchema,
        },
      })
    }
  }

  projects = await prisma.project.findMany()

  const findProject = (name: string) => projects.find((p) => p.name === name)?.id ?? null

  // 4. Sample Transactions (only if empty)
  const txCount = await prisma.transaction.count()
  if (txCount === 0) {
    const now = new Date()
    const monthsAgo = (m: number, day: number) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, day))
      return d
    }

    const sampleTransactions = [
      // Hace 3 meses
      {
        type: TransactionType.INCOME,
        amount: 1850000,
        date: monthsAgo(3, 5),
        description: 'Anticipo desarrollo módulo principal FlowEngine',
        reference: 'FC-A-00012',
        paymentMethod: PaymentMethod.TRANSFER,
        status: TransactionStatus.PAID,
        projectId: findProject('FlowEngine'),
        categoryId: categoryMap['Cobro de Proyecto'],
        createdById: admin.id,
      },
      {
        type: TransactionType.EXPENSE,
        amount: 420000,
        date: monthsAgo(3, 12),
        description: 'Honorarios equipo desarrollo backend (Global)',
        reference: 'REC-0088',
        paymentMethod: PaymentMethod.TRANSFER,
        status: TransactionStatus.PAID,
        projectId: null,
        categoryId: categoryMap['Sueldos y Honorarios'],
        createdById: admin.id,
      },
      {
        type: TransactionType.EXPENSE,
        amount: 145000,
        date: monthsAgo(3, 18),
        description: 'Servidores AWS & Cloudflare generales empresa',
        reference: 'AWS-2026-08',
        paymentMethod: PaymentMethod.CARD,
        status: TransactionStatus.PAID,
        projectId: null,
        categoryId: categoryMap['Infraestructura / Cloud'],
        createdById: admin.id,
      },

      // Hace 2 meses
      {
        type: TransactionType.INCOME,
        amount: 1450000,
        date: monthsAgo(2, 4),
        description: 'Entrega final FlowEngine',
        reference: 'FC-A-00018',
        paymentMethod: PaymentMethod.TRANSFER,
        status: TransactionStatus.PAID,
        projectId: findProject('FlowEngine'),
        categoryId: categoryMap['Cobro de Proyecto'],
        createdById: admin.id,
      },
      {
        type: TransactionType.INCOME,
        amount: 950000,
        date: monthsAgo(2, 10),
        description: 'Hito 1 - Plataforma Copa Center Padel',
        reference: 'FC-B-00041',
        paymentMethod: PaymentMethod.TRANSFER,
        status: TransactionStatus.PAID,
        projectId: findProject('Copa Center Padel'),
        categoryId: categoryMap['Cobro de Proyecto'],
        createdById: admin.id,
      },
      {
        type: TransactionType.EXPENSE,
        amount: 580000,
        date: monthsAgo(2, 15),
        description: 'Sueldos y honorarios mensuales',
        reference: 'LIQ-2026-09',
        paymentMethod: PaymentMethod.TRANSFER,
        status: TransactionStatus.PAID,
        projectId: null,
        categoryId: categoryMap['Sueldos y Honorarios'],
        createdById: admin.id,
      },
      {
        type: TransactionType.EXPENSE,
        amount: 120000,
        date: monthsAgo(2, 20),
        description: 'Hosting dedicado y base de datos Copa Center Padel',
        reference: 'DO-9921',
        paymentMethod: PaymentMethod.CARD,
        status: TransactionStatus.PAID,
        projectId: findProject('Copa Center Padel'),
        categoryId: categoryMap['Infraestructura / Cloud'],
        createdById: admin.id,
      },

      // Hace 1 mes
      {
        type: TransactionType.INCOME,
        amount: 1100000,
        date: monthsAgo(1, 6),
        description: 'Implementación torneos Encuentro Padel Azul',
        reference: 'FC-B-00055',
        paymentMethod: PaymentMethod.TRANSFER,
        status: TransactionStatus.PAID,
        projectId: findProject('Encuentro Padel Azul'),
        categoryId: categoryMap['Cobro de Proyecto'],
        createdById: admin.id,
      },
      {
        type: TransactionType.INCOME,
        amount: 650000,
        date: monthsAgo(1, 12),
        description: 'Suscripciones SaaS Mintork Analytics',
        reference: 'MP-44210',
        paymentMethod: PaymentMethod.TRANSFER,
        status: TransactionStatus.PAID,
        projectId: findProject('Mintork Analytics'),
        categoryId: categoryMap['Abono / Mantenimiento Mensual'],
        createdById: admin.id,
      },
      {
        type: TransactionType.INCOME,
        amount: 450000,
        date: monthsAgo(1, 20),
        description: 'Consultoría técnica general a tercero',
        reference: 'FC-C-00011',
        paymentMethod: PaymentMethod.TRANSFER,
        status: TransactionStatus.PAID,
        projectId: null,
        categoryId: categoryMap['Consultoría y Desarrollo'],
        createdById: admin.id,
      },
      {
        type: TransactionType.EXPENSE,
        amount: 640000,
        date: monthsAgo(1, 14),
        description: 'Sueldos y honorarios mensuales',
        reference: 'LIQ-2026-10',
        paymentMethod: PaymentMethod.TRANSFER,
        status: TransactionStatus.PAID,
        projectId: null,
        categoryId: categoryMap['Sueldos y Honorarios'],
        createdById: admin.id,
      },
      {
        type: TransactionType.EXPENSE,
        amount: 195000,
        date: monthsAgo(1, 22),
        description: 'Estudio contable e impuestos mensuales (Global)',
        reference: 'EST-1022',
        paymentMethod: PaymentMethod.TRANSFER,
        status: TransactionStatus.PAID,
        projectId: null,
        categoryId: categoryMap['Impuestos y Contabilidad'],
        createdById: admin.id,
      },

      // Mes actual
      {
        type: TransactionType.INCOME,
        amount: 1250000,
        date: monthsAgo(0, 3),
        description: 'Abono mensual + mejoras Copa Center Padel',
        reference: 'FC-B-00067',
        paymentMethod: PaymentMethod.TRANSFER,
        status: TransactionStatus.PAID,
        projectId: findProject('Copa Center Padel'),
        categoryId: categoryMap['Abono / Mantenimiento Mensual'],
        createdById: admin.id,
      },
      {
        type: TransactionType.INCOME,
        amount: 780000,
        date: monthsAgo(0, 8),
        description: 'Suscripciones mensuales Mintork Analytics',
        reference: 'MP-51200',
        paymentMethod: PaymentMethod.TRANSFER,
        status: TransactionStatus.PAID,
        projectId: findProject('Mintork Analytics'),
        categoryId: categoryMap['Abono / Mantenimiento Mensual'],
        createdById: admin.id,
      },
      {
        type: TransactionType.INCOME,
        amount: 550000,
        date: monthsAgo(0, 14),
        description: 'Mantenimiento Encuentro Padel Azul (Pendiente cobro)',
        reference: 'FC-B-00070',
        paymentMethod: PaymentMethod.TRANSFER,
        status: TransactionStatus.PENDING,
        projectId: findProject('Encuentro Padel Azul'),
        categoryId: categoryMap['Abono / Mantenimiento Mensual'],
        createdById: admin.id,
      },
      {
        type: TransactionType.EXPENSE,
        amount: 185000,
        date: monthsAgo(0, 5),
        description: 'Infraestructura Cloud + Vercel + Resend (Global)',
        reference: 'CLOUD-1105',
        paymentMethod: PaymentMethod.CARD,
        status: TransactionStatus.PAID,
        projectId: null,
        categoryId: categoryMap['Infraestructura / Cloud'],
        createdById: admin.id,
      },
      {
        type: TransactionType.EXPENSE,
        amount: 210000,
        date: monthsAgo(0, 10),
        description: 'Campaña Meta Ads para Encuentro Padel Azul',
        reference: 'META-8831',
        paymentMethod: PaymentMethod.CARD,
        status: TransactionStatus.PAID,
        projectId: findProject('Encuentro Padel Azul'),
        categoryId: categoryMap['Marketing y Publicidad'],
        createdById: admin.id,
      },
      {
        type: TransactionType.EXPENSE,
        amount: 95000,
        date: monthsAgo(0, 12),
        description: 'Licencias herramientas IA y GitHub Copilot (Global)',
        reference: 'LIC-2026-11',
        paymentMethod: PaymentMethod.CARD,
        status: TransactionStatus.PAID,
        projectId: null,
        categoryId: categoryMap['Licencias de Software'],
        createdById: admin.id,
      },
      {
        type: TransactionType.EXPENSE,
        amount: 260000,
        date: monthsAgo(0, 15),
        description: 'Alquiler oficina y servicios (Pendiente pago)',
        reference: 'ALQ-1126',
        paymentMethod: PaymentMethod.TRANSFER,
        status: TransactionStatus.PENDING,
        projectId: null,
        categoryId: categoryMap['Gastos Operativos / Oficina'],
        createdById: admin.id,
      },
    ]

    await prisma.transaction.createMany({ data: sampleTransactions })
  }

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
