'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import type { RawHolding, ProcessingStatus, ProcessingStep, ProcessingLog } from '@/lib/types'
import type { PortfolioReport, ResearchedHolding, AllocationBreakdown, IncomeBreakdown } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type HoldingStatus = 'queued' | 'researching' | 'verifying' | 'verified' | 'discrepancy'

interface HoldingState {
  holding: RawHolding
  status: HoldingStatus
}

interface StepConfig {
  id: ProcessingStep
  label: string
  icon: React.ReactNode
  progressRange: [number, number]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS: StepConfig[] = [
  {
    id: 'parsing',
    label: 'Parse',
    icon: <FileText size={16} />,
    progressRange: [0, 10],
  },
  {
    id: 'researching',
    label: 'Research',
    icon: <Search size={16} />,
    progressRange: [10, 70],
  },
  {
    id: 'verifying',
    label: 'Verify',
    icon: <ShieldCheck size={16} />,
    progressRange: [70, 90],
  },
  {
    id: 'building_report',
    label: 'Report',
    icon: <FileText size={16} />,
    progressRange: [90, 100],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function makeLog(
  level: ProcessingLog['level'],
  message: string,
  holding?: string,
): ProcessingLog {
  return { timestamp: now(), level, message, holding }
}

function buildMockReport(
  holdings: RawHolding[],
  taxYear: number,
): PortfolioReport {
  const totalValue = holdings.reduce((s, h) => s + h.marketValue, 0)

  const researchedHoldings: ResearchedHolding[] = holdings.map((h) => {
    const allocation: AllocationBreakdown = {
      equity: h.type.includes('etf') || h.type.includes('stock') ? 80 : 10,
      fixedIncome: h.type === 'gic' ? 90 : 15,
      cash: h.type === 'cash' ? 100 : 5,
      alternatives: 0,
      canadaEquity: h.currency === 'CAD' ? 50 : 10,
      usEquity: h.currency === 'USD' ? 40 : 15,
      internationalEquity: 15,
    }

    const income: IncomeBreakdown = {
      year: taxYear,
      eligibleDividends: h.marketValue * 0.018,
      interest: h.type === 'gic' ? h.marketValue * 0.045 : 0,
      capitalGains: 0,
      returnOfCapital: h.type.includes('etf') ? h.marketValue * 0.005 : 0,
      foreignIncome: h.currency === 'USD' ? h.marketValue * 0.012 : 0,
      total: h.marketValue * 0.025,
    }

    return {
      ...h,
      allocation,
      income,
      mer: h.type.includes('etf') ? 0.2 : h.type.includes('mutual_fund') ? 1.8 : undefined,
      performance: {
        return1yr: 8.5 + Math.random() * 6 - 3,
        return3yr: 7.2 + Math.random() * 4 - 2,
        return5yr: 9.1 + Math.random() * 3 - 1.5,
        sourceUrl: `https://www.morningstar.ca/ca/funds/snapshot.aspx?id=${h.ticker}`,
        asOf: `${taxYear}-12-31`,
      },
      verificationStatus: Math.random() > 0.15 ? 'verified' : 'discrepancy',
      verificationNotes: undefined,
      weight: (h.marketValue / totalValue) * 100,
    }
  })

  const discrepancyCount = researchedHoldings.filter(
    (h) => h.verificationStatus === 'discrepancy',
  ).length

  const aggregateAlloc: AllocationBreakdown = researchedHoldings.reduce(
    (acc, h) => {
      const w = h.weight / 100
      acc.equity += h.allocation.equity * w
      acc.fixedIncome += h.allocation.fixedIncome * w
      acc.cash += h.allocation.cash * w
      acc.alternatives += h.allocation.alternatives * w
      acc.canadaEquity += h.allocation.canadaEquity * w
      acc.usEquity += h.allocation.usEquity * w
      acc.internationalEquity += h.allocation.internationalEquity * w
      return acc
    },
    {
      equity: 0,
      fixedIncome: 0,
      cash: 0,
      alternatives: 0,
      canadaEquity: 0,
      usEquity: 0,
      internationalEquity: 0,
    },
  )

  const aggregateIncome: IncomeBreakdown = {
    year: taxYear,
    eligibleDividends: researchedHoldings.reduce((s, h) => s + h.income.eligibleDividends, 0),
    interest: researchedHoldings.reduce((s, h) => s + h.income.interest, 0),
    capitalGains: 0,
    returnOfCapital: researchedHoldings.reduce((s, h) => s + h.income.returnOfCapital, 0),
    foreignIncome: researchedHoldings.reduce((s, h) => s + h.income.foreignIncome, 0),
    total: researchedHoldings.reduce((s, h) => s + h.income.total, 0),
  }

  const weightedMER =
    researchedHoldings.reduce((s, h) => s + (h.mer ?? 0) * (h.weight / 100), 0)

  return {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    holdings: researchedHoldings,
    totalValue,
    currency: 'CAD',
    allocation: aggregateAlloc,
    income: aggregateIncome,
    weightedMER,
    selectedBenchmark: 'XGRO',
    verificationComplete: true,
    discrepancyCount,
  }
}

// ─── Circular Progress SVG ────────────────────────────────────────────────────

function CircularProgress({
  progress,
  stepLabel,
}: {
  progress: number
  stepLabel: string
}) {
  const radius = 72
  const stroke = 8
  const normalised = radius - stroke / 2
  const circumference = 2 * Math.PI * normalised
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      {/* Track ring */}
      <svg
        width={180}
        height={180}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={90}
          cy={90}
          r={normalised}
          fill="none"
          stroke="oklch(1 0 0 / 0.07)"
          strokeWidth={stroke}
        />
        <circle
          cx={90}
          cy={90}
          r={normalised}
          fill="none"
          stroke="oklch(0.80 0.16 85)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
          filter="drop-shadow(0 0 8px oklch(0.80 0.16 85 / 0.6))"
        />
      </svg>

      {/* Centre content */}
      <div className="flex flex-col items-center gap-0.5 z-10">
        <span className="font-data text-4xl font-bold text-primary leading-none tabular-nums">
          {Math.round(progress)}
        </span>
        <span className="font-data text-sm text-primary/70 leading-none">%</span>
        <span className="text-[11px] text-muted-foreground mt-1 text-center leading-tight max-w-[100px]">
          {stepLabel}
        </span>
      </div>
    </div>
  )
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  currentStep,
}: {
  currentStep: ProcessingStep
}) {
  const stepOrder: ProcessingStep[] = ['parsing', 'researching', 'verifying', 'building_report']
  const currentIdx = stepOrder.indexOf(currentStep)

  return (
    <div className="flex items-center gap-0 mt-6 w-full max-w-sm mx-auto">
      {STEPS.map((step, idx) => {
        const stepIdx = stepOrder.indexOf(step.id)
        const isComplete = currentIdx > stepIdx || currentStep === 'complete'
        const isActive = currentIdx === stepIdx
        const isPending = currentIdx < stepIdx

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Node */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'flex items-center justify-center rounded-full transition-all duration-500',
                  'w-8 h-8',
                  isComplete
                    ? 'bg-success/20 text-success border border-success/40'
                    : isActive
                    ? 'bg-primary/20 text-primary border border-primary/60 animate-[pulseGlow_2s_ease-in-out_infinite]'
                    : 'bg-white/5 text-muted-foreground border border-white/10',
                ].join(' ')}
              >
                {isComplete ? <CheckCircle2 size={14} /> : step.icon}
              </div>
              <span
                className={[
                  'text-[10px] font-medium leading-none whitespace-nowrap',
                  isComplete
                    ? 'text-success'
                    : isActive
                    ? 'text-primary'
                    : 'text-muted-foreground',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {idx < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-1 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 rounded-full" />
                <div
                  className="absolute inset-y-0 left-0 bg-primary/60 rounded-full transition-all duration-700"
                  style={{ width: isComplete ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Holding Card ─────────────────────────────────────────────────────────────

function HoldingCard({
  state,
  index,
}: {
  state: HoldingState
  index: number
}) {
  const { holding, status } = state

  const badge = {
    queued: { label: 'Queued', className: 'bg-white/5 text-muted-foreground border-white/10' },
    researching: { label: 'Researching...', className: 'bg-primary/15 text-primary border-primary/30' },
    verifying: { label: 'Verifying...', className: 'bg-accent/15 text-accent border-accent/30' },
    verified: { label: '✓ Verified', className: 'bg-success/15 text-success border-success/30' },
    discrepancy: { label: '⚠ Discrepancy', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  }[status]

  return (
    <div
      className="glass rounded-xl p-4 hover-lift shine-border"
      style={{
        animation: 'fadeUp 0.5s cubic-bezier(0.25,0.1,0.25,1) forwards',
        animationDelay: `${index * 80}ms`,
        opacity: 0,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-mono text-primary font-bold text-base leading-none tracking-wide">
          {holding.ticker}
        </span>
        <span
          className={[
            'text-[10px] px-2 py-0.5 rounded-full border font-medium leading-none whitespace-nowrap',
            badge.className,
          ].join(' ')}
        >
          {badge.label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-snug line-clamp-2 mt-1.5">
        {holding.name}
      </p>
      <div className="flex items-center gap-2 mt-2.5">
        <span className="font-data text-[11px] text-foreground/60">
          {holding.currency === 'CAD' ? 'CA$' : 'US$'}
          {holding.marketValue.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
        </span>
        {status === 'researching' && (
          <span className="flex gap-0.5 items-center">
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Live Log ─────────────────────────────────────────────────────────────────

function LiveLog({
  logs,
  collapsed,
  onToggle,
}: {
  logs: ProcessingLog[]
  collapsed: boolean
  onToggle: () => void
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!collapsed && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, collapsed])

  const levelStyle: Record<ProcessingLog['level'], string> = {
    info: 'text-foreground/80',
    success: 'text-success',
    warning: 'text-yellow-400',
    error: 'text-destructive',
  }

  const levelIcon: Record<ProcessingLog['level'], string> = {
    info: '›',
    success: '✓',
    warning: '⚠',
    error: '✕',
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={!collapsed}
      >
        <span className="flex items-center gap-2 font-medium">
          <span
            className="w-2 h-2 rounded-full bg-primary animate-pulse"
            aria-hidden="true"
          />
          Live Log
          <span className="font-data text-xs bg-white/5 px-1.5 py-0.5 rounded-full">
            {logs.length}
          </span>
        </span>
        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {/* Log body */}
      {!collapsed && (
        <div className="border-t border-white/5 max-h-48 overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin">
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] leading-relaxed font-mono">
              <span className="text-muted-foreground/50 shrink-0 tabular-nums w-[72px]">
                {log.timestamp}
              </span>
              <span className={`shrink-0 w-3 ${levelStyle[log.level]}`}>
                {levelIcon[log.level]}
              </span>
              <span className={levelStyle[log.level]}>
                {log.holding && (
                  <span className="text-primary mr-1">[{log.holding}]</span>
                )}
                {log.message}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}

// ─── Animated heading dots ────────────────────────────────────────────────────

function AnimatedDots({ active }: { active: boolean }) {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '.' : d + '.'))
    }, 500)
    return () => clearInterval(id)
  }, [active])

  return (
    <span className="text-primary/60 font-normal" aria-hidden="true">
      {active ? dots : ''}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProcessingClient() {
  const router = useRouter()

  const [holdings, setHoldings] = useState<RawHolding[]>([])
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear() - 1)
  const [holdingStates, setHoldingStates] = useState<HoldingState[]>([])
  const [status, setStatus] = useState<ProcessingStatus>({
    step: 'parsing',
    progress: 0,
    completedHoldings: 0,
    totalHoldings: 0,
    logs: [],
  })
  const [logCollapsed, setLogCollapsed] = useState(false)
  const [sessionError, setSessionError] = useState(false)
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  const addLog = useCallback(
    (level: ProcessingLog['level'], message: string, holding?: string) => {
      setStatus((prev) => ({
        ...prev,
        logs: [...prev.logs, makeLog(level, message, holding)],
      }))
    },
    [],
  )

  const setProgress = useCallback((progress: number, step: ProcessingStep, currentHolding?: string) => {
    setStatus((prev) => ({ ...prev, progress, step, currentHolding }))
  }, [])

  // Read session on mount, then kick off simulation
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('portfoliolens_session')
      if (!raw) {
        setSessionError(true)
        return
      }
      const session = JSON.parse(raw) as { holdings: RawHolding[]; taxYear: number }
      if (!session.holdings?.length) {
        setSessionError(true)
        return
      }
      setHoldings(session.holdings)
      setTaxYear(session.taxYear ?? new Date().getFullYear() - 1)
      setHoldingStates(session.holdings.map((h) => ({ holding: h, status: 'queued' })))
      setStatus((prev) => ({
        ...prev,
        totalHoldings: session.holdings.length,
      }))
      setStarted(true)
    } catch {
      setSessionError(true)
    }
  }, [])

  // Simulation pipeline
  useEffect(() => {
    if (!started || !holdings.length) return

    let cancelled = false
    const delay = (ms: number) =>
      new Promise<void>((res) => setTimeout(() => { if (!cancelled) res() }, ms))

    async function run() {
      try {
        // ── Step 1: Parse ──────────────────────────────────────────────────
        setProgress(2, 'parsing')
        addLog('info', `Starting analysis for ${holdings.length} holdings`)
        await delay(600)
        setProgress(6, 'parsing')
        addLog('info', 'Validating holding data structure')
        await delay(500)
        setProgress(10, 'parsing')
        addLog('success', `Parsed ${holdings.length} holdings successfully`)
        await delay(300)

        if (cancelled) return

        // ── Step 2: Research each holding ─────────────────────────────────
        setProgress(10, 'researching')
        addLog('info', 'Initialising Claude research pipeline')
        await delay(400)

        const researchRange = 60 // 10→70
        const perHolding = researchRange / holdings.length

        for (let i = 0; i < holdings.length; i++) {
          if (cancelled) return
          const h = holdings[i]

          // Mark as researching
          setHoldingStates((prev) =>
            prev.map((s, idx) => idx === i ? { ...s, status: 'researching' } : s),
          )
          setProgress(10 + i * perHolding, 'researching', h.ticker)
          addLog('info', `Fetching fund data from primary sources`, h.ticker)
          await delay(800 + Math.random() * 800)

          if (cancelled) return
          addLog('info', `Retrieving MER, distributions, asset allocation`, h.ticker)
          await delay(600 + Math.random() * 600)

          if (cancelled) return
          addLog('info', `Calculating ${taxYear} income distributions`, h.ticker)
          await delay(400 + Math.random() * 400)

          if (cancelled) return

          // Mark as verifying (briefly)
          setHoldingStates((prev) =>
            prev.map((s, idx) => idx === i ? { ...s, status: 'verifying' } : s),
          )
          addLog('info', `Cross-referencing with secondary source`, h.ticker)
          await delay(500 + Math.random() * 500)

          if (cancelled) return

          // Mark final status
          const isDiscrepancy = Math.random() < 0.12
          setHoldingStates((prev) =>
            prev.map((s, idx) =>
              idx === i ? { ...s, status: isDiscrepancy ? 'discrepancy' : 'verified' } : s,
            ),
          )
          if (isDiscrepancy) {
            addLog('warning', `Minor discrepancy detected in distribution data`, h.ticker)
          } else {
            addLog('success', `Data verified across sources`, h.ticker)
          }

          setStatus((prev) => ({
            ...prev,
            completedHoldings: i + 1,
            progress: 10 + (i + 1) * perHolding,
          }))

          await delay(200)
        }

        if (cancelled) return

        // ── Step 3: Verify ────────────────────────────────────────────────
        setProgress(70, 'verifying')
        addLog('info', 'Running cross-verification pass')
        await delay(500)
        setProgress(76, 'verifying')
        addLog('info', 'Checking income totals against T3/T5 thresholds')
        await delay(700)
        setProgress(82, 'verifying')
        addLog('info', 'Validating asset allocation weights sum to 100%')
        await delay(600)
        setProgress(88, 'verifying')
        addLog('success', 'Verification pass complete')
        await delay(400)

        if (cancelled) return

        // ── Step 4: Build report ──────────────────────────────────────────
        setProgress(90, 'building_report')
        addLog('info', 'Aggregating portfolio-level metrics')
        await delay(500)
        setProgress(94, 'building_report')
        addLog('info', 'Calculating weighted MER and benchmark comparison')
        await delay(600)
        setProgress(97, 'building_report')
        addLog('info', 'Formatting annual income breakdown by tax category')
        await delay(500)
        setProgress(100, 'complete')
        addLog('success', 'Report generation complete — redirecting')

        if (cancelled) return

        // Store report and navigate
        const report = buildMockReport(holdings, taxYear)
        sessionStorage.setItem('portfoliolens_report', JSON.stringify(report))
        await delay(800)

        if (!cancelled) {
          router.push('/report')
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unexpected error during processing'
          setPipelineError(msg)
          addLog('error', msg)
          setStatus((prev) => ({ ...prev, step: 'error' }))
        }
      }
    }

    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started])

  // ── Error: no session ────────────────────────────────────────────────────────
  if (sessionError) {
    return (
      <main className="min-h-screen flex items-center justify-center pt-16 px-4">
        <div className="glass rounded-2xl p-10 max-w-md w-full text-center space-y-6">
          <div className="w-14 h-14 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} className="text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-semibold mb-2">No Portfolio Data Found</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Session data is missing or expired. Please upload your holdings again to continue.
            </p>
          </div>
          <Button
            onClick={() => router.push('/')}
            className="w-full gap-2"
            variant="outline"
          >
            <ArrowLeft size={16} />
            Go Back
          </Button>
        </div>
      </main>
    )
  }

  // ── Error: pipeline failure ───────────────────────────────────────────────────
  if (pipelineError) {
    return (
      <main className="min-h-screen flex items-center justify-center pt-16 px-4">
        <div className="glass rounded-2xl p-10 max-w-md w-full text-center space-y-6">
          <div className="w-14 h-14 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} className="text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-semibold mb-2">Processing Failed</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{pipelineError}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => {
                setPipelineError(null)
                setStarted(false)
                setTimeout(() => setStarted(true), 50)
              }}
              className="flex-1 gap-2"
            >
              <RefreshCw size={16} />
              Try Again
            </Button>
            <Button
              onClick={() => router.push('/')}
              className="flex-1 gap-2"
              variant="outline"
            >
              <ArrowLeft size={16} />
              Go Back
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // ── Derive active step label ─────────────────────────────────────────────────
  const activeStepConfig = STEPS.find((s) => s.id === status.step) ?? STEPS[0]
  const stepLabel =
    status.step === 'researching' && status.currentHolding
      ? `Researching ${status.currentHolding}`
      : status.step === 'complete'
      ? 'Complete'
      : activeStepConfig.label

  const isProcessing = status.step !== 'complete' && status.step !== 'error'

  // ── Main UI ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            <span className="gradient-text">Analyzing Portfolio</span>
            <AnimatedDots active={isProcessing} />
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Claude is researching each holding from primary sources
          </p>
        </div>

        {/* ── Progress card ───────────────────────────────────────────────── */}
        <div className="glass-strong rounded-2xl p-6 sm:p-8 glow-gold">
          <div className="flex flex-col items-center gap-2">
            <CircularProgress progress={status.progress} stepLabel={stepLabel} />
            <StepIndicator currentStep={status.step} />

            {/* Holdings counter */}
            {status.totalHoldings > 0 && status.step === 'researching' && (
              <p className="text-xs text-muted-foreground mt-2 font-data tabular-nums">
                {status.completedHoldings} / {status.totalHoldings} holdings processed
              </p>
            )}
          </div>
        </div>

        {/* ── Holdings grid ───────────────────────────────────────────────── */}
        {holdingStates.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">
              Holdings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {holdingStates.map((hs, i) => (
                <HoldingCard key={hs.holding.ticker} state={hs} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* ── Live log ────────────────────────────────────────────────────── */}
        {status.logs.length > 0 && (
          <LiveLog
            logs={status.logs}
            collapsed={logCollapsed}
            onToggle={() => setLogCollapsed((v) => !v)}
          />
        )}

        {/* ── Placeholder shimmer while waiting for session ──────────────── */}
        {!started && !sessionError && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="shimmer rounded-xl h-20" />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
