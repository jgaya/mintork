import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import {
  PrismaClient,
  Role,
  ProjectStatus,
  TransactionType,
  PaymentMethod,
  TransactionStatus,
} from '../generated/prisma/client'

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
})

async function main() {
  console.log('Seeding Mintork Finance database (histórico completo en ARS)...')

  // 1. Usuarios
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mintork.com' },
    update: {},
    create: {
      name: 'Administrador Mintork',
      email: 'admin@mintork.com',
      passwordHash: '$2b$10$nitfJy1pXDo.HNgr7a7RneyNfiSsvZJJVRjedTW6wx6m1QE.iOuty',
      role: Role.ADMIN,
    },
  })

  // 2. Configuración de facturación de torneos
  await prisma.billingConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      pricePerPlayer: 1300,
      autoSyncOnPlaying: false,
    },
  })

  // 3. Categorías (incluyendo "Cobro de Torneo")
  const categoriesData = [
    { name: 'Cobro de Proyecto', type: TransactionType.INCOME, color: '#10b981', isActive: true },
    { name: 'Abono / Mantenimiento Mensual', type: TransactionType.INCOME, color: '#14b8a6', isActive: true },
    { name: 'Consultoría y Desarrollo', type: TransactionType.INCOME, color: '#06b6d4', isActive: true },
    { name: 'Otros Ingresos', type: TransactionType.INCOME, color: '#3b82f6', isActive: true },
    { name: 'Cobro de Torneo', type: TransactionType.INCOME, color: '#6366f1', isActive: true },
    { name: 'Infraestructura / Cloud', type: TransactionType.EXPENSE, color: '#f59e0b', isActive: true },
    { name: 'Sueldos y Honorarios', type: TransactionType.EXPENSE, color: '#ef4444', isActive: true },
    { name: 'Licencias de Software', type: TransactionType.EXPENSE, color: '#8b5cf6', isActive: true },
    { name: 'Marketing y Publicidad', type: TransactionType.EXPENSE, color: '#ec4899', isActive: true },
    { name: 'Impuestos y Contabilidad', type: TransactionType.EXPENSE, color: '#6366f1', isActive: true },
    { name: 'Gastos Operativos / Oficina', type: TransactionType.EXPENSE, color: '#64748b', isActive: true },
  ]

  const categoryMap = new Map<string, number>()
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: { type: cat.type, color: cat.color, isActive: cat.isActive },
      create: cat,
    })
    categoryMap.set(cat.name, created.id)
  }

  // 4. Proyectos históricos (incluyendo vinculación a schemas MySQL)
  const projectsData = [
    {
      name: 'Copa Center Padel',
      clientName: 'Center Padel Club',
      description: 'Plataforma de gestión y torneos en la nube para Copa Center Padel.',
      status: ProjectStatus.ACTIVE,
      budget: 4500000,
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      endDate: null,
      dbSchema: 'padel',
      customPricePerPlayer: null,
    },
    {
      name: 'Encuentro Padel Azul',
      clientName: 'Encuentro Padel',
      description: 'Sistema organizador de torneos y rankings para Encuentro Padel Azul.',
      status: ProjectStatus.ACTIVE,
      budget: 3200000,
      startDate: new Date('2026-07-15T00:00:00.000Z'),
      endDate: null,
      dbSchema: 'encuentro',
      customPricePerPlayer: null,
    },
    {
      name: 'La Pista Padel',
      clientName: 'La Pista Padel',
      description: null,
      status: ProjectStatus.ACTIVE,
      budget: null,
      startDate: new Date('2026-11-19T12:00:00.000Z'),
      endDate: null,
      dbSchema: 'lapista',
      customPricePerPlayer: null,
    },
    {
      name: 'Meraki Gimnasio',
      clientName: 'Meraki Gimnasio',
      description: null,
      status: ProjectStatus.ACTIVE,
      budget: null,
      startDate: new Date('2026-11-19T12:00:00.000Z'),
      endDate: null,
      dbSchema: null,
      customPricePerPlayer: null,
    },
    {
      name: 'BYB Padel',
      clientName: null,
      description: null,
      status: ProjectStatus.ACTIVE,
      budget: null,
      startDate: new Date('2026-11-19T12:00:00.000Z'),
      endDate: null,
      dbSchema: 'byb',
      customPricePerPlayer: null,
    },
    {
      name: 'Padel.net.ar',
      clientName: null,
      description: null,
      status: ProjectStatus.ACTIVE,
      budget: null,
      startDate: new Date('2026-11-19T12:00:00.000Z'),
      endDate: null,
      dbSchema: null,
      customPricePerPlayer: null,
    },
    {
      name: 'TotalGym',
      clientName: null,
      description: null,
      status: ProjectStatus.ACTIVE,
      budget: null,
      startDate: new Date('2026-11-19T12:00:00.000Z'),
      endDate: null,
      dbSchema: null,
      customPricePerPlayer: null,
    },
  ]

  const projectMap = new Map<string, number>()
  for (const proj of projectsData) {
    const existing = await prisma.project.findFirst({
      where: proj.dbSchema
        ? { OR: [{ dbSchema: proj.dbSchema }, { name: proj.name }] }
        : { name: proj.name },
    })

    if (existing) {
      if (proj.dbSchema && !existing.dbSchema) {
        await prisma.project.update({
          where: { id: existing.id },
          data: { dbSchema: proj.dbSchema },
        })
      }
      projectMap.set(proj.name, existing.id)
    } else {
      const created = await prisma.project.create({ data: proj })
      projectMap.set(proj.name, created.id)
    }
  }

  // 5. Histórico completo de movimientos (52 registros)
  const historicalTransactions: Array<{
    type: TransactionType
    amount: number
    date: string
    description: string
    reference: string | null
    paymentMethod: PaymentMethod
    status: TransactionStatus
    projectName: string | null
    categoryName: string
  }> = [
    {
      type: TransactionType.EXPENSE,
      amount: 46980,
      date: '2025-12-06T12:00:00.000Z',
      description: 'Primeros 3 meses server',
      reference: null,
      paymentMethod: PaymentMethod.CARD,
      status: TransactionStatus.PAID,
      projectName: null,
      categoryName: 'Infraestructura / Cloud',
    },
    {
      type: TransactionType.EXPENSE,
      amount: 208800,
      date: '2026-03-09T12:00:00.000Z',
      description: 'Server 12 meses',
      reference: null,
      paymentMethod: PaymentMethod.CARD,
      status: TransactionStatus.PAID,
      projectName: null,
      categoryName: 'Infraestructura / Cloud',
    },
    {
      type: TransactionType.EXPENSE,
      amount: 51508,
      date: '2026-09-14T12:00:00.000Z',
      description: 'Upgrade a 8gb de Ram',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: null,
      categoryName: 'Infraestructura / Cloud',
    },
    {
      type: TransactionType.EXPENSE,
      amount: 8500,
      date: '2026-11-19T12:00:00.000Z',
      description: 'Registro de Dominio NIC.ar',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'TotalGym',
      categoryName: 'Licencias de Software',
    },
    {
      type: TransactionType.EXPENSE,
      amount: 8500,
      date: '2026-11-19T12:00:00.000Z',
      description: 'Registro de Dominio NIC.ar',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Padel.net.ar',
      categoryName: 'Licencias de Software',
    },
    {
      type: TransactionType.EXPENSE,
      amount: 8500,
      date: '2026-11-19T12:00:00.000Z',
      description: 'Registro de Dominio NIC.ar',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Meraki Gimnasio',
      categoryName: 'Licencias de Software',
    },
    {
      type: TransactionType.EXPENSE,
      amount: 8500,
      date: '2026-11-19T12:00:00.000Z',
      description: 'Registro de Dominio NIC.ar',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'La Pista Padel',
      categoryName: 'Licencias de Software',
    },
    {
      type: TransactionType.EXPENSE,
      amount: 8500,
      date: '2026-11-19T12:00:00.000Z',
      description: 'Registro de Dominio NIC.ar',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Encuentro Padel Azul',
      categoryName: 'Gastos Operativos / Oficina',
    },
    {
      type: TransactionType.EXPENSE,
      amount: 8500,
      date: '2026-11-19T12:00:00.000Z',
      description: 'Registro de Dominio NIC.ar',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Licencias de Software',
    },
    {
      type: TransactionType.EXPENSE,
      amount: 8500,
      date: '2026-11-19T12:00:00.000Z',
      description: 'Registro de Dominio NIC.ar Padeltresarroyos y se borraron',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: null,
      categoryName: 'Gastos Operativos / Oficina',
    },
    {
      type: TransactionType.EXPENSE,
      amount: 8500,
      date: '2026-11-19T12:00:00.000Z',
      description: 'Registro de Dominio NIC.ar Mintorksoft.com.ar',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: null,
      categoryName: 'Gastos Operativos / Oficina',
    },
    {
      type: TransactionType.EXPENSE,
      amount: 30000,
      date: '2026-01-15T12:00:00.000Z',
      description: 'Resend 1 mes para ampliar mails',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Infraestructura / Cloud',
    },
    {
      type: TransactionType.INCOME,
      amount: 156000,
      date: '2026-09-30T12:00:00.000Z',
      description: 'Torneo Semanal Sep-Oct',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Encuentro Padel Azul',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 161200,
      date: '2026-10-30T12:00:00.000Z',
      description: 'Torneo Semanal Oct-Nov',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Encuentro Padel Azul',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 161200,
      date: '2026-12-19T12:00:00.000Z',
      description: 'Torneo Semanal Nov-Dic (approx)',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PENDING,
      projectName: 'Encuentro Padel Azul',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 54000,
      date: '2026-03-25T12:00:00.000Z',
      description: 'Semanal Marzo',
      reference: null,
      paymentMethod: PaymentMethod.CASH,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 112000,
      date: '2026-04-11T12:00:00.000Z',
      description: 'Semanal Cab6 Dam6 Abril',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 130000,
      date: '2026-04-29T12:00:00.000Z',
      description: 'Semanal Cab5 Cab7 Abril',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 102000,
      date: '2026-05-13T12:00:00.000Z',
      description: 'Semanal Cab7+6 Cab5+4 Mayo',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 134000,
      date: '2026-05-29T12:00:00.000Z',
      description: 'Semanal Cab7 Cab6 Mayo',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 32000,
      date: '2026-06-24T12:00:00.000Z',
      description: 'Mixto Suma 12',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 42000,
      date: '2026-07-01T12:00:00.000Z',
      description: 'Semanal Cab5 Julio',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 42000,
      date: '2026-07-10T12:00:00.000Z',
      description: 'Semanal Cab6 Julio',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 50000,
      date: '2026-07-15T12:00:00.000Z',
      description: 'Semanal Cab7 Julio',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 28000,
      date: '2026-08-05T12:00:00.000Z',
      description: 'Semanal Cab5 Agosto',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 72000,
      date: '2026-08-07T12:00:00.000Z',
      description: 'Semanal Cab6 Dam6 Agosto',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Abono / Mantenimiento Mensual',
    },
    {
      type: TransactionType.INCOME,
      amount: 94000,
      date: '2026-09-01T12:00:00.000Z',
      description: 'Semanal Cab7 Dam7 Septiembre',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 86000,
      date: '2026-09-22T12:00:00.000Z',
      description: 'Semanal Cab6 Dam6 Septiembre',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 124000,
      date: '2026-11-24T12:00:00.000Z',
      description: 'Semanal Cab5 Cab7 Octubre',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PENDING,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 116000,
      date: '2026-11-24T12:00:00.000Z',
      description: 'Semanal Cab6 Dam7 Noviembre',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PENDING,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 102000,
      date: '2026-11-24T12:00:00.000Z',
      description: 'Semanal Cab7 Dam6 Nov',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PENDING,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 42000,
      date: '2026-12-24T12:00:00.000Z',
      description: 'Suma11 Dam Suma11 Cab (aprox)',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PENDING,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 294000,
      date: '2026-02-09T12:00:00.000Z',
      description: 'Pares Etapa 1',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 286000,
      date: '2026-02-23T12:00:00.000Z',
      description: 'Impares Etapa 1',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 330000,
      date: '2026-03-09T12:00:00.000Z',
      description: 'Pares Etapa 2',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 352000,
      date: '2026-03-24T12:00:00.000Z',
      description: 'Impares Etapa 2',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 332000,
      date: '2026-04-05T12:00:00.000Z',
      description: 'Pares Etapa 3',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 336000,
      date: '2026-04-27T12:00:00.000Z',
      description: 'Impares Etapa 3',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 336000,
      date: '2026-05-11T12:00:00.000Z',
      description: 'Pares Etapa 4',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 340000,
      date: '2026-05-24T12:00:00.000Z',
      description: 'Impares Etapa 4',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 342000,
      date: '2026-06-08T12:00:00.000Z',
      description: 'Pares Etapa 5',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 342000,
      date: '2026-06-22T12:00:00.000Z',
      description: 'Impares Etapa 5',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 316000,
      date: '2026-07-06T12:00:00.000Z',
      description: 'Pares Etapa 6',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 316000,
      date: '2026-07-27T12:00:00.000Z',
      description: 'Impares Etapa 6',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 274000,
      date: '2026-08-17T12:00:00.000Z',
      description: 'Pares Etapa 7',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 312000,
      date: '2026-08-30T12:00:00.000Z',
      description: 'Impares Etapa 7',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 254000,
      date: '2026-09-14T12:00:00.000Z',
      description: 'Pares Etapa 8',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 280000,
      date: '2026-09-28T12:00:00.000Z',
      description: 'Impares Etapa 8',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PAID,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 286000,
      date: '2026-11-24T12:00:00.000Z',
      description: 'Pares Etapa 9',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PENDING,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 304000,
      date: '2026-11-24T12:00:00.000Z',
      description: 'Impares Etapa 9',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PENDING,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 280000,
      date: '2026-11-24T12:00:00.000Z',
      description: 'Pares Etapa 10',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PENDING,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
    {
      type: TransactionType.INCOME,
      amount: 278000,
      date: '2026-11-24T12:00:00.000Z',
      description: 'Impares Etapa 10',
      reference: null,
      paymentMethod: PaymentMethod.TRANSFER,
      status: TransactionStatus.PENDING,
      projectName: 'Copa Center Padel',
      categoryName: 'Cobro de Torneo',
    },
  ]

  // Evitar duplicados si la DB ya tiene los registros cargados
  const existingRows = await prisma.transaction.findMany({
    include: {
      project: { select: { name: true } },
      category: { select: { name: true } },
    },
  })

  const makeKey = (item: {
    type: string
    amount: number | string
    date: Date | string
    description: string
    projectName: string | null
    categoryName: string
  }) => {
    const iso = (item.date instanceof Date ? item.date : new Date(item.date)).toISOString()
    return `${item.type}|${Number(item.amount)}|${iso}|${item.description}|${item.projectName ?? 'GLOBAL'}|${item.categoryName}`
  }

  const existingKeys = new Set(
    existingRows.map((r) =>
      makeKey({
        type: r.type,
        amount: Number(r.amount),
        date: r.date,
        description: r.description,
        projectName: r.project?.name ?? null,
        categoryName: r.category.name,
      })
    )
  )

  const toInsert = historicalTransactions
    .filter((tx) => !existingKeys.has(makeKey(tx)))
    .map((tx) => {
      const categoryId = categoryMap.get(tx.categoryName)
      if (!categoryId) {
        throw new Error(`Categoría faltante en seed: ${tx.categoryName}`)
      }
      const projectId = tx.projectName ? (projectMap.get(tx.projectName) ?? null) : null
      return {
        type: tx.type,
        amount: tx.amount,
        date: new Date(tx.date),
        description: tx.description,
        reference: tx.reference,
        paymentMethod: tx.paymentMethod,
        status: tx.status,
        projectId,
        categoryId,
        createdById: admin.id,
      }
    })

  if (toInsert.length > 0) {
    await prisma.transaction.createMany({ data: toInsert })
    console.log(`Insertados ${toInsert.length} movimientos históricos.`)
  } else {
    console.log('Todos los movimientos históricos ya existen en la DB (0 duplicados).')
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
