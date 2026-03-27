import type { ReactElement } from 'react'
import Navbar from '@/components/layout/Navbar'
import PageBackground from '@/components/layout/PageBackground'
import ProcessingClient from '@/components/processing/ProcessingClient'

export const metadata = {
  title: 'Analyzing Portfolio — PortfolioLens',
  description: 'Claude is researching each holding from primary sources.',
}

export default function ProcessingPage(): ReactElement {
  return (
    <>
      <PageBackground />
      <Navbar />
      <ProcessingClient />
    </>
  )
}
