'use client'

import { useState } from 'react'
import type { Benchmark } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const BENCHMARKS: { value: Benchmark; label: string }[] = [
  { value: 'XGRO', label: 'XGRO — 80/20 Growth' },
  { value: 'XEQT', label: 'XEQT — 100% Equity' },
  { value: 'XBAL', label: 'XBAL — 60/40 Balanced' },
  { value: 'XDIV', label: 'XDIV — Canadian Dividend' },
]

const CUSTOM_VALUE = '__custom__'

interface BenchmarkSelectorProps {
  value: string
  onBenchmarkChange: (benchmark: string) => void
}

export default function BenchmarkSelector({
  value,
  onBenchmarkChange,
}: BenchmarkSelectorProps) {
  const isKnown = BENCHMARKS.some(b => b.value === value)
  const [showCustom, setShowCustom] = useState(!isKnown)
  const [customTicker, setCustomTicker] = useState(!isKnown ? value : '')
  const [selectValue, setSelectValue] = useState(isKnown ? value : CUSTOM_VALUE)

  const handleSelectChange = (newValue: string | null) => {
    if (!newValue) return
    setSelectValue(newValue)
    if (newValue === CUSTOM_VALUE) {
      setShowCustom(true)
      if (customTicker.trim()) {
        onBenchmarkChange(customTicker.trim().toUpperCase())
      }
    } else {
      setShowCustom(false)
      onBenchmarkChange(newValue)
    }
  }

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase()
    setCustomTicker(val)
    if (val.trim()) {
      onBenchmarkChange(val.trim())
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground font-medium hidden sm:inline">
        Benchmark:
      </span>
      <div className="flex items-center gap-2">
        <Select value={selectValue} onValueChange={handleSelectChange}>
          <SelectTrigger className="glass border-primary/20 text-sm min-w-[180px] h-9">
            <SelectValue placeholder="Select benchmark" />
          </SelectTrigger>
          <SelectContent>
            {BENCHMARKS.map(b => (
              <SelectItem key={b.value} value={b.value}>
                {b.label}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_VALUE}>Custom ticker…</SelectItem>
          </SelectContent>
        </Select>

        {showCustom && (
          <input
            type="text"
            value={customTicker}
            onChange={handleCustomInput}
            placeholder="e.g. SPY"
            maxLength={10}
            className={[
              'h-9 w-28 rounded-lg px-3 text-sm font-mono',
              'glass border border-primary/20',
              'text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20',
              'transition-colors uppercase',
            ].join(' ')}
          />
        )}
      </div>
    </div>
  )
}
