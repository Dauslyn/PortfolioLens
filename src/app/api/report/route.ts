import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { anthropic, MODEL, MAX_TOKENS } from '@/lib/claude'
import {
  calculatePortfolioWeights,
  totalPortfolioValue,
  aggregateAllocation,
  aggregateIncome,
  weightedMER,
} from '@/lib/portfolio-math'
import type {
  ResearchedHolding,
  PortfolioReport,
  BenchmarkPerformance,
  Benchmark,
} from '@/lib/types'

const USD_TO_CAD = 1.36

/** Benchmark fetch system prompt */
const BENCHMARK_SYSTEM = `You are a financial data researcher. Return ONLY valid JSON, no explanation.`

interface ReportRequest {
  holdings: ResearchedHolding[]
  selectedBenchmark: string
  taxYear: number
}

interface ReportResponse {
  report?: PortfolioReport
  error?: string
}

/** Extract JSON from Claude's text, tolerating markdown fences */
function extractJson(text: string): unknown {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenceMatch ? fenceMatch[1].trim() : text.trim()
  return JSON.parse(raw)
}

/**
 * Fetches benchmark performance for the given ticker using Claude + web search.
 * Returns null if the fetch fails — report is still returned without benchmark data.
 */
async function fetchBenchmarkPerformance(
  ticker: string,
): Promise<BenchmarkPerformance | null> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: BENCHMARK_SYSTEM,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [
        {
          role: 'user',
          content: `Fetch the current 1-year, 3-year, 5-year, and 10-year annualized returns for the ETF with ticker ${ticker} (traded on the Toronto Stock Exchange). Return JSON in this exact shape:
{
  "ticker": "${ticker}",
  "return1yr": <number or null>,
  "return3yr": <number or null>,
  "return5yr": <number or null>,
  "return10yr": <number or null>
}
Returns are percentages (e.g. 8.5 means 8.5%). Use null for unavailable periods.`,
        },
      ],
    })

    const textBlock = response.content.findLast((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return null

    return extractJson(textBlock.text) as BenchmarkPerformance
  } catch {
    return null
  }
}

export async function POST(req: Request): Promise<NextResponse<ReportResponse>> {
  let body: ReportRequest

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { holdings, selectedBenchmark, taxYear } = body

  if (!Array.isArray(holdings) || holdings.length === 0) {
    return NextResponse.json({ error: 'holdings array is required' }, { status: 400 })
  }
  if (!selectedBenchmark) {
    return NextResponse.json({ error: 'selectedBenchmark is required' }, { status: 400 })
  }
  if (!taxYear || typeof taxYear !== 'number') {
    return NextResponse.json({ error: 'taxYear is required' }, { status: 400 })
  }

  try {
    // 1. Assign portfolio weights (converts USD → CAD at fixed rate)
    const weightedHoldings = calculatePortfolioWeights(holdings, USD_TO_CAD)

    // 2. Total portfolio value in CAD
    const totalValue = totalPortfolioValue(holdings, USD_TO_CAD)

    // 3. Weighted-average asset allocation
    const allocation = aggregateAllocation(weightedHoldings)

    // 4. Aggregate income for the tax year
    const income = aggregateIncome(weightedHoldings, taxYear)

    // 5. Weighted-average MER
    const mer = weightedMER(weightedHoldings)

    // 6. Fetch benchmark performance
    const benchmarkPerformance = await fetchBenchmarkPerformance(selectedBenchmark)

    // 7. Determine verification completeness
    const failedCount = weightedHoldings.filter(
      (h) => h.verificationStatus === 'failed',
    ).length
    const discrepancyCount = weightedHoldings.filter(
      (h) => h.verificationStatus === 'discrepancy',
    ).length
    const verificationComplete =
      failedCount === 0 &&
      weightedHoldings.every(
        (h) => h.verificationStatus === 'verified' || h.verificationStatus === 'discrepancy',
      )

    const report: PortfolioReport = {
      id: randomUUID(),
      generatedAt: new Date().toISOString(),
      holdings: weightedHoldings,
      totalValue,
      currency: 'CAD',
      allocation,
      income,
      weightedMER: mer,
      selectedBenchmark: selectedBenchmark as Benchmark,
      benchmarkPerformance: benchmarkPerformance ?? undefined,
      verificationComplete,
      discrepancyCount,
    }

    return NextResponse.json({ report })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
