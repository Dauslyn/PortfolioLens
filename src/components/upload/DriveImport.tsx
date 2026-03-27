'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HardDrive, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// ─── Google API type stubs ─────────────────────────────────────────────────

declare global {
  interface Window {
    gapi: {
      load: (lib: string, cb: () => void) => void
      client: { setToken: (token: { access_token: string }) => void }
    }
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string
            scope: string
            callback: (resp: { access_token?: string; error?: string }) => void
          }) => { requestAccessToken: () => void }
        }
      }
      picker: {
        PickerBuilder: new () => GooglePickerBuilder
        ViewId: { DOCS: string }
        View: new (id: string) => GooglePickerView
        DocsView: new (id: string) => GooglePickerView & {
          setMimeTypes: (types: string) => GooglePickerView
        }
        Action: { PICKED: string; CANCEL: string }
      }
    }
  }
  interface GooglePickerBuilder {
    addView: (v: unknown) => GooglePickerBuilder
    setOAuthToken: (token: string) => GooglePickerBuilder
    setDeveloperKey: (key: string) => GooglePickerBuilder
    setCallback: (cb: (data: GooglePickerResponse) => void) => GooglePickerBuilder
    setTitle: (title: string) => GooglePickerBuilder
    build: () => { setVisible: (v: boolean) => void }
  }
  interface GooglePickerView {
    setMimeTypes?: (types: string) => this
  }
  interface GooglePickerResponse {
    action: string
    docs?: Array<{ id: string; name: string; mimeType: string }>
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}

async function arrayBufferToBase64(buf: ArrayBuffer): Promise<string> {
  return new Promise((resolve) => {
    const blob = new Blob([buf])
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.readAsDataURL(blob)
  })
}

// ─── Component ────────────────────────────────────────────────────────────

type Phase = 'idle' | 'auth' | 'picked' | 'loading' | 'error'

export default function DriveImport() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string } | null>(null)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const accessTokenRef = useRef<string | null>(null)
  const pickerReadyRef = useRef(false)

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? ''

  // Preload GAPI + GIS scripts on mount
  useEffect(() => {
    Promise.all([
      loadScript('https://apis.google.com/js/api.js'),
      loadScript('https://accounts.google.com/gsi/client'),
    ]).then(() => {
      window.gapi.load('picker', () => { pickerReadyRef.current = true })
    }).catch(() => {/* silently ignore preload failure */})
  }, [])

  const openPicker = useCallback((token: string) => {
    if (!pickerReadyRef.current) return
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      .setMimeTypes('application/pdf')
    new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .setTitle('Select a brokerage statement PDF')
      .setCallback((data: GooglePickerResponse) => {
        if (data.action === window.google.picker.Action.PICKED && data.docs?.[0]) {
          setSelectedFile({ id: data.docs[0].id, name: data.docs[0].name })
          setPhase('picked')
        } else if (data.action === window.google.picker.Action.CANCEL) {
          setPhase('idle')
        }
      })
      .build()
      .setVisible(true)
  }, [apiKey])

  const handleConnect = useCallback(async () => {
    setError(null)
    setPhase('auth')

    try {
      await Promise.all([
        loadScript('https://apis.google.com/js/api.js'),
        loadScript('https://accounts.google.com/gsi/client'),
      ])
      await new Promise<void>((resolve) => window.gapi.load('picker', resolve))
      pickerReadyRef.current = true
    } catch {
      setError('Failed to load Google APIs. Check your connection.')
      setPhase('error')
      return
    }

    if (!clientId) {
      setError('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.')
      setPhase('error')
      return
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          setError('Google sign-in was cancelled or failed.')
          setPhase('error')
          return
        }
        accessTokenRef.current = resp.access_token
        window.gapi.client.setToken({ access_token: resp.access_token })
        openPicker(resp.access_token)
      },
    })

    tokenClient.requestAccessToken()
  }, [clientId, openPicker])

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile || !accessTokenRef.current) return

    setPhase('loading')
    setProgress(10)
    setStatusText('Downloading from Drive...')
    setError(null)

    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${selectedFile.id}?alt=media`,
        { headers: { Authorization: `Bearer ${accessTokenRef.current}` } }
      )

      if (!res.ok) throw new Error(`Drive download failed: ${res.status}`)

      setProgress(30)
      setStatusText('Sending to analysis pipeline...')

      const buf = await res.arrayBuffer()
      const base64 = await arrayBufferToBase64(buf)

      const parseRes = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pdf',
          filename: selectedFile.name,
          fileSize: buf.byteLength,
          base64,
        }),
      })

      setProgress(70)
      setStatusText('Processing response...')

      if (!parseRes.ok) {
        const errData = await parseRes.json().catch(() => ({}))
        throw new Error(errData?.error ?? `Server error: ${parseRes.status}`)
      }

      const data = await parseRes.json()

      setProgress(95)
      setStatusText('Preparing session...')

      sessionStorage.setItem(
        'portfoliolens_session',
        JSON.stringify({
          source: 'drive',
          filename: selectedFile.name,
          uploadedAt: new Date().toISOString(),
          ...data,
        })
      )

      setProgress(100)
      router.push('/processing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      setPhase('error')
      setProgress(0)
    }
  }, [selectedFile, router])

  return (
    <div className="w-full space-y-4">
      {/* Main zone */}
      <div
        className={cn(
          'relative flex min-h-[260px] flex-col items-center justify-center gap-4',
          'rounded-2xl border-2 border-dashed p-8 text-center',
          'transition-all duration-200',
          phase === 'picked'
            ? 'border-success/40 bg-success/5'
            : phase === 'error'
            ? 'border-destructive/30 bg-destructive/5'
            : 'border-primary/20',
          (phase === 'auth' || phase === 'loading') && 'opacity-80'
        )}
      >
        {phase === 'picked' && selectedFile ? (
          <>
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
              <p className="text-xs text-muted-foreground">From Google Drive</p>
            </div>
            <button
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              onClick={() => { setSelectedFile(null); setPhase('idle') }}
            >
              Choose a different file
            </button>
          </>
        ) : (
          <>
            <div className={cn(
              'flex size-16 items-center justify-center rounded-2xl bg-primary/10',
              phase === 'auth' && 'animate-pulse'
            )}>
              <HardDrive className="size-8 text-primary" strokeWidth={1.5} />
            </div>
            <div className="space-y-1.5">
              <p className="text-base font-semibold text-foreground">
                {phase === 'auth' ? 'Opening Google Drive...' : 'Import from Google Drive'}
              </p>
              <p className="text-sm text-muted-foreground">
                {phase === 'auth'
                  ? 'Complete sign-in in the popup window'
                  : 'Sign in to pick a PDF directly from your Drive'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground/70 max-w-xs leading-relaxed">
              PortfolioLens only requests read-only access to the file you select
            </p>
          </>
        )}
      </div>

      {/* Error */}
      {(phase === 'error' || error) && error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5">
          <AlertCircle className="size-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {phase === 'loading' && (
        <div className="space-y-2">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-center">{statusText}</p>
        </div>
      )}

      {/* CTA button */}
      {phase === 'idle' || phase === 'error' ? (
        <Button
          onClick={handleConnect}
          className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200"
        >
          Connect Google Drive
        </Button>
      ) : phase === 'picked' ? (
        <Button
          onClick={handleAnalyze}
          className={cn(
            'w-full h-12 text-base font-semibold',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'animate-[pulseGlow_2s_ease-in-out_infinite]',
            'transition-all duration-200'
          )}
        >
          Analyze Portfolio
        </Button>
      ) : null}
    </div>
  )
}
