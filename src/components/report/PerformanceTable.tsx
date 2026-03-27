'use client'

import { ExternalLink, Info } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ResearchedHolding, BenchmarkPerformance } from '@/lib/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface PerformanceTableProps {
  holdings: ResearchedHolding[]
  benchmark?: BenchmarkPerformance
  selectedBenchmark: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtReturn = (val?: number) =>
  val == null ? '—' : `${val > 0 ? '+' : ''}${val.toFixed(1)}%`

const returnColor = (val?: number, bench?: number): string => {
  if (val == null || bench == null) return 'text-muted-foreground'
  return val >= bench ? 'return-positive' : 'return-negative'
}

const returnArrow = (val?: number, bench?: number): string => {
  if (val == null || bench == null) return ''
  return val >= bench ? '▲ ' : '▼ '
}

const fmtWeight = (val: number) => `${val.toFixed(1)}%`
const fmtMer = (val?: number) => (val == null ? '—' : `${val.toFixed(2)}%`)

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ResearchedHolding['verificationStatus'] }) {
  const map = {
    verified:    { label: 'Verified',    bg: 'oklch(0.72 0.16 145 / 0.15)', fg: 'oklch(0.72 0.16 145)', border: 'oklch(0.72 0.16 145 / 0.3)' },
    pending:     { label: 'Pending',     bg: 'oklch(0.80 0.16 85 / 0.12)',  fg: 'oklch(0.80 0.16 85)',  border: 'oklch(0.80 0.16 85 / 0.3)' },
    discrepancy: { label: 'Discrepancy', bg: 'oklch(0.63 0.22 25 / 0.15)',  fg: 'oklch(0.63 0.22 25)',  border: 'oklch(0.63 0.22 25 / 0.3)' },
    failed:      { label: 'Failed',      bg: 'oklch(0.63 0.22 25 / 0.15)',  fg: 'oklch(0.63 0.22 25)',  border: 'oklch(0.63 0.22 25 / 0.3)' },
  }[status]

  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none"
      style={{ background: map.bg, color: map.fg, borderColor: map.border }}
    >
      {map.label}
    </span>
  )
}

// ─── Individual return cell ───────────────────────────────────────────────────

function ReturnCell({ val, bench }: { val?: number; bench?: number }) {
  const color = returnColor(val, bench)
  const arrow = returnArrow(val, bench)
  const text = fmtReturn(val)
  const isMissing = val == null

  return (
    <td className="px-3 py-3 text-right whitespace-nowrap">
      <span className={`font-data text-xs font-semibold ${color}`}>
        {isMissing ? (
          <span className="text-muted-foreground/40">—</span>
        ) : bench != null ? (
          `${arrow}${text}`
        ) : (
          text
        )}
      </span>
    </td>
  )
}

// ─── Benchmark return cell (always gold, no arrow) ────────────────────────────

function BenchReturnCell({ val }: { val?: number }) {
  return (
    <td className="px-3 py-3 text-right whitespace-nowrap">
      <span className="font-data text-xs font-semibold" style={{ color: 'var(--chart-1)' }}>
        {val == null ? <span className="opacity-40">—</span> : fmtReturn(val)}
      </span>
    </td>
  )
}

// ─── Column header ────────────────────────────────────────────────────────────

