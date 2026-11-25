// app/data/lenisConfig.ts

export const LENIS_SCROLL_CONFIG = {
  // Core wheel interpolation (lower = silkier coasting, higher = snappier tracking)
  lerp: 0.095,
  wheelMultiplier: 0.95,
  touchMultiplier: 1.0,

  // Keep 100% native hardware touch inertia on Android/iOS for zero INP/touch lag
  syncTouch: false,

  // Programmatic hash & anchor glide choreography
  anchorDuration: 1.2,
  anchorOffset: 0,
} as const

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

/**
 * Exact cubic-bezier(0.22, 1, 0.36, 1) solver for programmatic anchor glides
 */
export function easeLenisAnchor(t: number): number {
  const x = clamp01(t)
  if (x <= 0 || x >= 1) return x

  const x1 = 0.22
  const y1 = 1.0
  const x2 = 0.36
  const y2 = 1.0

  let u = x
  for (let i = 0; i < 6; i++) {
    const inv = 1 - u
    const bx = 3 * inv * inv * u * x1 + 3 * inv * u * u * x2 + u * u * u - x
    if (Math.abs(bx) < 1e-5) break
    const dbx = 3 * inv * inv * x1 + 6 * inv * u * (x2 - x1) + 3 * u * u * (1 - x2)
    if (Math.abs(dbx) < 1e-5) break
    u = clamp01(u - bx / dbx)
  }

  const inv = 1 - u
  return 3 * inv * inv * u * y1 + 3 * inv * u * u * y2 + u * u * u
}