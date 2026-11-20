'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'
import { formatARS } from '@/lib/format'
import type {
  BillingConfigDTO,
  ExternalEventoState,
  ExternalEventoSyncRow,
  SchemaSyncStatusDTO,
  TournamentSyncDashboardDTO,
} from '@/lib/types'

const SCHEMA_NAME_REGEX = /^[a-zA-Z0-9_]+$/

function isValidSchemaName(schema: string): boolean {
  return SCHEMA_NAME_REGEX.test(schema)
}

function toStringDate(val: unknown): string {
  if (!val) return ''
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? '' : val.toISOString().split('T')[0]
  }
  return String(val)
}

function parseDateValue(val: unknown): Date | null {
  if (!val) return null
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? null : val
  }
  const str = String(val).trim()
  if (!str) return null
  const parsed = new Date(str)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Replica la lógica de estado de `encuentro/src/utils/eventos.ts`:
 * ABIERTO -> CERRADO -> JUGANDOSE (cuando hoy > inicio) -> FINALIZADO (cuando hoy > fin + 1 día o finalizado = 1)
 */
function computeEventoState(
  openVal: unknown,
  finalizadoVal: unknown,
  inicioVal: unknown,
  finVal: unknown
): ExternalEventoState {
  if (Boolean(Number(finalizadoVal))) {
    return 'FINALIZADO'
  }

  const now = new Date()
  const finDate = parseDateValue(finVal)
  if (finDate) {
    const finMasUnDia = new Date(finDate.getTime())
    finMasUnDia.setDate(finMasUnDia.getDate() + 1)
    if (now > finMasUnDia) {
      return 'FINALIZADO'
    }
  }

  const inicioDate = parseDateValue(inicioVal)
  if (inicioDate && now > inicioDate) {
    return 'JUGANDOSE'
  }

  if (!Boolean(Number(openVal))) {
    return 'CERRADO'
  }

  return 'ABIERTO'
}

interface SchemaInspection {
  available: boolean
  error: string | null
  openExpr: string
  finExpr: string
  pagoExpr: string
}

async function inspectExternalSchema(schema: string): Promise<SchemaInspection> {
  if (!isValidSchemaName(schema)) {
    return {
      available: false,
      error: 'Nombre de schema inválido',
      openExpr: '1',
      finExpr: '0',
      pagoExpr: '0',
    }
  }

  try {
    const cols = await prisma.$queryRaw<Array<{ TABLE_NAME: string; COLUMN_NAME: string }>>`
      SELECT TABLE_NAME, COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ${schema}
        AND TABLE_NAME IN ('Evento', 'Torneo', 'Pareja')
    `

    const tableCols = new Map<string, Set<string>>()
    for (const row of cols) {
      if (!tableCols.has(row.TABLE_NAME)) {
        tableCols.set(row.TABLE_NAME, new Set())
      }
      tableCols.get(row.TABLE_NAME)!.add(row.COLUMN_NAME)
    }

    const eventoCols = tableCols.get('Evento')
    const torneoCols = tableCols.get('Torneo')
    const parejaCols = tableCols.get('Pareja')

    if (!eventoCols || !torneoCols || !parejaCols) {
      return {
        available: false,
        error: `Schema "${schema}" no encontrado o sin tablas Evento/Torneo/Pareja en este MySQL`,
        openExpr: '1',
        finExpr: '0',
        pagoExpr: '0',
      }
    }

    const openExpr = eventoCols.has('open')
      ? 'e.open'
      : eventoCols.has('isOpen')
        ? 'e.isOpen'
        : '1'

    const finExpr = eventoCols.has('finalizado')
      ? 'e.finalizado'
      : eventoCols.has('isFinished')
        ? 'e.isFinished'
        : '0'

    const pagoExpr = eventoCols.has('pago') ? 'e.pago' : '0'

  return {
    available: true,
    error: null,
    openExpr,
    finExpr,
    pagoExpr,
  }
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : 'Error consultando schema en MySQL',
      openExpr: '1',
      finExpr: '0',
      pagoExpr: '0',
    }
  }
}

async function detectTournamentMySQLSchemas(): Promise<string[]> {
  try {
    const rows = await prisma.$queryRaw<Array<{ TABLE_SCHEMA: string }>>`
      SELECT TABLE_SCHEMA
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys', 'mintork_finance')
        AND TABLE_NAME IN ('Evento', 'Torneo', 'Pareja')
      GROUP BY TABLE_SCHEMA
      HAVING COUNT(DISTINCT TABLE_NAME) = 3
      ORDER BY TABLE_SCHEMA ASC
    `
    return rows.map((r) => r.TABLE_SCHEMA)
  } catch {
    return []
  }
}

