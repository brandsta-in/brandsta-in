// app/data/ambientWaveConfig.ts

export interface AmbientViewportProfile {
  dprCap: number
  maxConcurrentCurrents: number
  minPauseSec: number
  maxPauseSec: number
  minSpanRatio: number
  maxSpanRatio: number
  minCurveAmpPx: number
  maxCurveAmpPx: number
  ribbonSpreadPx: number
  strandCount: number
  moteCount: number
  mistStampCount: number
  ambientParticleCount: number
  logoAuraMultiplier: number
}

export const AMBIENT_WAVE_PALETTE = {
  // Deep obsidian-midnight Hero base inspired by "Something is forming."
  heroBaseRgb: [2, 5, 15] as const, // #02050f

  // Rich dark scroll-alternating floor & crest tones down the page
  scrollFloorRgb: [1, 4, 12] as const, // #01040c
  scrollCrestRgb: [4, 11, 29] as const, // #040b1d

  // Whisper-subtle sapphire depth & scroll-alternating washes (never flat navy)
  heroVelvetRgb: '6, 28, 102',
  cobaltWashRgb: '0, 48, 176',
  glacierWashRgb: '18, 92, 228',

  // Exact Resonator logo radial aura stops (preserved 1:1)
  logoCoreRgb: '38, 122, 255',
  logoMidRgb: '0, 72, 255',
  logoOuterRgb: '0, 38, 150',

  // Milder submerged bioluminescent silk current spectrum
  mistDeepRgb: '0, 58, 208',
  silkElectricRgb: '32, 114, 255',
  silkGlacierRgb: '124, 192, 255',
  causticFrostRgb: '198, 232, 255',

  // Twinkling micro-particle pinpoint hues
  sparkFrostRgb: '232, 245, 255',
  sparkGlacierRgb: '154, 210, 255',
  sparkElectricRgb: '48, 132, 255',
} as const

export const AMBIENT_SCROLL_MODULATION = {
  // Resonator radial aura shrinks & fades completely out by 38% of first viewport scroll
  logoAuraFadeEndVh: 0.38,
  logoAuraMinScale: 0.32,

  // Smooth handoff from Hero obsidian-midnight into scroll-alternating depth
  heroBaseHandoffVh: 0.65,
  lumaCyclePerVh: 1.95,
  washSweepCyclePerVh: 1.42,
  toneBlendCyclePerVh: 1.15,
  scrollSmoothingRate: 6.5,

  // Milder section-band current presence
  heroCurrentScale: 0.62,
  midCurrentScale: 0.74,
  footerAmplificationStart: 0.82,
  footerCurrentScale: 0.94,
} as const

export const AMBIENT_CURSOR_PHYSICS = {
  pointerLerpRate: 5.2,
  influenceRadiusPx: 280,
  maxPartingPx: 14,
  shimmerBoost: 0.14,
  particleInfluenceRadiusPx: 175,
  particlePushPx: 5,
  ambientCursorGlowAlpha: 0.055,
} as const

export function resolveAmbientViewportProfile(
  width: number,
  height: number,
): AmbientViewportProfile {
  const isCompactLandscape = width > height && height <= 540

  // 1. Compact Rotated Mobile Landscape
  if (isCompactLandscape) {
    return {
      dprCap: 1.35,
      maxConcurrentCurrents: 1,
      minPauseSec: 1.5,
      maxPauseSec: 3.0,
      minSpanRatio: 0.52,
      maxSpanRatio: 0.74,
      minCurveAmpPx: 12,
      maxCurveAmpPx: 22,
      ribbonSpreadPx: 16,
      strandCount: 8,
      moteCount: 12,
      mistStampCount: 4,
      ambientParticleCount: 28,
      logoAuraMultiplier: 1.38,
    }
  }

  // 2. Mobile Portrait (< 640px)
  if (width < 640) {
    return {
      dprCap: 1.25,
      maxConcurrentCurrents: 2,
      minPauseSec: 1.5,
      maxPauseSec: 3.1,
      minSpanRatio: 0.62,
      maxSpanRatio: 0.86,
      minCurveAmpPx: 15,
      maxCurveAmpPx: 28,
      ribbonSpreadPx: 20,
      strandCount: 9,
      moteCount: 14,
      mistStampCount: 5,
      ambientParticleCount: 34,
      logoAuraMultiplier: 1.48,
    }
  }

  // 3. Tablets & Foldables (640px–1023px, plus 1024px+ Portrait)
  if (width < 1024 || height > width) {
    return {
      dprCap: 1.5,
      maxConcurrentCurrents: 2,
      minPauseSec: 1.45,
      maxPauseSec: 3.0,
      minSpanRatio: 0.52,
      maxSpanRatio: 0.78,
      minCurveAmpPx: 19,
      maxCurveAmpPx: 36,
      ribbonSpreadPx: 25,
      strandCount: 10,
      moteCount: 16,
      mistStampCount: 5,
      ambientParticleCount: 46,
      logoAuraMultiplier: 1.45,
    }
  }

  // 4. Full HD & Ultrawide Desktops (> 1536px Landscape)
  if (width > 1536) {
    return {
      dprCap: 1.65,
      maxConcurrentCurrents: 2,
      minPauseSec: 1.4,
      maxPauseSec: 2.9,
      minSpanRatio: 0.44,
      maxSpanRatio: 0.7,
      minCurveAmpPx: 24,
      maxCurveAmpPx: 46,
      ribbonSpreadPx: 33,
      strandCount: 11,
      moteCount: 20,
      mistStampCount: 6,
      ambientParticleCount: 72,
      logoAuraMultiplier: 1.36,
    }
  }

  // 5. Standard Laptops & Desktops (1024px–1536px Landscape)
  return {
    dprCap: 1.65,
    maxConcurrentCurrents: 2,
    minPauseSec: 1.4,
    maxPauseSec: 2.95,
    minSpanRatio: 0.46,
    maxSpanRatio: 0.72,
    minCurveAmpPx: 21,
    maxCurveAmpPx: 40,
    ribbonSpreadPx: 29,
    strandCount: 10,
    moteCount: 18,
    mistStampCount: 5,
    ambientParticleCount: 58,
    logoAuraMultiplier: 1.38,
  }
}