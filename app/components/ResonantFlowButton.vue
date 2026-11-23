<!-- app/components/ResonantFlowButton.vue -->
<script setup lang="ts">
import { ref, computed, useId, onMounted, onBeforeUnmount } from 'vue'
import { useNuxtApp, navigateTo } from '#imports'
import {
  BUTTON_VISUAL_TUNING,
  RESONANT_BUTTON_PHYSICS,
  type ResonantButtonVariant,
  type ResonantButtonFluid,
  type ResonantButtonSize,
  type ResonantButtonArrow,
} from '~/data/ResonantFlowButtonConfig'

export type {
  ResonantButtonVariant,
  ResonantButtonFluid,
  ResonantButtonSize,
  ResonantButtonArrow,
}

interface VaporSheetSpec {
  offsetRatio: number
  spanScale: number
  freqA: number
  freqB: number
  driftSpeed: number
  phaseSeed: number
  underbellyHeight: number
  cornerWrapHeight: number
}

const VAPOR_SHEETS: readonly VaporSheetSpec[] = [
  // Sheet 0: Outer Rim Deep Bed
  {
    offsetRatio: -0.03,
    spanScale: 1.06,
    freqA: 0.056,
    freqB: 0.036,
    driftSpeed: 1.9,
    phaseSeed: 0.0,
    underbellyHeight: 0.52,
    cornerWrapHeight: 1.15,
  },
  // Sheet 1: Mid Harmonic Mist Swell
  {
    offsetRatio: 0.03,
    spanScale: 0.94,
    freqA: 0.074,
    freqB: 0.048,
    driftSpeed: -2.3,
    phaseSeed: 1.8,
    underbellyHeight: 0.44,
    cornerWrapHeight: 1.06,
  },
  // Sheet 2: Luminous Crest Rim Wash
  {
    offsetRatio: 0.05,
    spanScale: 0.84,
    freqA: 0.092,
    freqB: 0.06,
    driftSpeed: 2.7,
    phaseSeed: 3.5,
    underbellyHeight: 0.36,
    cornerWrapHeight: 0.98,
  },
]

// Optically balanced 20x20 arrows (identical 7.0-unit 45° chevron wings & centered shafts)
const ARROW_PATHS: Record<Exclude<ResonantButtonArrow, 'auto'>, string> = {
  'up-right': 'M5.75 14.25L14.25 5.75M14.25 5.75H7.25M14.25 5.75V12.75',
  right: 'M4.25 10H15.75M10.8 5.05L15.75 10L10.8 14.95',
  down: 'M10 4.25V15.75M5.05 10.8L10 15.75L14.95 10.8',
  up: 'M10 15.75V4.25M5.05 9.2L10 4.25L14.95 9.2',
}

const STREAM_PTS = 60

// Pre-allocated instance scratch buffers (zero GC allocations during 120fps rAF ticks)
const glowUpX = new Float64Array(STREAM_PTS + 1)
const glowUpY = new Float64Array(STREAM_PTS + 1)
const glowLoX = new Float64Array(STREAM_PTS + 1)
const glowLoY = new Float64Array(STREAM_PTS + 1)
const up1X = new Float64Array(STREAM_PTS + 1)
const up1Y = new Float64Array(STREAM_PTS + 1)
const lo1X = new Float64Array(STREAM_PTS + 1)
const lo1Y = new Float64Array(STREAM_PTS + 1)
const up2X = new Float64Array(STREAM_PTS + 1)
const up2Y = new Float64Array(STREAM_PTS + 1)
const lo2X = new Float64Array(STREAM_PTS + 1)
const lo2Y = new Float64Array(STREAM_PTS + 1)

const props = withDefaults(
  defineProps<{
    label: string
    href?: string
    variant?: ResonantButtonVariant
    fluid?: ResonantButtonFluid
    size?: ResonantButtonSize
    arrow?: ResonantButtonArrow
    newTab?: boolean
    preventNavigation?: boolean
  }>(),
  {
    href: undefined,
    variant: 'primary',
    fluid: 'auto',
    size: 'lg',
    arrow: 'auto',
    newTab: undefined,
    preventNavigation: false,
  },
)

const emit = defineEmits<{
  action: [event: MouseEvent | KeyboardEvent]
}>()

const uid = useId()
const nuxtApp = useNuxtApp()
const rootEl = ref<HTMLElement | null>(null)

const isHashLink = computed(() => Boolean(props.href && props.href.startsWith('#')))

// Explicit fluid prop always wins; otherwise 'astral' defaults to gold and 'primary'/'secondary' default to blue
const resolvedFluid = computed<'blue' | 'gold'>(() => {
  if (props.fluid === 'blue' || props.fluid === 'gold') {
    return props.fluid
  }
  return props.variant === 'astral' ? 'gold' : 'blue'
})

const isGoldFluid = computed(() => resolvedFluid.value === 'gold')

// Always default to target="_blank" for external http(s) domains unless explicitly overridden
const shouldOpenNewTab = computed(() => {
  if (!props.href || isHashLink.value) return false
  if (props.newTab !== undefined) return props.newTab
  return /^https?:\/\//i.test(props.href)
})