interface RawExternalEventoRow {
  eventoId: bigint | number
  nombre: string
  inicio: Date | string
  fin: Date | string
  openVal: number | boolean | bigint
  finalizadoVal: number | boolean | bigint
  pagoVal: number | boolean | bigint
  torneosCount: bigint | number
  parejasInscriptas: bigint | number
  parejasSuplentes: bigint | number
}

async function fetchExternalEventos(
  schema: string,
  layout: SchemaInspection,
  onlyEventoId?: number
): Promise<RawExternalEventoRow[]> {
  const filterClause = onlyEventoId ? `AND e.id = ${Number(onlyEventoId)}` : ''

  const sql = `
    SELECT
      e.id AS eventoId,
      e.nombre AS nombre,
      e.inicio AS inicio,
      e.fin AS fin,
      ${layout.openExpr} AS openVal,
      ${layout.finExpr} AS finalizadoVal,
      ${layout.pagoExpr} AS pagoVal,
      COUNT(DISTINCT t.id) AS torneosCount,
      COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.deletedAt IS NULL AND p.suplente = 0 THEN p.id END) AS parejasInscriptas,
      COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.deletedAt IS NULL AND p.suplente = 1 THEN p.id END) AS parejasSuplentes
    FROM \`${schema}\`.\`Evento\` e
    LEFT JOIN \`${schema}\`.\`Torneo\` t
      ON t.eventoId = e.id AND t.deletedAt IS NULL
    LEFT JOIN \`${schema}\`.\`Pareja\` p
      ON p.torneoId = t.id AND p.deletedAt IS NULL
    WHERE e.deletedAt IS NULL
      ${filterClause}
    GROUP BY e.id, e.nombre, e.inicio, e.fin, ${layout.openExpr}, ${layout.finExpr}, ${layout.pagoExpr}
    ORDER BY e.id DESC
  `

  return prisma.$queryRawUnsafe<RawExternalEventoRow[]>(sql)
}

async function ensureBillingConfig() {
  return prisma.billingConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      pricePerPlayer: 1300,
      autoSyncOnPlaying: true,
    },
  })
}

async function ensureIncomeCategoryId(): Promise<number> {
  const torneoCat = await prisma.category.findFirst({
    where: { name: 'Cobro de Torneo', type: 'INCOME' },
  })
  if (torneoCat) return torneoCat.id

  const existing = await prisma.category.findFirst({
    where: { name: 'Cobro de Proyecto', type: 'INCOME' },
  })
  if (existing) return existing.id

  const anyIncome = await prisma.category.findFirst({
    where: { type: 'INCOME', isActive: true },
  })
  if (anyIncome) return anyIncome.id

  const created = await prisma.category.create({
    data: {
      name: 'Cobro de Torneo',
      type: 'INCOME',
      color: '#6366f1',
      isActive: true,
    },
  })
  return created.id
}

function buildTournamentTxDescription(
  eventoNombre: string,
  parejasInscriptas: number,
  personasInscriptas: number,
  pricePerPlayer: number
): string {
  return `Cobro Torneo "${eventoNombre}" — ${parejasInscriptas} parejas (${personasInscriptas} pers. × ${formatARS(pricePerPlayer)})`
}

/**
 * Sincroniza automáticamente en estado PENDING los eventos que ya pasaron a "Jugándose" (o "Finalizado")
 * en los schemas configurados. Usado tanto desde el dashboard como desde el endpoint de cron.
 */
