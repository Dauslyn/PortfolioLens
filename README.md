# PortfolioLens

AI-powered portfolio analysis tool for Canadian financial advisors. Upload a brokerage statement PDF or paste holdings — Claude researches every fund/ETF/stock from primary sources, verifies each data point with an independent agent, and generates a comprehensive report.

## What it does

- **Parses** brokerage statements (PDF or pasted text) into structured holdings
- **Researches** each holding: asset allocation, income distributions (eligible dividends, interest, capital gains, ROC, foreign income), MER, and 1/3/5/10yr performance from MRFP documents
- **Verifies** — a second independent agent re-fetches each source and flags discrepancies
- **Reports** — asset allocation chart, income breakdown, performance vs benchmark (XGRO/XEQT/XBAL/XDIV), weighted MER, and full holdings detail
- **Exports** report as JSON for use in Plan Builder

## Getting started

```bash
# 1. Clone the repo
git clone https://github.com/Dauslyn/PortfolioLens.git
cd PortfolioLens

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.local.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# 4. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech stack

- Next.js 16 (App Router, Turbopack)
- React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Claude API (`claude-sonnet-4-6`) — PDF parsing, web research, verification
- Recharts — allocation/income/performance charts
- Lucide React — icons

## Data sources

All free, no paid APIs:
- **Canadian ETFs/mutual funds**: ETF Facts + MRFP PDFs from fund company websites
- **DFA Canada**: dimensional.com/ca-en/document-center
- **US ETFs**: Provider fact sheets (SSGA, iShares, Vanguard)
- **Tax character**: CDS Innovations CTBS (annually), fund company T3/T5 notices
- **Stocks**: Yahoo Finance, canadastockchannel.com

Note: SEDAR+ is bot-protected — the app uses fund company websites directly.

## Part of Finance Hub

One of 13-14 advisor tools being built. Each tool lives in its own repo.
