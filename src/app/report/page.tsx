import type { ReactElement } from 'react'
import Navbar from '@/components/layout/Navbar'
import PageBackground from '@/components/layout/PageBackground'
import ReportClient from '@/components/report/ReportClient'

export const metadata = {
  title: 'Portfolio Report — PortfolioLens',
  description: 'Comprehensive portfolio analysis: allocation, income, MER, and performance benchmarking.',
}

export default function ReportPage(): ReactElement {
  return (
    <>
      <PageBackground />
      <Navbar />
      <ReportClient />
    </>
  )
}