export async function syncPlayingEventsInternal(options?: {
  respectAutoFlag?: boolean
  createdById?: number | null
}): Promise<TournamentSyncDashboardDTO> {
  const configRow = await ensureBillingConfig()
  const config: BillingConfigDTO = {
    pricePerPlayer: Number(configRow.pricePerPlayer),
    autoSyncOnPlaying: configRow.autoSyncOnPlaying,
    updatedAt: configRow.updatedAt.toISOString(),
  }

  const shouldCreateAuto = options?.respectAutoFlag ? config.autoSyncOnPlaying : true

  const [allProjectsRaw, detectedMySQLSchemas] = await Promise.all([
    prisma.project.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: { id: true, name: true, dbSchema: true, customPricePerPlayer: true },
      orderBy: { name: 'asc' },
    }),
    detectTournamentMySQLSchemas(),
  ])

  const linkedProjects = await prisma.project.findMany({
    where: {
      dbSchema: { not: null },
      status: { not: 'CANCELLED' },
    },
    orderBy: { id: 'asc' },
  })

  const existingTransactions = await prisma.transaction.findMany({
    where: {
      externalKey: { not: null },
    },
  })

  const txByExternalKey = new Map(
    existingTransactions
      .filter((t) => t.externalKey !== null)
      .map((t) => [t.externalKey!, t])
  )

  const incomeCategoryId = await ensureIncomeCategoryId()

  const schemas: SchemaSyncStatusDTO[] = []
  const events: ExternalEventoSyncRow[] = []
  let autoCreatedCount = 0

  for (const project of linkedProjects) {
    const dbSchema = project.dbSchema!
    const customPrice =
      project.customPricePerPlayer !== null ? Number(project.customPricePerPlayer) : null
    const effectivePrice = customPrice ?? config.pricePerPlayer

    const layout = await inspectExternalSchema(dbSchema)
    if (!layout.available) {
      schemas.push({
        projectId: project.id,
        projectName: project.name,
        dbSchema,
        customPricePerPlayer: customPrice,
        effectivePricePerPlayer: effectivePrice,
        availableInMySQL: false,
        error: layout.error,
        totalEventos: 0,
        playingOrFinishedEventos: 0,
        pendingAmount: 0,
        paidAmount: 0,
      })
      continue
    }

    let rawRows: RawExternalEventoRow[] = []
    try {
      rawRows = await fetchExternalEventos(dbSchema, layout)
    } catch (err) {
      schemas.push({
        projectId: project.id,
        projectName: project.name,
        dbSchema,
        customPricePerPlayer: customPrice,
        effectivePricePerPlayer: effectivePrice,
        availableInMySQL: false,
        error: err instanceof Error ? err.message : 'Error leyendo eventos',
        totalEventos: 0,
        playingOrFinishedEventos: 0,
        pendingAmount: 0,
        paidAmount: 0,
      })
      continue
    }

    let playingOrFinishedEventos = 0
    let pendingAmount = 0
    let paidAmount = 0

    for (const row of rawRows) {
      const eventoId = Number(row.eventoId)
      const parejasInscriptas = Number(row.parejasInscriptas)
      const parejasSuplentes = Number(row.parejasSuplentes)
      const torneosCount = Number(row.torneosCount)
      const personasInscriptas = parejasInscriptas * 2
      const calculatedAmount = personasInscriptas * effectivePrice
      const state = computeEventoState(row.openVal, row.finalizadoVal, row.inicio, row.fin)
      const isPlayingOrFinished = state === 'JUGANDOSE' || state === 'FINALIZADO'

      if (isPlayingOrFinished) {
        playingOrFinishedEventos += 1
      }

      const externalKey = `${dbSchema}:evento:${eventoId}`
      let linkedTx = txByExternalKey.get(externalKey) ?? null

      // Auto-crear Entrada en estado PENDING cuando el evento pasa a Jugándose (o Finalizado)
      if (!linkedTx && shouldCreateAuto && isPlayingOrFinished && parejasInscriptas > 0) {
        try {
          linkedTx = await prisma.transaction.create({
            data: {
              type: 'INCOME',
              amount: calculatedAmount,
              date: new Date(),
              description: buildTournamentTxDescription(
                row.nombre,
                parejasInscriptas,
                personasInscriptas,
                effectivePrice
              ),
              reference: `${dbSchema.toUpperCase()}-EV-${eventoId}`,
              paymentMethod: 'TRANSFER',
              status: 'PENDING',
              projectId: project.id,
              categoryId: incomeCategoryId,
              createdById: options?.createdById ?? null,
              externalKey,
              pairsCount: parejasInscriptas,
              playersCount: personasInscriptas,
            },
          })
          txByExternalKey.set(externalKey, linkedTx)
          autoCreatedCount += 1
        } catch (err) {
          // Si otra ejecución paralela lo creó recién (P2002), lo leemos de la DB
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ) {
            linkedTx = await prisma.transaction.findUnique({ where: { externalKey } })
            if (linkedTx) txByExternalKey.set(externalKey, linkedTx)
          }
        }
      }

      if (linkedTx) {
        const txAmt = Number(linkedTx.amount)
        if (linkedTx.status === 'PENDING') pendingAmount += txAmt
        else if (linkedTx.status === 'PAID') paidAmount += txAmt
      }

      events.push({
        externalKey,
        projectId: project.id,
        projectName: project.name,
        dbSchema,
        eventoId,
        nombre: row.nombre,
        inicio: toStringDate(row.inicio),
        fin: toStringDate(row.fin),
        state,
        torneosCount,
        parejasInscriptas,
        parejasSuplentes,
        personasInscriptas,
        appliedPricePerPlayer: effectivePrice,
        calculatedAmount,
        externalPago: Boolean(Number(row.pagoVal)),
        transaction: linkedTx
          ? {
              id: linkedTx.id,
              amount: Number(linkedTx.amount),
              status: linkedTx.status,
              pairsCount: linkedTx.pairsCount,
              playersCount: linkedTx.playersCount,
              date: linkedTx.date.toISOString(),
            }
          : null,
      })
    }

    schemas.push({
      projectId: project.id,
      projectName: project.name,
      dbSchema,
      customPricePerPlayer: customPrice,
      effectivePricePerPlayer: effectivePrice,
      availableInMySQL: true,
      error: null,
      totalEventos: rawRows.length,
      playingOrFinishedEventos,
      pendingAmount,
      paidAmount,
    })
  }

  return {
    config,
    schemas,
    events,
    autoCreatedCount,
    allProjects: allProjectsRaw.map((p) => ({
      id: p.id,
      name: p.name,
      dbSchema: p.dbSchema,
      customPricePerPlayer:
        p.customPricePerPlayer !== null ? Number(p.customPricePerPlayer) : null,
    })),
    detectedMySQLSchemas,
  }
}

