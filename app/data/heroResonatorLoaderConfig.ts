// app/data/heroResonatorLoaderConfig.ts

/**
 * Exact SVG vector paths from BrandstaSvg (mark variant coordinate space: 160 -2 498 512)
 * Rendered inside padded viewBox "120 -36 578 584" with overflow-visible for outward harmonic traces.
 */
export const RESONATOR_PATHS = {
  viewBox: '120 -36 578 584',
  topArch:
    'M406.821.637c77.91-7.154 170.359 139.921 200.678 201.374a511.7 511.7 0 0 1 36.647 95.491c-15.63-1.784-33.256-3.159-48.99-4.494-1.592-3.674-4.497-14.004-5.849-18.183a401 401 0 0 0-10.098-27.673c-23.506-59.225-97.481-193.975-166.697-200.647-32.912-1.556-68.708 35.42-88.363 58.587a518.8 518.8 0 0 0-100.32 188.167c-14.435.491-33.219 3.166-48.351 4.224 2.685-13.281 9.699-32.525 14.685-45.301a629.2 629.2 0 0 1 102.869-173.51C320.493 46.177 362.048 4.37 406.821.636',
  bottomCradle:
    'M166.607 343.586c14.955-.41 31.859-.037 47.014-.041-3.554 31.077-.034 58.592 27.709 78.014 14.896 10.428 31.917 17.047 49.393 21.999 62.814 17.797 130.028 20.137 194.433 10.482 35.042-5.469 86.041-18.077 108.241-48.218 13.169-17.879 14.801-40.857 11.268-62.185q24.162-.143 48.324-.017c.876 11.885 1.151 31.777-1.045 43.238-4.7 28.205-18.654 51.626-41.351 69.128-66.607 51.362-190.628 55.851-271.445 45.387-51.803-6.707-118.344-23.3-151.716-67.008-19.635-25.718-25.133-59.203-20.825-90.779',
  innerWave:
    'M407.673 217.758c18.455-1.38 18.888 17.666 23.972 28.91 5.283 11.683 25.836 85.047 31.831 89.573 1.967.581 3.148-.025 4.588-1.346 3.681-3.377 6.022-8.571 8.478-12.859 2.147-3.749 4.67-7.365 6.981-11.023 5.584-8.839 11.172-18.863 21.417-22.889 24.666-9.694 33.113 25.607 45.754 30.575 5.274 2.072 13.513-5.052 18.285-7.263 3.544-1.643 7.065-2.809 10.99-2.985 12.335-.553 28.3 2.393 40.82 3.641 6.676.666 20.376.61 26.107 2.877 1.351.535 2.765 1.379 3.293 2.81.537 1.457.482 3.498-.208 4.895-1.87 3.789-9.83 2.965-13.306 2.889-9.908-.219-51.328-1.059-58.451 1.302-6.758 2.24-11.976 7.383-18.56 9.835-13.342 4.968-24.238-4.141-31.883-14.274-3.412-4.522-7.168-12.081-12.525-14.324-2.394-1.003-4.993-.386-7.024 1.124-3.302 2.454-5.615 6.491-7.79 9.918-6.898 10.869-18.09 35.117-29.842 40.105-3.672 1.559-7.921 1.973-11.645.381-4.149-1.774-7.618-5.387-10.004-9.153-5.611-8.856-8.965-19.28-12.542-29.087-5.984-16.406-11.276-33.046-16.855-49.59-2.899-8.598-5.646-17.263-9.132-25.645l-.643-.722c-6.23 3.024-31.072 99.527-43.284 109.541-3.378 2.77-7.055 6.145-12.04 5.796-18.826-1.318-30.064-38.1-42.499-50.543-1.336-1.337-3.379-2.874-5.175-2.651-8.786 1.088-15.56 16.571-22.764 22.57-7.099 5.911-8.463 7.694-18.109 7.838-10.663.159-17.494-10.464-26.94-11.974-5.439-.869-16.123-.491-21.877-.49l-44.556.006c-4.714-4.245-4.683-5.934-.875-10.534 6.662-1.432 22.745-2.558 30.425-3.251 13.485-1.06 25.999-3.674 39.599-3.171 6.992.259 22.235 12.233 25.283 10.665 13.908-7.154 17.658-27.899 35.081-31.923 16.228-3.748 25.524 10.828 32.918 22.611a560 560 0 0 1 9.405 15.378c10.501 17.954 11.844 12.537 17.838-3.992 1.754-4.838 3.372-9.884 5.043-14.759l18.85-55.606c2.811-8.037 5.76-17.376 9.543-24.944 2.389-4.779 7.127-6.829 12.028-8.242',
} as const

