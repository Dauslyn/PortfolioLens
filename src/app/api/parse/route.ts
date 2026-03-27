import { NextResponse } from 'next/server'
import { anthropic, MODEL, MAX_TOKENS, PARSE_SYSTEM } from '@/lib/claude'
import type { RawHolding, ParseRequest, ParseResponse } from '@/lib/types'

/**
 * Extracts a JSON object from Claude's text response.
 * Handles cases where Claude wraps JSON in markdown code fences.
 */
function extractJson(text: string): unknown {
  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenceMatch ? fenceMatch[1].trim() : text.trim()
  return JSON.parse(raw)
}

export async function POST(req: Request): Promise<NextResponse<ParseResponse>> {
  let body: ParseRequest

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ holdings: [], error: 'Invalid JSON body' }, { status: 400 })
  }

  const { pdfBase64, manualText } = body

  if (!pdfBase64 && !manualText) {
    return NextResponse.json(
      { holdings: [], error: 'Provide either pdfBase64 or manualText' },
      { status: 400 },
    )
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: PARSE_SYSTEM,
      messages: [
        {
          role: 'user',
          content: pdfBase64
            ? [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: pdfBase64,
                  },
                },
                {
                  type: 'text',
                  text: 'Extract all investment holdings from this brokerage statement.',
                },
              ]
            : [
                {
                  type: 'text',
                  text: `Extract holdings from this text:\n\n${manualText}`,
                },
              ],
        },
      ],
    })

    // Pull the text content from the response
    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { holdings: [], error: 'No text response from Claude' },
        { status: 502 },
      )
    }

    const parsed = extractJson(textBlock.text) as { holdings: RawHolding[] }

    if (!parsed || !Array.isArray(parsed.holdings)) {
      return NextResponse.json(
        { holdings: [], error: 'Claude returned unexpected JSON shape' },
        { status: 502 },
      )
    }

    return NextResponse.json({ holdings: parsed.holdings })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ holdings: [], error: message }, { status: 500 })
  }
}
