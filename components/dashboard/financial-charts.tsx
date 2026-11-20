'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatARS, formatARSCompact } from '@/lib/format'
import type { DashboardData } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function CustomBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="mb-1.5 font-semibold text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="font-mono font-medium text-foreground">
              {formatARS(entry.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CustomPieTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; payload?: { color?: string } }>
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: item.payload?.color }}
        />
        <span className="font-medium text-foreground">{item.name}</span>
      </div>
      <p className="mt-1 font-mono font-semibold text-foreground">
        {formatARS(item.value ?? 0)}
      </p>
    </div>
  )
}

export function FinancialCharts({ data }: { data: DashboardData }) {
  const totalExpenses = data.expensesByCategory.reduce((acc, c) => acc + c.amount, 0)

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Flujo Mensual */}
      <Card className="border-border/60 bg-card/70 lg:col-span-7">
        <CardHeader>
          <CardTitle className="text-base">Flujo de Caja Mensual (ARS)</CardTitle>
          <CardDescription>
            Comparativa de entradas cobradas vs. gastos pagados (globales y proyectos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.monthlySeries.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No hay movimientos pagados para graficar en este período.
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatARSCompact(Number(v))}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={62}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="ingresos" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribución de Gastos por Categoría */}
      <Card className="border-border/60 bg-card/70 lg:col-span-5">
        <CardHeader>
          <CardTitle className="text-base">Gastos por Categoría (ARS)</CardTitle>
          <CardDescription>Distribución del gasto pagado en el período</CardDescription>
        </CardHeader>
        <CardContent>
          {data.expensesByCategory.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              Sin gastos pagados en este período.
            </div>
          ) : (
            <div className="grid items-center gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.expensesByCategory}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {data.expensesByCategory.map((entry) => (
                        <Cell key={entry.categoryId} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {data.expensesByCategory.map((cat) => {
                  const pct = totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0
                  return (
                    <div key={cat.categoryId} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="truncate text-muted-foreground">{cat.name}</span>
                      </div>
                      <div className="shrink-0 text-right font-mono">
                        <span className="text-foreground">{formatARSCompact(cat.amount)}</span>
                        <span className="ml-1.5 text-muted-foreground">({pct.toFixed(0)}%)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rentabilidad por Proyecto */}
      <Card className="border-border/60 bg-card/70 lg:col-span-12">
        <CardHeader>
          <CardTitle className="text-base">Ingresos vs. Gastos por Proyecto (ARS)</CardTitle>
          <CardDescription>
            Desempeño económico individual de proyectos activos y finalizados en el período
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.projectPerformance.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              No hay proyectos registrados todavía.
            </div>
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.projectPerformance} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatARSCompact(Number(v))}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={62}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="ingresos" name="Ingresos Proyecto" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" name="Gastos Proyecto" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
