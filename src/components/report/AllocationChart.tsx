'use client'

import { useState, useEffect, useRef } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AllocationBreakdown {
  equity: number
  fixedIncome: number
  cash: number
  alternatives: number
  canadaEquity: number
  usEquity: number
  internationalEquity: number
}

interface AllocationChartProps {
  allocation: AllocationBreakdown
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = {
  equity:       'var(--chart-1)', // gold
  fixedIncome:  'var(--chart-2)', // teal
  cash:         'var(--chart-3)', // purple
  alternatives: 'var(--chart-4)', // green
  canada:       'var(--chart-1)', // gold
  us:           'var(--chart-2)', // teal
  international:'var(--chart-3)', // purple
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPct(val: number) {
  return `${val.toFixed(1)}%`
}

// ─── Active shape ─────────────────────────────────────────────────────────────

function renderActiveShape(props: Record<string, unknown>) {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent,
  } = props as {
    cx: number; cy: number; innerRadius: number; outerRadius: number
    startAngle: number; endAngle: number; fill: string
    payload: { name: string; value: number }; percent: number
  }

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 3}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.95}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 13}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.6}
      />
      {/* Center label */}
      <text x={cx} y={cy - 10} textAnchor="middle" fill="oklch(0.96 0.005 255)" fontSize={22} fontWeight={700} fontFamily="var(--font-jetbrains)">
        {Math.round(percent * 100)}%
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="oklch(0.55 0.015 255)" fontSize={11} fontFamily="var(--font-outfit)">
        {payload.name}
      </text>
    </g>
  )
}

// ─── Donut center (idle state) ────────────────────────────────────────────────

function DonutCenter({ label, pct }: { label: string; pct: number }) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    const duration = 900

    function step(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplayed(Math.round(pct * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [pct])

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="font-data text-3xl font-bold" style={{ color: 'var(--chart-1)' }}>
        {displayed}%
      </span>
      <span className="text-xs text-muted-foreground mt-0.5">{label}</span>
    </div>
  )
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function AssetTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ backgroundColor: item.payload.color }} />
        <span className="text-foreground font-medium">{item.name}</span>
      </div>
      <div className="font-data text-sm font-semibold mt-0.5" style={{ color: item.payload.color }}>
        {fmtPct(item.value)}
      </div>
    </div>
  )
}

// ─── Geographic Bar ───────────────────────────────────────────────────────────

function GeoBar({ label, value, max, color, delay }: {
  label: string; value: number; max: number; color: string; delay: number
}) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth((value / max) * 100)
    }, delay)
    return () => clearTimeout(timer)
  }, [value, max, delay])

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-muted-foreground text-right">{label}</span>
      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'oklch(1 0 0 / 0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-12 shrink-0 font-data text-xs font-semibold text-right" style={{ color }}>
        {fmtPct(value)}
      </span>
    </div>
  )
}

// ─── Legend Item ──────────────────────────────────────────────────────────────

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <span className="size-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <span className="font-data text-xs font-semibold" style={{ color }}>{fmtPct(value)}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AllocationChart({ allocation }: AllocationChartProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [view, setView] = useState<'asset' | 'geo'>('asset')

  const assetData = [
    { name: 'Equity',       value: allocation.equity,       color: CHART_COLORS.equity },
    { name: 'Fixed Income', value: allocation.fixedIncome,  color: CHART_COLORS.fixedIncome },
    { name: 'Cash',         value: allocation.cash,         color: CHART_COLORS.cash },
    { name: 'Alternatives', value: allocation.alternatives, color: CHART_COLORS.alternatives },
  ].filter(d => d.value > 0)

  const maxGeo = Math.max(allocation.canadaEquity, allocation.usEquity, allocation.internationalEquity, 1)

  const subtitle = `${fmtPct(allocation.equity)} Equity · ${fmtPct(allocation.fixedIncome)} Fixed Income · ${fmtPct(allocation.cash)} Cash`

  return (
    <Card className="glass rounded-2xl border-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="gradient-text text-lg">Asset Allocation</CardTitle>
            <CardDescription className="mt-0.5 text-xs">{subtitle}</CardDescription>
          </div>
          {/* Toggle */}
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'oklch(1 0 0 / 0.05)' }}>
            <button
              onClick={() => setView('asset')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                view === 'asset'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Asset Class
            </button>
            <button
              onClick={() => setView('geo')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                view === 'geo'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Geography
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {view === 'asset' ? (
          <>
            {/* Donut Chart */}
            <div className="relative" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    activeShape={activeIndex >= 0 ? (renderActiveShape as Parameters<typeof Pie>[0]['activeShape']) : undefined}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    strokeWidth={0}
                  >
                    {assetData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<AssetTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Idle center label — show dominant when no hover */}
              {activeIndex === -1 && (
                <DonutCenter
                  label={assetData[0]?.name ?? ''}
                  pct={assetData[0]?.value ?? 0}
                />
              )}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 justify-center">
              {assetData.map((item) => (
                <LegendItem key={item.name} color={item.color} label={item.name} value={item.value} />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Geographic breakdown */}
            <div className="mt-2 mb-4">
              <p className="text-xs text-muted-foreground mb-4">
                Equity geographic breakdown · {fmtPct(allocation.equity)} total equity
              </p>
              <div className="flex flex-col gap-4">
                <GeoBar
                  label="Canada"
                  value={allocation.canadaEquity}
                  max={maxGeo}
                  color={CHART_COLORS.canada}
                  delay={0}
                />
                <GeoBar
                  label="United States"
                  value={allocation.usEquity}
                  max={maxGeo}
                  color={CHART_COLORS.us}
                  delay={80}
                />
                <GeoBar
                  label="International"
                  value={allocation.internationalEquity}
                  max={maxGeo}
                  color={CHART_COLORS.international}
                  delay={160}
                />
              </div>
            </div>

            {/* Sub-legend */}
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 justify-center">
              <LegendItem color={CHART_COLORS.canada} label="Canada" value={allocation.canadaEquity} />
              <LegendItem color={CHART_COLORS.us} label="United States" value={allocation.usEquity} />
              <LegendItem color={CHART_COLORS.international} label="International" value={allocation.internationalEquity} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export { AllocationChart as default }
