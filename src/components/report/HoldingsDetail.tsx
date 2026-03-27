'use client'

import type { ResearchedHolding } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'

interface HoldingsDetailProps {
  holdings: ResearchedHolding[]
}

const TYPE_LABELS: Record<string, string> = {
  canadian_etf: 'CA ETF',
  canadian_mutual_fund: 'Mutual Fund',
  us_etf: 'US ETF',
  stock_ca: 'CA Stock',
  stock_us: 'US Stock',
  gic: 'GIC',
  cash: 'Cash',
  other: 'Other',
}

function AllocationBar({
  equity,
  fixedIncome,
  cash,
  alternatives,
}: {
  equity: number
  fixedIncome: number
  cash: number
  alternatives: number
}) {
  const segments = [
    { label: 'Equity', pct: equity, color: 'oklch(0.80 0.16 85)' },        // gold
    { label: 'Fixed Income', pct: fixedIncome, color: 'oklch(0.70 0.12 185)' }, // teal
    { label: 'Cash', pct: cash, color: 'oklch(0.72 0.16 145)' },            // green
    { label: 'Alt', pct: alternatives, color: 'oklch(0.62 0.18 295)' },     // purple
  ].filter(s => s.pct > 0)

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-1.5 w-20 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
        {segments.map(seg => (
          <div
            key={seg.label}
            style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
            title={`${seg.label}: ${seg.pct}%`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground font-data">
        {segments[0]?.pct ?? 0}%{segments[0] ? ` ${segments[0].label.slice(0, 2)}` : ''}
      </span>
    </div>
  )
}

function ReturnPill({ value, label }: { value?: number | null; label: string }) {
  if (value == null) {
    return (
      <div className="flex flex-col items-center">
        <span className="text-[10px] text-muted-foreground/50 uppercase">{label}</span>
        <span className="font-data text-xs text-muted-foreground/30">—</span>
      </div>
    )
  }
  const cls = value > 0 ? 'return-positive' : value < 0 ? 'return-negative' : 'text-muted-foreground'
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-muted-foreground/50 uppercase">{label}</span>
      <span className={`font-data text-xs font-medium ${cls}`}>
        {value > 0 ? '+' : ''}{value.toFixed(1)}%
      </span>
    </div>
  )
}

function VerificationBadge({ status }: { status: ResearchedHolding['verificationStatus'] }) {
  const config = {
    verified: { label: 'Verified', className: 'bg-[oklch(0.72_0.16_145)]/15 text-[oklch(0.72_0.16_145)] border-[oklch(0.72_0.16_145)]/30' },
    pending: { label: 'Pending', className: 'bg-[oklch(0.80_0.16_85)]/15 text-[oklch(0.80_0.16_85)] border-[oklch(0.80_0.16_85)]/30' },
    discrepancy: { label: 'Discrepancy', className: 'bg-[oklch(0.63_0.22_25)]/15 text-[oklch(0.63_0.22_25)] border-[oklch(0.63_0.22_25)]/30' },
    failed: { label: 'Failed', className: 'bg-[oklch(0.63_0.22_25)]/15 text-[oklch(0.63_0.22_25)] border-[oklch(0.63_0.22_25)]/30' },
  }
  const { label, className } = config[status]
  return (
    <Badge variant="outline" className={`text-xs border ${className}`}>
      {label}
    </Badge>
  )
}

// ── Desktop table row ──────────────────────────────────────────────────────────
function HoldingRow({ holding }: { holding: ResearchedHolding }) {
  return (
    <tr className="border-t border-white/5 transition-colors hover:bg-white/[0.025] group">
      {/* Ticker + Name */}
      <td className="px-4 py-4 align-middle">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-base font-semibold text-primary leading-none">
            {holding.ticker}
          </span>
          <span className="text-xs text-muted-foreground leading-tight max-w-[200px] truncate">
            {holding.name}
          </span>
          <span className="text-[11px] text-muted-foreground/50 mt-0.5">
            {TYPE_LABELS[holding.type] ?? holding.type}
          </span>
        </div>
      </td>

      {/* Weight */}
      <td className="px-4 py-4 align-middle text-center">
        <span className="font-data text-sm font-medium text-foreground">
          {holding.weight.toFixed(2)}%
        </span>
      </td>

      {/* Market Value */}
      <td className="px-4 py-4 align-middle text-right">
        <span className="font-data text-sm text-foreground">
          {new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(holding.marketValue)}
        </span>
      </td>

      {/* Allocation bar */}
      <td className="px-4 py-4 align-middle">
        <AllocationBar
          equity={holding.allocation.equity}
          fixedIncome={holding.allocation.fixedIncome}
          cash={holding.allocation.cash}
          alternatives={holding.allocation.alternatives}
        />
      </td>

      {/* MER */}
      <td className="px-4 py-4 align-middle text-center">
        {holding.mer != null ? (
          <span className="font-data text-sm text-foreground">
            {holding.mer.toFixed(2)}%
          </span>
        ) : (
          <span className="font-data text-xs text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Performance */}
      <td className="px-4 py-4 align-middle">
        <div className="flex items-center gap-3">
          <ReturnPill value={holding.performance.return1yr} label="1Y" />
          <ReturnPill value={holding.performance.return3yr} label="3Y" />
          <ReturnPill value={holding.performance.return5yr} label="5Y" />
          <ReturnPill value={holding.performance.return10yr} label="10Y" />
        </div>
      </td>

      {/* Verification */}
      <td className="px-4 py-4 align-middle">
        <VerificationBadge status={holding.verificationStatus} />
        {holding.verificationNotes && (
          <p className="text-[11px] text-muted-foreground mt-1 max-w-[140px] truncate">
            {holding.verificationNotes}
          </p>
        )}
      </td>

      {/* Source link */}
      <td className="px-4 py-4 align-middle text-center">
        {holding.performance.sourceUrl ? (
          <a
            href={holding.performance.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
            aria-label={`Source data for ${holding.ticker}`}
          >
            <ExternalLink className="size-4" />
          </a>
        ) : (
          <span className="text-muted-foreground/30">—</span>
        )}
      </td>
    </tr>
  )
}

// ── Mobile card ────────────────────────────────────────────────────────────────
function HoldingCard({ holding }: { holding: ResearchedHolding }) {
  return (
    <div className="glass shine-border rounded-xl p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold text-primary">{holding.ticker}</span>
            <span className="font-data text-sm text-muted-foreground">{holding.weight.toFixed(2)}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{holding.name}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <VerificationBadge status={holding.verificationStatus} />
          {holding.performance.sourceUrl && (
            <a
              href={holding.performance.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Source for ${holding.ticker}`}
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Market Value</p>
          <p className="font-data text-sm font-medium text-foreground">
            {new Intl.NumberFormat('en-CA', {
              style: 'currency',
              currency: 'CAD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(holding.marketValue)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">MER</p>
          <p className="font-data text-sm font-medium text-foreground">
            {holding.mer != null ? `${holding.mer.toFixed(2)}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Type</p>
          <p className="text-xs text-muted-foreground">{TYPE_LABELS[holding.type] ?? holding.type}</p>
        </div>
      </div>

      {/* Allocation bar */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Allocation</p>
        <AllocationBar
          equity={holding.allocation.equity}
          fixedIncome={holding.allocation.fixedIncome}
          cash={holding.allocation.cash}
          alternatives={holding.allocation.alternatives}
        />
      </div>

      {/* Performance row */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Performance (Annualized)</p>
        <div className="flex items-center gap-4">
          <ReturnPill value={holding.performance.return1yr} label="1Y" />
          <ReturnPill value={holding.performance.return3yr} label="3Y" />
          <ReturnPill value={holding.performance.return5yr} label="5Y" />
          <ReturnPill value={holding.performance.return10yr} label="10Y" />
        </div>
      </div>

      {holding.verificationNotes && (
        <p className="text-xs text-muted-foreground border-t border-white/5 pt-2">
          {holding.verificationNotes}
        </p>
      )}
    </div>
  )
}

// ── Legend bar ─────────────────────────────────────────────────────────────────
function AllocLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      {[
        { label: 'Equity', color: 'bg-[oklch(0.80_0.16_85)]' },
        { label: 'Fixed Income', color: 'bg-[oklch(0.70_0.12_185)]' },
        { label: 'Cash', color: 'bg-[oklch(0.72_0.16_145)]' },
        { label: 'Alternatives', color: 'bg-[oklch(0.62_0.18_295)]' },
      ].map(item => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${item.color}`} />
          {item.label}
        </div>
      ))}
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function HoldingsDetail({ holdings }: HoldingsDetailProps) {
  if (holdings.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-muted-foreground">No holdings to display.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div className="hidden lg:block glass rounded-2xl overflow-hidden">
        {/* Table header bar */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Holdings Detail
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({holdings.length} positions)
            </span>
          </h2>
          <AllocLegend />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-muted-foreground text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Ticker / Name</th>
                <th className="px-4 py-3 text-center font-medium">Weight</th>
                <th className="px-4 py-3 text-right font-medium">Market Value</th>
                <th className="px-4 py-3 text-left font-medium">Allocation</th>
                <th className="px-4 py-3 text-center font-medium">MER</th>
                <th className="px-4 py-3 text-left font-medium">Performance</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(holding => (
                <HoldingRow key={holding.ticker} holding={holding} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-white/5">
          <p className="text-xs text-muted-foreground/60">
            Returns are annualized. All values in CAD unless noted. Allocation bar shows Equity / Fixed Income / Cash / Alternatives.
          </p>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="lg:hidden space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-foreground">
            Holdings Detail
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({holdings.length} positions)
            </span>
          </h2>
        </div>
        <AllocLegend />
        {holdings.map(holding => (
          <HoldingCard key={holding.ticker} holding={holding} />
        ))}
      </div>
    </div>
  )
}
