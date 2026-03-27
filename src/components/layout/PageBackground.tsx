import type { ReactElement } from 'react'

/**
 * Fixed fullscreen background providing depth and atmosphere for every page.
 * Layers (back to front):
 *   1. Solid base colour  (bg-background)
 *   2. Animated grid overlay  (.grid-bg)
 *   3. Three large blurred colour blobs for ambient glow
 *
 * Purely decorative — pointer-events disabled, sits at z-index -10.
 * Blob animations are suppressed when the user prefers reduced motion.
 */
export default function PageBackground(): ReactElement {
  // Detect reduced-motion preference at the CSS level via a class applied
  // server-side. The inline `animation` style is overridden by the global
  // `@media (prefers-reduced-motion: reduce)` rule in globals.css which sets
  // `animation: none` on `.shimmer` etc.  For blobs we gate the animation
  // property directly: browsers that honour PRM will receive `animation: none`
  // from the media query we add here as a parallel inline approach via a
  // CSS custom property fallback chain.
  //
  // Because this is a Server Component (no 'use client') we cannot read
  // `window.matchMedia`, so we rely entirely on CSS to suppress the motion.
  // The `@media (prefers-reduced-motion)` block in globals.css already handles
  // `.shimmer` and others; we add a matching class-level override below.

  const blobBase =
    'absolute rounded-full pointer-events-none motion-reduce:animate-none'

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-background"
      aria-hidden="true"
    >
      {/* ── Animated grid overlay ── */}
      <div className="absolute inset-0 grid-bg opacity-100" />

      {/* ── Ambient colour blobs ── */}

      {/* Blob 1 — bottom-left, gold tint */}
      <div
        className={`${blobBase} bg-primary/8 w-[600px] h-[600px] blur-[120px] -bottom-48 -left-32`}
        style={{
          animation: 'var(--animate-blob)',
          animationDelay: '2s',
          animationFillMode: 'both',
        }}
      />

      {/* Blob 2 — top-right, teal tint */}
      <div
        className={`${blobBase} bg-accent/6 w-[500px] h-[500px] blur-[100px] -top-32 -right-24`}
        style={{
          animation: 'var(--animate-blob)',
          animationDelay: '0s',
          animationFillMode: 'both',
        }}
      />

      {/* Blob 3 — center-right, subtle gold */}
      <div
        className={`${blobBase} bg-primary/4 w-[400px] h-[400px] blur-[80px] top-1/3 -right-16`}
        style={{
          animation: 'var(--animate-blob)',
          animationDelay: '4s',
          animationFillMode: 'both',
        }}
      />
    </div>
  )
}
