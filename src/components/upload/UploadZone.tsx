'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadZone() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('Reading statement...')
  const [error, setError] = useState<string | null>(null)

  const acceptFile = useCallback((file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.')
      return
    }
    setError(null)
    setSelectedFile(file)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) acceptFile(file)
    },
    [acceptFile]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) acceptFile(file)
    },
    [acceptFile]
  )

  const handleClick = useCallback(() => {
    if (!isLoading) inputRef.current?.click()
  }, [isLoading])

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile || isLoading) return

    setIsLoading(true)
    setProgress(10)
    setStatusText('Reading statement...')
    setError(null)

    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Strip the data URL prefix to get raw base64
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(selectedFile)
      })

      setProgress(30)
      setStatusText('Sending to analysis pipeline...')

      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pdf',
          filename: selectedFile.name,
          fileSize: selectedFile.size,
          base64,
        }),
      })

      setProgress(70)
      setStatusText('Processing response...')

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData?.error ?? `Server error: ${response.status}`)
      }

      const data = await response.json()

      setProgress(95)
      setStatusText('Preparing session...')

      sessionStorage.setItem(
        'portfoliolens_session',
        JSON.stringify({
          source: 'pdf',
          filename: selectedFile.name,
          uploadedAt: new Date().toISOString(),
          ...data,
        })
      )

      setProgress(100)
      router.push('/processing')
    } catch (err) {
      setIsLoading(false)
      setProgress(0)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    }
  }, [selectedFile, isLoading, router])

  return (
    <div className="w-full space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload PDF brokerage statement"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
        className={cn(
          'relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center gap-4',
          'rounded-2xl border-2 border-dashed p-8 text-center',
          'transition-all duration-200',
          isDragOver
            ? 'border-primary/60 bg-primary/5'
            : selectedFile
            ? 'border-success/40 bg-success/5'
            : 'border-primary/20 hover:border-primary/40 hover:bg-primary/[0.03]',
          isLoading && 'pointer-events-none opacity-80'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={handleInputChange}
          tabIndex={-1}
        />

        {!selectedFile ? (
          <>
            {/* Upload icon */}
            <div
              className={cn(
                'flex size-16 items-center justify-center rounded-2xl',
                'bg-primary/10 transition-transform duration-200',
                isDragOver && 'scale-110'
              )}
            >
              <UploadCloud className="size-8 text-primary" strokeWidth={1.5} />
            </div>

            <div className="space-y-1.5">
              <p className="text-base font-semibold text-foreground">
                Drop your brokerage statement here
              </p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>

            <p className="text-xs text-muted-foreground/70 max-w-xs leading-relaxed">
              Supports PDF — TD, CIBC, RBC, Fidelity, National Bank, Questrade and more
            </p>
          </>
        ) : (
          <>
            {/* File selected state */}
            <div className="flex size-16 items-center justify-center rounded-2xl bg-success/10">
              <FileText className="size-8 text-success" strokeWidth={1.5} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 justify-center">
                <CheckCircle2 className="size-4 text-success shrink-0" />
                <p className="text-sm font-semibold text-foreground truncate max-w-[280px]">
                  {selectedFile.name}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatBytes(selectedFile.size)}
              </p>
            </div>

            {!isLoading && (
              <p
                className="text-xs text-muted-foreground/60 underline-offset-2 hover:text-muted-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedFile(null)
                  setError(null)
                  if (inputRef.current) inputRef.current.value = ''
                }}
              >
                Choose a different file
              </p>
            )}
          </>
        )}

        {/* Drag overlay indicator */}
        {isDragOver && (
          <div className="absolute inset-0 rounded-2xl bg-primary/5 pointer-events-none" />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5">
          <AlertCircle className="size-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-center">{statusText}</p>
        </div>
      )}

      {/* Analyze button */}
      {selectedFile && !isLoading && (
        <Button
          onClick={(e) => {
            e.stopPropagation()
            handleAnalyze()
          }}
          className={cn(
            'w-full h-12 text-base font-semibold',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90',
            'animate-[pulseGlow_2s_ease-in-out_infinite]',
            'transition-all duration-200'
          )}
        >
          Analyze Portfolio
        </Button>
      )}
    </div>
  )
}
