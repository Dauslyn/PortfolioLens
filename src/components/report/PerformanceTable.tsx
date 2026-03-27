import type { ReactElement } from 'react'
import type { ResearchedHolding, BenchmarkPerformance } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

interface PerformanceTableProps {
  holdings: ResearchedHolding[]
  benchmark?: BenchmarkPerformance
  selectedBenchmark: string
}

function ReturnCell({ value }: { value?: number | null }) {
  if (value == null) {
    return <span className="font-data text-muted-foreground/40">—</span>
  }
  const cls = value > 0 ? 'return-positive' : value < 0 ? 'return-negative' : 'return-neutral'
  return (
    <span className={`font-data ${cls}`}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  )
}

function BenchmarkRow({ bench }: { bench: BenchmarkPerformance }) {
  return (
    <tr className="border-t border-white/5 bg-primary/5">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-primary">{bench.ticker}</span>
          <span className="text-xs text-muted-foreground bg-primary/10 rounded px-1.5 py-0.5 uppercase tracking-wide">
            Benchmark
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <ReturnCell value={bench.return1yr} />
      </td>
      <td className="px-4 py-3 text-center">
        <ReturnCell value={bench.return3yr} />
      </td>
      <td className="px-4 py-3 text-center">
        <ReturnCell value={bench.return5yr} />
      </td>
      <td className="px-4 py-3 text-center">
        <ReturnCell value={bench.return10yr} />
      </td>
    </tr>
  )
}

export default function PerformanceTable({
  holdings,
  benchmark,
  selectedBenchmark,
}: PerformanceTableProps): ReactElement {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Performance vs Benchmark
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>vs</span>
          <span className="font-mono font-semibold text-primary">{selectedBenchmark}</span>
          <Tooltip>
            <TooltipTrigger>
              <Info className="size-3.5 text-muted-foreground/60" />
            </TooltipTrigger>
            <TooltipContent side="top">
              Returns are annualized. Benchmark data sourced from public market data.
              Past performance does not guarantee future results.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium w-48">Holding</th>
              <th className="px-4 py-3 text-center font-medium">1 Year</th>
              <th className="px-4 py-3 text-center font-medium">3 Year</th>
              <th className="px-4 py-3 text-center font-medium">5 Year</th>
              <th className="px-4 py-3 text-center font-medium">10 Year</th>
            </tr>
          </thead>
          <tbody>
            {/* Benchmark row first */}
            {benchmark && <BenchmarkRow bench={benchmark} />}

            {/* Holdings rows */}
            {holdings.map((holding, idx) => (
              <tr
                key={holding.ticker}
                className={[
                  'border-t border-white/5',
                  'transition-colors hover:bg-white/[0.02]',
                  idx % 2 === 0 ? '' : 'bg-white/[0.015]',
                ].join(' ')}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-sm font-semibold text-primary">
                      {holding.ticker}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {holding.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <ReturnCell value={holding.performance.return1yr} />
                </td>
                <td className="px-4 py-3 text-center">
                  <ReturnCell value={holding.performance.return3yr} />
                </td>
                <td className="px-4 py-3 text-center">
                  <ReturnCell value={holding.performance.return5yr} />
                </td>
                <td className="px-4 py-3 text-center">
                  <ReturnCell value={holding.performance.return10yr} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="px-6 py-3 border-t border-white/5">
        <p className="text-xs text-muted-foreground/60">
          All returns are annualized percentages. Data sourced from fund provider disclosures and public filings.
          Past performance does not indicate future results.
        </p>
      </div>
    </div>
  )
}
