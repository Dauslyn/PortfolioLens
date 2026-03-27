'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { PortfolioReport } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ArrowLeft, LayoutDashboard, ListOrdered } from 'lucide-react'
import SummaryStats from '@/components/report/SummaryStats'
import BenchmarkSelector from '@/components/report/BenchmarkSelector'
import ExportButton from '@/components/report/ExportButton'
import { AllocationChart } from '@/components/report/AllocationChart'
import { IncomeChart } from '@/components/report/IncomeChart'
import PerformanceTable from '@/components/report/PerformanceTable'
import HoldingsDetail from '@/components/report/HoldingsDetail'

const MOCK_REPORT: PortfolioReport = {
  id: 'mock-001',
  generatedAt: new Date().toISOString(),
  totalValue: 487350,
  currency: 'CAD',
  weightedMER: 0.18,
  selectedBenchmark: 'XGRO',
  verificationComplete: true,
  discrepancyCount: 0,
  allocation: {
    equity: 80,
    fixedIncome: 15,
    cash: 5,
    alternatives: 0,
    canadaEquity: 35,
    usEquity: 35,
    internationalEquity: 10,
  },
  income: {
    year: 2024,
    eligibleDividends: 2840,
    interest: 420,
    capitalGains: 680,
    returnOfCapital: 0,
    foreignIncome: 1120,
    total: 5060,
  },
  benchmarkPerformance: {
    ticker: 'XGRO',
    return1yr: 19.2,
    return3yr: 8.8,
    return5yr: 10.4,
    return10yr: null as unknown as undefined,
  },
  holdings: [
    {
      ticker: 'XIC',
      name: 'iShares Core S&P/TSX Capped Composite ETF',
      units: 850,
      marketValue: 28560,
      currency: 'CAD',
      type: 'canadian_etf',
      weight: 5.86,
      mer: 0.06,
      verificationStatus: 'verified',
      allocation: { equity: 100, fixedIncome: 0, cash: 0, alternatives: 0, canadaEquity: 100, usEquity: 0, internationalEquity: 0 },
      income: { year: 2024, eligibleDividends: 0.48, interest: 0, capitalGains: 0.02, returnOfCapital: 0, foreignIncome: 0, total: 0.50 },
      performance: { return1yr: 21.6, return3yr: 10.2, return5yr: 9.8, return10yr: 8.4, sourceUrl: 'https://example.com', asOf: '2024-12-31' },
    },
    {
      ticker: 'ZAG',
      name: 'BMO Aggregate Bond Index ETF',
      units: 400,
      marketValue: 36800,
      currency: 'CAD',
      type: 'canadian_etf',
      weight: 7.55,
      mer: 0.09,
      verificationStatus: 'verified',
      allocation: { equity: 0, fixedIncome: 100, cash: 0, alternatives: 0, canadaEquity: 0, usEquity: 0, internationalEquity: 0 },
      income: { year: 2024, eligibleDividends: 0, interest: 1.42, capitalGains: 0, returnOfCapital: 0, foreignIncome: 0, total: 1.42 },
      performance: { return1yr: 4.2, return3yr: -1.8, return5yr: 0.4, return10yr: 2.1, sourceUrl: 'https://example.com', asOf: '2024-12-31' },
    },
    {
      ticker: 'XUS',
      name: 'iShares Core S&P 500 Index ETF (CAD-Hedged)',
      units: 1200,
      marketValue: 58200,
      currency: 'CAD',
      type: 'canadian_etf',
      weight: 11.94,
      mer: 0.10,
      verificationStatus: 'verified',
      allocation: { equity: 100, fixedIncome: 0, cash: 0, alternatives: 0, canadaEquity: 0, usEquity: 100, internationalEquity: 0 },
      income: { year: 2024, eligibleDividends: 0, interest: 0, capitalGains: 0.15, returnOfCapital: 0, foreignIncome: 0.58, total: 0.73 },
      performance: { return1yr: 25.4, return3yr: 12.1, return5yr: 14.8, return10yr: 13.2, sourceUrl: 'https://example.com', asOf: '2024-12-31' },
    },
    {
      ticker: 'MAW104',
      name: 'Mawer Canadian Equity Fund',
      units: 650,
      marketValue: 42250,
      currency: 'CAD',
      type: 'canadian_mutual_fund',
      weight: 8.67,
      mer: 0.94,
      verificationStatus: 'verified',
      allocation: { equity: 97, fixedIncome: 0, cash: 3, alternatives: 0, canadaEquity: 97, usEquity: 0, internationalEquity: 0 },
      income: { year: 2024, eligibleDividends: 1.85, interest: 0, capitalGains: 2.40, returnOfCapital: 0, foreignIncome: 0, total: 4.25 },
      performance: { return1yr: 18.9, return3yr: 9.6, return5yr: 11.2, return10yr: 10.8, sourceUrl: 'https://example.com', asOf: '2024-12-31' },
    },
  ],
}

export default function ReportClient() {
  const [report, setReport] = useState<PortfolioReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('portfoliolens_report')
      if (stored) {
        const parsed = JSON.parse(stored) as PortfolioReport
        setReport(parsed)
      } else {
        setReport(MOCK_REPORT)
      }
    } catch {
      setReport(MOCK_REPORT)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleBenchmarkChange = (benchmark: string) => {
    if (!report) return
    setReport(prev => prev ? { ...prev, selectedBenchmark: benchmark } : prev)
  }

  if (loading) {
    return (
      <main className="min-h-screen pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <p className="text-muted-foreground text-sm">Loading report…</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!report) {
    return (
      <main className="min-h-screen pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center h-64 gap-6">
            <div className="text-center">
              <p className="text-xl font-medium text-foreground mb-2">No report found</p>
              <p className="text-muted-foreground text-sm">Upload a portfolio statement to generate a report.</p>
            </div>
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="size-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const generatedDate = new Date(report.generatedAt).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <main className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* ── Top bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text tracking-tight">Portfolio Report</h1>
            <p className="text-sm text-muted-foreground mt-1">Generated {generatedDate}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <BenchmarkSelector
              value={report.selectedBenchmark}
              onBenchmarkChange={handleBenchmarkChange}
            />
            <ExportButton report={report} />
          </div>
        </div>

        {/* ── Summary stats row ── */}
        <SummaryStats report={report} />

        {/* ── Tabbed content ── */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="size-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="holdings" className="gap-2">
              <ListOrdered className="size-4" />
              Holdings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AllocationChart allocation={report.allocation} />
              <IncomeChart income={report.income} />
            </div>

            {/* Performance table — full width */}
            <PerformanceTable
              holdings={report.holdings}
              benchmark={report.benchmarkPerformance}
              selectedBenchmark={report.selectedBenchmark}
            />
          </TabsContent>

          <TabsContent value="holdings">
            <HoldingsDetail holdings={report.holdings} />
          </TabsContent>
        </Tabs>

      </div>
    </main>
  )
}
