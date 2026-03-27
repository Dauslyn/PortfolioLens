import { NextResponse } from 'next/server'
import { anthropic, MODEL, MAX_TOKENS, VERIFY_SYSTEM } from '@/lib/claude'
import type {
  ResearchedHolding,
  VerificationDiscrepancy,
  VerifyRequest,
  VerifyResponse,
} from '@/lib/types'

interface VerifyResult {
  verificationStatus: 'verified' | 'discrepancy' | 'failed'
  verificationNotes?: string
  verifiedData?: {
    mer?: number
    performance?: {
      return1yr?: number
      return3yr?: number
      return5yr?: number
      return10yr?: number
    }
  }
  discrepancies?: Array<{
    field: string
    researchValue: string | number
    verificationValue: string | number
  }>
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

async function verifyHolding(holding: ResearchedHolding): Promise<VerifyResult | null> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: VERIFY_SYSTEM,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [
      {
        role: 'user',
        content: `Verify this holding's data by re-fetching the source:
${JSON.stringify(holding, null, 2)}

Re-fetch the sourceUrl and re-extract the data. Compare against the provided values.`,
      },
    ],
  })

  const textBlock = response.content.findLast((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') return null

  return extractJson(textBlock.text) as VerifyResult
}

export async function POST(req: Request): Promise<NextResponse<VerifyResponse>> {
  let body: VerifyRequest

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { holdings: [], discrepancies: [], error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const { holdings } = body

  if (!Array.isArray(holdings) || holdings.length === 0) {
    return NextResponse.json(
      { holdings: [], discrepancies: [], error: 'holdings array is required' },
      { status: 400 },
    )
  }

  const updatedHoldings: ResearchedHolding[] = []
  const allDiscrepancies: VerificationDiscrepancy[] = []

  for (let i = 0; i < holdings.length; i++) {
    const holding = holdings[i]

    // Skip holdings that already failed during research
    if (holding.verificationStatus === 'failed') {
      updatedHoldings.push(holding)
      continue
    }

    // Delay between requests (except before the first one)
    if (i > 0) {
      await sleep(500)
    }

    try {
      const result = await verifyHolding(holding)

      if (!result) {
        updatedHoldings.push({
          ...holding,
          verificationStatus: 'failed',
          verificationNotes: 'Claude returned no text response during verification',
        })
        continue
      }

      // Collect any discrepancies and attach the ticker
      if (result.discrepancies && result.discrepancies.length > 0) {
        for (const d of result.discrepancies) {
          allDiscrepancies.push({
            holdingTicker: holding.ticker,
            field: d.field,
            researchValue: d.researchValue,
            verificationValue: d.verificationValue,
          })
        }
      }

      // Merge verified data back onto the holding if verification succeeded
      const verifiedPerf =
        result.verifiedData?.performance && result.verificationStatus === 'verified'
          ? {
              ...holding.performance,
              ...result.verifiedData.performance,
            }
          : holding.performance

      updatedHoldings.push({
        ...holding,
        mer:
          result.verifiedData?.mer !== undefined && result.verificationStatus === 'verified'
            ? result.verifiedData.mer
            : holding.mer,
        performance: verifiedPerf,
        verificationStatus: result.verificationStatus,
        verificationNotes: result.verificationNotes,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      updatedHoldings.push({
        ...holding,
        verificationStatus: 'failed',
        verificationNotes: `Verification failed: ${message}`,
      })
    }
  }

  return NextResponse.json({ holdings: updatedHoldings, discrepancies: allDiscrepancies })
}