export async function getTournamentSyncDashboard(
  runAutoSync = true
): Promise<TournamentSyncDashboardDTO> {
  const session = await requireApiAuth()
  const result = await syncPlayingEventsInternal({
    respectAutoFlag: !runAutoSync,
    createdById: session.userId,
  })
  return result
}

const updateConfigSchema = z.object({
  pricePerPlayer: z.number().positive('El monto por persona debe ser mayor a 0'),
  autoSyncOnPlaying: z.boolean(),
})

export async function updateBillingConfigAction(input: {
  pricePerPlayer: number
  autoSyncOnPlaying: boolean
}) {
  const session = await requireApiAuth()
  if (session.role === 'VIEWER') {
    return { success: false, error: 'No tienes permisos para modificar la tarifa.' }
  }

  const parsed = updateConfigSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Datos de configuración inválidos',
    }
  }

  await prisma.billingConfig.upsert({
    where: { id: 1 },
    update: {
      pricePerPlayer: parsed.data.pricePerPlayer,
      autoSyncOnPlaying: parsed.data.autoSyncOnPlaying,
    },
    create: {
      id: 1,
      pricePerPlayer: parsed.data.pricePerPlayer,
      autoSyncOnPlaying: parsed.data.autoSyncOnPlaying,
    },
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function syncOrRecalculateEventAction(input: {
  projectId: number
  eventoId: number
}) {
  const session = await requireApiAuth()
  if (session.role === 'VIEWER') {
    return { success: false, error: 'No tienes permisos para generar o recalcular cobros.' }
  }

  const project = await prisma.project.findUnique({ where: { id: input.projectId } })
  if (!project || !project.dbSchema) {
    return { success: false, error: 'El proyecto no tiene un schema MySQL vinculado.' }
  }

  const layout = await inspectExternalSchema(project.dbSchema)
  if (!layout.available) {
    return { success: false, error: layout.error ?? 'Schema no disponible en MySQL.' }
  }

  const rows = await fetchExternalEventos(project.dbSchema, layout, input.eventoId)
  const row = rows[0]
  if (!row) {
    return { success: false, error: 'No se encontró el evento en el schema.' }
  }

  const parejasInscriptas = Number(row.parejasInscriptas)
  const personasInscriptas = parejasInscriptas * 2
  if (parejasInscriptas <= 0) {
    return {
      success: false,
      error: 'El evento tiene 0 parejas inscriptas activas; no se puede generar un cobro por $0.',
    }
  }

  const configRow = await ensureBillingConfig()
  const effectivePrice =
    project.customPricePerPlayer !== null
      ? Number(project.customPricePerPlayer)
      : Number(configRow.pricePerPlayer)
  const calculatedAmount = personasInscriptas * effectivePrice
  const externalKey = `${project.dbSchema}:evento:${input.eventoId}`

  const existingTx = await prisma.transaction.findUnique({ where: { externalKey } })

  if (existingTx) {
    if (existingTx.status === 'PAID') {
      return {
        success: false,
        error: 'Este cobro ya figura como Cobrado/Pagado y no se sobreescribe automáticamente.',
      }
    }

    await prisma.transaction.update({
      where: { id: existingTx.id },
      data: {
        amount: calculatedAmount,
        pairsCount: parejasInscriptas,
        playersCount: personasInscriptas,
        description: buildTournamentTxDescription(
          row.nombre,
          parejasInscriptas,
          personasInscriptas,
          effectivePrice
        ),
      },
    })

    revalidatePath('/dashboard', 'layout')
    return { success: true, mode: 'updated' as const }
  }

  const categoryId = await ensureIncomeCategoryId()
  await prisma.transaction.create({
    data: {
      type: 'INCOME',
      amount: calculatedAmount,
      date: new Date(),
      description: buildTournamentTxDescription(
        row.nombre,
        parejasInscriptas,
        personasInscriptas,
        effectivePrice
      ),
      reference: `${project.dbSchema.toUpperCase()}-EV-${input.eventoId}`,
      paymentMethod: 'TRANSFER',
      status: 'PENDING',
      projectId: project.id,
      categoryId,
      createdById: session.userId,
      externalKey,
      pairsCount: parejasInscriptas,
      playersCount: personasInscriptas,
    },
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true, mode: 'created' as const }
}

export async function markTournamentTransactionPaidAction(transactionId: number) {
  const session = await requireApiAuth()
  if (session.role === 'VIEWER') {
    return { success: false, error: 'No tienes permisos para modificar el estado del cobro.' }
  }

  const tx = await prisma.transaction.findUnique({ where: { id: transactionId } })
  if (!tx) {
    return { success: false, error: 'La transacción no existe.' }
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: 'PAID' },
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

const saveSchemaInputSchema = z
  .object({
    mode: z.enum(['existing', 'new']),
    projectId: z.number().int().positive().optional(),
    projectName: z.string().trim().max(150).optional(),
    clientName: z.string().trim().max(150).nullable().optional(),
    dbSchema: z
      .string()
      .trim()
      .min(1, 'Ingresa el nombre del schema MySQL')
      .max(64)
      .regex(/^[a-zA-Z0-9_]+$/, 'El schema solo puede contener letras, números y guión bajo (_)'),
    customPricePerPlayer: z
      .number()
      .nonnegative('La tarifa no puede ser negativa')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => (data.mode === 'existing' ? Boolean(data.projectId) : Boolean(data.projectName && data.projectName.length >= 2)),
    {
      message: 'Selecciona un proyecto existente o ingresa un nombre válido para el nuevo proyecto.',
    }
  )

export async function saveTournamentSchemaAction(
  input: z.infer<typeof saveSchemaInputSchema>
) {
  const session = await requireApiAuth()
  if (session.role === 'VIEWER') {
    return { success: false, error: 'No tienes permisos para configurar schemas.' }
  }

  const parsed = saveSchemaInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Datos de schema inválidos',
    }
  }

  const data = parsed.data
  const schemaName = data.dbSchema.trim()

  if (data.mode === 'existing' && data.projectId) {
    const inUse = await prisma.project.findFirst({
      where: { dbSchema: schemaName, id: { not: data.projectId } },
    })
    if (inUse) {
      return {
        success: false,
        error: `El schema "${schemaName}" ya está vinculado al proyecto "${inUse.name}".`,
      }
    }

    await prisma.project.update({
      where: { id: data.projectId },
      data: {
        dbSchema: schemaName,
        customPricePerPlayer: data.customPricePerPlayer ?? null,
      },
    })
  } else {
    const inUse = await prisma.project.findFirst({
      where: { dbSchema: schemaName },
    })
    if (inUse) {
      return {
        success: false,
        error: `El schema "${schemaName}" ya está vinculado al proyecto "${inUse.name}".`,
      }
    }

    await prisma.project.create({
      data: {
        name: data.projectName!,
        clientName: data.clientName || null,
        status: 'ACTIVE',
        dbSchema: schemaName,
        customPricePerPlayer: data.customPricePerPlayer ?? null,
      },
    })
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function unlinkTournamentSchemaAction(projectId: number) {
  const session = await requireApiAuth()
  if (session.role === 'VIEWER') {
    return { success: false, error: 'No tienes permisos para desvincular schemas.' }
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return { success: false, error: 'El proyecto no existe.' }
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { dbSchema: null },
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
