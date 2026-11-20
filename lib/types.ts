export type RoleType = 'ADMIN' | 'MANAGER' | 'VIEWER'
export type ProjectStatusType = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
export type TransactionTypeValue = 'INCOME' | 'EXPENSE'
export type PaymentMethodValue = 'TRANSFER' | 'CASH' | 'CARD' | 'CRYPTO' | 'OTHER'
export type TransactionStatusValue = 'PAID' | 'PENDING' | 'CANCELLED'
export type PeriodFilter = 'month' | 'quarter' | 'year' | 'all'

export interface CategoryDTO {
  id: number
  name: string
  type: TransactionTypeValue
  color: string
  isActive: boolean
  transactionCount?: number
  createdAt: string
}

export interface ProjectDTO {
  id: number
  name: string
  clientName: string | null
  description: string | null
  status: ProjectStatusType
  budget: number | null
  startDate: string | null
  endDate: string | null
  dbSchema: string | null
  customPricePerPlayer: number | null
  totalIncome: number
  totalExpense: number
  pendingIncome: number
  pendingExpense: number
  netBalance: number
  transactionCount: number
  createdAt: string
}

export type ExternalEventoState = 'ABIERTO' | 'CERRADO' | 'JUGANDOSE' | 'FINALIZADO'

export interface BillingConfigDTO {
  pricePerPlayer: number
  autoSyncOnPlaying: boolean
  updatedAt: string
}

export interface SchemaSyncStatusDTO {
  projectId: number
  projectName: string
  dbSchema: string
  customPricePerPlayer: number | null
  effectivePricePerPlayer: number
  availableInMySQL: boolean
  error: string | null
  totalEventos: number
  playingOrFinishedEventos: number
  pendingAmount: number
  paidAmount: number
}

export interface ExternalEventoSyncRow {
  externalKey: string
  projectId: number
  projectName: string
  dbSchema: string
  eventoId: number
  nombre: string
  inicio: string
  fin: string
  state: ExternalEventoState
  torneosCount: number
  parejasInscriptas: number
  parejasSuplentes: number
  personasInscriptas: number
  appliedPricePerPlayer: number
  calculatedAmount: number
  externalPago: boolean
  transaction: {
    id: number
    amount: number
    status: TransactionStatusValue
    pairsCount: number | null
    playersCount: number | null
    date: string
  } | null
}

export interface SchemaProjectOption {
  id: number
  name: string
  dbSchema: string | null
  customPricePerPlayer: number | null
}

export interface TournamentSyncDashboardDTO {
  config: BillingConfigDTO
  schemas: SchemaSyncStatusDTO[]
  events: ExternalEventoSyncRow[]
  autoCreatedCount: number
  allProjects: SchemaProjectOption[]
  detectedMySQLSchemas: string[]
}

export interface TransactionDTO {
  id: number
  type: TransactionTypeValue
  amount: number
  date: string
  description: string
  reference: string | null
  paymentMethod: PaymentMethodValue
  status: TransactionStatusValue
  projectId: number | null
  projectName: string | null
  categoryId: number
  categoryName: string
  categoryColor: string
  createdById: number | null
  createdByName: string | null
  createdAt: string
}

export interface UserDTO {
  id: number
  name: string
  email: string
  role: RoleType
  transactionCount: number
  createdAt: string
}

export interface DashboardData {
  period: PeriodFilter
  kpis: {
    totalIncome: number
    globalIncome: number
    projectIncome: number
    totalExpense: number
    globalExpense: number
    projectExpense: number
    netBalance: number
    profitMargin: number
    pendingIncome: number
    pendingExpense: number
  }
  monthlySeries: Array<{
    month: string
    label: string
    ingresos: number
    gastos: number
    balance: number
  }>
  expensesByCategory: Array<{
    categoryId: number
    name: string
    color: string
    amount: number
  }>
  projectPerformance: Array<{
    id: number
    name: string
    status: ProjectStatusType
    ingresos: number
    gastos: number
    balance: number
    budget: number | null
  }>
  recentTransactions: TransactionDTO[]
}

export const ROLE_LABELS: Record<RoleType, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Operador / Manager',
  VIEWER: 'Solo Lectura',
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatusType, string> = {
  ACTIVE: 'Activo',
  PAUSED: 'Pausado',
  COMPLETED: 'Finalizado',
  CANCELLED: 'Cancelado',
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionTypeValue, string> = {
  INCOME: 'Entrada',
  EXPENSE: 'Gasto',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodValue, string> = {
  TRANSFER: 'Transferencia',
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  CRYPTO: 'Cripto / USDT',
  OTHER: 'Otro',
}

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatusValue, string> = {
  PAID: 'Pagado / Cobrado',
  PENDING: 'Pendiente',
  CANCELLED: 'Anulado',
}
