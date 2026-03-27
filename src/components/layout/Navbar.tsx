import type { ReactElement } from 'react'

export default function Navbar(): ReactElement {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 glass-strong border-b border-white/5">
      <div className="flex h-full items-center justify-between px-6">
        {/* ── Logo ── */}
        <div className="flex items-center gap-3">
          {/* Hexagonal lens icon — inline SVG, gold colored */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Hexagon shell */}
            <path
              d="M16 2L28.124 9V23L16 30L3.876 23V9L16 2Z"
              stroke="oklch(0.80 0.16 85)"
              strokeWidth="1.5"
              fill="oklch(0.80 0.16 85 / 0.08)"
            />
            {/* Outer lens ring */}
            <circle
              cx="16"
              cy="16"
              r="7"
              stroke="oklch(0.80 0.16 85)"
              strokeWidth="1.25"
              fill="none"
            />
            {/* Inner lens pupil */}
            <circle
              cx="16"
              cy="16"
              r="3"
              fill="oklch(0.80 0.16 85)"
              opacity="0.9"
            />
            {/* Lens glint */}
            <circle
              cx="14.5"
              cy="14.5"
              r="1"
              fill="oklch(0.96 0.005 255)"
              opacity="0.7"
            />
          </svg>

          {/* Wordmark */}
          <span
            className="text-lg tracking-tight font-[family-name:var(--font-outfit)]"
            aria-label="PortfolioLens"
          >
            <span className="font-normal text-foreground">Portfolio</span>
            <span className="font-bold gradient-text">Lens</span>
          </span>
        </div>

        {/* ── Version badge ── */}
        <span
          className={[
            'rounded-full px-2.5 py-0.5',
            'border border-primary/20',
            'text-xs text-muted-foreground',
            'font-[family-name:var(--font-outfit)]',
            'select-none',
          ].join(' ')}
        >
          v0.1 beta
        </span>
      </div>
    </header>
  )
}
