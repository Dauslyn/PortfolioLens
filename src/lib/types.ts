export type HoldingType =
  | 'canadian_etf'
  | 'canadian_mutual_fund'
  | 'us_etf'
  | 'stock_ca'
  | 'stock_us'
  | 'gic'
  | 'cash'
  | 'other'

export type Benchmark = 'XGRO' | 'XEQT' | 'XBAL' | 'XDIV' | string

export interface RawHolding {
  ticker: string
  name: string
  units?: number
  marketValue: number
  currency: 'CAD' | 'USD'
  type: HoldingType
}

export interface AllocationBreakdown {
  equity: number        // portfolio weight % allocated to equity
  fixedIncome: number
  cash: number
  alternatives: number
  canadaEquity: number  // geographic sub-breakdown of equity
  usEquity: number
  internationalEquity: number
}

export interface IncomeBreakdown {
  year: number
  eligibleDividends: number   // CAD
  interest: number
  capitalGains: number        // realized
  returnOfCapital: number
  foreignIncome: number       // all non-Canadian income = foreign
  total: number
}

export interface PerformanceData {
  return1yr?: number   // percentage e.g. 8.5 means 8.5%
  return3yr?: number
  return5yr?: number
  return10yr?: number
  sourceUrl: string
  asOf?: string
}

export interface ResearchedHolding extends RawHolding {
  allocation: AllocationBreakdown
  income: IncomeBreakdown
  mer?: number         // management expense ratio %
  performance: PerformanceData
  verificationStatus: 'pending' | 'verified' | 'discrepancy' | 'failed'
  verificationNotes?: string
  weight: number       // % of total portfolio value
}

export interface BenchmarkPerformance {
  ticker: Benchmark
  return1yr?: number
  return3yr?: number
  return5yr?: number
  return10yr?: number
}

export interface PortfolioReport {
  id: string
  clientId?: string
  generatedAt: string
  holdings: ResearchedHolding[]
  totalValue: number
  currency: 'CAD'
  allocation: AllocationBreakdown
  income: IncomeBreakdown
  weightedMER: number
  selectedBenchmark: Benchmark
  benchmarkPerformance?: BenchmarkPerformance
  verificationComplete: boolean
  discrepancyCount: number
}

export type ProcessingStep =
  | 'uploading'
  | 'parsing'
  | 'researching'
  | 'verifying'
  | 'building_report'
  | 'complete'
  | 'error'

export interface ProcessingLog {
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  holding?: string
}

export interface ProcessingStatus {
  step: ProcessingStep
  progress: number
  currentHolding?: string
  completedHoldings: number
  totalHoldings: number
  logs: ProcessingLog[]
  error?: string
}

export interface ParseRequest {
  pdfBase64?: string
  manualText?: string
}

export interface ParseResponse {
  holdings: RawHolding[]
  error?: string
}

export interface ResearchRequest {
  holdings: RawHolding[]
  taxYear: number
}

export interface ResearchResponse {
  holdings: ResearchedHolding[]
  error?: string
}

export interface VerifyRequest {
  holdings: ResearchedHolding[]
}

export interface VerificationDiscrepancy {
  holdingTicker: string
  field: string
  researchValue: string | number
  verificationValue: string | number
}

export interface VerifyResponse {
  holdings: ResearchedHolding[]
  discrepancies: VerificationDiscrepancy[]
  error?: string
}