// Auto-resolve arrow direction from href semantics unless explicitly passed
const resolvedArrow = computed<Exclude<ResonantButtonArrow, 'auto'>>(() => {
  if (props.arrow !== 'auto') return props.arrow
  if (!props.href) return 'up-right'
  if (props.href === '#' || props.href === '#top') return 'up'
  if (props.href.startsWith('#')) return 'down'
  if (/^https?:\/\//i.test(props.href)) return 'up-right'
  return 'right'
})

const activeArrowPath = computed(() => ARROW_PATHS[resolvedArrow.value])

// Fluid plasma & rim stream palette (Decoupled from shell variant so cross-combos work seamlessly)
const energyPalette = computed(() => {
  if (isGoldFluid.value) {
    return {
      vapDeep0: '#b45309',
      vapDeep1: '#ea8c00',
      vapDeep2: '#fbbf24',
      vapMid0: '#d97706',
      vapMid1: '#f59e0b',
      vapMid2: '#fde047',
      vaporWash: 'rgba(251, 191, 36, 0.25)',
      aura0: '#d97706',
      aura1: '#f59e0b',
      aura2: '#fcd34d',
      prim0: '#e07c00',
      prim1: '#fbbf24',
      prim2: '#fef08a',
      comp0: '#b45309',
      comp1: '#f59e0b',
      comp2: '#fef9c3',
      waveHalo: '#fbbf24',
      arrowHalo: '#fde047',
    }
  }
  return {
    vapDeep0: '#003de0',
    vapDeep1: '#0062ff',
    vapDeep2: '#1e8cff',
    vapMid0: '#0052ff',
    vapMid1: '#1a85ff',
    vapMid2: '#3ea8ff',
    vaporWash: 'rgba(24, 132, 255, 0.24)',
    aura0: '#0048ff',
    aura1: '#0f70ff',
    aura2: '#2994ff',
    prim0: '#0050ff',
    prim1: '#147aff',
    prim2: '#36a6ff',
    comp0: '#003ee6',
    comp1: '#1e88ff',
    comp2: '#52b6ff',
    waveHalo: '#1e88ff',
    arrowHalo: '#2994ff',
  }
})

// Cached inner padding-box geometry (matches inset-0 SVG 1:1; zero layout reads inside rAF)
const btnW = ref(252)
const btnH = ref(props.size === 'sm' ? 36 : props.size === 'md' ? 44 : 52)

// Interaction state flags
const isHovered = ref(false)
const isPressed = ref(false)

// Live reactive outputs driven by continuous springs
const vaporStageOpacity = ref(0)
const activePresence = ref(0)
const energyBalance = ref(0)
const inertialBtnScale = ref(1)
const internalIconProgress = ref(0)
const leftLaunchWave = ref(0)
const rightArrivalBloom = ref(0)
const leftReturnGlow = ref(0)

// Gaseous edge sheets + Continuous Unbroken Flowing Stream Polygons
const vaporPath0 = ref('')
const vaporPath1 = ref('')
const vaporPath2 = ref('')
const streamGlowRibbon = ref('')
const streamRibbonPrimary = ref('')
const streamRibbonSecondary = ref('')

// Exact integer concentric geometry inside 2px border:
// lg: 56px outer -> 52px inner -> 38px socket + 7px gap on top/bottom/left/right
// md: 48px outer -> 44px inner -> 32px socket + 6px gap on top/bottom/left/right
// sm: 40px outer -> 36px inner -> 26px socket + 5px gap on top/bottom/left/right
const sizeMetrics = computed(() => {
  if (props.size === 'sm') {
    return {
      shellClass: 'h-10 px-[5px] gap-2.5 text-[0.68rem]',
      socketClass: 'h-[26px] w-[26px]',
      waveSvgClass: 'h-[15px] w-[15px]',
      arrowSvgClass: 'h-[13px] w-[13px]',
      socketRingPx: 1.75,
      streamPeakWidth: 2.25,
    }
  }
  if (props.size === 'md') {
    return {
      shellClass: 'h-12 px-[6px] gap-3 text-[0.73rem]',
      socketClass: 'h-[32px] w-[32px]',
      waveSvgClass: 'h-[18px] w-[18px]',
      arrowSvgClass: 'h-[15px] w-[15px]',
      socketRingPx: BUTTON_VISUAL_TUNING.socketBorderWidthPx,
      streamPeakWidth: 2.6,
    }
  }
  return {
    shellClass: 'h-14 px-[7px] gap-3.5 text-[0.78rem]',
    socketClass: 'h-[38px] w-[38px]',
    waveSvgClass: 'h-[20px] w-[20px]',
    arrowSvgClass: 'h-[16px] w-[16px]',
    socketRingPx: BUTTON_VISUAL_TUNING.socketBorderWidthPx,
    streamPeakWidth: 2.95,
  }
})

// Concentric stadium steps for the Edge-Strong -> Inward-Weak SVG Mask
const edgeFalloffSteps = computed(() => {
  const W = btnW.value
  const H = btnH.value
  const steps = [
    { inset: 3.5, darkAlpha: 0.28 },
    { inset: 7.0, darkAlpha: 0.32 },
    { inset: 11.0, darkAlpha: 0.36 },
    { inset: 15.0, darkAlpha: 0.42 },
    { inset: 19.5, darkAlpha: 0.50 },
  ]
  return steps
    .map((s) => {
      const w = Math.max(0, W - s.inset * 2)
      const h = Math.max(0, H - s.inset * 2)
      return {
        x: s.inset,
        y: s.inset,
        w,
        h,
        rx: h * 0.5,
        alpha: s.darkAlpha,
      }
    })
    .filter((r) => r.w > 4 && r.h > 4)
})

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

// Pure SVG-space vector transforms (100% Retina crisp, exact 1.0 rest size preserved)
const waveVectorTransform = computed(() => {
  const baseScale = lerp(
    1,
    BUTTON_VISUAL_TUNING.leftWaveHoverScale,
    Math.max(0, internalIconProgress.value),
  )
  const s = baseScale + leftLaunchWave.value * 0.12
  if (Math.abs(s - 1) < 0.001) return undefined
  const f = s.toFixed(4)
  return `translate(14 14) scale(${f}) translate(-14 -14)`
})

// Preserves signature arrival glide along each arrow's exact forward vector + scale around (10, 10)
const arrowVectorTransform = computed(() => {
  const bloom = rightArrivalBloom.value
  const baseScale = lerp(
    1,
    BUTTON_VISUAL_TUNING.rightArrowHoverScale,
    Math.max(0, internalIconProgress.value),
  )
  const s = baseScale + bloom * 0.11
  const diagGlide = bloom * 1.15
  const axialGlide = bloom * 1.45

  if (Math.abs(s - 1) < 0.001 && Math.abs(diagGlide) < 0.01) return undefined

  const dir = resolvedArrow.value
  let dx = diagGlide
  let dy = -diagGlide
  if (dir === 'right') {
    dx = axialGlide
    dy = 0
  } else if (dir === 'down') {
    dx = 0
    dy = axialGlide
  } else if (dir === 'up') {
    dx = 0
    dy = -axialGlide
  }

  const f = s.toFixed(4)
  const gx = (10 + dx).toFixed(3)
  const gy = (10 + dy).toFixed(3)
  return `translate(${gx} ${gy}) scale(${f}) translate(-10 -10)`
})

const arrowVectorGlowOpacity = computed(() => {
  const base = activePresence.value * energyBalance.value * 0.42
  return Number(clamp(base + rightArrivalBloom.value * 0.48, 0, 0.92).toFixed(3))
})

// Live CSS Custom Properties
const liveStyleVars = computed(() => {
  const e = energyBalance.value
  const p = activePresence.value
  const bloom = rightArrivalBloom.value

  const borderRest =
    props.variant === 'primary'
      ? BUTTON_VISUAL_TUNING.primaryBorderRest
      : props.variant === 'astral'
        ? BUTTON_VISUAL_TUNING.astralBorderRest
        : BUTTON_VISUAL_TUNING.secondaryBorderRest

  const borderHover =
    props.variant === 'primary'
      ? BUTTON_VISUAL_TUNING.primaryBorderHover
      : props.variant === 'astral'
        ? BUTTON_VISUAL_TUNING.astralBorderHover
        : BUTTON_VISUAL_TUNING.secondaryBorderHover

  const borderProgress = clamp(p * (0.4 + 0.6 * e) + bloom * 0.25, 0, 1)

  const leftRing = clamp(
    lerp(BUTTON_VISUAL_TUNING.leftCircleRest, BUTTON_VISUAL_TUNING.leftCircleHover, e) +
      leftReturnGlow.value * 0.14 +
      Math.max(0, leftLaunchWave.value) * 0.18,
    0,
    1,
  )
  const leftWave = clamp(
    lerp(BUTTON_VISUAL_TUNING.leftWaveRest, BUTTON_VISUAL_TUNING.leftWaveHover, e) +
      Math.max(0, leftLaunchWave.value) * 0.12,
    0,
    1,
  )

  const rightRing = clamp(
    lerp(BUTTON_VISUAL_TUNING.rightCircleRest, BUTTON_VISUAL_TUNING.rightCircleHover, e) +
      bloom * 0.35,
    0,
    1,
  )
  const rightRingScale = 1 + bloom * 0.065

  const rightArrow = clamp(
    lerp(BUTTON_VISUAL_TUNING.rightArrowRest, BUTTON_VISUAL_TUNING.rightArrowHover, e) +
      bloom * 0.2,
    0,
    1,
  )

  const dimMax =
    props.variant === 'astral'
      ? BUTTON_VISUAL_TUNING.astralHoverDimOpacity
      : BUTTON_VISUAL_TUNING.primaryHoverDimOpacity
  const coreDim = (p * (0.38 + 0.62 * e) * dimMax).toFixed(3)

  const secondaryBgTint = isGoldFluid.value
    ? `rgba(255, 236, 179, ${(p * BUTTON_VISUAL_TUNING.secondaryHoverBgAlpha).toFixed(4)})`
    : `rgba(255, 255, 255, ${(p * BUTTON_VISUAL_TUNING.secondaryHoverBgAlpha).toFixed(4)})`

  return {
    '--b-btn-scale': inertialBtnScale.value.toFixed(4),
    '--b-pill-border-w': `${BUTTON_VISUAL_TUNING.pillBorderWidthPx}px`,
    '--b-socket-border-w': `${sizeMetrics.value.socketRingPx}px`,
    '--b-border-alpha': lerp(borderRest, borderHover, borderProgress).toFixed(3),
    '--b-left-ring': leftRing.toFixed(3),
    '--b-left-wave': leftWave.toFixed(3),
    '--b-right-ring': rightRing.toFixed(3),
    '--b-right-ring-scale': rightRingScale.toFixed(4),
    '--b-right-click-glow': clamp(bloom, 0, 1).toFixed(3),
    '--b-right-arrow': rightArrow.toFixed(3),
    '--b-primary-dim': coreDim,
    '--b-secondary-bg': secondaryBgTint,
  }
})

// Continuous fluid simulation scalars
let rafId: number | null = null
let lastTs = 0
let simTime = 0
let flowPhase = 0
let flowDirection = 1

// Button shell scale spring (1.0 at rest)
let btnScaleActual = 1
let btnScaleVel = 0

// Left wave launch spring & Right socket arrival spring
let leftLaunchPos = 0
let leftLaunchVel = 0
let rightBloomPos = 0
let rightBloomVel = 0

// Active traveling click wave fronts
const clickWaves: number[] = []

let tide = 0
let tideVel = 0

// Monotonic evaporation latch (prevents any unhover kickback / re-brightening)
let isEvaporating = false

// Outside-click partial sympathetic impulse state
let ambientDrive = 0
let isAmbientMode = false
let isInViewport = true

let masterAlpha = 0
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let navTimer: ReturnType<typeof setTimeout> | null = null

function measureGeometry() {
  const el = rootEl.value
  if (!el) return
  const w = el.clientWidth || el.offsetWidth
  const h = el.clientHeight || el.offsetHeight
  if (w > 0 && h > 0) {
    btnW.value = w
    btnH.value = h
  }
}

function sampleClickCrestAt(u: number): number {
  if (clickWaves.length === 0) return 0
  let sum = 0
  for (let idx = 0; idx < clickWaves.length; idx++) {
    const wPos = clickWaves[idx]!
    const dist = (u - wPos) / 0.24
    const fadeTail = smoothstep(1.42, 0.96, wPos) * smoothstep(-0.05, 0.08, wPos)
    sum += Math.exp(-dist * dist) * fadeTail
  }
  return Math.min(1.35, sum)
}

function buildPlasmaAndContinuousStream() {
  const W = btnW.value
  const H = btnH.value
  const R = H * 0.5
  const cxL = R
  const cxR = Math.max(cxL + 20, W - R)
  const corridorSpan = Math.max(1, cxR - cxL)

  const clampedTide = clamp(tide, 0, 1)
  const inertialOvershoot = Math.max(0, tide - clampedTide)
  const transitStretch = Math.sin(Math.PI * clampedTide)
  const cornerBreathX = isHovered.value ? Math.sin(simTime * 2.1) * H * 0.08 * clampedTide : 0
  const globalClickLift = rightBloomPos * 0.16

  const packetCenterX =
    cxL + clampedTide * corridorSpan + inertialOvershoot * H * 0.4 + cornerBreathX
  const baseHalfSpan = H * 0.88 + transitStretch * W * 0.46 + globalClickLift * H

  // PART A: Gaseous Edge-Hugging Vapor Polygons
  const SAMPLES = 36
  const stepX = (W + 12) / SAMPLES
  const yFloorStr = (H + 6).toFixed(1)
  const outPolys = ['', '', '']

  for (let k = 0; k < VAPOR_SHEETS.length; k++) {
    const spec = VAPOR_SHEETS[k]!
    const sloshOffset =
      Math.sin(simTime * spec.driftSpeed + spec.phaseSeed) * H * 0.075 * clampedTide
    const sheetCenter =
      packetCenterX + spec.offsetRatio * W * (0.3 + 0.7 * transitStretch) + sloshOffset
    const halfSpan = baseHalfSpan * spec.spanScale

    let dTop = ''
    let dBot = ''

    for (let i = 0; i <= SAMPLES; i++) {
      const x = -6 + i * stepX
      const xf = x.toFixed(1)
      const revX = (-6 + (SAMPLES - i) * stepX).toFixed(1)
      dBot += `L${revX} ${yFloorStr} `

      const normDx = (x - sheetCenter) / Math.max(18, halfSpan)
      const rawDome = Math.max(0, 1 - normDx * normDx)
      const packetEnv = rawDome > 0 ? Math.pow(rawDome, 1.32) : 0

      if (packetEnv <= 0.001) {
        dTop += `${i === 0 ? 'M' : 'L'}${xf} ${yFloorStr} `
        continue
      }

      const uCorridor = clamp((x - cxL) / corridorSpan, 0, 1)
      const underTextMask = Math.pow(Math.sin(Math.PI * uCorridor), 0.78)
      const socketWrapMask = 1 - underTextMask
      const localCrest = sampleClickCrestAt(0.16 + uCorridor * 0.72)

      const maxLocalHeight =
        H *
        (spec.underbellyHeight * underTextMask +
          spec.cornerWrapHeight * socketWrapMask +
          localCrest * 0.18)

      const wTravel = Math.sin(x * spec.freqA - flowPhase * (1.1 + k * 0.18) + spec.phaseSeed)
      const wBillow = Math.cos(
        x * spec.freqB + simTime * spec.driftSpeed + spec.phaseSeed * 1.3,
      )
      const wSwirl = Math.sin(normDx * Math.PI * 2.0 - simTime * 2.3 + spec.phaseSeed)

      const amp = H * (0.1 + 0.05 * transitStretch + localCrest * 0.065)
      const vaporWave =
        (wTravel * 0.5 + wBillow * 0.32 + wSwirl * 0.22) * amp * Math.sqrt(packetEnv)

      const yTop = H + 4 - (packetEnv * maxLocalHeight + vaporWave)
      dTop += `${i === 0 ? 'M' : 'L'}${xf} ${yTop.toFixed(1)} `
    }

    outPolys[k] = `${dTop}${dBot}Z`
  }

  vaporPath0.value = outPolys[0]!
  vaporPath1.value = outPolys[1]!
  vaporPath2.value = outPolys[2]!

  // PART B: Continuous Unbroken Luminous Stream + Flowing Click Tidal Swell
  const rRim = Math.max(8, R - 2.6)
  const basePeakHalfW = sizeMetrics.value.streamPeakWidth * 0.5

  const uTail = lerp(0.02, 0.13, clampedTide)
  const uHead = clamp(lerp(0.26, 1.0, clampedTide) + inertialOvershoot * 0.06, 0.22, 1.0)

  for (let i = 0; i <= STREAM_PTS; i++) {
    const u = i / STREAM_PTS

    let bx = 0
    let by = 0
    let nx = 0
    let ny = -1

    if (u < 0.25) {
      const t = u / 0.25
      const ang = -0.78 * Math.PI + t * (1.28 * Math.PI)
      const ca = Math.cos(ang)
      const sa = Math.sin(ang)
      bx = cxL + ca * rRim
      by = R + sa * rRim
      nx = -ca
      ny = -sa
    } else if (u <= 0.75) {
      const t = (u - 0.25) / 0.5
      bx = cxL + t * corridorSpan
      by = R + rRim
      nx = 0
      ny = -1
    } else {
      const t = (u - 0.75) / 0.25
      const ang = 0.5 * Math.PI - t * (1.3 * Math.PI)
      const ca = Math.cos(ang)
      const sa = Math.sin(ang)
      bx = cxR + ca * rRim
      by = R + sa * rRim
      nx = -ca
      ny = -sa
    }

    const tailEnv = smoothstep(uTail, uTail + 0.085, u)
    const headEnv = smoothstep(uHead, uHead - 0.09, u)
    const localClick = sampleClickCrestAt(u)
    const spanEnv = clamp(
      tailEnv * headEnv + localClick * 0.45 * smoothstep(0.0, 0.06, u),
      0,
      1.2,
    )

    const osc1 = Math.sin(u * 21.0 - flowPhase * 1.55)
    const osc2 = Math.cos(u * 31.0 - flowPhase * 2.15 + 1.1)
    const osc3 = Math.sin(u * 14.0 - flowPhase * 1.1 + 2.3)

    const shift1 =
      (1.35 +
        localClick * 1.15 +
        (osc1 * 0.58 + osc2 * 0.28 + osc3 * 0.22) * (2.15 + localClick * 0.9)) *
      Math.min(1, spanEnv)
    const shift2 =
      (3.35 + localClick * 1.35 + (osc2 * 0.56 - osc1 * 0.38) * (2.35 + localClick * 0.8)) *
      Math.min(1, spanEnv)

    const swell1 =
      0.42 + 0.58 * Math.pow(0.5 + 0.5 * Math.sin(u * 16.0 - flowPhase * 1.8), 1.35)
    const swell2 =
      0.36 + 0.64 * Math.pow(0.5 + 0.5 * Math.cos(u * 20.0 - flowPhase * 2.2 + 0.7), 1.45)

    const crestBoost = 1 + localClick * 0.82
    const hw1 = basePeakHalfW * swell1 * crestBoost * Math.min(1, spanEnv)
    const hw2 = basePeakHalfW * 0.74 * swell2 * crestBoost * Math.min(1, spanEnv)
    const hwGlow =
      basePeakHalfW *
      2.35 *
      (0.52 + 0.48 * swell1) *
      (1 + localClick * 0.95) *
      Math.min(1, spanEnv)

    const c1x = bx + nx * shift1
    const c1y = by + ny * shift1

    up1X[i] = c1x + nx * hw1
    up1Y[i] = c1y + ny * hw1
    lo1X[i] = c1x - nx * hw1
    lo1Y[i] = c1y - ny * hw1

    glowUpX[i] = c1x + nx * hwGlow
    glowUpY[i] = c1y + ny * hwGlow
    glowLoX[i] = c1x - nx * (hwGlow * 0.85)
    glowLoY[i] = c1y - ny * (hwGlow * 0.85)

    const c2x = bx + nx * shift2
    const c2y = by + ny * shift2
    up2X[i] = c2x + nx * hw2
    up2Y[i] = c2y + ny * hw2
    lo2X[i] = c2x - nx * hw2
    lo2Y[i] = c2y - ny * hw2
  }

  let polyGlow = ''
  let poly1 = ''
  let poly2 = ''
  for (let i = 0; i <= STREAM_PTS; i++) {
    const cmd = i === 0 ? 'M' : 'L'
    polyGlow += `${cmd}${glowUpX[i]!.toFixed(1)} ${glowUpY[i]!.toFixed(1)} `
    poly1 += `${cmd}${up1X[i]!.toFixed(1)} ${up1Y[i]!.toFixed(1)} `
    poly2 += `${cmd}${up2X[i]!.toFixed(1)} ${up2Y[i]!.toFixed(1)} `
  }
  for (let i = STREAM_PTS; i >= 0; i--) {
    polyGlow += `L${glowLoX[i]!.toFixed(1)} ${glowLoY[i]!.toFixed(1)} `
    poly1 += `L${lo1X[i]!.toFixed(1)} ${lo1Y[i]!.toFixed(1)} `
    poly2 += `L${lo2X[i]!.toFixed(1)} ${lo2Y[i]!.toFixed(1)} `
  }
  polyGlow += 'Z'
  poly1 += 'Z'
  poly2 += 'Z'

  streamGlowRibbon.value = polyGlow
  streamRibbonPrimary.value = poly1
  streamRibbonSecondary.value = poly2
}

function tickPhysics(ts: number) {
  if (!lastTs) lastTs = ts
  const dt = Math.min(0.034, (ts - lastTs) / 1000)
  lastTs = ts
  simTime += dt

  // 1. Button Shell Scale Spring (Critically damped + zero-crossing arrest on unhover so it NEVER bobbles)
  const isReturningScaleToRest = !isPressed.value && !isHovered.value
  const targetBtnScale = isPressed.value
    ? BUTTON_VISUAL_TUNING.buttonPressDipScale
    : isHovered.value
      ? BUTTON_VISUAL_TUNING.buttonHoverScale
      : 1.0

  const activeScaleDamping = isReturningScaleToRest
    ? 2.05 * Math.sqrt(RESONANT_BUTTON_PHYSICS.scaleSpringStiffness)
    : RESONANT_BUTTON_PHYSICS.scaleSpringDamping

  const prevScaleDiff = btnScaleActual - 1.0
  const scaleAccel =
    (targetBtnScale - btnScaleActual) * RESONANT_BUTTON_PHYSICS.scaleSpringStiffness -
    btnScaleVel * activeScaleDamping
  btnScaleVel += scaleAccel * dt
  btnScaleActual += btnScaleVel * dt
  const nextScaleDiff = btnScaleActual - 1.0

  if (
    isReturningScaleToRest &&
    ((prevScaleDiff !== 0 && prevScaleDiff * nextScaleDiff <= 0) ||
      (Math.abs(nextScaleDiff) < 0.0004 && Math.abs(btnScaleVel) < 0.02))
  ) {
    btnScaleActual = 1.0
    btnScaleVel = 0
  }
  inertialBtnScale.value = Number(btnScaleActual.toFixed(4))

  // 2. Advance Traveling Click Wave Crests
  let rightSocketDrive = 0
  let activeWaveEnergy = 0
  for (let i = clickWaves.length - 1; i >= 0; i--) {
    const cur = clickWaves[i]!
    const glideFactor = 1.18 - 0.32 * clamp(cur, 0, 1)
    const next = cur + dt * RESONANT_BUTTON_PHYSICS.clickWaveTravelSpeed * glideFactor
    if (next > 1.46) {
      clickWaves.splice(i, 1)
    } else {
      clickWaves[i] = next
      activeWaveEnergy = Math.max(activeWaveEnergy, smoothstep(1.44, 0.85, next))
      const dRight = (next - 0.88) / 0.26
      rightSocketDrive = Math.max(rightSocketDrive, Math.exp(-dRight * dRight))
    }
  }

  leftLaunchVel += (-leftLaunchPos * 38.0 - leftLaunchVel * 8.5) * dt
  leftLaunchPos += leftLaunchVel * dt
  leftLaunchWave.value = Number(leftLaunchPos.toFixed(4))

  const bloomAccel =
    (rightSocketDrive - rightBloomPos) * RESONANT_BUTTON_PHYSICS.clickArrivalStiffness -
    rightBloomVel * RESONANT_BUTTON_PHYSICS.clickArrivalDamping
  rightBloomVel += bloomAccel * dt
  rightBloomPos += rightBloomVel * dt
  rightArrivalBloom.value = Number(Math.max(0, rightBloomPos).toFixed(4))

  if (ambientDrive > 0.001) {
    ambientDrive *= Math.exp(-RESONANT_BUTTON_PHYSICS.outsideDecayRate * dt)
    if (ambientDrive < 0.002) ambientDrive = 0
  }

  // 3. Fluid Tide Spring (Critically damped + zero-floor arrest on return -> zero kickback!)
  let targetTide = 0
  let stiffness: number = RESONANT_BUTTON_PHYSICS.tideSpringStiffness
  let damping: number = RESONANT_BUTTON_PHYSICS.tideSpringDamping

  if (isHovered.value || activeWaveEnergy > 0.15) {
    isAmbientMode = false
    isEvaporating = false
    ambientDrive = 0
    targetTide = 1 + Math.sin(simTime * 2.0) * 0.026
  } else if (isAmbientMode) {
    targetTide = ambientDrive
    stiffness = RESONANT_BUTTON_PHYSICS.outsideSpringStiffness
    damping =
      ambientDrive < 0.04
        ? 2.05 * Math.sqrt(stiffness)
        : RESONANT_BUTTON_PHYSICS.outsideSpringDamping
  } else {
    damping = 2.05 * Math.sqrt(stiffness)
  }

  const prevTide = tide
  const tideAccel = (targetTide - tide) * stiffness - tideVel * damping
  tideVel += tideAccel * dt
  tide += tideVel * dt

  // Hard one-way floor at left socket: once returning energy reaches 0, arrest cleanly with zero rebound
  if (targetTide === 0 && (tide <= 0.002 || (prevTide > 0 && tide <= 0))) {
    tide = 0
    tideVel = 0
  }

  const hoverNorm = clamp(
    (btnScaleActual - 1) / (BUTTON_VISUAL_TUNING.buttonHoverScale - 1),
    0,
    1.15,
  )
  const iconTarget = isHovered.value
    ? Math.max(hoverNorm, clamp(tide, 0, 1) * 0.85)
    : Math.max(0, clamp(tide, 0, 1) * (activeWaveEnergy > 0.05 ? 0.85 : 0.36))
  internalIconProgress.value = Number(iconTarget.toFixed(4))

  const advancingOutward =
    isHovered.value || activeWaveEnergy > 0.1 || (isAmbientMode && tideVel > 0.03)
  const targetDir = advancingOutward ? 1 : -1
  flowDirection +=
    (targetDir - flowDirection) *
    (1 - Math.exp(-RESONANT_BUTTON_PHYSICS.directionInertiaRate * dt))

  const speedBoost = Math.abs(tideVel) * 1.35 + activeWaveEnergy * 2.6 + rightBloomPos * 1.8
  flowPhase += dt * (RESONANT_BUTTON_PHYSICS.vaporWaveSpeed + speedBoost) * flowDirection

  // 4. Latched Evaporation Choreography (Once wave returns left, it ONLY fades to 0 — zero re-flash)
  if (
    !isHovered.value &&
    ambientDrive < 0.04 &&
    activeWaveEnergy < 0.04 &&
    tide <= 0.16 &&
    tideVel <= 0.05
  ) {
    isEvaporating = true
  }

  if (isHovered.value || activeWaveEnergy >= 0.04) {
    isEvaporating = false
    masterAlpha +=
      (1 - masterAlpha) * (1 - Math.exp(-RESONANT_BUTTON_PHYSICS.vaporFadeInRate * dt))
  } else if (isEvaporating) {
    masterAlpha +=
      (0 - masterAlpha) * (1 - Math.exp(-RESONANT_BUTTON_PHYSICS.vaporEvaporateRate * dt))
  } else if (isAmbientMode) {
    masterAlpha += (0.76 - masterAlpha) * (1 - Math.exp(-7.5 * dt))
  } else {
    masterAlpha += (1 - masterAlpha) * (1 - Math.exp(-8.5 * dt))
  }

  const isCoastingIntoLeft =
    !isHovered.value && !isEvaporating && tide < 0.28 && tideVel < -0.08
  const targetLeftGlow = isCoastingIntoLeft ? masterAlpha : 0
  leftReturnGlow.value +=
    (targetLeftGlow - leftReturnGlow.value) * (1 - Math.exp(-9.0 * dt))

  energyBalance.value = Number(clamp(tide, 0, 1).toFixed(3))
  activePresence.value = Number(clamp(masterAlpha, 0, 1).toFixed(3))
  vaporStageOpacity.value = Number(
    (clamp(masterAlpha, 0, 1) * BUTTON_VISUAL_TUNING.gaseousMasterOpacity).toFixed(3),
  )

  buildPlasmaAndContinuousStream()

  // Put rAF completely to sleep once settled (0.000ms idle CPU)
  const scaleSettled =
    !isPressed.value &&
    Math.abs(targetBtnScale - btnScaleActual) < 0.0004 &&
    Math.abs(btnScaleVel) < 0.002
  const tideSettled =
    !isHovered.value &&
    ambientDrive === 0 &&
    clickWaves.length === 0 &&
    masterAlpha < 0.006 &&
    tide < 0.01 &&
    Math.abs(tideVel) < 0.01 &&
    Math.abs(rightBloomPos) < 0.004

  if (scaleSettled && tideSettled) {
    btnScaleActual = 1
    btnScaleVel = 0
    tide = 0
    tideVel = 0
    masterAlpha = 0
    leftLaunchPos = 0
    leftLaunchVel = 0
    rightBloomPos = 0
    rightBloomVel = 0
    isAmbientMode = false
    isEvaporating = false
    inertialBtnScale.value = 1
    internalIconProgress.value = 0
    leftLaunchWave.value = 0
    rightArrivalBloom.value = 0
    vaporStageOpacity.value = 0
    activePresence.value = 0
    energyBalance.value = 0
    leftReturnGlow.value = 0
    rafId = null
    lastTs = 0
    return
  }

  rafId = requestAnimationFrame(tickPhysics)
}

function ensurePhysicsLoop() {
  if (rafId === null && typeof window !== 'undefined') {
    lastTs = 0
    rafId = requestAnimationFrame(tickPhysics)
  }
}

function smoothScrollToHash(hash: string) {
  if (typeof window === 'undefined') return

  const lenis =
    (nuxtApp as Record<string, any>).$lenis ??
    (window as unknown as Record<string, any>).__lenis

  if (hash === '#' || hash === '#top') {
    if (lenis && typeof lenis.scrollTo === 'function') {
      lenis.scrollTo(0)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    return
  }

  const target = document.querySelector<HTMLElement>(hash)
  if (!target) return

  if (lenis && typeof lenis.scrollTo === 'function') {
    lenis.scrollTo(target)
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function onPointerEnter() {
  measureGeometry()
  if (masterAlpha < 0.04 && Math.abs(tide) < 0.05) {
    tide = 0
    tideVel = 0.28
    flowDirection = 1
  }
  isAmbientMode = false
  isEvaporating = false
  isHovered.value = true
  ensurePhysicsLoop()
}

function onPointerLeave() {
  isHovered.value = false
  isPressed.value = false
  ensurePhysicsLoop()
}

function onPointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  measureGeometry()
  isPressed.value = true
  btnScaleVel = Math.min(btnScaleVel, -0.22)
  ensurePhysicsLoop()
}

function onPointerUp() {
  isPressed.value = false
  ensurePhysicsLoop()
}

function onWindowPointerDown(e: PointerEvent) {
  if (!isInViewport || isHovered.value) return
  if (e.pointerType === 'mouse' && e.button !== 0) return

  const el = rootEl.value
  if (!el) return
  if (e.target instanceof Node && el.contains(e.target)) return

  measureGeometry()
  isAmbientMode = true
  isEvaporating = false
  ambientDrive = Math.min(
    RESONANT_BUTTON_PHYSICS.outsideImpulseMax,
    ambientDrive + RESONANT_BUTTON_PHYSICS.outsideImpulseStep,
  )
  tideVel = Math.min(1.45, tideVel + 0.68)
  masterAlpha = Math.max(masterAlpha, 0.42)
  flowDirection = 1
  ensurePhysicsLoop()
}

function triggerClickSequence(e: MouseEvent) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
    return
  }

  measureGeometry()
  isPressed.value = false
  isAmbientMode = false
  isEvaporating = false

  btnScaleVel += 0.24
  leftLaunchVel = 2.4
  if (clickWaves.length < 4) {
    clickWaves.push(0.06)
  }
  tideVel = Math.max(tideVel, 1.35)
  flowDirection = 1
  ensurePhysicsLoop()

  if (navTimer) {
    clearTimeout(navTimer)
    navTimer = null
  }

  // 1. Calibration test lock: stay on page
  if (props.preventNavigation) {
    if (props.href) e.preventDefault()
    emit('action', e)
    return
  }

  // 2. Smooth in-page hash scroll (#contact, #top, etc.)
  if (props.href && isHashLink.value) {
    e.preventDefault()
    const targetHash = props.href
    emit('action', e)
    smoothScrollToHash(targetHash)
    return
  }

  // 3. External / New-Tab link: let native <a target="_blank" rel="noopener noreferrer">
  // open the single new tab cleanly while this tab settles back to rest
  if (props.href && shouldOpenNewTab.value) {
    emit('action', e)
    isHovered.value = false
    ensurePhysicsLoop()
    return
  }

  // 4. Internal Nuxt route (/formation, etc.): play click wave arrival, then SPA navigate
  if (props.href) {
    e.preventDefault()
    const destination = props.href
    navTimer = setTimeout(() => {
      navTimer = null
      emit('action', e)
      navigateTo(destination)
    }, RESONANT_BUTTON_PHYSICS.clickNavigationHoldMs)
    return
  }

  emit('action', e)
}

onMounted(() => {
  measureGeometry()
  window.addEventListener('pointerdown', onWindowPointerDown, { passive: true })

  if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
    resizeObserver = new ResizeObserver(() => {
      measureGeometry()
    })
    resizeObserver.observe(rootEl.value)
  }

  if (typeof IntersectionObserver !== 'undefined' && rootEl.value) {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        isInViewport = entries[0]?.isIntersecting ?? true
      },
      { threshold: 0.05 },
    )
    intersectionObserver.observe(rootEl.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onWindowPointerDown)
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (intersectionObserver) {
    intersectionObserver.disconnect()
    intersectionObserver = null
  }
  if (navTimer) clearTimeout(navTimer)
})
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    ref="rootEl"
    :href="href"
    :type="href ? undefined : 'button'"
    :target="href && shouldOpenNewTab ? '_blank' : undefined"
    :rel="href && shouldOpenNewTab ? 'noopener noreferrer' : undefined"
    :style="liveStyleVars"
    class="resonant-btn relative inline-flex items-center justify-between rounded-full font-semibold uppercase tracking-[0.11em] text-white no-underline select-none cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-void"
    :class="[
      sizeMetrics.shellClass,
      variant === 'primary'
        ? 'resonant-btn--primary'
        : variant === 'astral'
          ? 'resonant-btn--astral'
          : isGoldFluid
            ? 'resonant-btn--secondary resonant-btn--secondary-gold'
            : 'resonant-btn--secondary',
      isGoldFluid ? 'focus-visible:ring-amber-200' : 'focus-visible:ring-brand-ice',
    ]"
    @mouseenter="onPointerEnter"
    @mouseleave="onPointerLeave"
    @focus="onPointerEnter"
    @blur="onPointerLeave"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @click="triggerClickSequence"
  >
    <!-- LAYER 0A: Symmetrical Ambient Drift -->
    <span
      aria-hidden="true"
      class="ambient-gradient-sheen pointer-events-none absolute -inset-3 z-0 rounded-full"
      :class="
        variant === 'primary'
          ? 'ambient-gradient-sheen--primary'
          : variant === 'astral'
            ? 'ambient-gradient-sheen--astral'
            : isGoldFluid
              ? 'ambient-gradient-sheen--secondary-gold'
              : 'ambient-gradient-sheen--secondary'
      "
    />

    <!-- LAYER 0B (Primary & Astral): Deep Contrast Dimming Veil on Hover -->
    <span
      v-if="variant === 'primary' || variant === 'astral'"
      aria-hidden="true"
      class="core-dim-veil pointer-events-none absolute inset-0 z-0 rounded-full"
      :class="variant === 'astral' ? 'core-dim-veil--astral' : 'core-dim-veil--primary'"
    />

    <!-- LAYER 1: Edge-Strong Gaseous Vapor + Continuous Full-Flowing Luminous Stream -->
    <span
      aria-hidden="true"
      class="gaseous-vapor-stage pointer-events-none absolute inset-0 z-1 rounded-full overflow-hidden"
      :style="{ opacity: vaporStageOpacity }"
    >
      <!-- Sub-Layer 1A: Edge-Masked Gaseous Vapor -->
      <svg
        focusable="false"
        :viewBox="`0 0 ${btnW} ${btnH}`"
        preserveAspectRatio="none"
        class="vapor-deep-blur absolute inset-0 h-full w-full"
      >
        <defs>
          <mask :id="`edgeMask-${uid}`">
            <rect x="0" y="0" :width="btnW" :height="btnH" :rx="btnH * 0.5" fill="#ffffff" />
            <rect
              v-for="(step, idx) in edgeFalloffSteps"
              :key="idx"
              :x="step.x"
              :y="step.y"
              :width="step.w"
              :height="step.h"
              :rx="step.rx"
              fill="#000000"
              :fill-opacity="step.alpha"
            />
          </mask>

          <linearGradient :id="`vapDeep-${uid}`" x1="0%" y1="100%" x2="100%" y2="10%">
            <stop offset="0%" :stop-color="energyPalette.vapDeep0" stop-opacity="0.60" />
            <stop offset="52%" :stop-color="energyPalette.vapDeep1" stop-opacity="0.76" />
            <stop offset="100%" :stop-color="energyPalette.vapDeep2" stop-opacity="0.68" />
          </linearGradient>

          <linearGradient :id="`vapMid-${uid}`" x1="5%" y1="95%" x2="95%" y2="10%">
            <stop offset="0%" :stop-color="energyPalette.vapMid0" stop-opacity="0.50" />
            <stop offset="55%" :stop-color="energyPalette.vapMid1" stop-opacity="0.70" />
            <stop offset="100%" :stop-color="energyPalette.vapMid2" stop-opacity="0.74" />
          </linearGradient>
        </defs>

        <g :mask="`url(#edgeMask-${uid})`">
          <path :d="vaporPath0" :fill="`url(#vapDeep-${uid})`" />
          <path :d="vaporPath1" :fill="`url(#vapMid-${uid})`" />
        </g>
      </svg>

      <!-- Sub-Layer 1B: Continuous Unbroken Flowing Luminous Stream -->
      <svg
        focusable="false"
        :viewBox="`0 0 ${btnW} ${btnH}`"
        preserveAspectRatio="none"
        class="absolute inset-0 h-full w-full"
      >
        <defs>
          <mask :id="`streamEdgeMask-${uid}`">
            <rect x="0" y="0" :width="btnW" :height="btnH" :rx="btnH * 0.5" fill="#ffffff" />
            <rect
              v-for="(step, idx) in edgeFalloffSteps"
              :key="idx"
              :x="step.x + 1.5"
              :y="step.y + 1.5"
              :width="Math.max(0, step.w - 3)"
              :height="Math.max(0, step.h - 3)"
              :rx="Math.max(0, step.rx - 1.5)"
              fill="#000000"
              :fill-opacity="step.alpha * 0.82"
            />
          </mask>

          <linearGradient :id="`streamAura-${uid}`" x1="0%" y1="90%" x2="100%" y2="15%">
            <stop offset="0%" :stop-color="energyPalette.aura0" stop-opacity="0.34" />
            <stop offset="52%" :stop-color="energyPalette.aura1" stop-opacity="0.48" />
            <stop offset="100%" :stop-color="energyPalette.aura2" stop-opacity="0.56" />
          </linearGradient>

          <linearGradient :id="`streamPrimary-${uid}`" x1="0%" y1="90%" x2="100%" y2="15%">
            <stop offset="0%" :stop-color="energyPalette.prim0" stop-opacity="0.76" />
            <stop offset="48%" :stop-color="energyPalette.prim1" stop-opacity="0.94" />
            <stop offset="100%" :stop-color="energyPalette.prim2" stop-opacity="0.98" />
          </linearGradient>

          <linearGradient :id="`streamCompanion-${uid}`" x1="8%" y1="95%" x2="92%" y2="10%">
            <stop offset="0%" :stop-color="energyPalette.comp0" stop-opacity="0.54" />
            <stop offset="55%" :stop-color="energyPalette.comp1" stop-opacity="0.86" />
            <stop offset="100%" :stop-color="energyPalette.comp2" stop-opacity="0.92" />
          </linearGradient>
        </defs>

        <g :mask="`url(#streamEdgeMask-${uid})`">
          <path :d="vaporPath2" :fill="energyPalette.vaporWash" />
          <path :d="streamGlowRibbon" :fill="`url(#streamAura-${uid})`" />
          <path :d="streamRibbonSecondary" :fill="`url(#streamCompanion-${uid})`" />
          <path :d="streamRibbonPrimary" :fill="`url(#streamPrimary-${uid})`" />
        </g>
      </svg>
    </span>

    <!-- LAYER 2: Left Concentric 2px Resonator Socket -->
    <span
      aria-hidden="true"
      class="left-socket relative z-10 inline-flex shrink-0 items-center justify-center rounded-full"
      :class="sizeMetrics.socketClass"
    >
      <span
        class="left-socket-ring pointer-events-none absolute inset-0 rounded-full"
        :class="{
          'left-socket-ring--warm': variant === 'astral' || (variant === 'secondary' && isGoldFluid),
          'left-socket-ring--gold-energy': isGoldFluid,
        }"
      />

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 28 28"
        fill="none"
        focusable="false"
        class="left-pulse-wave relative z-10 overflow-visible"
        :class="sizeMetrics.waveSvgClass"
      >
        <g :transform="waveVectorTransform">
          <path
            d="M2.5 14H6.2L8.1 16.4L10.4 9.8L12.6 19.6L15.1 5.4L17.6 21.4L19.9 10.6L21.8 15.8L23.2 14H25.5"
            :stroke="energyPalette.waveHalo"
            stroke-width="3.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.38"
          />
          <path
            d="M2.5 14H6.2L8.1 16.4L10.4 9.8L12.6 19.6L15.1 5.4L17.6 21.4L19.9 10.6L21.8 15.8L23.2 14H25.5"
            stroke="currentColor"
            stroke-width="2.0"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </g>
      </svg>
    </span>

    <!-- LAYER 3: Dead-Centered Cap-Height Uppercase Label -->
    <span class="button-label relative z-10 flex-1 justify-center whitespace-nowrap px-1 pt-0.5 text-center">
      {{ label }}
    </span>

    <!-- LAYER 4: Right Concentric 2px Action Socket -->
    <span
      aria-hidden="true"
      class="right-socket relative z-10 inline-flex shrink-0 items-center justify-center rounded-full"
      :class="sizeMetrics.socketClass"
    >
      <span
        class="right-socket-ring pointer-events-none absolute inset-0 rounded-full"
        :class="{
          'right-socket-ring--warm': variant === 'astral' || (variant === 'secondary' && isGoldFluid),
          'right-socket-ring--gold-energy': isGoldFluid,
        }"
      />

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="none"
        focusable="false"
        class="right-arrow-icon relative z-10 overflow-visible"
        :class="sizeMetrics.arrowSvgClass"
      >
        <g :transform="arrowVectorTransform">
          <path
            :d="activeArrowPath"
            :stroke="energyPalette.arrowHalo"
            stroke-width="3.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            :opacity="arrowVectorGlowOpacity"
          />
          <path
            :d="activeArrowPath"
            stroke="currentColor"
            stroke-width="1.85"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </g>
      </svg>
    </span>
  </component>
