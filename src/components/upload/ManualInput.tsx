'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PLACEHOLDER = `Paste your holdings here, e.g.:
XIC   iShares Core S&P/TSX Capped Composite ETF   500 units   $15,250 CAD
ZAG   BMO Aggregate Bond Index ETF   200 units   $4,100 CAD
SPY   SPDR S&P 500 ETF Trust   50 units   $18,500 USD`

// Build year options: current year and 5 years back
function buildYearOptions(): number[] {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => currentYear - i)
}

export default function ManualInput() {
  const router = useRouter()
  const years = buildYearOptions()
  // Default to last year (tax year convention)
  const [selectedYear, setSelectedYear] = useState<number>(years[1])
  const [holdings, setHoldings] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = useCallback(async () => {
    const trimmed = holdings.trim()
    if (!trimmed) {
      setError('Please paste your holdings before analyzing.')
      return
    }
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          text: trimmed,
          taxYear: selectedYear,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData?.error ?? `Server error: ${response.status}`)
      }

      const data = await response.json()

      sessionStorage.setItem(
        'portfoliolens_session',
        JSON.stringify({
          source: 'manual',
          taxYear: selectedYear,
          uploadedAt: new Date().toISOString(),
          ...data,
        })
      )

      router.push('/processing')
    } catch (err) {
      setIsLoading(false)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    }
  }, [holdings, selectedYear, isLoading, router])

  return (
    <div className="w-full space-y-4">
      {/* Textarea */}
      <textarea
        value={holdings}
        onChange={(e) => {
          setHoldings(e.target.value)
          if (error) setError(null)
        }}
        placeholder={PLACEHOLDER}
        disabled={isLoading}
        rows={9}
        className={cn(
          'w-full min-h-[200px] resize-y rounded-xl px-4 py-3',
          'bg-muted/50 border border-border',
          'text-sm text-foreground placeholder:text-muted-foreground/50',
          'font-[family-name:var(--font-jetbrains)] leading-relaxed',
          'outline-none ring-0',
          'focus:border-primary/40 focus:bg-muted/70',
          'transition-colors duration-150',
          'disabled:opacity-60 disabled:cursor-not-allowed'
        )}
      />

      {/* Controls row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Year selector */}
        <div className="flex items-center gap-2.5">
          <label
            htmlFor="tax-year"
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            Tax year:
          </label>
          <select
            id="tax-year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            disabled={isLoading}
            className={cn(
              'h-8 rounded-lg border border-input bg-muted/50 px-2.5',
              'text-sm text-foreground',
              'outline-none focus:border-primary/40 focus:ring-0',
              'transition-colors duration-150',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              'cursor-pointer'
            )}
          >
            {years.map((year) => (
              <option key={year} value={year} className="bg-card text-foreground">
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Analyze button */}
        <Button
          onClick={handleAnalyze}
          disabled={isLoading || !holdings.trim()}
          className={cn(
            'h-10 px-6 text-sm font-semibold sm:h-10',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 disabled:opacity-50',
            'transition-all duration-200',
            !isLoading && holdings.trim() && 'animate-[pulseGlow_2s_ease-in-out_infinite]'
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin shrink-0" />
              Analyzing...
            </>
          ) : (
            'Analyze Holdings'
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5">
          <AlertCircle className="size-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Character count hint */}
      {holdings.length > 0 && !error && (
        <p className="text-xs text-muted-foreground/60 text-right">
          {holdings.trim().split('\n').filter(Boolean).length} line
          {holdings.trim().split('\n').filter(Boolean).length !== 1 ? 's' : ''} entered
        </p>
      )}
    </div>
  )
}