export interface ClickResonancePayload {
  timestamp: number
  originX: number
  originY: number
  auraDuration: number
  source?: 'self' | 'user'
}

export type LeftTraceGradientKey = 'sapphireDeep' | 'cobaltFluid' | 'glacierSpec'
export type RightTraceGradientKey = 'bronzeDeep' | 'goldMolten' | 'goldSpecular'

export interface LeftTraceFilamentSpec {
  readonly id: string
  readonly gradKey: LeftTraceGradientKey
  readonly strokeWidth: number
  readonly opacity: number
  readonly ampScale: number
  readonly phaseOffset: number
  readonly slotOffsetSvg: number
}

export interface RightTraceFilamentSpec {
  readonly id: string
  readonly gradKey: RightTraceGradientKey
  readonly strokeWidth: number
  readonly opacity: number
  readonly ampScale: number
  readonly phaseOffset: number
  readonly slotOffsetSvg: number
}

/**
 * Locked ~2.20s Entrance Choreography
 */
export const HERO_LOADER_CHOREOGRAPHY = {
  waveDrawStart: 0.08,
  waveDrawDuration: 0.68,

  shell2DAppearStart: 0.42,
  shell2DAppearDuration: 0.60,

  spatialGlideStart: 0.92,
  spatialGlideDuration: 1.14,

  morph3DStart: 0.88,
  morph3DDuration: 1.10,
  magneticClampStart: 0.98,
  magneticClampDuration: 1.02,

  veilFadeStart: 1.42,
  veilFadeDuration: 0.76,

  totalLoaderDuration: 2.20,

  centerIgnitionScaleDesktop: 0.76,
  centerIgnitionScaleCompact: 0.90,

  initialOpenShellGap: 18.5,
} as const

export const HERO_RESONATOR_ANCHOR_CONFIG = {
  // 100% Dead-Center Forward Stance (0.00° yaw/pitch/roll)
  restRotY: 0.0,
  restRotX: 0.0,
  restRotZ: 0.0,

  // Symmetrical Centered Inward 3D Depth Nudge
  topPivotX: 409.65,
  topPivotY: 295.0,
  topInwardTuckX: 0.03,
  topInwardTuckY: 0.008,
  topExtrudeDy: 5.5,

  bottomPivotX: 409.5,
  bottomPivotY: 343.6,
  bottomInwardTuckX: 0.026,
  bottomInwardTuckY: 0.004,
  bottomExtrudeDy: 5.8,

  wavePivotX: 405.8,
  waveInwardTuckX: 0.006,
  waveInwardTuckMultiplier: 2.2,
  waveExtrudeDy: 4.8,
  waveExtrudeDyMultiplier: 1.38,

  // Living Brandsta-Blue + Light-Blue Wave Flow Inside the Stationary Anchor
  waveBaseFlowSpeed: 0.38,
  pointerSurgeGain: 0.55,
  pointerSurgeMax: 0.95,
  pointerSurgeDecay: 2.8,
  pointerPhaseInfluence: 0.08,
  pointerDampingRate: 5.2,

  // Faster Left-to-Right Alloy Polish on a Near 2-Wave-Cycle Interval (~5.18s period, 1.45s sweep)
  alloyPolishInitialDelay: 2.45,
  alloyPolishPeriod: 5.18,
  alloyPolishSweepDuration: 1.45,
  alloyPolishPeakOpacity: 0.92,

  // 0.92s Click-Triggered Pakka Brandsta-Blue Wave Aura & Brief Flow Pause
  clickAuraDuration: 0.92,
  clickAuraSmoothingRate: 0.92,
} as const

/**
 * Top-Overlapping Horizontal Fluid Wave Extension Config
 * - Starts ~16 SVG units inside `#innerWaveGeo`'s straight ends (x=185 / x=634.5) with a feathered 0->1 ramp.
 * - Matches full stroked inner-wave height (11.7 SVG units) across the port entrance before tapering.
 * - Traces open top & bottom white-ice rim outlines that slowly fade out along both extensions.
 * - Drives rich multi-stop Brandsta Sapphire fluid (left) and 24K Astral Molten Gold fluid (right).
 */
