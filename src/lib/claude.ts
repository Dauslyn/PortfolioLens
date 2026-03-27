import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const MODEL = 'claude-sonnet-4-6'
export const MAX_TOKENS = 8192

/**
 * Parse a brokerage statement PDF (base64) or pasted text into holdings.
 * Returns structured JSON.
 */
export const PARSE_SYSTEM = `You are an expert at parsing Canadian brokerage statements.
Extract all investment holdings from the provided document.

For each holding, extract:
- ticker: the trading symbol or fund code (e.g. "XIC", "MAW104", "AAPL")
- name: full fund/company name
- units: number of units/shares held (if available)
- marketValue: market value in the holding's currency (number, no commas)
- currency: "CAD" or "USD"
- type: one of:
  - "canadian_etf" — Canadian-listed ETF (e.g. XIC, ZAG, VSB)
  - "canadian_mutual_fund" — Canadian mutual fund (e.g. Mawer, RBC funds with fund codes)
  - "us_etf" — US-listed ETF (e.g. SPY, VTI, IVV)
  - "stock_ca" — Canadian individual stock (TSX/TSXV listed)
  - "stock_us" — US individual stock (NYSE/NASDAQ listed)
  - "gic" — GIC or term deposit
  - "cash" — cash or money market
  - "other" — anything else

Return ONLY valid JSON in this exact format:
{
  "holdings": [
    {
      "ticker": "XIC",
      "name": "iShares Core S&P/TSX Capped Composite Index ETF",
      "units": 500,
      "marketValue": 15250.00,
      "currency": "CAD",
      "type": "canadian_etf"
    }
  ]
}

If a field is not available, omit it (except ticker, name, marketValue, currency, type which are required).
Do not include any explanation — only the JSON object.`

/**
 * Research a single holding. Returns allocation, income, MER, performance.
 */
export const RESEARCH_SYSTEM = `You are an expert Canadian financial data researcher.
Your job is to research a single investment holding using web searches and document fetching.

For Canadian ETFs and mutual funds:
1. Find the fund company's website (NOT SEDAR+ — it's bot-protected)
2. Fetch the MRFP (Management Report on Fund Performance) PDF — this has the proper 1yr/3yr/5yr/10yr returns table
3. Fetch the ETF Facts or Fund Facts for MER and asset allocation
4. For tax character: check CDS Innovations CTBS (cdsinnovations.ca) or the fund company's tax notices

For US ETFs:
1. Fetch the fund's fact sheet from the provider website (SSGA for SPY, iShares for US-listed, Vanguard, etc.)
2. For 19a-1 tax notices, check the fund company website

For individual stocks:
1. Use Yahoo Finance for price history and dividends
2. Use canadastockchannel.com for Canadian stock DRIP total return

Return ONLY valid JSON — no markdown, no explanation:
{
  "allocation": {
    "equity": 85,
    "fixedIncome": 10,
    "cash": 5,
    "alternatives": 0,
    "canadaEquity": 60,
    "usEquity": 20,
    "internationalEquity": 5
  },
  "income": {
    "year": 2024,
    "eligibleDividends": 0.45,
    "interest": 0.00,
    "capitalGains": 0.10,
    "returnOfCapital": 0.00,
    "foreignIncome": 0.12,
    "total": 0.67
  },
  "mer": 0.20,
  "performance": {
    "return1yr": 18.5,
    "return3yr": 9.2,
    "return5yr": 11.4,
    "return10yr": 8.8,
    "sourceUrl": "https://example.com/mrfp.pdf",
    "asOf": "2024-12-31"
  }
}

Income values are per-unit distributions (CAD). If data is unavailable for a field, use null.
Performance returns are annual compound percentages (e.g. 8.5 means 8.5% per year).`

/**
 * Verification system prompt — re-checks a research result independently.
 */
export const VERIFY_SYSTEM = `You are an independent verification agent for financial data.
You will be given a holding with research data already filled in, including source URLs.

Your job:
1. Re-fetch each sourceUrl independently
2. Re-extract the same data points from scratch
3. Compare your extracted values against the provided research values
4. Flag any discrepancies

Return ONLY valid JSON:
{
  "verificationStatus": "verified",
  "verificationNotes": "All values confirmed from source",
  "verifiedData": {
    "mer": 0.20,
    "performance": { "return1yr": 18.5, "return3yr": 9.2, "return5yr": 11.4, "return10yr": 8.8 }
  },
  "discrepancies": []
}

verificationStatus options:
- "verified" — all values match within rounding tolerance (±0.1%)
- "discrepancy" — one or more values differ materially
- "failed" — could not access sources to verify

discrepancies array (if any):
[{ "field": "return1yr", "researchValue": 18.5, "verificationValue": 17.9 }]`

/** Build a quick log message for the processing stream */
export function logMsg(
  level: 'info' | 'success' | 'warning' | 'error',
  message: string,
  holding?: string,
) {
  return { timestamp: new Date().toISOString(), level, message, holding }
}
