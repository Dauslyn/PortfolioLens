'use client'

import { useState } from 'react'
import type { PortfolioReport } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Download, Check } from 'lucide-react'

interface ExportButtonProps {
  report: PortfolioReport
}

export default function ExportButton({ report }: ExportButtonProps) {
  const [exported, setExported] = useState(false)

  const handleExport = () => {
    const date = new Date(report.generatedAt)
    const dateStr = date.toISOString().slice(0, 10)
    const filename = `portfoliolens-report-${dateStr}.json`

    const json = JSON.stringify(report, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)

    setExported(true)
    setTimeout(() => setExported(false), 2000)
  }

  return (
    <Button
      variant="outline"
      size="default"
      onClick={handleExport}
      className={[
        'gap-2 border-primary/30 text-primary',
        'hover:bg-primary/10 hover:border-primary/60',
        'transition-all duration-200',
        exported ? 'border-[oklch(0.72_0.16_145)]/60 text-[oklch(0.72_0.16_145)]' : '',
      ].join(' ')}
      aria-label="Export report as JSON"
    >
      {exported ? (
        <>
          <Check className="size-4" />
          <span>Exported!</span>
        </>
      ) : (
        <>
          <Download className="size-4" />
          <span>Export JSON</span>
        </>
      )}
    </Button>
  )
}