export const HERO_HARMONIC_TRACE_CONFIG = {
  // Automatic initial arrival pulse delays (ms)
  selfPulseDelayMs: 65,
  spaReturnPulseDelayMs: 85,

  // Lifecycle timing (seconds): smooth horizontal shoot-out -> outward fluid travel -> slow dissolve
  totalDuration: 1.1,
  unfurlDuration: 0.42,
  fadeStart: 0.74,

  // Feathered top-layer overlap origins (~16 SVG units inside `#innerWaveGeo` outer tips x=168.9 & x=650.5)
  leftOriginX: 185.0,
  rightOriginX: 634.5,
  innerOriginY: 319.62,
  outerOriginY: 320.22,
  innerOverlapEndU: 0.072,

  // Horizontal propagation span & continuous outward drift boost (+22% glide while fading)
  traceSpanSvg: 218.0,
  horizontalGlideBoost: 0.22,
  sampleCount: 54,
  bodySampleCount: 42,

  // Shallow, poised horizontal wave physics (zero vertical oscillation inside the overlap zone)
  oscillationCycles: 1.58,
  peakAmplitudeSvg: 17.5,
  spatialDampingExp: 1.16,
  collarStartU: 0.072,
  collarEndU: 0.23,

  // Continuous outward horizontal phase velocity & gentle amplitude settle
  settleAmplitudeFloor: 0.38,
  initialRippleSpeed: 6.8,
  settledRippleSpeed: 3.15,
  initialPhaseRad: 0.08,

  // Fuller entrance body (11.7 SVG units tall = 5.85 half-height) with port-mouth plateau -> smooth taper
  extensionBodyEndU: 0.90,
  portBodyHalfHeightSvg: 5.85,
  portPlateauEndU: 0.105,
  bodyTaperExp: 1.06,

  // Open top & bottom rim outlines continuing `#innerWaveGeo`'s white-ice edge and fading slowly outward
  rimReachRatio: 0.72,
  rimStrokeWidth: 1.42,
  rimPeakOpacity: 0.90,

  // Master thickness & background port-aura dials
  strokeScale: 1.16,
  masterOpacity: 0.98,
  portAuraOpacity: 0.46,
  portAuraStrokeWidth: 12.0,

  // Right-wing Astral Molten Gold fluid transition stops (extends Brandsta blue further before warming to gold)
  goldBlueHoldOffset: '19%',
  goldBronzeBridgeOffset: '27%',
  goldMoltenStartOffset: '36%',
} as const

/**
 * Left Extension: Multi-Stop Brandsta Sapphire, Royal Cobalt & Glacier Fluid Currents
 */
export const LEFT_TRACE_FILAMENTS: readonly LeftTraceFilamentSpec[] = [
  {
    id: 'l-fluid-undertow',
    gradKey: 'sapphireDeep',
    strokeWidth: 2.2,
    opacity: 0.82,
    ampScale: 0.92,
    phaseOffset: 0.08,
    slotOffsetSvg: 1.25,
  },
  {
    id: 'l-fluid-secondary',
    gradKey: 'cobaltFluid',
    strokeWidth: 1.75,
    opacity: 0.84,
    ampScale: 1.06,
    phaseOffset: -0.1,
    slotOffsetSvg: -0.95,
  },
  {
    id: 'l-fluid-core',
    gradKey: 'cobaltFluid',
    strokeWidth: 2.05,
    opacity: 0.96,
    ampScale: 1.0,
    phaseOffset: 0.0,
    slotOffsetSvg: 0.0,
  },
  {
    id: 'l-fluid-specular',
    gradKey: 'glacierSpec',
    strokeWidth: 1.05,
    opacity: 0.92,
    ampScale: 1.02,
    phaseOffset: -0.03,
    slotOffsetSvg: -0.4,
  },
] as const

/**
 * Right Extension: Multi-Stop Burnished Cognac-Bronze, 24K Molten Gold & Sunlit Champagne Fluid Currents
 */
export const RIGHT_TRACE_FILAMENTS: readonly RightTraceFilamentSpec[] = [
  {
    id: 'r-gold-bronze-undertow',
    gradKey: 'bronzeDeep',
    strokeWidth: 2.3,
    opacity: 0.88,
    ampScale: 0.91,
    phaseOffset: 0.09,
    slotOffsetSvg: 1.3,
  },
  {
    id: 'r-gold-secondary-wave',
    gradKey: 'goldMolten',
    strokeWidth: 1.65,
    opacity: 0.88,
    ampScale: 1.07,
    phaseOffset: -0.11,
    slotOffsetSvg: -0.9,
  },
  {
    id: 'r-gold-molten-core',
    gradKey: 'goldMolten',
    strokeWidth: 2.0,
    opacity: 0.98,
    ampScale: 1.0,
    phaseOffset: 0.0,
    slotOffsetSvg: 0.05,
  },
  {
    id: 'r-gold-champagne-crest',
    gradKey: 'goldSpecular',
    strokeWidth: 1,
    opacity: 0.94,
    ampScale: 1.02,
    phaseOffset: -0.04,
    slotOffsetSvg: -0.42,
  },
] as const