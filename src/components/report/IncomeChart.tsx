'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { IncomeBreakdown } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IncomeChartProps {
  income: IncomeBreakdown
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDollar(val: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val).replace('CA$', '$')
}

function fmtDollarShort(val: number): string {
  if (val >= 1000) {
    return `$${(val / 1000).toFixed(1)}k`
  }
  return `$${val.toFixed(0)}`
}

// ─── Income categories config ─────────────────────────────────────────────────

const INCOME_CATEGORIES = [
  { key: 'eligibleDividends', label: 'Eligible Dividends', color: 'var(--chart-1)' },
  { key: 'interest',          label: 'Interest',            color: 'var(--chart-2)' },
  { key: 'capitalGains',      label: 'Capital Gains',       color: 'var(--chart-3)' },
  { key: 'returnOfCapital',   label: 'Return of Capital',   color: 'var(--chart-4)' },
  { key: 'foreignIncome',     label: 'Foreign Income',      color: 'var(--chart-5)' },
] as const

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    dataKey: string
    color: string
  }>
  label?: string
}

function IncomeTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="glass rounded-xl px-4 py-3 shadow-xl min-w-[200px]">
      <p className="text-xs text-muted-foreground mb-2 font-medium">Income Breakdown</p>
      <div className="flex flex-col gap-1.5">
        {payload
          .filter(p => p.value > 0)
          .map((p) => {
            const cat = INCOME_CATEGORIES.find(c => c.key === p.dataKey)
            return (
              <div key={p.dataKey} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: cat?.color ?? p.color }} />
                  <span className="text-xs text-muted-foreground">{cat?.label ?? p.name}</span>
                </div>
                <span className="font-data text-xs font-semibold" style={{ color: cat?.color ?? p.color }}>
                  {fmtDollar(p.value)}
                </span>
              </div>
            )
          })}
      </div>
    </div>
  )
}

// ─── Legend row item ──────────────────────────────────────────────────────────

function IncomeLegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 min-w-[110px]">
      <div className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="font-data text-sm font-semibold pl-4" style={{ color }}>
        {fmtDollar(value)}
      </span>
    </div>
  )
}

// ─── Tax summary item ─────────────────────────────────────────────────────────

function TaxItem({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="flex-1 min-w-[160px] rounded-xl p-3" style={{ background: 'oklch(1 0 0 / 0.03)', border: '1px solid oklch(1 0 0 / 0.06)' }}>
      <div className="font-data text-sm font-bold text-foreground">{fmtDollar(value)}</div>
      <div className="text-xs font-medium text-foreground/80 mt-0.5">{label}</div>
      <div className="text-[11px] text-muted-foreground mt-1 leading-tight">{note}</div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function IncomeChart({ income }: IncomeChartProps) {
  const chartData = [
    {
      name: `${income.year}`,
      eligibleDividends: income.eligibleDividends,
      interest: income.interest,
      capitalGains: income.capitalGains,
      returnOfCapital: income.returnOfCapital,
      foreignIncome: income.foreignIncome,
    },
  ]

  const totalTaxable = income.interest + income.returnOfCapital

  return (
    <Card className="glass rounded-2xl border-0">
      <CardHeader>
        <CardTitle className="gradient-text text-lg">{income.year} Income Breakdown</CardTitle>
        <CardDescription className="text-xs mt-0.5">
          {fmtDollar(income.total)} total distributions
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stacked Bar Chart */}
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              barCategoryGap="40%"
            >
              <CartesianGrid
                vertical={false}
                stroke="oklch(1 0 0 / 0.06)"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="name"
                tick={{ fill: 'oklch(0.55 0.015 255)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtDollarShort}
                tick={{ fill: 'oklch(0.55 0.015 255)', fontSize: 11, fontFamily: 'var(--font-jetbrains)' }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                content={<IncomeTooltip />}
                cursor={{ fill: 'oklch(1 0 0 / 0.04)', radius: 4 }}
              />
              {INCOME_CATEGORIES.map((cat) => (
                <Bar
                  key={cat.key}
                  dataKey={cat.key}
                  stackId="income"
                  fill={cat.color}
                  radius={cat.key === 'eligibleDividends' ? [0, 0, 6, 6] : cat.key === 'foreignIncome' ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                  maxBarSize={120}
                >
                  <Cell fill={cat.color} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend row */}
        <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
          {INCOME_CATEGORIES.map((cat) => {
            const value = income[cat.key as keyof IncomeBreakdown] as number
            if (value <= 0) return null
            return (
              <IncomeLegendItem
                key={cat.key}
                color={cat.color}
                label={cat.label}
                value={value}
              />
            )
          })}
        </div>

        {/* Divider */}
        <div className="h-px" style={{ background: 'oklch(1 0 0 / 0.07)' }} />

        {/* Tax character summary */}
        <div>
          <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Tax Character Summary</p>
          <div className="flex flex-wrap gap-3">
            <TaxItem
              label="Eligible Dividends"
              value={income.eligibleDividends}
              note="Most tax-efficient for Canadians"
            />
            <TaxItem
              label="Capital Gains"
              value={income.capitalGains}
              note="50% inclusion rate"
            />
            <TaxItem
              label="Foreign Income"
              value={income.foreignIncome}
              note="Foreign tax credit available"
            />
            <TaxItem
              label="Interest + ROC"
              value={totalTaxable}
              note="Fully taxable"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { IncomeChart as default }
