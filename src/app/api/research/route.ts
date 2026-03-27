import { NextResponse } from 'next/server'
import { anthropic, MODEL, MAX_TOKENS, RESEARCH_SYSTEM } from '@/lib/claude'
import type {
  RawHolding,
  ResearchedHolding,
  AllocationBreakdown,
  IncomeBreakdown,
  PerformanceData,
  ResearchRequest,
  ResearchResponse,
} from '@/lib/types'

/** Default empty allocation breakdown */
function emptyAllocation(): AllocationBreakdown {
  return {
    equity: 0,
    fixedIncome: 0,
    cash: 0,
    alternatives: 0,
    canadaEquity: 0,
    usEquity: 0,
    internationalEquity: 0,
  }
}

/** Default empty income breakdown */
function emptyIncome(year: number): IncomeBreakdown {
  return {
    year,
    eligibleDividends: 0,
    interest: 0,
    capitalGains: 0,
    returnOfCapital: 0,
    foreignIncome: 0,
    total: 0,
  }
}

/** Default empty performance */
function emptyPerformance(): PerformanceData {
  return { sourceUrl: '' }
}

/** Extract JSON from Claude's text, tolerating markdown fences */
function extractJson(text: string): unknown {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenceMatch ? fenceMatch[1].trim() : text.trim()
  return JSON.parse(raw)
}

/** Sleep for ms milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface ResearchResult {
  allocation: AllocationBreakdown
  income: IncomeBreakdown
  mer?: number
  performance: PerformanceData
}

async function researchHolding(
  holding: RawHolding,
  taxYear: number,
): Promise<ResearchResult | null> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: RESEARCH_SYSTEM,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [
      {
        role: 'user',
        content: `Research this holding for Canadian tax year ${taxYear}:
Ticker: ${holding.ticker}
Name: ${holding.name}
Type: ${holding.type}
Currency: ${holding.currency}

Return the JSON data as specified in your instructions.`,
      },
    ],
  })

  // Find the final text block (after any tool use turns)
  const textBlock = response.content.findLast((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') return null

  const parsed = extractJson(textBlock.text) as ResearchResult
  return parsed
}

export async function POST(req: Request): Promise<NextResponse<ResearchResponse>> {
  let body: ResearchRequest

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ holdings: [], error: 'Invalid JSON body' }, { status: 400 })
  }

  const { holdings, taxYear } = body

  if (!Array.isArray(holdings) || holdings.length === 0) {
    return NextResponse.json({ holdings: [], error: 'holdings array is required' }, { status: 400 })
  }

  if (!taxYear || typeof taxYear !== 'number') {
    return NextResponse.json({ holdings: [], error: 'taxYear is required' }, { status: 400 })
  }

  const researched: ResearchedHolding[] = []

  for (let i = 0; i < holdings.length; i++) {
    const holding = holdings[i]

    // Delay between requests (except before the first one) to avoid rate limits
    if (i > 0) {
      await sleep(500)
    }

    try {
      const result = await researchHolding(holding, taxYear)

      if (!result) {
        researched.push({
          ...holding,
          allocation: emptyAllocation(),
          income: emptyIncome(taxYear),
          performance: emptyPerformance(),
          verificationStatus: 'failed',
          verificationNotes: 'Claude returned no text response',
          weight: 0,
        })
        continue
      }

      researched.push({
        ...holding,
        allocation: result.allocation ?? emptyAllocation(),
        income: result.income ?? emptyIncome(taxYear),
        mer: result.mer ?? undefined,
        performance: result.performance ?? emptyPerformance(),
        verificationStatus: 'pending',
        weight: 0, // weights are calculated in the report route
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      researched.push({
        ...holding,
        allocation: emptyAllocation(),
        income: emptyIncome(taxYear),
        performance: emptyPerformance(),
        verificationStatus: 'failed',
        verificationNotes: `Research failed: ${message}`,
        weight: 0,
      })
    }
  }

  return NextResponse.json({ holdings: researched })
}