</template>

<style scoped>
/* Permanent 3D GPU composite plane prevents any 1px layer-demotion twitch at scale(1) */
.resonant-btn {
  --rf-ease: cubic-bezier(0.22, 1, 0.36, 1);
  transform: translate3d(0, 0, 0) scale(var(--b-btn-scale, 1));
  transform-origin: 50% 50%;
  backface-visibility: hidden;
  will-change: transform;
  transition: box-shadow 520ms var(--rf-ease);
}

/* =========================================================
   PRIMARY VARIANT: Custom #125dfd Sculpted Sapphire Gradient
   ========================================================= */
.resonant-btn--primary {
  background-color: #0038b8;
  background-image:
    radial-gradient(ellipse 76% 66% at 50% -12%, rgba(116, 184, 255, 0.42) 0%, rgba(30, 107, 255, 0) 68%),
    radial-gradient(ellipse 64% 56% at 50% 46%, rgba(30, 107, 255, 0.24) 0%, transparent 72%),
    linear-gradient(180deg, #125dfd 0%, var(--color-brand-blue, #0048ff) 50%, #002382 100%);
  background-origin: border-box;
  background-clip: border-box;
  background-repeat: no-repeat;
  border: var(--b-pill-border-w, 2px) solid rgba(168, 218, 255, var(--b-border-alpha, 0.30));
  box-shadow:
    0 5px 18px -4px rgba(0, 72, 255, 0.34),
    0 0 10px rgba(30, 107, 255, 0.14),
    inset 0 0 12px rgba(0, 14, 56, 0.34);
}

/* =========================================================
   GOLDEN ASTRAL VARIANT: Sculpted Molten-Champagne Gold
   ========================================================= */
.resonant-btn--astral {
  background-color: #8a4b00;
  background-image:
    radial-gradient(ellipse 78% 66% at 50% -12%, rgba(255, 243, 176, 0.48) 0%, rgba(245, 158, 11, 0) 68%),
    radial-gradient(ellipse 64% 56% at 50% 46%, rgba(251, 191, 36, 0.24) 0%, transparent 72%),
    linear-gradient(180deg, #d48806 0%, #9e5800 52%, #472100 100%);
  background-origin: border-box;
  background-clip: border-box;
  background-repeat: no-repeat;
  border: var(--b-pill-border-w, 2px) solid rgba(255, 236, 170, var(--b-border-alpha, 0.36));
  box-shadow:
    0 4px 14px -4px rgba(180, 83, 9, 0.22),
    0 0 8px rgba(245, 158, 11, 0.08),
    inset 0 0 12px rgba(32, 12, 0, 0.42);
}

.core-dim-veil {
  opacity: var(--b-primary-dim, 0);
}

.core-dim-veil--primary {
  background: radial-gradient(
    ellipse 85% 90% at 50% 50%,
    rgba(0, 12, 34, 0.88) 0%,
    rgba(0, 8, 24, 0.94) 100%
  );
}

.core-dim-veil--astral {
  background: radial-gradient(
    ellipse 85% 90% at 50% 50%,
    rgba(22, 10, 1, 0.90) 0%,
    rgba(10, 4, 0, 0.96) 100%
  );
}

/* =========================================================
   SECONDARY VARIANT: Uniform Crisp 2px Rim + Subtle Glass Wash
   ========================================================= */
.resonant-btn--secondary {
  background-color: var(--b-secondary-bg, rgba(255, 255, 255, 0.01));
  border: var(--b-pill-border-w, 2px) solid rgba(214, 236, 255, var(--b-border-alpha, 0.38));
}

.resonant-btn--secondary-gold {
  border-color: rgba(254, 238, 196, var(--b-border-alpha, 0.38));
}

/* =========================================================
   SUBTLE AMBIENT GRADIENT ANIMATION
   ========================================================= */
.ambient-gradient-sheen {
  animation: subtleGradientDrift 8.5s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
}

.ambient-gradient-sheen--primary {
  background: radial-gradient(
    ellipse 54% 86% at 50% 42%,
    rgba(68, 172, 255, 0.20) 0%,
    rgba(20, 122, 255, 0.12) 48%,
    transparent 76%
  );
  opacity: 0.72;
}

.ambient-gradient-sheen--astral {
  background: radial-gradient(
    ellipse 54% 86% at 50% 42%,
    rgba(254, 240, 138, 0.24) 0%,
    rgba(245, 158, 11, 0.14) 48%,
    transparent 76%
  );
  opacity: 0.72;
}

.ambient-gradient-sheen--secondary {
  background: radial-gradient(
    ellipse 50% 84% at 50% 48%,
    rgba(20, 122, 255, 0.09) 0%,
    rgba(54, 166, 255, 0.04) 48%,
    transparent 76%
  );
  opacity: 0.68;
}

.ambient-gradient-sheen--secondary-gold {
  background: radial-gradient(
    ellipse 50% 84% at 50% 48%,
    rgba(245, 158, 11, 0.10) 0%,
    rgba(253, 224, 71, 0.045) 48%,
    transparent 76%
  );
  opacity: 0.68;
}

@keyframes subtleGradientDrift {
  0% {
    transform: translate3d(-8%, -4%, 0) scale(0.97);
  }
  100% {
    transform: translate3d(8%, 4%, 0) scale(1.05);
  }
}

/* =========================================================
   EDGE-HUGGING VAPOR BLUR
   ========================================================= */
.vapor-deep-blur {
  filter: blur(5.5px);
}

/* =========================================================
   SOCKETS & TRUE CAP-HEIGHT OPTICAL TEXT CENTERING
   ========================================================= */
.left-socket-ring {
  border: var(--b-socket-border-w, 2px) solid rgba(224, 244, 255, 0.96);
  background: radial-gradient(
    circle,
    rgba(26, 133, 255, 0.16) 0%,
    transparent 74%
  );
  opacity: var(--b-left-ring, 0.92);
}

.left-socket-ring--warm {
  border-color: rgba(254, 243, 199, 0.96);
}

.left-socket-ring--gold-energy {
  background: radial-gradient(
    circle,
    rgba(245, 158, 11, 0.20) 0%,
    transparent 74%
  );
}

.left-pulse-wave {
  color: #ffffff;
  opacity: var(--b-left-wave, 1);
}

.button-label {
  display: inline-flex;
  align-items: center;
  line-height: 1;
  text-box-trim: trim-both;
  text-box-edge: cap alphabetic;
  text-shadow: 0 1px 10px rgba(0, 6, 20, 0.56);
}

.resonant-btn--astral .button-label {
  text-shadow: 0 1px 10px rgba(20, 8, 0, 0.68);
}

@supports not (text-box-trim: trim-both) {
  .button-label {
    transform: translateY(0.5px);
  }
}

.right-socket-ring {
  border: var(--b-socket-border-w, 2px) solid rgba(224, 244, 255, 0.96);
  background: radial-gradient(
    circle,
    rgba(54, 166, 255, calc(0.14 + var(--b-right-click-glow, 0) * 0.24)) 0%,
    transparent 74%
  );
  opacity: var(--b-right-ring, 0.38);
  transform: scale(var(--b-right-ring-scale, 1));
  box-shadow: 0 0 18px rgba(96, 190, 255, calc(var(--b-right-click-glow, 0) * 0.82));
}

.right-socket-ring--warm {
  border-color: rgba(254, 243, 199, 0.96);
}

.right-socket-ring--gold-energy {
  background: radial-gradient(
    circle,
    rgba(251, 191, 36, calc(0.16 + var(--b-right-click-glow, 0) * 0.28)) 0%,
    transparent 74%
  );
  box-shadow: 0 0 18px rgba(254, 226, 114, calc(var(--b-right-click-glow, 0) * 0.86));
}

.right-arrow-icon {
  color: #ffffff;
  opacity: var(--b-right-arrow, 0.8);
}
</style>