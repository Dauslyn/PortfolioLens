import type { ReactElement } from 'react'
import type { PortfolioReport } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Wallet,
  TrendingUp,
  ShieldCheck,
  Banknote,
  Info,
} from 'lucide-react'

interface SummaryStatsProps {
  report: PortfolioReport
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tooltip,
  indicator,
}: {
  icon: ReactElement
  label: string
  value: string
  sub?: string
  tooltip?: string
  indicator?: 'green' | 'amber' | 'red'
}) {
  const indicatorColor = {
    green: 'bg-[oklch(0.72_0.16_145)]',
    amber: 'bg-[oklch(0.80_0.16_85)]',
    red: 'bg-[oklch(0.63_0.22_25)]',
  }

  return (
    <div className="glass shine-border hover-lift rounded-2xl p-6 flex flex-col gap-4">
      {/* Icon row */}
      <div className="flex items-center justify-between">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger className="text-muted-foreground hover:text-foreground transition-colors">
              <Info className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="max-w-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
        {indicator && (
          <span
            className={`size-2.5 rounded-full ${indicatorColor[indicator]} ring-4 ring-[oklch(0.72_0.16_145)]/20`}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="font-data text-3xl font-semibold text-primary leading-none">
          {value}
        </p>
        {sub && (
          <p className="text-sm text-muted-foreground mt-1.5">{sub}</p>
        )}
      </div>
    </div>
  )
}

export default function SummaryStats({ report }: SummaryStatsProps): ReactElement {
  const formattedValue = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(report.totalValue)

  const verifiedCount = report.holdings.filter(h => h.verificationStatus === 'verified').length
  const totalCount = report.holdings.length
  const verificationRatio = totalCount > 0 ? verifiedCount / totalCount : 0

  const verificationIndicator: 'green' | 'amber' | 'red' =
    report.discrepancyCount > 0 ? 'amber' :
    verificationRatio === 1 ? 'green' : 'amber'

  const verificationSub =
    report.discrepancyCount > 0
      ? `${report.discrepancyCount} discrepanc${report.discrepancyCount === 1 ? 'y' : 'ies'} flagged`
      : verificationRatio === 1
      ? 'All holdings verified'
      : `${totalCount - verifiedCount} pending verification`

  const formattedIncome = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(report.income.total)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<Wallet className="size-5" />}
        label="Total Portfolio Value"
        value={formattedValue}
        sub={`${report.currency} · ${totalCount} holdings`}
      />

      <StatCard
        icon={<TrendingUp className="size-5" />}
        label="Weighted MER"
        value={`${report.weightedMER.toFixed(2)}%`}
        sub="Annual management cost"
        tooltip="Weighted Management Expense Ratio — the blended annual cost across all holdings, weighted by portfolio allocation. Lower is generally better."
      />

      <StatCard
        icon={<ShieldCheck className="size-5" />}
        label="Verification Status"
        value={`${verifiedCount} of ${totalCount}`}
        sub={verificationSub}
        indicator={verificationIndicator}
      />

      <StatCard
        icon={<Banknote className="size-5" />}
        label={`${report.income.year} Tax Year Income`}
        value={formattedIncome}
        sub="Total distributions"
        tooltip="Estimated annual income distributions including eligible dividends, interest, capital gains, return of capital, and foreign income."
      />
    </div>
  )
}