function TH({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`px-3 py-2.5 text-xs font-medium uppercase tracking-wider whitespace-nowrap ${
        right ? 'text-right' : 'text-left'
      }`}
      style={{ color: 'oklch(0.55 0.015 255)' }}
    >
      {children}
    </th>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PerformanceTable({ holdings, benchmark, selectedBenchmark }: PerformanceTableProps) {
  return (
    <TooltipProvider>
      <Card className="glass rounded-2xl border-0 w-full">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="gradient-text text-lg">
                Performance vs {selectedBenchmark}
              </CardTitle>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-xs text-muted-foreground">
                  Annualized returns · <span className="return-positive">green</span> = outperforms · <span className="return-negative">red</span> = underperforms
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                      <Info size={12} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Returns are annualized percentages. Past performance does not guarantee future results.
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            {benchmark && (
              <Badge
                variant="outline"
                className="font-mono text-xs border-primary/30 text-primary shrink-0"
              >
                {benchmark.ticker}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 pb-4">
          {/* Scrollable table wrapper */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] border-collapse text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid oklch(1 0 0 / 0.08)' }}>
                  <TH>Holding</TH>
                  <TH right>Weight</TH>
                  <TH right>1 Year</TH>
                  <TH right>3 Year</TH>
                  <TH right>5 Year</TH>
                  <TH right>10 Year</TH>
                  <TH right>MER</TH>
                  <TH right>Source</TH>
                </tr>
              </thead>

              <tbody>
                {holdings.map((holding, i) => (
                  <tr
                    key={holding.ticker}
                    className="transition-colors hover:bg-white/[0.03]"
                    style={{
                      background: i % 2 !== 0 ? 'oklch(1 0 0 / 0.02)' : 'transparent',
                      borderBottom: '1px solid oklch(1 0 0 / 0.04)',
                    }}
                  >
                    {/* Holding */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="font-mono text-xs font-bold shrink-0"
                          style={{ color: 'var(--chart-1)' }}
                        >
                          {holding.ticker}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {holding.name}
                        </span>
                        <StatusBadge status={holding.verificationStatus} />
                      </div>
                    </td>

                    {/* Weight */}
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className="font-data text-xs text-foreground/70">
                        {fmtWeight(holding.weight)}
                      </span>
                    </td>

                    {/* Return columns */}
                    <ReturnCell val={holding.performance.return1yr}  bench={benchmark?.return1yr} />
                    <ReturnCell val={holding.performance.return3yr}  bench={benchmark?.return3yr} />
                    <ReturnCell val={holding.performance.return5yr}  bench={benchmark?.return5yr} />
                    <ReturnCell val={holding.performance.return10yr} bench={benchmark?.return10yr} />

                    {/* MER */}
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className="font-data text-xs text-muted-foreground">
                        {fmtMer(holding.mer)}
                      </span>
                    </td>

                    {/* Source link */}
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      {holding.performance.sourceUrl ? (
                        <a
                          href={holding.performance.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-end text-muted-foreground hover:text-primary transition-colors"
                          aria-label={`Source for ${holding.ticker}`}
                        >
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Benchmark row — highlighted at bottom */}
                {benchmark && (
                  <tr
                    style={{
                      borderTop: '2px solid oklch(0.80 0.16 85 / 0.30)',
                      background: 'oklch(0.80 0.16 85 / 0.06)',
                    }}
                  >
                    {/* Label */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-xs font-bold"
                          style={{ color: 'var(--chart-1)' }}
                        >
                          {benchmark.ticker}
                        </span>
                        <span
                          className="text-[10px] font-medium rounded px-1.5 py-0.5 uppercase tracking-wide"
                          style={{
                            color: 'var(--chart-1)',
                            background: 'oklch(0.80 0.16 85 / 0.12)',
                          }}
                        >
                          Benchmark
                        </span>
                      </div>
                    </td>

                    {/* No weight */}
                    <td className="px-3 py-3 text-right">
                      <span className="text-muted-foreground/30 text-xs">—</span>
                    </td>

                    {/* Benchmark returns */}
                    <BenchReturnCell val={benchmark.return1yr} />
                    <BenchReturnCell val={benchmark.return3yr} />
                    <BenchReturnCell val={benchmark.return5yr} />
                    <BenchReturnCell val={benchmark.return10yr} />

                    {/* No MER or Source */}
                    <td className="px-3 py-3 text-right">
                      <span className="text-muted-foreground/30 text-xs">—</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-muted-foreground/30 text-xs">—</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <p className="px-4 pt-3 text-[11px] text-muted-foreground/50 leading-relaxed">
            All returns are annualized percentages sourced from fund provider disclosures and public filings.
            Past performance does not indicate future results.
          </p>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
