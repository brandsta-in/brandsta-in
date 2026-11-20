<!-- app/components/ConvergentSignalEngine.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { NEURAL_STRANDS, AMBIENT_SPARKS } from '~/data/neuralStrands'
import { HERO_CHOREOGRAPHY } from '~/data/heroChoreography'
import {
  useConvergentScroll,
  CONVERGENT_CONSTANTS,
  type ConvergentTelemetry,
} from '~/composables/useConvergentScroll'

const { onScrollTick } = useConvergentScroll()

const svgW = ref(1440)
const svgH = ref(900)

const RIBBON_SAMPLES = 72
const SPINDLE_SAMPLES = 10
const WAKE_SAMPLES = 36
const TWO_PI = Math.PI * 2

const engineStageEl = ref<HTMLDivElement | null>(null)
const worldGroupEl = ref<SVGGElement | null>(null)
const clipRectEl = ref<SVGRectElement | null>(null)
const pulseGroupEl = ref<SVGGElement | null>(null)
const auraCircleEl = ref<SVGCircleElement | null>(null)
const ring1El = ref<SVGCircleElement | null>(null)
const ring2El = ref<SVGCircleElement | null>(null)
const ring3El = ref<SVGCircleElement | null>(null)
const contactWaveEl = ref<SVGCircleElement | null>(null)
const wakeStreamEl = ref<SVGPathElement | null>(null)

const sheathPathEls: Array<SVGPathElement | null> = new Array(NEURAL_STRANDS.length).fill(null)
const corePathEls: Array<SVGPathElement | null> = new Array(NEURAL_STRANDS.length).fill(null)
const spindlePathEls: Array<SVGPathElement | null> = new Array(NEURAL_STRANDS.length).fill(null)
const primarySpotEls: Array<SVGGElement | null> = new Array(NEURAL_STRANDS.length).fill(null)
const secondarySpotEls: Array<SVGGElement | null> = new Array(NEURAL_STRANDS.length).fill(null)
const tipGlowEls: Array<SVGGElement | null> = new Array(NEURAL_STRANDS.length).fill(null)
const ambientSparkEls: Array<SVGCircleElement | null> = new Array(AMBIENT_SPARKS.length).fill(null)

const hx = new Float64Array(5)
const hy = new Float64Array(5)
const s1x = new Float64Array(5)
const s1y = new Float64Array(5)
const dxArr = new Float64Array(5)
const dyArr = new Float64Array(5)
const wx = new Float64Array(5)
const wy = new Float64Array(5)

const cometSpineX = new Float64Array(5)
const cometSpineY = new Float64Array(5)
const cometNormX = new Float64Array(5)
const cometNormY = new Float64Array(5)

const MOTION_HISTORY_STEPS = 24
const histX = new Float64Array(MOTION_HISTORY_STEPS + 1)
const histY = new Float64Array(MOTION_HISTORY_STEPS + 1)
const histDist = new Float64Array(MOTION_HISTORY_STEPS + 1)

const sampleX = new Float64Array(RIBBON_SAMPLES + 1)
const sampleY = new Float64Array(RIBBON_SAMPLES + 1)
const normX = new Float64Array(RIBBON_SAMPLES + 1)
const normY = new Float64Array(RIBBON_SAMPLES + 1)
const taperEnv = new Float64Array(RIBBON_SAMPLES + 1)
const cometTaperEnv = new Float64Array(RIBBON_SAMPLES + 1)

for (let k = 0; k <= RIBBON_SAMPLES; k++) {
  const u = k / RIBBON_SAMPLES
  taperEnv[k] = k === 0 || k === RIBBON_SAMPLES ? 0 : Math.pow(Math.sin(Math.PI * u), 0.68)
  cometTaperEnv[k] =
    k === 0 || k === RIBBON_SAMPLES
      ? 0
      : Math.pow(u, 1.3) * Math.sin(Math.PI * 0.5 * Math.min(1, (1 - u) * 8))
}

const freqTaperEnv = new Float64Array(RIBBON_SAMPLES + 1)
for (let k = 0; k <= RIBBON_SAMPLES; k++) {
  const u = k / RIBBON_SAMPLES
  freqTaperEnv[k] =
    k === 0 || k === RIBBON_SAMPLES
      ? 0
      : Math.pow(Math.sin(Math.PI * 0.5 * Math.min(1, u / 0.18)), 1.15) *
        Math.sin(Math.PI * 0.5 * Math.min(1, (1 - u) / 0.1))
}

const FREQ_LUT_STEPS = 512
const freqLutX = new Float64Array(FREQ_LUT_STEPS + 1)
const freqLutY = new Float64Array(FREQ_LUT_STEPS + 1)
const freqLutS = new Float64Array(FREQ_LUT_STEPS + 1)
const stage3SpineX = new Float64Array(RIBBON_SAMPLES + 1)
const stage3SpineY = new Float64Array(RIBBON_SAMPLES + 1)
const stage3NormX = new Float64Array(RIBBON_SAMPLES + 1)
const stage3NormY = new Float64Array(RIBBON_SAMPLES + 1)

let freqLutTotalLen = 1
let freqSnakeMaxLen = 1
let freqCurrentLenRatio = 0
let freqLutW = 0
let freqLutSvh = 0
let freqLutFieldLeft = 0
let freqLutPortrait = false
let stage3TravelPx = 0

const INTERACTION_NODE_COUNT = 6
const INTERACTION_NODE_INDICES = [0, 1, 2, 3, 4, 5] as const
const interactionNodeEls: (SVGGElement | null)[] = new Array(INTERACTION_NODE_COUNT).fill(null)

function setInteractionNodeRef(el: unknown, idx: number) {
  interactionNodeEls[idx] = (el as SVGGElement | null) ?? null
}

const interactTaperEnv = new Float64Array(RIBBON_SAMPLES + 1)
for (let k = 0; k <= RIBBON_SAMPLES; k++) {
  const u = k / RIBBON_SAMPLES
  interactTaperEnv[k] =
    k === 0 || k === RIBBON_SAMPLES
      ? 0
      : Math.pow(Math.sin(Math.PI * 0.5 * Math.min(1, u / 0.13)), 1.15) *
        Math.pow(Math.sin(Math.PI * 0.5 * Math.min(1, (1 - u) / 0.22)), 1.35)
}

const interactNodeU = new Float64Array(INTERACTION_NODE_COUNT)
const interactNodeX = new Float64Array(INTERACTION_NODE_COUNT)
const interactNodeY = new Float64Array(INTERACTION_NODE_COUNT)
const interactNodeEnergy = new Float64Array(INTERACTION_NODE_COUNT)
let interactBranchFront = 0

let s3UnrollFlip = false

function getStage4StrandProfile(
  strandIdx: number,
  portrait: boolean
): [maxW: number, coreOp: number, sheathOp: number] {
  const pScale = portrait ? 0.82 : 1
  // Tier 1: Sleek, authoritative primary carrier rims & 180-deg alternate branches
  if (strandIdx === 0 || strandIdx === 7) return [1.82 * pScale, 0.9, 0.38]
  if (strandIdx === 1 || strandIdx === 8) return [1.52 * pScale, 0.82, 0.31]
  if (strandIdx >= 13) {
    const branchWidths = [1.72, 1.56, 1.76, 1.52, 1.65] as const
    const bw = branchWidths[(strandIdx - 13) % 5] ?? 1.64
    return [bw * pScale, 0.86, 0.34]
  }
  // Tier 2: Mid-weight harmonic companion trajectories
  if (strandIdx === 2 || strandIdx === 3 || strandIdx === 9 || strandIdx === 10) {
    return [1.22 * pScale, 0.68, 0.23]
  }
  // Tier 3: Fine inner harp micro-strands
  return [0.74 * pScale, 0.48, 0.15]
}

const RESONANCE_ARC_INDICES = [0, 1, 2] as const
const resonanceArcEls: (SVGGElement | null)[] = [null, null, null]
const resonanceTipLeftEl = ref<SVGGElement | null>(null)
const resonanceTipRightEl = ref<SVGGElement | null>(null)

function setResonanceArcRef(el: unknown, idx: number) {
  resonanceArcEls[idx] = (el as SVGGElement | null) ?? null
}

const resonanceTaperEnv = new Float64Array(RIBBON_SAMPLES + 1)
for (let k = 0; k <= RIBBON_SAMPLES; k++) {
  const u = k / RIBBON_SAMPLES
  resonanceTaperEnv[k] =
    k === 0 || k === RIBBON_SAMPLES
      ? 0
      : Math.pow(Math.sin(Math.PI * u), 0.76) * (0.7 + 0.3 * Math.sin(Math.PI * u))
}

let resonanceLock = 0

function getStage5StrandProfile(
  strandIdx: number,
  portrait: boolean
): [maxW: number, coreOp: number, sheathOp: number] {
  const pScale = portrait ? 0.84 : 1
  // Tier 1: Fuller 4-strand coherent core bundle (bridges smoothly from 04 into 06)
  if (strandIdx === 0) return [2.18 * pScale, 0.98, 0.44]
  if (strandIdx === 7) return [2.02 * pScale, 0.94, 0.4]
  if (strandIdx === 1) return [1.84 * pScale, 0.88, 0.35]
  if (strandIdx === 8) return [1.68 * pScale, 0.84, 0.31]

  // Tier 2: Harmonic overtone crown arches & inner sub-crest echoes
  if (strandIdx >= 13 && strandIdx <= 16) return [1.18 * pScale, 0.6, 0.22]
  if (strandIdx === 5 || strandIdx === 6 || strandIdx === 17) return [1.02 * pScale, 0.52, 0.18]

  // Tier 3: Outer crown & symmetric side-wing lens filaments (crisp, never hair-thin)
  return [0.85 * pScale, 0.44, 0.15]
}

const ampUpperHaloEl = ref<SVGPathElement | null>(null)
const ampUpperBodyEl = ref<SVGPathElement | null>(null)
const ampUpperSpecEl = ref<SVGPathElement | null>(null)
const ampLowerHaloEl = ref<SVGPathElement | null>(null)
const ampLowerBodyEl = ref<SVGPathElement | null>(null)
const ampLowerSpecEl = ref<SVGPathElement | null>(null)
const ampFloorGlowEl = ref<SVGGElement | null>(null)
const ampBlueAuraEl = ref<SVGPathElement | null>(null)
const ampGoldBaseEl = ref<SVGPathElement | null>(null)
const ampGoldFlowEl = ref<SVGPathElement | null>(null)
const ampGoldSpecEl = ref<SVGPathElement | null>(null)

const AMP_MOLTEN_STEPS = 52
const moltenBaseX = new Float64Array(AMP_MOLTEN_STEPS + 1)
const moltenBaseY = new Float64Array(AMP_MOLTEN_STEPS + 1)
const moltenOutNX = new Float64Array(AMP_MOLTEN_STEPS + 1)
const moltenOutNY = new Float64Array(AMP_MOLTEN_STEPS + 1)

const WAVE_GOLD_INDICES = [0, 1, 2, 3, 4, 5] as const
const WAVE_GOLD_HERO_INDICES = [0, 1, 2] as const
const ampUpperArchGroupEl = ref<SVGGElement | null>(null)
const ampGoldRadiateEl = ref<SVGPathElement | null>(null)
const ampRightBlueVolTopEl = ref<SVGPathElement | null>(null)
const ampRightBlueVolBotEl = ref<SVGPathElement | null>(null)
const waveClickAuraGlowEl = ref<SVGGElement | null>(null)
const waveClickArcLeftEl = ref<SVGPathElement | null>(null)
const waveClickArcRightEl = ref<SVGPathElement | null>(null)
const waveGoldHaloEls: (SVGPathElement | null)[] = new Array(3).fill(null)
const waveGoldCoreEls: (SVGPathElement | null)[] = new Array(6).fill(null)
const waveGoldSpecEls: (SVGPathElement | null)[] = new Array(3).fill(null)

function setWaveGoldHaloRef(el: unknown, idx: number) {
  waveGoldHaloEls[idx] = (el as SVGPathElement | null) ?? null
}
function setWaveGoldCoreRef(el: unknown, idx: number) {
  waveGoldCoreEls[idx] = (el as SVGPathElement | null) ?? null
}
function setWaveGoldSpecRef(el: unknown, idx: number) {
  waveGoldSpecEls[idx] = (el as SVGPathElement | null) ?? null
}

// Stage 07 width envelopes: full Amplification+ thickness in chamber, crisp medium-fine left, boldest right
const waveTaperEnvDesktop = new Float64Array(RIBBON_SAMPLES + 1)
const waveTaperEnvPortrait = new Float64Array(RIBBON_SAMPLES + 1)
for (let k = 0; k <= RIBBON_SAMPLES; k++) {
  const u = k / RIBBON_SAMPLES
  if (k === 0 || k === RIBBON_SAMPLES) {
    waveTaperEnvDesktop[k] = 0
    waveTaperEnvPortrait[k] = 0
  } else if (u < 0.25) {
    const tL = u / 0.25
    waveTaperEnvDesktop[k] = Math.pow(tL, 0.68) * 0.78
    waveTaperEnvPortrait[k] = Math.pow(tL, 0.68) * 0.74
  } else if (u <= 0.75) {
    const tC = (u - 0.25) / 0.5
    const arch = Math.sin(Math.PI * tC)
    waveTaperEnvDesktop[k] = 0.8 + 0.38 * Math.pow(arch, 0.82)
    waveTaperEnvPortrait[k] = 0.76 + 0.36 * Math.pow(arch, 0.82)
  } else {
    const tR = (u - 0.75) / 0.25
    const swell = smoothstep01(tR / 0.32)
    const exitTaper = tR > 0.84 ? Math.pow((1 - tR) / 0.16, 0.7) : 1
    waveTaperEnvDesktop[k] = (0.82 + 0.48 * swell) * exitTaper
    waveTaperEnvPortrait[k] = (0.78 + 0.44 * swell) * exitTaper
  }
}

let waveSequenceDrive = 0

const WAVE_GOLD_SAMPLES = 48
const goldRibbonX = new Float64Array(WAVE_GOLD_SAMPLES + 1)
const goldRibbonY = new Float64Array(WAVE_GOLD_SAMPLES + 1)
const goldRibbonNX = new Float64Array(WAVE_GOLD_SAMPLES + 1)
const goldRibbonNY = new Float64Array(WAVE_GOLD_SAMPLES + 1)
const WAVE_GOLD_ARCH = [-0.46, -0.28, -0.07, 0.09, 0.3, 0.48] as const
const WAVE_GOLD_PHASE = [0.15, 0.55, 2.35, 2.85, 4.35, 4.85] as const
const WAVE_GOLD_WIDTHS = [1.62, 2.88, 1.48, 1.42, 2.65, 1.28] as const

function buildRightGoldWavePath(
  ribbonIdx: number,
  xPortR: number,
  rightOutLen: number,
  yMid: number,
  H: number,
  pScale: number,
  nowSec: number,
  goldOutProg: number,
  auraImpulse: number,
  mode: 'halo' | 'core' | 'spec'
): string {
  if (goldOutProg <= 0.01 || rightOutLen <= 2) return ''

  const blastReach = 0.1 + 0.9 * (1 - Math.pow(1 - clamp01(goldOutProg), 2.15))
  const archTarget = WAVE_GOLD_ARCH[ribbonIdx] ?? 0
  const wavePhase = WAVE_GOLD_PHASE[ribbonIdx] ?? 0
  // Click expresses pure luminous aura width (zero positional gel bounce)
  const auraWidthBoost =
    mode === 'halo' ? 1 + auraImpulse * 0.85 : mode === 'core' ? 1 + auraImpulse * 0.22 : 1 + auraImpulse * 0.35
  const baseW = (WAVE_GOLD_WIDTHS[ribbonIdx] ?? 1.55) * pScale * auraWidthBoost
  const modeMult = mode === 'halo' ? 3.1 : mode === 'spec' ? 0.38 : 1.0
  const yStart = yMid - 0.8 * pScale

  for (let m = 0; m <= WAVE_GOLD_SAMPLES; m++) {
    const t = m / WAVE_GOLD_SAMPLES
    const tW = t * blastReach
    const easeEntry = smoothstep01(tW / 0.24)
    const sBell = 0.5 - 0.5 * Math.cos(Math.PI * Math.pow(tW, 0.82))
    const waveUndulation =
      Math.sin(tW * 1.55 * Math.PI - nowSec * 2.2 + wavePhase) * H * 0.18 * easeEntry
    const secondaryRoll =
      Math.sin(tW * 0.98 * Math.PI - nowSec * 1.45 + ribbonIdx * 1.1) * H * 0.048 * sBell

    goldRibbonX[m] = xPortR + rightOutLen * tW
    goldRibbonY[m] = yStart + archTarget * H * sBell + waveUndulation + secondaryRoll
  }

  for (let m = 0; m <= WAVE_GOLD_SAMPLES; m++) {
    const prev = m === 0 ? 0 : m - 1
    const next = m === WAVE_GOLD_SAMPLES ? WAVE_GOLD_SAMPLES : m + 1
    const dx = goldRibbonX[next]! - goldRibbonX[prev]!
    const dy = goldRibbonY[next]! - goldRibbonY[prev]!
    const len = Math.hypot(dx, dy) || 1
    goldRibbonNX[m] = -dy / len
    goldRibbonNY[m] = dx / len
  }

  let d = `M ${goldRibbonX[0]!.toFixed(1)} ${goldRibbonY[0]!.toFixed(1)}`
  for (let m = 1; m < WAVE_GOLD_SAMPLES; m++) {
    const t = m / WAVE_GOLD_SAMPLES
    const portRamp = 0.22 + 0.78 * smoothstep01(t / 0.2)
    const tipFade = t > 0.8 ? Math.sin(((1 - t) / 0.2) * Math.PI * 0.5) : 1
    const pulse = 0.86 + 0.14 * Math.sin(t * 4.6 - nowSec * 3.2 + ribbonIdx)
    const hw = baseW * modeMult * portRamp * tipFade * pulse * smoothstep01(goldOutProg * 1.25)
    d += ` L ${(goldRibbonX[m]! + goldRibbonNX[m]! * hw).toFixed(1)} ${(goldRibbonY[m]! + goldRibbonNY[m]! * hw).toFixed(1)}`
  }
  d += ` L ${goldRibbonX[WAVE_GOLD_SAMPLES]!.toFixed(1)} ${goldRibbonY[WAVE_GOLD_SAMPLES]!.toFixed(1)}`
  for (let m = WAVE_GOLD_SAMPLES - 1; m >= 1; m--) {
    const t = m / WAVE_GOLD_SAMPLES
    const portRamp = 0.22 + 0.78 * smoothstep01(t / 0.2)
    const tipFade = t > 0.8 ? Math.sin(((1 - t) / 0.2) * Math.PI * 0.5) : 1
    const pulse = 0.86 + 0.14 * Math.sin(t * 4.6 - nowSec * 3.2 + ribbonIdx)
    const hw = baseW * modeMult * portRamp * tipFade * pulse * smoothstep01(goldOutProg * 1.25)
    d += ` L ${(goldRibbonX[m]! - goldRibbonNX[m]! * hw).toFixed(1)} ${(goldRibbonY[m]! - goldRibbonNY[m]! * hw).toFixed(1)}`
  }
  return `${d} Z`
}

function buildWaveAuraCrescentPath(
  portX: number,
  yMid: number,
  dir: -1 | 1,
  travelDist: number,
  halfSpanY: number,
  peakThick: number
): string {
  const steps = 22
  const bow = dir * halfSpanY * 0.34
  let d = ''
  for (let s = 0; s <= steps; s++) {
    const v = (s / steps) * 2 - 1
    const env = Math.cos(v * Math.PI * 0.5)
    const cxArc = portX + dir * travelDist + bow * env
    const cyArc = yMid + v * halfSpanY
    const ox = cxArc + dir * peakThick * env * env
    d += s === 0 ? `M ${ox.toFixed(1)} ${cyArc.toFixed(1)}` : ` L ${ox.toFixed(1)} ${cyArc.toFixed(1)}`
  }
  for (let s = steps; s >= 0; s--) {
    const v = (s / steps) * 2 - 1
    const env = Math.cos(v * Math.PI * 0.5)
    const cxArc = portX + dir * travelDist + bow * env
    const cyArc = yMid + v * halfSpanY
    const ix = cxArc - dir * peakThick * 0.45 * env * env
    d += ` L ${ix.toFixed(1)} ${cyArc.toFixed(1)}`
  }
  return `${d} Z`
}

const ampTaperEnv = new Float64Array(RIBBON_SAMPLES + 1)
for (let k = 0; k <= RIBBON_SAMPLES; k++) {
  const u = k / RIBBON_SAMPLES
  if (k === 0 || k === RIBBON_SAMPLES) {
    ampTaperEnv[k] = 0
  } else {
    const tipFade = Math.pow(Math.sin(Math.PI * u), 0.58)
    const chamberSwell = 0.58 + 0.42 * Math.exp(-Math.pow((u - 0.5) / 0.28, 2))
    ampTaperEnv[k] = tipFade * chamberSwell
  }
}

// Precomputed normalized right-half Resonator curve (Top Apex -> Right Belly -> Bottom Center)
const AMP_WALL_SEG1 = 48
const AMP_WALL_SEG2 = 24
const AMP_WALL_SAMPLES = AMP_WALL_SEG1 + AMP_WALL_SEG2
const ampRelX = new Float64Array(AMP_WALL_SAMPLES + 1)
const ampRelY = new Float64Array(AMP_WALL_SAMPLES + 1)
const ampWallNormX = new Float64Array(AMP_WALL_SAMPLES + 1)
const ampWallNormY = new Float64Array(AMP_WALL_SAMPLES + 1)
const ampOutXScratch = new Float64Array(AMP_WALL_SAMPLES + 1)
const ampOutYScratch = new Float64Array(AMP_WALL_SAMPLES + 1)
const ampInXScratch = new Float64Array(AMP_WALL_SAMPLES + 1)
const ampInYScratch = new Float64Array(AMP_WALL_SAMPLES + 1)

{
  for (let k = 0; k <= AMP_WALL_SAMPLES; k++) {
    let x = 0
    let y = 0
    let dx = 0
    let dy = 0
    if (k <= AMP_WALL_SEG1) {
      const t = k / AMP_WALL_SEG1
      const mt = 1 - t
      // Top Apex (0, -0.665) -> Right Belly (0.525, +0.075)
      x = 3 * mt * mt * t * 0.185 + 3 * mt * t * t * 0.525 + t * t * t * 0.525
      y =
        mt * mt * mt * -0.665 +
        3 * mt * mt * t * -0.665 +
        3 * mt * t * t * -0.245 +
        t * t * t * 0.075
      dx = 3 * mt * mt * 0.185 + 6 * mt * t * (0.525 - 0.185)
      dy = 6 * mt * t * (-0.245 - -0.665) + 3 * t * t * (0.075 - -0.245)
    } else {
      const t = (k - AMP_WALL_SEG1) / AMP_WALL_SEG2
      const mt = 1 - t
      // Right Belly (0.525, +0.075) -> Bottom Center (0, +0.335)
      x =
        mt * mt * mt * 0.525 +
        3 * mt * mt * t * 0.525 +
        3 * mt * t * t * 0.32 +
        t * t * t * 0
      y =
        mt * mt * mt * 0.075 +
        3 * mt * mt * t * 0.242 +
        3 * mt * t * t * 0.335 +
        t * t * t * 0.335
      dx = 6 * mt * t * (0.32 - 0.525) + 3 * t * t * (0 - 0.32)
      dy = 3 * mt * mt * (0.242 - 0.075) + 6 * mt * t * (0.335 - 0.242)
    }
    const len = Math.hypot(dx, dy) || 1
    ampRelX[k] = x
    ampRelY[k] = y
    ampWallNormX[k] = dy / len
    ampWallNormY[k] = -dx / len
  }
}

function buildResonatorShellPath(
  cx: number,
  yMid: number,
  H: number,
  outerOffRel: number,
  innerOffRel: number,
  isUpper: boolean,
  drawProg: number
): string {
  if (drawProg <= 0.01) return ''

  for (let k = 0; k <= AMP_WALL_SAMPLES; k++) {
    const rx = ampRelX[k]!
    const ry = ampRelY[k]!
    const nx = ampWallNormX[k]!
    const ny = ampWallNormY[k]!
    ampOutXScratch[k] = rx + nx * outerOffRel
    ampOutYScratch[k] = ry + ny * outerOffRel
    ampInXScratch[k] = rx + nx * innerOffRel
    ampInYScratch[k] = ry + ny * innerOffRel
  }

  if (isUpper) {
    const yStart = Math.max(ampOutYScratch[0]!, ampInYScratch[0]!) + 0.014
    const yPortUpper = -0.068
    const yLim = yStart + (yPortUpper - yStart) * drawProg

    let kOutEnd = 0
    while (kOutEnd < AMP_WALL_SEG1 && ampOutYScratch[kOutEnd + 1]! < yLim) kOutEnd++
    const outDen = ampOutYScratch[kOutEnd + 1]! - ampOutYScratch[kOutEnd]! || 1e-5
    const outFrac = clamp01((yLim - ampOutYScratch[kOutEnd]!) / outDen)
    const xOutHit =
      ampOutXScratch[kOutEnd]! +
      (ampOutXScratch[kOutEnd + 1]! - ampOutXScratch[kOutEnd]!) * outFrac

    let kInEnd = 0
    while (kInEnd < AMP_WALL_SEG1 && ampInYScratch[kInEnd + 1]! < yLim) kInEnd++
    const inDen = ampInYScratch[kInEnd + 1]! - ampInYScratch[kInEnd]! || 1e-5
    const inFrac = clamp01((yLim - ampInYScratch[kInEnd]!) / inDen)
    const xInHit =
      ampInXScratch[kInEnd]! + (ampInXScratch[kInEnd + 1]! - ampInXScratch[kInEnd]!) * inFrac

    const yLimPx = (yMid + yLim * H).toFixed(1)
    let d = `M ${(cx - xOutHit * H).toFixed(1)} ${yLimPx}`
    for (let k = kOutEnd; k >= 1; k--) {
      d += ` L ${(cx - ampOutXScratch[k]! * H).toFixed(1)} ${(yMid + ampOutYScratch[k]! * H).toFixed(1)}`
    }
    d += ` L ${cx.toFixed(1)} ${(yMid + ampOutYScratch[0]! * H).toFixed(1)}`
    for (let k = 1; k <= kOutEnd; k++) {
      d += ` L ${(cx + ampOutXScratch[k]! * H).toFixed(1)} ${(yMid + ampOutYScratch[k]! * H).toFixed(1)}`
    }
    d += ` L ${(cx + xOutHit * H).toFixed(1)} ${yLimPx}`
    d += ` L ${(cx + xInHit * H).toFixed(1)} ${yLimPx}`
    for (let k = kInEnd; k >= 1; k--) {
      d += ` L ${(cx + ampInXScratch[k]! * H).toFixed(1)} ${(yMid + ampInYScratch[k]! * H).toFixed(1)}`
    }
    d += ` L ${cx.toFixed(1)} ${(yMid + ampInYScratch[0]! * H).toFixed(1)}`
    for (let k = 1; k <= kInEnd; k++) {
      d += ` L ${(cx - ampInXScratch[k]! * H).toFixed(1)} ${(yMid + ampInYScratch[k]! * H).toFixed(1)}`
    }
    d += ` L ${(cx - xInHit * H).toFixed(1)} ${yLimPx} Z`
    return d
  }

  const last = AMP_WALL_SAMPLES
  const yStart = Math.min(ampOutYScratch[last]!, ampInYScratch[last]!) - 0.014
  const yPortLower = 0.068
  const yLim = yStart + (yPortLower - yStart) * drawProg

  let kOutEnd = last
  while (kOutEnd > 1 && ampOutYScratch[kOutEnd - 1]! > yLim) kOutEnd--
  const outDen = ampOutYScratch[kOutEnd - 1]! - ampOutYScratch[kOutEnd]! || -1e-5
  const outFrac = clamp01((yLim - ampOutYScratch[kOutEnd]!) / outDen)
  const xOutHit =
    ampOutXScratch[kOutEnd]! +
    (ampOutXScratch[kOutEnd - 1]! - ampOutXScratch[kOutEnd]!) * outFrac

  let kInEnd = last
  while (kInEnd > 1 && ampInYScratch[kInEnd - 1]! > yLim) kInEnd--
  const inDen = ampInYScratch[kInEnd - 1]! - ampInYScratch[kInEnd]! || -1e-5
  const inFrac = clamp01((yLim - ampInYScratch[kInEnd]!) / inDen)
  const xInHit =
    ampInXScratch[kInEnd]! + (ampInXScratch[kInEnd - 1]! - ampInXScratch[kInEnd]!) * inFrac

  const yLimPx = (yMid + yLim * H).toFixed(1)
  let d = `M ${(cx - xOutHit * H).toFixed(1)} ${yLimPx}`
  for (let k = kOutEnd; k < last; k++) {
    d += ` L ${(cx - ampOutXScratch[k]! * H).toFixed(1)} ${(yMid + ampOutYScratch[k]! * H).toFixed(1)}`
  }
  d += ` L ${cx.toFixed(1)} ${(yMid + ampOutYScratch[last]! * H).toFixed(1)}`
  for (let k = last - 1; k >= kOutEnd; k--) {
    d += ` L ${(cx + ampOutXScratch[k]! * H).toFixed(1)} ${(yMid + ampOutYScratch[k]! * H).toFixed(1)}`
  }
  d += ` L ${(cx + xOutHit * H).toFixed(1)} ${yLimPx}`
  d += ` L ${(cx + xInHit * H).toFixed(1)} ${yLimPx}`
  for (let k = kInEnd; k < last; k++) {
    d += ` L ${(cx + ampInXScratch[k]! * H).toFixed(1)} ${(yMid + ampInYScratch[k]! * H).toFixed(1)}`
  }
  d += ` L ${cx.toFixed(1)} ${(yMid + ampInYScratch[last]! * H).toFixed(1)}`
  for (let k = last - 1; k >= kInEnd; k--) {
    d += ` L ${(cx - ampInXScratch[k]! * H).toFixed(1)} ${(yMid + ampInYScratch[k]! * H).toFixed(1)}`
  }
  d += ` L ${(cx - xInHit * H).toFixed(1)} ${yLimPx} Z`
  return d
}

let amplificationDrive = 0

function getStage6StrandProfile(
  strandIdx: number,
  portrait: boolean
): [maxW: number, coreOp: number, sheathOp: number] {
  // Sleeker than Stage 07's wave, with luminous inner filaments preserved for smooth 05 -> 06 color flow
  const pScale = portrait ? 0.66 : 0.83
  if (strandIdx === 0) return [3.35 * pScale, 0.94, 0.32]
  if (strandIdx === 7) return [3.02 * pScale, 0.8, 0.26]
  if (strandIdx === 1) return [2.72 * pScale, 0.64, 0.2]
  if (strandIdx === 8) return [2.44 * pScale, 0.52, 0.16]

  if (strandIdx >= 13 && strandIdx <= 16) return [1.92 * pScale, 0.32, 0.1]
  if (strandIdx === 5 || strandIdx === 6 || strandIdx === 17) return [1.66 * pScale, 0.25, 0.08]

  return [1.42 * pScale, 0.2, 0.07]
}

function getStage7StrandProfile(
  strandIdx: number,
  portrait: boolean
): [maxW: number, coreOp: number, sheathOp: number] {
  // Scaled proportionally to 82% desktop / 73% mobile resonator PLUS +12% bolder wave body
  const pScale = portrait ? 0.72 : 0.94
  if (strandIdx === 0) return [3.55 * pScale, 0.96, 0.33]
  if (strandIdx === 7) return [3.22 * pScale, 0.86, 0.28]
  if (strandIdx === 1) return [2.92 * pScale, 0.76, 0.22]
  if (strandIdx === 8) return [2.64 * pScale, 0.68, 0.18]

  // Stronger outer wave ribbons so left & right plumes read boldly without washing out center blue
  if (strandIdx >= 13 && strandIdx <= 16) return [2.16 * pScale, 0.48, 0.12]
  if (strandIdx === 5 || strandIdx === 6 || strandIdx === 17) return [1.88 * pScale, 0.42, 0.1]

  return [1.62 * pScale, 0.36, 0.08]
}

function populateStage6PeakExteriorNormals(
  w: number,
  svh: number,
  fieldLeft: number,
  portrait: boolean,
  nowSec: number,
  ampDrive: number,
  clickImpulse: number,
  uResonance: number,
  uAmp: number,
  uWave: number,
  seqDrive: number
) {
  // Slides from central peak [0.438..0.562] rightward along the top edge to the right port [0.692..0.748]
  const slideRight = uWave * smoothstep01((seqDrive - 0.22) / 0.46)
  const uStart = 0.438 + (0.692 - 0.438) * slideRight
  const uSpan = 0.124 + (0.056 - 0.124) * slideRight

  for (let m = 0; m <= AMP_MOLTEN_STEPS; m++) {
    const u = uStart + (m / AMP_MOLTEN_STEPS) * uSpan
    let bx = 0
    let by = 0

    if (uWave < 0.9999) {
      const [ax, ay] = evalStage6StrandPoint(
        0,
        u,
        w,
        svh,
        fieldLeft,
        portrait,
        nowSec,
        ampDrive,
        clickImpulse
      )
      bx = ax
      by = ay
      if (uAmp < 0.9999 && uResonance > 0.0001) {
        const [rx, ry] = evalStage5StrandPoint(
          0,
          u,
          w,
          svh,
          fieldLeft,
          portrait,
          nowSec,
          resonanceLock,
          clickImpulse
        )
        bx = rx + (ax - rx) * uAmp
        by = ry + (ay - ry) * uAmp
      }
    }

    if (uWave > 0.0001) {
      const [wx, wy] = evalStage7StrandPoint(
        0,
        u,
        w,
        svh,
        fieldLeft,
        portrait,
        nowSec,
        seqDrive,
        uWave,
        clickImpulse
      )
      bx = uWave >= 0.9999 ? wx : bx + (wx - bx) * uWave
      by = uWave >= 0.9999 ? wy : by + (wy - by) * uWave
    }

    moltenBaseX[m] = bx
    moltenBaseY[m] = by
  }

  for (let m = 0; m <= AMP_MOLTEN_STEPS; m++) {
    const prev = m === 0 ? 0 : m - 1
    const next = m === AMP_MOLTEN_STEPS ? AMP_MOLTEN_STEPS : m + 1
    const dx = moltenBaseX[next]! - moltenBaseX[prev]!
    const dy = moltenBaseY[next]! - moltenBaseY[prev]!
    const len = Math.hypot(dx, dy) || 1
    // Always points strictly along the TOP exterior edge of the left-to-right wave
    moltenOutNX[m] = dy / len
    moltenOutNY[m] = -dx / len
  }
}

function buildStage6MoltenLayerPath(
  goldPressure: number,
  nowSec: number,
  pScale: number,
  clickImpulse: number,
  layer: 0 | 1 | 2 | 3,
  reactiveBoost = 0,
  edgeScale = 1
): string {
  const normDenom = 1 - Math.sqrt(0.018 / 1.018)
  const tempo = 1 + reactiveBoost * 0.85
  const exciteAmp = 1 + reactiveBoost * 0.55
  let d = ''

  for (let m = 0; m <= AMP_MOLTEN_STEPS; m++) {
    const sNorm = (m / AMP_MOLTEN_STEPS) * 2 - 1
    const cNorm = clamp01((1 - Math.sqrt((sNorm * sNorm + 0.018) / 1.018)) / normDenom)
    const flowFront = smoothstep01((goldPressure * 1.28 - cNorm * 0.36) / 0.64)
    const taper = Math.sin(cNorm * Math.PI * 0.5) * flowFront

    const w1 = 0.5 + 0.5 * Math.sin(cNorm * 11.5 - nowSec * 4.8 * tempo)
    const w2 = 0.5 + 0.5 * Math.sin(cNorm * 19.0 - nowSec * 7.4 * tempo + 0.9)
    const baseThick =
      (1.85 + 2.65 * Math.pow(cNorm, 0.82)) *
      taper *
      (0.66 + (0.23 * w1 + 0.11 * w2) * exciteAmp) *
      pScale *
      (1 + clickImpulse * 0.25)

    const edgeStart = (3.15 + 0.55 * cNorm) * pScale * edgeScale
    let outDist = edgeStart + baseThick

    if (layer === 1) {
      const surge = 0.34 + 0.66 * Math.pow(w1, 1.45) * (0.65 + 0.35 * w2) * exciteAmp
      outDist =
        edgeStart +
        0.35 * taper * pScale +
        (1.55 + 2.25 * Math.pow(cNorm, 0.86)) * taper * surge * pScale * (1 + clickImpulse * 0.28)
    } else if (layer === 2) {
      outDist = edgeStart + baseThick + 0.25 * taper * pScale
    } else if (layer === 3) {
      // Reactive radiative corona rising off the molten top edge during Stage 07 Beat 2
      const radWave = 0.55 + 0.45 * Math.sin(cNorm * 15.0 - nowSec * 9.5)
      outDist = edgeStart + baseThick * (1.85 + 1.15 * radWave * reactiveBoost)
    }

    const ox = moltenBaseX[m]! + moltenOutNX[m]! * outDist
    const oy = moltenBaseY[m]! + moltenOutNY[m]! * outDist
    d += m === 0 ? `M ${ox.toFixed(1)} ${oy.toFixed(1)}` : ` L ${ox.toFixed(1)} ${oy.toFixed(1)}`
  }

  for (let m = AMP_MOLTEN_STEPS; m >= 0; m--) {
    const sNorm = (m / AMP_MOLTEN_STEPS) * 2 - 1
    const cNorm = clamp01((1 - Math.sqrt((sNorm * sNorm + 0.018) / 1.018)) / normDenom)
    const flowFront = smoothstep01((goldPressure * 1.28 - cNorm * 0.36) / 0.64)
    const taper = Math.sin(cNorm * Math.PI * 0.5) * flowFront
    const w1 = 0.5 + 0.5 * Math.sin(cNorm * 11.5 - nowSec * 4.8 * tempo)
    const w2 = 0.5 + 0.5 * Math.sin(cNorm * 19.0 - nowSec * 7.4 * tempo + 0.9)

    const edgeStart = (3.15 + 0.55 * cNorm) * pScale * edgeScale
    let inDist = edgeStart

    if (layer === 1) {
      inDist = edgeStart + 0.35 * taper * pScale
    } else if (layer === 2) {
      const baseThick =
        (1.85 + 2.65 * Math.pow(cNorm, 0.82)) *
        taper *
        (0.66 + (0.23 * w1 + 0.11 * w2) * exciteAmp) *
        pScale *
        (1 + clickImpulse * 0.25)
      const specThick = (0.75 + 0.95 * cNorm) * taper * (0.55 + 0.45 * w2) * pScale
      inDist = Math.max(edgeStart, edgeStart + baseThick - specThick)
    }

    const ix = moltenBaseX[m]! + moltenOutNX[m]! * inDist
    const iy = moltenBaseY[m]! + moltenOutNY[m]! * inDist
    d += ` L ${ix.toFixed(1)} ${iy.toFixed(1)}`
  }

  return `${d} Z`
}

const spX = new Float64Array(SPINDLE_SAMPLES + 1)
const spY = new Float64Array(SPINDLE_SAMPLES + 1)
const spEnv = new Float64Array(SPINDLE_SAMPLES + 1)
for (let k = 0; k <= SPINDLE_SAMPLES; k++) {
  const u = k / SPINDLE_SAMPLES
  spEnv[k] = k === 0 || k === SPINDLE_SAMPLES ? 0 : Math.sin(Math.PI * u)
}

const livePhases = new Float32Array(NEURAL_STRANDS.length)
for (let i = 0; i < NEURAL_STRANDS.length; i++) {
  livePhases[i] = NEURAL_STRANDS[i]!.spotPhase
}

let mountPerfMs = 0
let scrollFastForward = 0
let stage2RoamSec = 0
let unsubscribeTick: (() => void) | null = null

function setSheathRef(el: unknown, i: number) {
  sheathPathEls[i] = el instanceof SVGPathElement ? el : null
}
function setCoreRef(el: unknown, i: number) {
  corePathEls[i] = el instanceof SVGPathElement ? el : null
}
function setSpindleRef(el: unknown, i: number) {
  spindlePathEls[i] = el instanceof SVGPathElement ? el : null
}
function setPrimarySpotRef(el: unknown, i: number) {
  primarySpotEls[i] = el instanceof SVGGElement ? el : null
}
function setSecondarySpotRef(el: unknown, i: number) {
  secondarySpotEls[i] = el instanceof SVGGElement ? el : null
}
function setTipGlowRef(el: unknown, i: number) {
  tipGlowEls[i] = el instanceof SVGGElement ? el : null
}
function setAmbientSparkRef(el: unknown, i: number) {
  ambientSparkEls[i] = el instanceof SVGCircleElement ? el : null
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t))
}

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

function easeOutCubic(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return 1 - Math.pow(1 - c, 3)
}

function getStrandGrowProgress(idx: number, elapsedMs: number): number {
  const pairIdx = idx % 9
  const wingOffset = idx >= 9 ? HERO_CHOREOGRAPHY.strandWingOffsetMs : 0
  const startMs =
    HERO_CHOREOGRAPHY.strandsStartMs +
    pairIdx * HERO_CHOREOGRAPHY.strandPairStaggerMs +
    wingOffset
  const raw = (elapsedMs - startMs) / HERO_CHOREOGRAPHY.strandGrowDurationMs
  return Math.max(scrollFastForward, easeOutCubic(raw))
}

function getParticleIntroProgress(sIdx: number, elapsedMs: number): number {
  const ratio = sIdx / Math.max(1, AMBIENT_SPARKS.length - 1)
  const startMs = HERO_CHOREOGRAPHY.particlesStartMs + ratio * HERO_CHOREOGRAPHY.particlesSpreadMs
  const raw = (elapsedMs - startMs) / HERO_CHOREOGRAPHY.particleFadeDurationMs
  return Math.max(scrollFastForward, smoothstep01(raw))
}

function evalUmatraSpiral(
  uRaw: number,
  w: number,
  svh: number,
  spoutX: number,
  spoutY: number,
  portrait: boolean
): [number, number] {
  const u = clamp01(uRaw)
  const uGrow = u * u

  // Starts at -0.78*PI (40deg Top-Right tangent), then curls +1.92*PI clockwise into a center-left circular rise
  const theta0 = -Math.PI * 0.78
  const theta = theta0 + u * Math.PI * 1.92

  const rx0 = portrait ? w * 0.075 : w * 0.085
  const ry0 = portrait ? svh * 0.085 : svh * 0.125
  const rx1 = portrait ? w * 0.25 : w * 0.22
  const ry1 = portrait ? svh * 0.165 : svh * 0.25

  const cx0 = spoutX - rx0 * Math.cos(theta0)
  const cy0 = spoutY - ry0 * Math.sin(theta0)

  const cx = cx0 - (portrait ? w * 0.18 : w * 0.16) * uGrow
  const cy = cy0 - (portrait ? svh * 0.025 : svh * 0.04) * uGrow
  const rx = rx0 + (rx1 - rx0) * uGrow
  const ry = ry0 + (ry1 - ry0) * uGrow

  return [cx + rx * Math.cos(theta), cy + ry * Math.sin(theta)]
}

const STAGE2_ROAM_TEMPO = 0.78 // Tune slightly up/down to adjust Stage 02 free-roam speed

function evalStage2Point(
  uRaw: number,
  tauRaw: number,
  w: number,
  svh: number,
  spoutX: number,
  spoutY: number,
  portrait: boolean
): [number, number] {
  const u = clamp01(uRaw)
  const [sx, sy] = evalUmatraSpiral(u, w, svh, spoutX, spoutY, portrait)

  const tau = Math.max(0, tauRaw)
  const wRoam = smoothstep01(u)
  const roamOpen = 1 - Math.exp(-tau * 1.35)
  const effBlend = wRoam * roamOpen

  if (effBlend <= 0.0001) return [sx, sy]

  const roamCenterX = portrait ? w * 0.5 : w * 0.51
  const roamCenterY = portrait ? svh * 0.55 : svh * 0.5
  const roamAmpX = portrait ? w * 0.34 : w * 0.35
  const roamAmpY = portrait ? svh * 0.22 : svh * 0.31

  const rxNorm =
    0.5 * Math.cos(tau * 1.0 + 1.2) +
    0.32 * Math.sin(tau * 1.4142 + 0.4) +
    0.18 * Math.cos(tau * 2.236 - 0.7)
  const ryNorm =
    -0.5 * Math.cos(tau * 0.866 + 0.25) -
    0.32 * Math.sin(tau * 1.618 + 0.5) +
    0.18 * Math.sin(tau * 2.073)

  const pureRoamX = roamCenterX + rxNorm * roamAmpX
  const pureRoamY = roamCenterY + ryNorm * roamAmpY

  return [
    sx + (pureRoamX - sx) * effBlend,
    sy + (pureRoamY - sy) * effBlend,
  ]
}

function updateStage2CometSpine(
  uHead: number,
  tauHead: number,
  w: number,
  svh: number,
  spoutX: number,
  spoutY: number,
  portrait: boolean
) {
  const roamWeight = smoothstep01((uHead - 0.72) / 0.28)
  const uTailSpan = 0.48 * (1 - roamWeight * 0.86)
  const tauTailSpan = 1.65

  for (let s = 0; s <= MOTION_HISTORY_STEPS; s++) {
    const frac = s / MOTION_HISTORY_STEPS
    const uSample = Math.max(0, uHead - frac * uTailSpan)
    const tauSample = Math.max(0, tauHead - frac * tauTailSpan)
    const [px, py] = evalStage2Point(uSample, tauSample, w, svh, spoutX, spoutY, portrait)
    histX[s] = px
    histY[s] = py
    if (s === 0) {
      histDist[0] = 0
    } else {
      histDist[s] = histDist[s - 1]! + Math.hypot(px - histX[s - 1]!, py - histY[s - 1]!)
    }
  }

  const desiredTailLen = portrait ? w * 0.46 : w * 0.3
  const totalHistLen = histDist[MOTION_HISTORY_STEPS]!

  const endDx = histX[MOTION_HISTORY_STEPS]! - histX[MOTION_HISTORY_STEPS - 2]!
  const endDy = histY[MOTION_HISTORY_STEPS]! - histY[MOTION_HISTORY_STEPS - 2]!
  const endLen = Math.hypot(endDx, endDy)
  const extUx = endLen > 0.5 ? endDx / endLen : -1
  const extUy = endLen > 0.5 ? endDy / endLen : 0

  cometSpineX[4] = histX[0]!
  cometSpineY[4] = histY[0]!

  for (let k = 0; k < 4; k++) {
    const targetDist = desiredTailLen * ((4 - k) / 4)
    if (targetDist <= totalHistLen && totalHistLen > 0.5) {
      let seg = 0
      while (seg < MOTION_HISTORY_STEPS - 1 && histDist[seg + 1]! < targetDist) {
        seg++
      }
      const d0 = histDist[seg]!
      const d1 = histDist[seg + 1]!
      const f = d1 > d0 ? (targetDist - d0) / (d1 - d0) : 0
      cometSpineX[k] = histX[seg]! + (histX[seg + 1]! - histX[seg]!) * f
      cometSpineY[k] = histY[seg]! + (histY[seg + 1]! - histY[seg]!) * f
    } else {
      const extra = targetDist - totalHistLen
      cometSpineX[k] = histX[MOTION_HISTORY_STEPS]! + extUx * extra
      cometSpineY[k] = histY[MOTION_HISTORY_STEPS]! + extUy * extra
    }
  }

  for (let k = 0; k <= 4; k++) {
    const prev = k === 0 ? 0 : k - 1
    const next = k === 4 ? 4 : k + 1
    const tx = cometSpineX[next]! - cometSpineX[prev]!
    const ty = cometSpineY[next]! - cometSpineY[prev]!
    const tLen = Math.hypot(tx, ty) || 1
    cometNormX[k] = -ty / tLen
    cometNormY[k] = tx / tLen
  }
}

function ensureStage3TrackLut(w: number, svh: number, fieldLeft: number, portrait: boolean) {
  if (
    w === freqLutW &&
    svh === freqLutSvh &&
    Math.abs(fieldLeft - freqLutFieldLeft) < 1 &&
    portrait === freqLutPortrait
  ) {
    return
  }
  freqLutW = w
  freqLutSvh = svh
  freqLutFieldLeft = fieldLeft
  freqLutPortrait = portrait

  const wavesPerLane = portrait ? 4 : 5
  const outerLeft = portrait ? w * 0.048 : Math.max(w * 0.408, fieldLeft)
  const outerRight = portrait ? w * 0.952 : w * 0.97
  const yTop = portrait ? svh * 0.568 : svh * 0.438
  const yBot = portrait ? svh * 0.765 : svh * 0.65
  const waveAmp = portrait ? svh * 0.038 : svh * 0.044

  const yMid = (yTop + yBot) * 0.5
  const turnRy = (yBot - yTop) * 0.5 + waveAmp
  const spanAvail = Math.max(120, outerRight - outerLeft)
  const turnRx = Math.min(turnRy * 0.66, spanAvail * 0.11)

  const xLeft = outerLeft + turnRx
  const xRight = Math.max(xLeft + 60, outerRight - turnRx)
  const laneW = xRight - xLeft

  const sinRatio = Math.max(-0.95, Math.min(-0.1, (yTop - yMid) / turnRy))
  const thetaStart = Math.PI - Math.asin(sinRatio)
  const dThetaEntry = Math.PI * 1.5 - thetaStart
  const dThetaReturn = thetaStart - Math.PI * 0.5

  for (let k = 0; k <= FREQ_LUT_STEPS; k++) {
    let px = 0
    let py = 0
    if (k <= 16) {
      const th = thetaStart + dThetaEntry * (k / 16)
      px = xLeft + turnRx * Math.cos(th)
      py = yMid + turnRy * Math.sin(th)
    } else if (k <= 208) {
      const u = (k - 16) / 192
      px = xLeft + laneW * u
      py = yTop - waveAmp * Math.cos(TWO_PI * wavesPerLane * u)
    } else if (k <= 272) {
      const th = -Math.PI * 0.5 + Math.PI * ((k - 208) / 64)
      px = xRight + turnRx * Math.cos(th)
      py = yMid + turnRy * Math.sin(th)
    } else if (k <= 464) {
      const u = (k - 272) / 192
      px = xRight - laneW * u
      py = yBot + waveAmp * Math.cos(TWO_PI * wavesPerLane * u)
    } else {
      const th = Math.PI * 0.5 + dThetaReturn * ((k - 464) / 48)
      px = xLeft + turnRx * Math.cos(th)
      py = yMid + turnRy * Math.sin(th)
    }

    freqLutX[k] = px
    freqLutY[k] = py
    if (k === 0) {
      freqLutS[0] = 0
    } else {
      freqLutS[k] = freqLutS[k - 1]! + Math.hypot(px - freqLutX[k - 1]!, py - freqLutY[k - 1]!)
    }
  }

  freqLutTotalLen = Math.max(1, freqLutS[FREQ_LUT_STEPS]!)
  // k = 240 is theta = 0 on the Right U-turn (exact right screen boundary)
  freqSnakeMaxLen = Math.max(40, freqLutS[240]!)
}

function sampleStage3TrackAtArc(sDist: number): [number, number] {
  const sWrap = ((sDist % freqLutTotalLen) + freqLutTotalLen) % freqLutTotalLen
  let lo = 0
  let hi = FREQ_LUT_STEPS
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (freqLutS[mid]! <= sWrap) lo = mid
    else hi = mid
  }
  const s0 = freqLutS[lo]!
  const s1 = freqLutS[hi]!
  const f = s1 > s0 ? (sWrap - s0) / (s1 - s0) : 0
  return [
    freqLutX[lo]! + (freqLutX[hi]! - freqLutX[lo]!) * f,
    freqLutY[lo]! + (freqLutY[hi]! - freqLutY[lo]!) * f,
  ]
}

function updateStage3SnakeSpine(travelPx: number, spanScale = 1) {
  const maxSpan = Math.max(24, freqSnakeMaxLen * spanScale)
  const sHead = Math.max(24, travelPx)
  const sTail = Math.max(0, sHead - maxSpan)
  const span = Math.max(8, sHead - sTail)
  freqCurrentLenRatio = clamp01(span / freqSnakeMaxLen)

  for (let k = 0; k <= RIBBON_SAMPLES; k++) {
    const s = sTail + span * (k / RIBBON_SAMPLES)
    const [px, py] = sampleStage3TrackAtArc(s)
    stage3SpineX[k] = px
    stage3SpineY[k] = py
  }

  for (let k = 0; k <= RIBBON_SAMPLES; k++) {
    const prev = k === 0 ? 0 : k - 1
    const next = k === RIBBON_SAMPLES ? RIBBON_SAMPLES : k + 1
    const dx = stage3SpineX[next]! - stage3SpineX[prev]!
    const dy = stage3SpineY[next]! - stage3SpineY[prev]!
    const len = Math.hypot(dx, dy) || 1
    stage3NormX[k] = -dy / len
    stage3NormY[k] = dx / len
  }
}

function sampleActiveSpine(uTarget: number, growU: number): [number, number] {
  const idxFloat = growU > 0.0001 ? clamp01(uTarget / growU) * RIBBON_SAMPLES : 0
  const k0 = Math.min(RIBBON_SAMPLES - 1, Math.floor(idxFloat))
  const frac = idxFloat - k0
  return [
    sampleX[k0]! + (sampleX[k0 + 1]! - sampleX[k0]!) * frac,
    sampleY[k0]! + (sampleY[k0 + 1]! - sampleY[k0]!) * frac,
  ]
}

function getInteractionGeometry(w: number, svh: number, fieldLeft: number, portrait: boolean) {
  const xLeft = portrait ? w * 0.025 : Math.max(w * 0.375, fieldLeft - w * 0.02)
  const xRight = portrait ? w * 0.985 : w * 0.992
  const spanX = Math.max(160, xRight - xLeft)
  const yMid = portrait ? svh * 0.655 : svh * 0.51
  const baseAmp = portrait ? svh * 0.088 : svh * 0.138
  const lobes = portrait ? 4.8 : 5.4
  return { xLeft, spanX, yMid, baseAmp, lobes }
}

function evalInteractionSpineCenterY(
  u: number,
  yMid: number,
  baseAmp: number,
  nowSec: number
): number {
  return (
    yMid -
    Math.sin(u * Math.PI * 2.85 + 0.18 + Math.sin(nowSec * 0.48) * 0.12) * (baseAmp * 0.22)
  )
}

function updateStage4InteractionNodes(
  w: number,
  svh: number,
  fieldLeft: number,
  portrait: boolean,
  nowSec: number,
  uInteract: number
) {
  const { xLeft, spanX, yMid, baseAmp, lobes } = getInteractionGeometry(
    w,
    svh,
    fieldLeft,
    portrait
  )
  const phase0 = 0.38 + Math.sin(nowSec * 0.62) * 0.13
  const flipS3 = uInteract > 0.0001 && s3UnrollFlip

  for (let n = 0; n < INTERACTION_NODE_COUNT; n++) {
    const uNode = (n + 1 - phase0 / Math.PI) / lobes
    interactNodeU[n] = uNode
    const targetX = xLeft + spanX * uNode
    const targetY = evalInteractionSpineCenterY(uNode, yMid, baseAmp, nowSec)

    const clampedU = clamp01(uNode)
    const s3Frac = flipS3 ? 1 - clampedU : clampedU
    const idxFloat = s3Frac * RIBBON_SAMPLES
    const k0 = Math.min(RIBBON_SAMPLES - 1, Math.floor(idxFloat))
    const frac = idxFloat - k0
    const s3X = stage3SpineX[k0]! + (stage3SpineX[k0 + 1]! - stage3SpineX[k0]!) * frac
    const s3Y = stage3SpineY[k0]! + (stage3SpineY[k0 + 1]! - stage3SpineY[k0]!) * frac

    interactNodeX[n] = s3X + (targetX - s3X) * uInteract
    interactNodeY[n] = s3Y + (targetY - s3Y) * uInteract
    interactNodeEnergy[n] = 0
  }
}

function evalStage4StrandPoint(
  strandIdx: number,
  u: number,
  w: number,
  svh: number,
  fieldLeft: number,
  portrait: boolean,
  nowSec: number
): [number, number] {
  const { xLeft, spanX, yMid, baseAmp, lobes } = getInteractionGeometry(
    w,
    svh,
    fieldLeft,
    portrait
  )
  const ix = xLeft + spanX * u
  const phase0 = 0.38 + Math.sin(nowSec * 0.62) * 0.13
  const theta = Math.PI * lobes * u + phase0

  // sin1 and sin2 both equal 0 at every 180-deg crossing node, locking intersections precisely
  const sin1 = Math.sin(theta)
  const sin2 = Math.sin(theta * 2)

  const leftRamp = smoothstep01(u / 0.09)
  const rightCalm = 1 - 0.25 * smoothstep01((u - 0.86) / 0.14)
  const swell = 0.56 + 0.44 * Math.sin(Math.PI * Math.pow(u, 0.82))
  const amp = baseAmp * leftRamp * rightCalm * swell

  const yNode = evalInteractionSpineCenterY(u, yMid, baseAmp, nowSec)
  const lobeStep = 1 / lobes
  const carrierOffset = amp * (0.88 * sin1 + 0.12 * sin2)

  let offset = carrierOffset

  if (strandIdx <= 6) {
    // Primary wave arch rim (0..1) + 5 fine harmonic harp filaments (2..6)
    const targetScale =
      strandIdx <= 1 ? (strandIdx === 0 ? 1.0 : 0.95) : 0.82 - (strandIdx - 2) * 0.135
    const fanOpen = smoothstep01((interactBranchFront - (u * 0.85 + 0.08)) / 0.2)
    const scaleA = 1 + (targetScale - 1) * fanOpen
    offset = carrierOffset * scaleA
  } else if (strandIdx <= 12) {
    // Counter-phase wave arch rim (7..8) + 4 inner filaments (9..12), opening past first 180 deg
    const scaleB =
      strandIdx <= 8 ? (strandIdx === 7 ? 1.0 : 0.94) : 0.78 - (strandIdx - 9) * 0.15
    const targetB = -amp * (0.84 * sin1 - 0.2 * sin2) * scaleB
    const uTrigger = lobeStep * 0.85
    const waveOpen =
      smoothstep01((interactBranchFront - uTrigger) / 0.18) *
      smoothstep01((interactBranchFront - u * 0.82) / 0.22)
    offset = carrierOffset + (targetB - carrierOffset) * waveOpen
  } else {
    // Sequential 180-deg alternate branches (13..17): each peels off top/bottom once next 180 deg passes
    const bIdx = strandIdx - 13
    const uSplit = Math.max(0.03, (bIdx + 0.5 - phase0 / Math.PI) / lobes)
    const uTrigger = uSplit + lobeStep * 0.88
    const peel =
      u <= uSplit
        ? 0
        : smoothstep01((u - uSplit) / 0.14) *
          smoothstep01((interactBranchFront - uTrigger) / 0.18)

    const targetBranch =
      bIdx % 2 === 0
        ? -amp * (1.06 * sin1 + 0.24 * sin2)
        : amp * (-0.66 * sin1 + 0.34 * sin2)

    offset = carrierOffset + (targetBranch - carrierOffset) * peel
  }

  const microShimmer =
    Math.sin(nowSec * 1.35 + strandIdx * 0.7 + u * 5.0) * (1 - Math.abs(sin1) * 0.4) * 0.55

  return [ix, yNode + offset + microShimmer]
}

function getResonanceGeometry(w: number, svh: number, fieldLeft: number, portrait: boolean) {
  const xLeft = portrait ? w * 0.045 : Math.max(w * 0.398, fieldLeft)
  const xRight = portrait ? w * 0.955 : w * 0.968
  const spanX = Math.max(160, xRight - xLeft)
  const yMid = portrait ? svh * 0.645 : svh * 0.505
  const peakAmp = portrait
    ? Math.min(svh * 0.064, w * 0.115)
    : Math.min(svh * 0.086, w * 0.064)
  return { xLeft, spanX, yMid, peakAmp }
}

function evalStage5StrandPoint(
  strandIdx: number,
  u: number,
  w: number,
  svh: number,
  fieldLeft: number,
  portrait: boolean,
  nowSec: number,
  lockProg: number,
  clickImpulse: number
): [number, number] {
  const { xLeft, spanX, yMid, peakAmp } = getResonanceGeometry(w, svh, fieldLeft, portrait)
  const rx = xLeft + spanX * u
  const s = u - 0.5
  const absS = Math.abs(s)

  // Ends pinch & lock first, driving harmonic compression inward toward u = 0.50
  const inwardFront = clamp01(lockProg * 1.32 - (1 - Math.min(1, absS * 2)) * 0.32)
  const localLock = smoothstep01(inwardFront)

  // Pinched needle envelope: zero offset & horizontal tangent at both tips
  const pinchWin = Math.pow(Math.sin(Math.PI * u), 1.42)
  const gaussBell = Math.exp(-Math.pow(s / 0.23, 2))

  // Visible phase-hunting tug-of-war that damps into unison as localLock -> 1
  const huntSign = strandIdx % 2 === 0 ? 1 : -1
  const initialSlip = ((strandIdx % 5) - 2) * 0.42 + (strandIdx >= 7 && strandIdx <= 12 ? 1.35 : 0)
  const phaseHunt =
    (1 - localLock) *
    (initialSlip + huntSign * 0.95 * Math.sin(nowSec * 2.55 + strandIdx * 0.72))

  const breath = 1 + 0.042 * Math.sin(nowSec * 1.75) + clickImpulse * 0.16 * Math.cos(nowSec * 15)
  const amp = peakAmp * breath
  const theta = 2 * Math.PI * 4.65 * s + phaseHunt

  // Disciplined resonant alignment—leaves room for Stage 06 Amplification to surge
  const packetEnv = 0.38 * (1 - localLock) + (0.22 + 0.58 * gaussBell) * localLock
  const upwardBias = -0.14 * gaussBell * pinchWin * localLock
  const yCore = (-0.79 * Math.cos(theta) * packetEnv * pinchWin + upwardBias) * amp

  // Side-wing harmonic lens envelope (pinches to 0 at u=0, u=0.5, and u=1)
  const wingBell =
    Math.sin(Math.PI * Math.min(1, absS / 0.47)) * pinchWin * (1 - 0.76 * gaussBell)

  let offset = yCore

  if (strandIdx === 0 || strandIdx === 1 || strandIdx === 7 || strandIdx === 8) {
    // 4-strand coherent core bundle: counter-phase strands flip into tight parallel lock
    const coreScales =
      strandIdx === 0 ? 1.0 : strandIdx === 7 ? 1.07 : strandIdx === 1 ? 0.91 : 0.83
    const microSep =
      (strandIdx === 0 ? 0 : strandIdx === 7 ? -2.2 : strandIdx === 1 ? 2.0 : 3.8) * pinchWin
    const preLockFlip = strandIdx >= 7 ? -0.55 * (1 - localLock) + coreScales * localLock : coreScales
    offset = yCore * preLockFlip + microSep * localLock
  } else if (strandIdx >= 13) {
    // Central overtone crown arches rising above peak & echoing beneath troughs
    const oIdx = strandIdx - 13 // 0..4
    if (oIdx <= 2) {
      const crownScale = 1.14 + oIdx * 0.12
      const crownLift = -amp * (0.045 + oIdx * 0.045) * gaussBell * pinchWin * localLock
      offset = yCore * (0.85 * (1 - localLock) + crownScale * localLock) + crownLift
    } else {
      const underScale = oIdx === 3 ? 0.68 : 0.52
      const troughEcho = amp * (oIdx === 3 ? 0.11 : 0.18) * gaussBell * pinchWin * localLock
      offset = yCore * underScale + troughEcho
    }
  } else if (strandIdx >= 2 && strandIdx <= 4) {
    // Upper side-wing harmonic arches (left & right lens curves)
    const tier = strandIdx - 1 // 1..3
    const wingLift = -amp * (0.16 + tier * 0.105) * wingBell * localLock
    const centerJoin = yCore * (0.76 + tier * 0.08)
    offset = centerJoin + wingLift
  } else if (strandIdx >= 9 && strandIdx <= 11) {
    // Lower side-wing harmonic arches (counter-symmetric lower lens curves)
    const tier = strandIdx - 8 // 1..3
    const wingDip = amp * (0.13 + tier * 0.088) * wingBell * localLock
    const preFlip = -0.5 * (1 - localLock) + (0.7 + tier * 0.07) * localLock
    offset = yCore * preFlip + wingDip
  } else {
    // Fine inner harmonic bridge threads (5, 6, 12)
    const bridgeScale = strandIdx === 5 ? 0.62 : strandIdx === 6 ? 0.45 : 0.74
    const preSign = strandIdx === 12 ? -0.4 * (1 - localLock) + bridgeScale * localLock : bridgeScale
    offset = yCore * preSign
  }

  const shimmer = Math.sin(nowSec * 1.4 + strandIdx * 0.6) * pinchWin * 0.35
  return [rx, yMid + offset + shimmer]
}

function getAmplificationGeometry(w: number, svh: number, fieldLeft: number, portrait: boolean) {
  const baseH = portrait
    ? Math.min(svh * 0.34, w * 0.62)
    : Math.min(svh * 0.52, w * 0.315)
  const baseSpanX = baseH * 1.46
  const cx = portrait
    ? w * 0.5
    : Math.min(w - baseSpanX * 0.52, Math.max(w * 0.684, fieldLeft + baseSpanX * 0.53))
  // Matches Stage 07's exact compact scale (82% desktop, 73% mobile) at the exact same (cx, yMid)
  const H = baseH * (portrait ? 0.73 : 0.82)
  const spanX = H * 1.46
  const xLeft = cx - spanX * 0.5
  const yMid = portrait ? svh * 0.675 : svh * 0.575
  return { cx, yMid, H, xLeft, spanX }
}

function evalStage6StrandPoint(
  strandIdx: number,
  u: number,
  w: number,
  svh: number,
  fieldLeft: number,
  portrait: boolean,
  nowSec: number,
  ampDrive: number,
  clickImpulse: number
): [number, number] {
  const resGeo = getResonanceGeometry(w, svh, fieldLeft, portrait)
  const ampGeo = getAmplificationGeometry(w, svh, fieldLeft, portrait)

  const squeeze = smoothstep01(ampDrive)
  const effLeft = resGeo.xLeft + (ampGeo.xLeft - resGeo.xLeft) * (0.72 + 0.28 * squeeze)
  const effSpan = resGeo.spanX + (ampGeo.spanX - resGeo.spanX) * (0.72 + 0.28 * squeeze)
  const effYMid = resGeo.yMid + (ampGeo.yMid - resGeo.yMid) * (0.68 + 0.32 * squeeze)
  const ax = effLeft + effSpan * u

  const s = u - 0.5
  const absS = Math.abs(s)

  const horizCompress = 1.12 - 0.12 * squeeze
  const sc = s / horizCompress

  // Clean horizontal beam through the resonator port gaps (|s| >= 0.34)
  const chamberGate = 1 - smoothstep01((absS - 0.27) / 0.075)
  const breath =
    1 + 0.028 * Math.sin(nowSec * 2.1) + clickImpulse * 0.14 * Math.cos(nowSec * 16)

  // Rises slightly higher (-0.382) into the lifted +14% upper resonator vault
  const vertSurge = (0.42 + 0.58 * squeeze) * breath * ampGeo.H
  const centralSpike = -0.382 * Math.exp(-Math.pow(sc / 0.064, 2))
  const deepTroughs =
    0.162 *
    (Math.exp(-Math.pow((sc + 0.116) / 0.049, 2)) +
      Math.exp(-Math.pow((sc - 0.116) / 0.049, 2)))
  const sideCrests =
    -0.134 *
    (Math.exp(-Math.pow((sc + 0.228) / 0.055, 2)) +
      Math.exp(-Math.pow((sc - 0.228) / 0.055, 2)))

  const yWave = (centralSpike + deepTroughs + sideCrests) * vertSurge * chamberGate

  // Subtle left-to-right travelling harmonic filament currents weaving inside the wave body
  const pSlim = portrait ? 0.72 : 1
  const travelPhase = u * 18.5 - nowSec * 3.85 + strandIdx * 0.74
  const crossPhase = u * 10.5 - nowSec * 2.45 - strandIdx * 0.52
  const streamWave = Math.sin(travelPhase) * 0.72 + Math.sin(crossPhase) * 0.28
  const slopeZone = Math.exp(-Math.pow(sc / 0.17, 2))

  let strandMult = 1
  let dyWeave = 0
  let dxWeave = 0

  if (strandIdx === 0) {
    // Strand 0 stays smooth so the 24k molten gold top rim glides with zero jitter
    strandMult = 1.0
    dyWeave = Math.sin(u * 14.0 - nowSec * 3.4) * 0.45 * pSlim * chamberGate
  } else if (strandIdx === 7 || strandIdx === 1 || strandIdx === 8) {
    strandMult = strandIdx === 7 ? 1.022 : strandIdx === 1 ? 0.974 : 0.942
    const baseBias = strandIdx === 7 ? -0.9 : strandIdx === 1 ? 0.9 : 1.7
    dyWeave = (baseBias + streamWave * 1.85) * pSlim * chamberGate
    dxWeave = Math.cos(travelPhase) * 1.45 * pSlim * slopeZone * chamberGate
  } else {
    const looseSpread = ((strandIdx % 5) - 2) * 0.13 * (1 - squeeze)
    const lockedHug = 0.915 + (strandIdx % 5) * 0.036
    strandMult = lockedHug + looseSpread
    const weaveAmp = (2.15 + (strandIdx % 3) * 0.55) * (1 - squeeze * 0.18)
    dyWeave = streamWave * weaveAmp * pSlim * chamberGate
    dxWeave = Math.cos(travelPhase) * 1.85 * pSlim * slopeZone * chamberGate
  }

  return [ax + dxWeave, effYMid + yWave * strandMult + dyWeave]
}

function getWaveStageGeometry(
  w: number,
  svh: number,
  fieldLeft: number,
  portrait: boolean,
  _uWave: number,
  _seqDrive = 0
) {
  const ampGeo = getAmplificationGeometry(w, svh, fieldLeft, portrait)
  const { cx, yMid, H } = ampGeo

  const xLeftFull = portrait
    ? w * 0.025
    : Math.max(fieldLeft * 0.9, cx - H * 1.48)
  const xRightFull = portrait
    ? w * 0.975
    : w + 14

  return { cx, yMid, H, xLeftFull, xRightFull }
}

function evalStage7StrandPoint(
  strandIdx: number,
  u: number,
  w: number,
  svh: number,
  fieldLeft: number,
  portrait: boolean,
  nowSec: number,
  seqDrive: number,
  uWave: number,
  clickImpulse: number
): [number, number] {
  const { cx, yMid, H, xLeftFull, xRightFull } = getWaveStageGeometry(
    w,
    svh,
    fieldLeft,
    portrait,
    uWave,
    seqDrive
  )

  // Seamless overlap: outward slingshot ignites at 0.18 right before inward retraction finishes at 0.24 (zero pause!)
  const retract = smoothstep01(clamp01(uWave * 0.14 + seqDrive / 0.28))
  const chamberCharge = smoothstep01(seqDrive / 0.32)

  const rawLeft = clamp01((seqDrive - 0.2) / 0.72)
  const rawRight = clamp01((seqDrive - 0.17) / 0.74)
  const propLeft = 1 - Math.pow(1 - rawLeft, 2.2)
  const propRight = 1 - Math.pow(1 - rawRight, 2.2)

  const uPort = 0.1541 + (0.25 - 0.1541) * retract
  const xPortL = cx - H * (0.505 - 0.034 * retract * (1 - propLeft))
  const xPortR = cx + H * (0.505 - 0.034 * retract * (1 - propRight))

  const leftOutLen = H * 0.225 * (1 - retract) + Math.max(0, xPortL - xLeftFull) * propLeft
  const rightOutLen = H * 0.225 * (1 - retract) + Math.max(0, xRightFull - xPortR) * propRight

  // Zone L: Stronger, Confident Pure-Blue Flowing S-Waves (0% gel bounce on click)
  if (u < uPort) {
    const tL = clamp01((uPort - u) / Math.max(1e-4, uPort))
    const tReachL = tL * propLeft
    const wx = xPortL - leftOutLen * tL
    if (propLeft <= 0.001) return [wx, yMid]

    const bandL = strandIdx % 3
    const subIdxL = Math.floor(strandIdx / 3) / 5 - 0.5
    const easeEntryL = smoothstep01(tReachL / 0.24)
    const sBellL = 0.5 - 0.5 * Math.cos(Math.PI * Math.pow(tReachL, 0.82))

    const archBaseL = bandL === 0 ? -0.35 : bandL === 2 ? 0.35 : 0.0
    const archOffsetL = (archBaseL + subIdxL * 0.14) * H * sBellL
    const phaseL = bandL * 2.05 + subIdxL * 0.9
    const sineWaveL =
      Math.sin(tReachL * 1.58 * Math.PI - nowSec * 2.15 + phaseL) *
      H *
      (bandL === 1 ? 0.22 : 0.155) *
      easeEntryL

    return [wx, yMid + archOffsetL + sineWaveL]
  }

  // Zone R: Bold, Energetic Brandsta-Blue S-Wave Streams (0% gel bounce on click)
  if (u > 1 - uPort) {
    const tR = clamp01((u - (1 - uPort)) / Math.max(1e-4, uPort))
    const tReachR = tR * propRight
    const wx = xPortR + rightOutLen * tR
    if (propRight <= 0.001) return [wx, yMid]

    let bandR = strandIdx % 3
    if (strandIdx === 7) bandR = 0
    else if (strandIdx === 0 || strandIdx === 1) bandR = 1
    else if (strandIdx === 8) bandR = 2
    const subIdxR = ((strandIdx * 5 + 1) % 6) / 5 - 0.5

    const easeEntryR = smoothstep01(tReachR / 0.24)
    const sBellR = 0.5 - 0.5 * Math.cos(Math.PI * Math.pow(tReachR, 0.82))

    const archBaseR = bandR === 0 ? -0.4 : bandR === 2 ? 0.4 : -0.03
    const archOffsetR = (archBaseR + subIdxR * 0.16) * H * sBellR
    const phaseR = (bandR === 0 ? 0.35 : bandR === 1 ? 2.55 : 4.55) + subIdxR * 0.85
    const sineWaveR =
      Math.sin(tReachR * 1.55 * Math.PI - nowSec * 2.2 + phaseR) *
      H *
      (bandR === 1 ? 0.235 : 0.175) *
      easeEntryR

    return [wx, yMid + archOffsetR + sineWaveR]
  }

  // Zone C: Symmetric Inner Chamber Wave (Rises slightly into lifted upper vault, zero gel bounce in 07)
  const cRaw = (u - uPort) / Math.max(1e-4, 1 - 2 * uPort)
  const sRaw = cRaw * 2 - 1
  const sCurved = (0.76 * sRaw + 0.24 * sRaw * sRaw * sRaw) * chamberCharge + sRaw * (1 - chamberCharge)
  const wx = cx + sCurved * (xPortR - cx)
  const sc = sCurved * 0.3459
  const absSc = Math.abs(sc)

  const chamberGate = 1 - smoothstep01((absSc - 0.27) / 0.075)
  const ampScale = 1 - 0.17 * chamberCharge
  const s6ClickSpring = clickImpulse * (1 - uWave) * 0.14 * Math.cos(nowSec * 15)
  const breath = 1 + 0.028 * Math.sin(nowSec * 2.1) + s6ClickSpring
  const vertAmp = ampScale * breath * H

  const peakW = 0.064 + 0.011 * chamberCharge
  const troughW = 0.049 + 0.007 * chamberCharge
  const centralSpike = -(0.355 + 0.024 * chamberCharge) * Math.exp(-Math.pow(sc / peakW, 2))
  const deepTroughs =
    0.162 *
    (Math.exp(-Math.pow((sc + 0.116) / troughW, 2)) +
      Math.exp(-Math.pow((sc - 0.116) / troughW, 2)))
  const sideCrests =
    -0.136 *
    (Math.exp(-Math.pow((sc + 0.228) / 0.058, 2)) +
      Math.exp(-Math.pow((sc - 0.228) / 0.058, 2)))

  const yWave = (centralSpike + deepTroughs + sideCrests) * vertAmp * chamberGate

  let strandMult = 1
  let microOffset = 0
  const mSlim = portrait ? 0.72 : 0.95
  if (strandIdx === 0 || strandIdx === 7 || strandIdx === 1 || strandIdx === 8) {
    strandMult = strandIdx === 0 ? 1.0 : strandIdx === 7 ? 1.018 : strandIdx === 1 ? 0.975 : 0.95
    microOffset =
      (strandIdx === 0 ? 0 : strandIdx === 7 ? -1.1 : strandIdx === 1 ? 1.1 : 2.0) *
      mSlim *
      chamberGate
  } else {
    strandMult = 0.94 + (strandIdx % 4) * 0.03
    microOffset = Math.sin(nowSec * 1.8 + strandIdx * 0.8) * 0.4 * mSlim * chamberGate
  }

  return [wx, yMid + yWave * strandMult + microOffset]
}

function sampleCatmullRomFrom(arrX: Float64Array, arrY: Float64Array, u: number): [number, number] {
  const clamped = Math.max(0, Math.min(0.999999, u))
  const scaled = clamped * 4
  const s = Math.floor(scaled)
  const t = scaled - s

  const im1 = s === 0 ? 0 : s - 1
  const i0 = s
  const i1 = s + 1
  const i2 = s + 2 > 4 ? 4 : s + 2

  const x0 = arrX[i0]!
  const y0 = arrY[i0]!
  const x3 = arrX[i1]!
  const y3 = arrY[i1]!

  const x1 = x0 + (x3 - arrX[im1]!) / 6
  const y1 = y0 + (y3 - arrY[im1]!) / 6
  const x2 = x3 - (arrX[i2]! - x0) / 6
  const y2 = y3 - (arrY[i2]! - y0) / 6

  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  const t2 = t * t
  const t3 = t2 * t

  return [
    mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3,
    mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3,
  ]
}

function sampleCatmullRomScratch(u: number): [number, number] {
  return sampleCatmullRomFrom(wx, wy, u)
}

function populateSpineAndNormals(
  strandIdx: number,
  clickImpulse: number,
  nowSec: number,
  growU: number,
  w: number,
  svh: number,
  fieldLeft: number,
  portrait: boolean,
  uFreq = 0,
  freqOffset = 0,
  uInteract = 0,
  uResonance = 0,
  uAmp = 0,
  uWave = 0
) {
  const flipS3 = uInteract > 0.0001 && s3UnrollFlip
  const flipSign = flipS3 ? -1 : 1

  for (let k = 0; k <= RIBBON_SAMPLES; k++) {
    const kFrac = k / RIBBON_SAMPLES
    const u = kFrac * growU
    const [px, py] = sampleCatmullRomScratch(u)

    let sx = px
    let sy = py

    if (uFreq > 0.0001 && uInteract < 0.9999) {
      const srcK = flipS3 ? RIBBON_SAMPLES - k : k
      const env = Math.sin(Math.PI * kFrac)
      const fx = stage3SpineX[srcK]! + stage3NormX[srcK]! * freqOffset * env * flipSign
      const fy = stage3SpineY[srcK]! + stage3NormY[srcK]! * freqOffset * env * flipSign
      sx = px + (fx - px) * uFreq
      sy = py + (fy - py) * uFreq
    }

    if (uInteract > 0.0001 && uResonance < 0.9999) {
      const [ix, iy] = evalStage4StrandPoint(
        strandIdx,
        kFrac,
        w,
        svh,
        fieldLeft,
        portrait,
        nowSec
      )
      sx = uInteract >= 0.9999 ? ix : sx + (ix - sx) * uInteract
      sy = uInteract >= 0.9999 ? iy : sy + (iy - sy) * uInteract
    }

    if (uResonance > 0.0001 && uAmp < 0.9999) {
      const [rx, ry] = evalStage5StrandPoint(
        strandIdx,
        kFrac,
        w,
        svh,
        fieldLeft,
        portrait,
        nowSec,
        resonanceLock,
        clickImpulse
      )
      sx = uResonance >= 0.9999 ? rx : sx + (rx - sx) * uResonance
      sy = uResonance >= 0.9999 ? ry : sy + (ry - sy) * uResonance
    }

    if (uAmp > 0.0001 && uWave < 0.9999) {
      const [ax, ay] = evalStage6StrandPoint(
        strandIdx,
        kFrac,
        w,
        svh,
        fieldLeft,
        portrait,
        nowSec,
        amplificationDrive,
        clickImpulse
      )
      sx = uAmp >= 0.9999 ? ax : sx + (ax - sx) * uAmp
      sy = uAmp >= 0.9999 ? ay : sy + (ay - sy) * uAmp
    }

    if (uWave > 0.0001) {
      const [wx, wy] = evalStage7StrandPoint(
        strandIdx,
        kFrac,
        w,
        svh,
        fieldLeft,
        portrait,
        nowSec,
        waveSequenceDrive,
        uWave,
        clickImpulse
      )
      sx = uWave >= 0.9999 ? wx : sx + (wx - sx) * uWave
      sy = uWave >= 0.9999 ? wy : sy + (wy - sy) * uWave
    }

    sampleX[k] = sx
    sampleY[k] = sy
  }

  for (let k = 0; k <= RIBBON_SAMPLES; k++) {
    const prev = k === 0 ? 0 : k - 1
    const next = k === RIBBON_SAMPLES ? RIBBON_SAMPLES : k + 1
    const dx = sampleX[next]! - sampleX[prev]!
    const dy = sampleY[next]! - sampleY[prev]!
    const len = Math.hypot(dx, dy) || 1
    normX[k] = -dy / len
    normY[k] = dx / len
  }

  if (clickImpulse > 0.005) {
    const rippleCycles = 3.5 + uFreq * 3.0 + uInteract * 1.5 - uResonance * 1.0
    const rippleScale = (1 - uResonance * 0.45) * (1 - uAmp * 0.45) * (1 - uWave)
    if (rippleScale > 0.002) {
      for (let k = 1; k < RIBBON_SAMPLES; k++) {
        const u = k / RIBBON_SAMPLES
        let portCalm = 1
        if (uAmp > 0.01 && uWave < 0.99) {
          portCalm = 1 - uAmp * (1 - uWave) * smoothstep01((Math.abs(u - 0.5) - 0.26) / 0.08)
        }
        const ripple =
          Math.sin(u * Math.PI * rippleCycles - nowSec * 14) *
          Math.sin(Math.PI * u) *
          clickImpulse *
          6.5 *
          rippleScale *
          portCalm
        sampleX[k] = sampleX[k]! + normX[k]! * ripple
        sampleY[k] = sampleY[k]! + normY[k]! * ripple
      }
    }
  }
}

function buildTaperedRibbonFromSpine(
  peakHalfWidth: number,
  cometBlend = 0,
  freqBlend = 0,
  interactBlend = 0,
  resonanceBlend = 0,
  ampBlend = 0,
  waveBlend = 0,
  portrait = false
): string {
  const flipS3 = interactBlend > 0.0001 && s3UnrollFlip
  const waveEnvArr = portrait ? waveTaperEnvPortrait : waveTaperEnvDesktop
  let d = `M ${sampleX[0]!.toFixed(1)} ${sampleY[0]!.toFixed(1)}`
  for (let k = 1; k < RIBBON_SAMPLES; k++) {
    const s3K = flipS3 ? RIBBON_SAMPLES - k : k
    const s2Env = taperEnv[k]! + (cometTaperEnv[k]! - taperEnv[k]!) * cometBlend
    const s3Env = s2Env + (freqTaperEnv[s3K]! - s2Env) * freqBlend
    const s4Env = s3Env + (interactTaperEnv[k]! - s3Env) * interactBlend
    const s5Env = s4Env + (resonanceTaperEnv[k]! - s4Env) * resonanceBlend
    const s6Env = s5Env + (ampTaperEnv[k]! - s5Env) * ampBlend
    const env = s6Env + (waveEnvArr[k]! - s6Env) * waveBlend
    const hw = peakHalfWidth * env
    const lx = sampleX[k]! + normX[k]! * hw
    const ly = sampleY[k]! + normY[k]! * hw
    d += ` L ${lx.toFixed(1)} ${ly.toFixed(1)}`
  }
  d += ` L ${sampleX[RIBBON_SAMPLES]!.toFixed(1)} ${sampleY[RIBBON_SAMPLES]!.toFixed(1)}`
  for (let k = RIBBON_SAMPLES - 1; k >= 1; k--) {
    const s3K = flipS3 ? RIBBON_SAMPLES - k : k
    const s2Env = taperEnv[k]! + (cometTaperEnv[k]! - taperEnv[k]!) * cometBlend
    const s3Env = s2Env + (freqTaperEnv[s3K]! - s2Env) * freqBlend
    const s4Env = s3Env + (interactTaperEnv[k]! - s3Env) * interactBlend
    const s5Env = s4Env + (resonanceTaperEnv[k]! - s4Env) * resonanceBlend
    const s6Env = s5Env + (ampTaperEnv[k]! - s5Env) * ampBlend
    const env = s6Env + (waveEnvArr[k]! - s6Env) * waveBlend
    const hw = peakHalfWidth * env
    const rx = sampleX[k]! - normX[k]! * hw
    const ry = sampleY[k]! - normY[k]! * hw
    d += ` L ${rx.toFixed(1)} ${ry.toFixed(1)}`
  }
  return `${d} Z`
}

function buildTaperedSpindle(
  centerU: number,
  halfSpan: number,
  peakHalfWidth: number,
  maxU: number
): string {
  const uStart = Math.max(0, centerU - halfSpan)
  const uEnd = Math.min(Math.min(0.9999, maxU), centerU + halfSpan)
  if (uEnd - uStart < 0.015) return 'M 0 0 Z'

  for (let k = 0; k <= SPINDLE_SAMPLES; k++) {
    const u = uStart + (uEnd - uStart) * (k / SPINDLE_SAMPLES)
    const [px, py] = sampleActiveSpine(u, maxU)
    spX[k] = px
    spY[k] = py
  }

  let d = `M ${spX[0]!.toFixed(1)} ${spY[0]!.toFixed(1)}`
  for (let k = 1; k < SPINDLE_SAMPLES; k++) {
    const dx = spX[k + 1]! - spX[k - 1]!
    const dy = spY[k + 1]! - spY[k - 1]!
    const len = Math.hypot(dx, dy) || 1
    const hw = peakHalfWidth * spEnv[k]!
    const lx = spX[k]! + (-dy / len) * hw
    const ly = spY[k]! + (dx / len) * hw
    d += ` L ${lx.toFixed(1)} ${ly.toFixed(1)}`
  }
  d += ` L ${spX[SPINDLE_SAMPLES]!.toFixed(1)} ${spY[SPINDLE_SAMPLES]!.toFixed(1)}`
  for (let k = SPINDLE_SAMPLES - 1; k >= 1; k--) {
    const dx = spX[k + 1]! - spX[k - 1]!
    const dy = spY[k + 1]! - spY[k - 1]!
    const len = Math.hypot(dx, dy) || 1
    const hw = peakHalfWidth * spEnv[k]!
    const rx = spX[k]! - (-dy / len) * hw
    const ry = spY[k]! - (dx / len) * hw
    d += ` L ${rx.toFixed(1)} ${ry.toFixed(1)}`
  }
  return `${d} Z`
}

function spotEnvelopeAlpha(
  u: number,
  contactProg = 0,
  cometBlend = 0,
  freqBlend = 0,
  interactBlend = 0,
  resonanceBlend = 0,
  ampBlend = 0,
  waveBlend = 0
): number {
  const cu = clamp01(u)
  const baseHeadFade = cu < 0.12 ? (cu / 0.12) * 0.96 : 0.96
  const cometTailFade = Math.pow(cu, 1.6) * 0.96
  const s2Fade = baseHeadFade + (cometTailFade - baseHeadFade) * cometBlend
  const s2Out = cu > 0.88 ? Math.max(contactProg * 0.75, ((1 - cu) / 0.12) * 0.96) : s2Fade

  if (freqBlend <= 0.001) return s2Out

  const freqIn = cu < 0.18 ? (cu / 0.18) * 0.94 : 0.94
  const freqOut = cu > 0.92 ? ((1 - cu) / 0.08) * 0.94 : freqIn
  const freqScale = 0.25 + 0.75 * freqCurrentLenRatio
  const s3Out = s2Out + (freqOut * freqScale - s2Out) * freqBlend

  if (interactBlend <= 0.001) return s3Out

  const intIn = cu < 0.13 ? (cu / 0.13) * 0.95 : 0.95
  const intOut = cu > 0.8 ? Math.max(0, (0.985 - cu) / 0.185) * 0.95 : intIn
  const s4Out = s3Out + (intOut - s3Out) * interactBlend

  if (resonanceBlend <= 0.001) return s4Out

  const resEnv = Math.sin(Math.PI * cu)
  const resOut = Math.pow(resEnv, 0.75) * 0.92
  const s5Out = s4Out + (resOut - s4Out) * resonanceBlend

  if (ampBlend <= 0.001) return s5Out

  const ampOut = Math.pow(resEnv, 0.9) * 0.42
  const s6Out = s5Out + (ampOut - s5Out) * ampBlend

  if (waveBlend <= 0.001) return s6Out

  const waveOut = Math.sin(Math.PI * cu) * 0.34
  return s6Out + (waveOut - s6Out) * waveBlend
}

function renderFrame(tel: ConvergentTelemetry, dtSec: number, nowSec: number) {
  const w = tel.vw
  const h = tel.vh
  const svh = tel.svh
  const portrait = tel.isPortrait
  const heroProg = tel.heroProgress
  const contactProg = tel.contactProgress
  const stageProg = tel.stageProgress
  const hoverPull = tel.hoverPull * (1 - heroProg)
  const clickImpulse = tel.clickImpulse

  const stageH = engineStageEl.value?.clientHeight || h
  if (svgW.value !== w) svgW.value = w
  if (svgH.value !== stageH) svgH.value = stageH

  const elapsedMs = mountPerfMs > 0 ? Math.max(0, nowSec * 1000 - mountPerfMs) : 0
  if (heroProg > 0.015) {
    scrollFastForward = Math.min(1, scrollFastForward + dtSec * 3.8)
  }

  const spoutX = tel.spoutX
  const spoutY = tel.spoutY

  const mProg = clamp01(stageProg)
  const uMotion = smoothstep01(mProg)
  const fProg = clamp01((stageProg - 1.34) / 0.24)
  const uFreq = smoothstep01(fProg)
  const iProg = clamp01((stageProg - 2.47) / 0.21)
  const uInteract = smoothstep01(iProg)
  const rProg = clamp01((stageProg - 3.46) / 0.22)
  const uResonance = smoothstep01(rProg)
  const aProg = clamp01((stageProg - 4.46) / 0.22)
  const uAmp = smoothstep01(aProg)
  const wProg = clamp01((stageProg - 5.44) / 0.24)
  const uWave = smoothstep01(wProg)  

  if (uMotion <= 0.001) {
    stage2RoamSec = 0
  } else {
    const roamDrive = smoothstep01((uMotion - 0.78) / 0.22) * (1 - uFreq * 0.65)
    stage2RoamSec += dtSec * STAGE2_ROAM_TEMPO * (0.15 + 0.85 * roamDrive)
  }

  let s2HeadX = spoutX
  let s2HeadY = spoutY
  if (mProg > 0.0001) {
    updateStage2CometSpine(uMotion, stage2RoamSec, w, svh, spoutX, spoutY, portrait)
    s2HeadX = cometSpineX[4]!
    s2HeadY = cometSpineY[4]!
  }

  let activePulseX = s2HeadX
  let activePulseY = s2HeadY

  if (fProg <= 0.002) {
    stage3TravelPx = 0
    freqCurrentLenRatio = 0
  } else {
    ensureStage3TrackLut(w, svh, tel.fieldLeft, portrait)
    const waveSpanScale = smoothstep01((stageProg - 1.45) / 0.13)
    if (stageProg >= 1.5) {
      const snakeSpeed = portrait ? w * 0.4 : Math.max(220, tel.fieldWidth * 0.33)
      const snakeFreeze = 1 - smoothstep01((stageProg - 2.45) / 0.09)
      const snakeDrive = smoothstep01((stageProg - 1.49) / 0.09) * snakeFreeze
      stage3TravelPx += dtSec * snakeSpeed * (1 + clickImpulse * 0.65) * snakeDrive
    }
    updateStage3SnakeSpine(stage3TravelPx, waveSpanScale)
    const s3HeadX = stage3SpineX[RIBBON_SAMPLES]!
    const s3HeadY = stage3SpineY[RIBBON_SAMPLES]!
    activePulseX = s2HeadX + (s3HeadX - s2HeadX) * uFreq
    activePulseY = s2HeadY + (s3HeadY - s2HeadY) * uFreq
  }

  if (iProg <= 0.002) {
    if (s3UnrollFlip) {
      s3UnrollFlip = false
      for (let s = 0; s < NEURAL_STRANDS.length; s++) {
        livePhases[s] = 1 - livePhases[s]!
      }
    }
    interactBranchFront = 0
  } else {
    const wantFlip = stage3SpineX[RIBBON_SAMPLES]! < stage3SpineX[0]!
    if (iProg < 0.06 && wantFlip !== s3UnrollFlip) {
      s3UnrollFlip = wantFlip
      for (let s = 0; s < NEURAL_STRANDS.length; s++) {
        livePhases[s] = 1 - livePhases[s]!
      }
    }
    const minFront = uInteract * 0.55
    if (stageProg >= 2.5) {
      interactBranchFront = Math.max(
        minFront,
        Math.min(1.25, interactBranchFront + dtSec * 0.85 * (1 + clickImpulse * 0.5))
      )
    } else {
      interactBranchFront = Math.max(minFront, interactBranchFront - dtSec * 1.6)
    }
    updateStage4InteractionNodes(w, svh, tel.fieldLeft, portrait, nowSec, uInteract)

    const s4AnchorU = s3UnrollFlip ? 0 : 1
    const [s4TipX, s4TipY] = evalStage4StrandPoint(
      0,
      s4AnchorU,
      w,
      svh,
      tel.fieldLeft,
      portrait,
      nowSec
    )
    activePulseX = activePulseX + (s4TipX - activePulseX) * uInteract
    activePulseY = activePulseY + (s4TipY - activePulseY) * uInteract
  }

  if (rProg <= 0.002) {
    resonanceLock = 0
  } else if (stageProg >= 3.5) {
    // Takes ~1.85s of visible harmonic phase-hunting effort to lock into full resonance
    resonanceLock = Math.min(
      1,
      resonanceLock + dtSec * 0.54 * (1 + clickImpulse * 0.65)
    )
  } else {
    resonanceLock = Math.max(0, resonanceLock - dtSec * 1.65)
  }

  if (aProg <= 0.002) {
    amplificationDrive = 0
  } else if (stageProg >= 4.5) {
    // Steady acoustic containment build-up (resonator stays 100% solid & immune to clicks)
    amplificationDrive = Math.min(1, amplificationDrive + dtSec * 0.68)
  } else {
    amplificationDrive = Math.max(0, amplificationDrive - dtSec * 1.75)
  }

  if (wProg <= 0.002) {
    waveSequenceDrive = 0
  } else if (stageProg >= 5.5) {
    waveSequenceDrive = Math.min(1, waveSequenceDrive + dtSec * 0.58)
  } else {
    waveSequenceDrive = Math.max(0, waveSequenceDrive - dtSec * 1.8)
  }

  // Balanced midpoint thickness & halo for Stage 03 Frequency
  const cometWidthScale = 1 - uMotion * 0.28 + uFreq * 0.12
  const bundleSheathGain = 1 - uMotion * 0.66 + uFreq * 0.18
  const bundleCoreGain = 1 - uMotion * 0.64 + uFreq * 0.16
  const bundleSpotGain = 1 - uMotion * 0.62 + uFreq * 0.1 + uInteract * 0.26

  const scrollFlowBoost = Math.sin(Math.PI * heroProg) * 0.55
  const speedBoost = 1 + hoverPull * 0.88 + clickImpulse * 2.1 + scrollFlowBoost
  const glowBoost = 1 + hoverPull * 0.28 + clickImpulse * 0.45
  const spotScale = 1 + hoverPull * 0.14 + clickImpulse * 0.34
  const centerX = w * 0.5
  const centerY = svh * 0.46

  const cThresh = CONVERGENT_CONSTANTS.contactThreshold
  const kissEase = smoothstep01(contactProg)

  const maxSpanX = portrait ? w * 0.68 : Math.min(w * 0.4, tel.fieldWidth * 0.78)
  const maxFanUpY = portrait ? svh * 0.135 : svh * 0.34
  const maxFanDownY = portrait ? svh * 0.155 : svh * 0.34

  for (let i = 0; i < NEURAL_STRANDS.length; i++) {
    const spec = NEURAL_STRANDS[i]!
    const growU = getStrandGrowProgress(i, elapsedMs)

    // Hold strand completely hidden until its staggered Beat 2 cue arrives
    if (growU <= 0.012) {
      sheathPathEls[i]?.style.setProperty('opacity', '0')
      corePathEls[i]?.style.setProperty('opacity', '0')
      spindlePathEls[i]?.style.setProperty('opacity', '0')
      primarySpotEls[i]?.style.setProperty('opacity', '0')
      secondarySpotEls[i]?.style.setProperty('opacity', '0')
      tipGlowEls[i]?.style.setProperty('opacity', '0')
      continue
    }

    const pts = portrait ? spec.portrait : spec.landscape

    livePhases[i] = (livePhases[i]! + spec.spotSpeed * speedBoost * dtSec) % 1

    const p1Phase = livePhases[i]!

    for (let k = 0; k < 5; k++) {

      if (uResonance > 0.05 && resonanceLock > 0.1) {
        const targetCohort = (nowSec * 0.24 + (i % 3) * 0.3333) % 1
        const phaseDelta = ((targetCohort - livePhases[i]! + 1.5) % 1) - 0.5
        livePhases[i] = (livePhases[i]! + phaseDelta * dtSec * 2.4 * uResonance * resonanceLock + 1) % 1
      }

      const baseX = pts[k]![0] * w
      const baseY = pts[k]![1] * svh

      const driftAtten = k === 0 ? 0.15 : k === 4 ? 0.42 : 1.0
      const waveX = Math.sin(nowSec * spec.driftFreq + spec.driftPhase + k * 1.15) * spec.driftAmpPx * driftAtten
      const waveY = Math.cos(nowSec * (spec.driftFreq * 0.86) + spec.driftPhase * 1.2 + k * 0.95) * spec.driftAmpPx * driftAtten

      const pullWeight = (k / 4) * 0.055 * hoverPull
      hx[k] = baseX + waveX + (centerX - baseX) * pullWeight
      hy[k] = baseY + waveY + (centerY - baseY) * pullWeight
    }

    if (heroProg <= 0.0001) {
      for (let k = 0; k < 5; k++) {
        wx[k] = hx[k]!
        wy[k] = hy[k]!
      }
    } else {
      const spanX = maxSpanX * spec.stage1Reach
      const fanY = (spec.stage1Fan < 0 ? maxFanUpY : maxFanDownY) * spec.stage1Fan
      const settleDrift = Math.sin(nowSec * (spec.driftFreq * 0.9) + spec.driftPhase) * (spec.driftAmpPx * 0.38)

      s1x[0] = spoutX - spanX
      s1y[0] = spoutY + fanY + settleDrift
      s1x[1] = spoutX - spanX * 0.74
      s1y[1] = spoutY + fanY * 0.84 + settleDrift * 0.8
      s1x[2] = spoutX - spanX * 0.45
      s1y[2] = spoutY + fanY * 0.42 - settleDrift * 0.5
      s1x[3] = spoutX - spanX * 0.19
      s1y[3] = spoutY + fanY * 0.085 + settleDrift * 0.2
      s1x[4] = spoutX
      s1y[4] = spoutY

      if (mProg <= 0.0001) {
        for (let k = 0; k < 5; k++) {
          dxArr[k] = s1x[k]!
          dyArr[k] = s1y[k]!
        }
      } else {
      const strandReach = 0.62 + 0.38 * clamp01(spec.stage1Reach)
      const strandBraid = smoothstep01(clamp01(mProg * 1.08))

      for (let k = 0; k < 4; k++) {
        const spinePos = Math.max(0, Math.min(3.9999, 4 - (4 - k) * strandReach))
        const idx0 = Math.max(0, Math.min(3, Math.floor(spinePos)))
        const frac = spinePos - idx0

          const cx = cometSpineX[idx0]! + (cometSpineX[idx0 + 1]! - cometSpineX[idx0]!) * frac
          const cy = cometSpineY[idx0]! + (cometSpineY[idx0 + 1]! - cometSpineY[idx0]!) * frac
          const nx = cometNormX[idx0]! + (cometNormX[idx0 + 1]! - cometNormX[idx0]!) * frac
          const ny = cometNormY[idx0]! + (cometNormY[idx0 + 1]! - cometNormY[idx0]!) * frac

          const braidEnv = Math.sin((k / 4) * Math.PI * 0.85)
          const microWeave = Math.sin(nowSec * (spec.driftFreq * 1.15) + spec.driftPhase + k * 0.9) * 1.2
          const tightOffset = (spec.stage1Fan * (portrait ? 2.6 : 3.6) + microWeave) * braidEnv

          const cTargetX = cx + nx * tightOffset
          const cTargetY = cy + ny * tightOffset

          dxArr[k] = s1x[k]! + (cTargetX - s1x[k]!) * strandBraid
          dyArr[k] = s1y[k]! + (cTargetY - s1y[k]!) * strandBraid
        }

        dxArr[4] = s2HeadX
        dyArr[4] = s2HeadY
      }

      const preGapX = (portrait ? 14 : 22) + Math.abs(spec.stage1Fan) * (portrait ? 12 : 20)
      const preGapY = spec.stage1Fan * (portrait ? 18 : 34)
      const preContactX = dxArr[4]! - preGapX
      const preContactY = dyArr[4]! + preGapY

      const rawApproach = Math.min(1, heroProg / cThresh)
      const tipApproach = smoothstep01(Math.pow(rawApproach, spec.convergenceExponent * 0.92))
      const portraitSwoopY = portrait ? Math.sin(Math.PI * tipApproach) * svh * 0.05 : 0

      const approachedTipX = hx[4]! + (preContactX - hx[4]!) * tipApproach
      const approachedTipY = hy[4]! + (preContactY - hy[4]!) * tipApproach + portraitSwoopY

      wx[4] = approachedTipX + (dxArr[4]! - approachedTipX) * kissEase
      wy[4] = approachedTipY + (dyArr[4]! - approachedTipY) * kissEase

      const uBody = smoothstep01(Math.pow(heroProg, spec.convergenceExponent))

      for (let k = 0; k < 4; k++) {
        const vhx = hx[k]! - hx[4]!
        const vhy = hy[k]! - hy[4]!
        const rh = Math.hypot(vhx, vhy)
        const th = Math.atan2(vhy, vhx)

        const vdx = dxArr[k]! - dxArr[4]!
        const vdy = dyArr[k]! - dyArr[4]!
        const rd = Math.hypot(vdx, vdy)
        const td = Math.atan2(vdy, vdx)

        let deltaTheta = ((td - th + Math.PI * 3) % TWO_PI) - Math.PI
        if (mProg < 0.01 && spec.wing === 'right' && spec.stage1Fan >= -0.06 && deltaTheta < 0) {
          deltaTheta += TWO_PI
        }

        const rCur = rh + (rd - rh) * uBody
        const tCur = th + deltaTheta * uBody

        wx[k] = wx[4]! + Math.cos(tCur) * rCur
        wy[k] = wy[4]! + Math.sin(tCur) * rCur
      }
    }

    const freqMicroOffset =
      (spec.stage1Fan * 0.22 + Math.sin(nowSec * spec.driftFreq + spec.driftPhase) * 0.18) *
      (1 - uInteract)
    populateSpineAndNormals(
      i,
      clickImpulse,
      nowSec,
      growU,
      w,
      svh,
      tel.fieldLeft,
      portrait,
      uFreq,
      freqMicroOffset,
      uInteract,
      uResonance,
      uAmp,
      uWave
    )

    const introFade = Math.min(1, growU / 0.28)
    const s3WidthScale = (1 - heroProg * 0.28) * cometWidthScale
    const sheathRefine = 1 - heroProg * 0.34

    const [s4MaxW, s4CoreOp, s4SheathOp] = getStage4StrandProfile(i, portrait)
    const [s5MaxW, s5CoreOp, s5SheathOp] = getStage5StrandProfile(i, portrait)
    const [s6MaxW, s6CoreOp, s6SheathOp] = getStage6StrandProfile(i, portrait)
    const [s7MaxW, s7CoreOp, s7SheathOp] = getStage7StrandProfile(i, portrait)
    const branchOpen = i === 0 ? 1 : smoothstep01(interactBranchFront / 0.85)
    const s4Weight = uInteract * (0.35 + 0.65 * branchOpen)
    const s5LockBoost = 0.86 + 0.18 * smoothstep01(resonanceLock)
    const s6SurgeBoost = 0.84 + 0.22 * smoothstep01(amplificationDrive)
    const s7WaveBoost = 0.88 + 0.22 * smoothstep01(waveSequenceDrive / 0.45)

    const s3CoreHalfW = spec.maxWidth * 0.55 * s3WidthScale
    const s3SheathHalfW = spec.maxWidth * 3.2 * s3WidthScale
    const s4CoreHalfW = s3CoreHalfW + (s4MaxW * 0.55 - s3CoreHalfW) * uInteract
    const s4SheathHalfW = s3SheathHalfW + (s4MaxW * 2.85 - s3SheathHalfW) * uInteract
    const s5CoreHalfW = s4CoreHalfW + (s5MaxW * 0.55 * s5LockBoost - s4CoreHalfW) * uResonance
    const s5SheathHalfW =
      s4SheathHalfW + (s5MaxW * 2.95 * s5LockBoost - s4SheathHalfW) * uResonance
    const s6CoreHalfW = s5CoreHalfW + (s6MaxW * 0.62 * s6SurgeBoost - s5CoreHalfW) * uAmp
    const s6SheathHalfW =
      s5SheathHalfW + (s6MaxW * 2.55 * s6SurgeBoost - s5SheathHalfW) * uAmp
    const s7AuraSheathBoost = 1 + uWave * smoothstep01(clickImpulse) * 0.65
    const effCoreHalfW = s6CoreHalfW + (s7MaxW * 0.65 * s7WaveBoost - s6CoreHalfW) * uWave
    const effSheathHalfW =
      (s6SheathHalfW + (s7MaxW * 2.75 * s7WaveBoost - s6SheathHalfW) * uWave) * s7AuraSheathBoost

    const s3CoreAlpha = spec.coreOpacity * bundleCoreGain
    const s3SheathAlpha = spec.sheathOpacity * sheathRefine * bundleSheathGain
    const s4CoreAlpha = s3CoreAlpha + (s4CoreOp - s3CoreAlpha) * s4Weight
    const s4SheathAlpha = s3SheathAlpha + (s4SheathOp - s3SheathAlpha) * s4Weight
    const s5CoreAlpha = s4CoreAlpha + (s5CoreOp * s5LockBoost - s4CoreAlpha) * uResonance
    const s5SheathAlpha = s4SheathAlpha + (s5SheathOp * s5LockBoost - s4SheathAlpha) * uResonance
    const s6CoreAlpha = s5CoreAlpha + (s6CoreOp * s6SurgeBoost - s5CoreAlpha) * uAmp
    const s6SheathAlpha = s5SheathAlpha + (s6SheathOp * s6SurgeBoost - s5SheathAlpha) * uAmp
    const effCoreAlpha = s6CoreAlpha + (s7CoreOp * s7WaveBoost - s6CoreAlpha) * uWave
    const effSheathAlpha = s6SheathAlpha + (s7SheathOp * s7WaveBoost - s6SheathAlpha) * uWave
    const funnelRefine = effCoreHalfW / 0.55

    const sheathEl = sheathPathEls[i]
    if (sheathEl) {
      sheathEl.setAttribute(
        'd',
        buildTaperedRibbonFromSpine(
          effSheathHalfW,
          uMotion,
          uFreq,
          uInteract,
          uResonance,
          uAmp,
          uWave,
          portrait
        )
      )
      sheathEl.style.opacity = Math.min(0.68, effSheathAlpha * glowBoost * introFade).toFixed(2)
    }

    const coreEl = corePathEls[i]
    if (coreEl) {
      coreEl.setAttribute(
        'd',
        buildTaperedRibbonFromSpine(
          effCoreHalfW,
          uMotion,
          uFreq,
          uInteract,
          uResonance,
          uAmp,
          uWave,
          portrait
        )
      )
      coreEl.style.opacity = Math.min(1, effCoreAlpha * glowBoost * introFade).toFixed(2)
    }

    const resSpotWeight =
      (i === 0 || i === 1 || i === 7 || i === 8 ? 1 - uResonance * 0.12 : 1 - uResonance * 0.52) *
      (i === 0 || i === 7 || i === 1 || i === 8 ? 1 - uAmp * 0.34 : 1 - uAmp * 0.66) *
      (1 - uWave * 0.35)
    const activePhase = growU < 0.995 ? growU * 0.92 : p1Phase
    const p1Alpha =
      spotEnvelopeAlpha(
        activePhase,
        kissEase,
        uMotion,
        uFreq,
        uInteract,
        uResonance,
        uAmp,
        uWave
      ) *
      introFade *
      bundleSpotGain *
      resSpotWeight

    const spindleEl = spindlePathEls[i]
    if (spindleEl) {
      spindleEl.setAttribute(
        'd',
        buildTaperedSpindle(
          activePhase,
          spec.spindleSpan * growU,
          spec.maxWidth * 1.05 * funnelRefine * spotScale,
          growU
        )
      )
      spindleEl.style.opacity = Math.min(1, p1Alpha * 0.72 * glowBoost).toFixed(2)
    }

    const pSpotEl = primarySpotEls[i]
    if (pSpotEl) {
      const [sx, sy] = sampleActiveSpine(activePhase, growU)
      const convergeSpotScale = spotScale * (1 - heroProg * 0.16) * (1 - uFreq * 0.22)
      pSpotEl.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) scale(${convergeSpotScale.toFixed(3)})`
      pSpotEl.style.opacity = Math.min(1, p1Alpha * glowBoost).toFixed(2)
    }

    if (spec.hasSecondarySpot) {
      const sSpotEl = secondarySpotEls[i]
      if (sSpotEl) {
        const p2Phase = ((p1Phase + (spec.secondaryOffset ?? 0.5)) % 1) * growU
        const p2Alpha =
          growU < 0.65
            ? 0
            : spotEnvelopeAlpha(
                p2Phase,
                kissEase,
                uMotion,
                uFreq,
                uInteract,
                uResonance,
                uAmp,
                uWave
              ) *
              0.85 *
              ((growU - 0.65) / 0.35) *
              bundleSpotGain *
              resSpotWeight
        const [sx2, sy2] = sampleActiveSpine(p2Phase, growU)
        const convergeSpotScale = spotScale * (1 - heroProg * 0.18) * (1 - uFreq * 0.22)
        sSpotEl.style.transform = `translate3d(${sx2.toFixed(1)}px, ${sy2.toFixed(1)}px, 0) scale(${convergeSpotScale.toFixed(3)})`
        sSpotEl.style.opacity = Math.min(1, p2Alpha * glowBoost).toFixed(2)
      }
    }

    if (uInteract > 0.01) {
      for (let n = 0; n < INTERACTION_NODE_COUNT; n++) {
        const uNode = interactNodeU[n]!
        if (uNode <= 0.04 || uNode >= 0.96) continue
        const d1 = Math.abs(activePhase - uNode)
        if (d1 < 0.055) {
          interactNodeEnergy[n] = interactNodeEnergy[n]! + (1 - d1 / 0.055)
        }
        if (spec.hasSecondarySpot && growU >= 0.65) {
          const p2Check = ((p1Phase + (spec.secondaryOffset ?? 0.5)) % 1) * growU
          const d2 = Math.abs(p2Check - uNode)
          if (d2 < 0.055) {
            interactNodeEnergy[n] = interactNodeEnergy[n]! + (1 - d2 / 0.055) * 0.85
          }
        }
      }
    }

    if (spec.hasTerminalGlow) {
      const tipEl = tipGlowEls[i]
      if (tipEl) {
        const [tx, ty] = sampleActiveSpine(growU, growU)
        const tipPulse = p1Phase > 0.78 ? Math.sin(((p1Phase - 0.78) / 0.22) * Math.PI) * 0.35 : 0
        const tipFade = (1 - kissEase * 0.85) * introFade
        tipEl.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${spotScale.toFixed(3)})`
        tipEl.style.opacity = Math.min(1, (0.62 + tipPulse) * glowBoost * tipFade * (1 - uMotion)).toFixed(2)
      }
    }
  }

  // Stage 01 First-Contact Pulse Ignition & Concentric Rings
  if (pulseGroupEl.value) {
    if (contactProg <= 0.001) {
      pulseGroupEl.value.style.opacity = '0'
    } else {
      const pulseX = activePulseX
      const pulseY = activePulseY

      const breathe = 1 + Math.sin(nowSec * 2.3) * 0.045
      const headDissolve = 1 - smoothstep01((stageProg - 2.4) / 0.11)
      const stage3CoreShrink = (1 - uFreq * 0.34) * (0.35 + 0.65 * headDissolve)
      const coreScale =
        (0.22 + 0.78 * kissEase) * breathe * stage3CoreShrink * (1 + clickImpulse * 0.28)
      const headAlpha = Math.min(
        1,
        kissEase * (1 - uFreq * 0.14 + clickImpulse * uFreq * 0.22) * headDissolve
      )

      pulseGroupEl.value.style.opacity = headAlpha.toFixed(3)
      pulseGroupEl.value.style.transform = `translate3d(${pulseX.toFixed(1)}px, ${pulseY.toFixed(1)}px, 0) scale(${coreScale.toFixed(3)})`

      const rawBaseR = portrait ? Math.min(w, svh) * 0.3 : Math.min(w, svh) * 0.24
      const baseR = rawBaseR * (1 - uMotion * 0.18)

      // Periodic autonomous ring blink (~every 4.6s) + full concentric bloom on click
      const blinkPos = (nowSec % 4.6) / 1.65
      const autoBlink1 = blinkPos < 1 ? Math.sin(Math.PI * clamp01(blinkPos / 0.82)) : 0
      const autoBlink2 =
        blinkPos > 0.08 && blinkPos < 1.08 ? Math.sin(Math.PI * clamp01((blinkPos - 0.08) / 0.86)) : 0
      const autoBlink3 =
        blinkPos > 0.16 && blinkPos < 1.18 ? Math.sin(Math.PI * clamp01((blinkPos - 0.16) / 0.9)) : 0
      const clickRingBloom = clickImpulse > 0.005 ? Math.sin(Math.PI * (1 - clickImpulse)) : 0

      const rExpand1 = 0.25 + 0.75 * smoothstep01(Math.min(1, contactProg * 1.25))
      const rExpand2 = 0.18 + 0.82 * smoothstep01(Math.max(0, (contactProg - 0.1) / 0.9))
      const rExpand3 = 0.12 + 0.88 * smoothstep01(Math.max(0, (contactProg - 0.22) / 0.78))

      if (auraCircleEl.value) {
        auraCircleEl.value.setAttribute('r', (baseR * (1.15 - uMotion * 0.2)).toFixed(1))
      }
      if (ring1El.value) {
        const ringBreathe1 = 1 + Math.sin(nowSec * 1.8) * 0.02
        const s1Alpha = Math.min(0.62, 0.34 + clickRingBloom * 0.28)
        const s2Alpha = Math.min(0.62, 0.025 + autoBlink1 * 0.3 + clickRingBloom * 0.54)
        ring1El.value.setAttribute('r', (baseR * 0.34 * rExpand1 * ringBreathe1).toFixed(1))
        ring1El.value.style.opacity = (kissEase * (s1Alpha * (1 - uMotion) + s2Alpha * uMotion) * (1 - uFreq)).toFixed(3)
      }
      if (ring2El.value) {
        const ringBreathe2 = 1 + Math.cos(nowSec * 1.45) * 0.024
        const s1Alpha = Math.min(0.46, 0.22 + clickRingBloom * 0.22)
        const s2Alpha = Math.min(0.46, 0.015 + autoBlink2 * 0.21 + clickRingBloom * 0.4)
        ring2El.value.setAttribute('r', (baseR * 0.64 * rExpand2 * ringBreathe2).toFixed(1))
        ring2El.value.style.opacity = (kissEase * (s1Alpha * (1 - uMotion) + s2Alpha * uMotion) * (1 - uFreq)).toFixed(3)
      }
      if (ring3El.value) {
        const ringBreathe3 = 1 + Math.sin(nowSec * 1.15 + 1) * 0.028
        const s1Alpha = Math.min(0.32, 0.13 + clickRingBloom * 0.16)
        const s2Alpha = Math.min(0.32, 0.008 + autoBlink3 * 0.13 + clickRingBloom * 0.28)
        ring3El.value.setAttribute('r', (baseR * 0.98 * rExpand3 * ringBreathe3).toFixed(1))
        ring3El.value.style.opacity = (kissEase * (s1Alpha * (1 - uMotion) + s2Alpha * uMotion) * (1 - uFreq)).toFixed(3)
      }

      if (contactWaveEl.value) {
        const waveProg = clickImpulse > 0.01 ? 1 - clickImpulse : contactProg
        if (waveProg > 0.02 && waveProg < 0.99) {
          contactWaveEl.value.setAttribute(
            'r',
            (14 + baseR * (1 - uFreq * 0.45) * 0.85 * waveProg).toFixed(1)
          )
          contactWaveEl.value.style.opacity = (
            Math.sin(Math.PI * waveProg) *
            0.45 *
            (1 - uInteract)
          ).toFixed(3)
        } else {
          contactWaveEl.value.style.opacity = '0'
        }
      }

      if (wakeStreamEl.value) {
        wakeStreamEl.value.style.opacity = '0'
      }
    }
  }

  // Stage 04 Wave-Crossing Intersection Stars + Meeting-Knot Flares
  for (let n = 0; n < INTERACTION_NODE_COUNT; n++) {
    const nodeEl = interactionNodeEls[n]
    if (!nodeEl) continue
    
    const s5FadeOut = 1 - smoothstep01((stageProg - 3.4) / 0.14)
    const settleGate = smoothstep01((uInteract - 0.78) / 0.22) * s5FadeOut

    if (settleGate <= 0.005) {
      nodeEl.style.opacity = '0'
      continue
    }

    const uNode = interactNodeU[n]!
    const edgeEnv =
      uNode <= 0.04 || uNode >= 0.96
        ? 0
        : Math.min(1, (uNode - 0.04) / 0.08) * Math.min(1, (0.96 - uNode) / 0.12)
    const branchFormed = smoothstep01((interactBranchFront - (uNode + 0.14)) / 0.16)
    const vis = settleGate * edgeEnv * branchFormed

    if (vis <= 0.005) {
      nodeEl.style.opacity = '0'
      continue
    }

    const meetEnergy = interactNodeEnergy[n]!
    const meetFlare = Math.min(
      1.35,
      meetEnergy * 0.34 + (meetEnergy > 1.05 ? (meetEnergy - 1.05) * 0.48 : 0)
    )
    const clickWave =
      clickImpulse > 0.005
        ? Math.max(0, Math.sin(Math.PI * clamp01((1 - clickImpulse) * 1.4 - uNode * 0.45))) * 0.65
        : 0
    const shimmer = 0.92 + 0.08 * Math.sin(nowSec * 2.8 + n * 1.3)

    const nodeAlpha = Math.min(1, vis * (0.46 * shimmer + meetFlare * 0.52 + clickWave))
    const nodeScale =
      (portrait ? 0.78 : 0.95) * (0.82 + meetFlare * 0.42 + clickWave * 0.38)

    nodeEl.style.transform = `translate3d(${interactNodeX[n]!.toFixed(1)}px, ${interactNodeY[n]!.toFixed(1)}px, 0) scale(${nodeScale.toFixed(3)})`
    nodeEl.style.opacity = nodeAlpha.toFixed(3)
  }

  // Stage 05 Resonance Concentric Field Arcs & Pinched Horizon Needle Flares (glide inward on 06)
  if (uResonance <= 0.005) {
    for (let r = 0; r < 3; r++) {
      const arcEl = resonanceArcEls[r]
      if (arcEl) arcEl.style.opacity = '0'
    }
    if (resonanceTipLeftEl.value) resonanceTipLeftEl.value.style.opacity = '0'
    if (resonanceTipRightEl.value) resonanceTipRightEl.value.style.opacity = '0'
  } else {
    const resGeo = getResonanceGeometry(w, svh, tel.fieldLeft, portrait)
    const s6ArcFade = 1 - smoothstep01((stageProg - 4.4) / 0.16)
    const s6ArcSqueeze = 1 - 0.18 * uAmp
    const cx5 = resGeo.xLeft + resGeo.spanX * 0.5
    const cy5 = resGeo.yMid

    for (let r = 0; r < 3; r++) {
      const arcEl = resonanceArcEls[r]
      if (!arcEl) continue
      const gateStart = 0.42 + r * 0.16
      const arcBloom = smoothstep01((resonanceLock - gateStart) / 0.24) * uResonance * s6ArcFade
      if (arcBloom <= 0.004) {
        arcEl.style.opacity = '0'
        continue
      }
      const rx = resGeo.spanX * (0.37 + r * 0.065) * (0.94 + 0.06 * arcBloom) * s6ArcSqueeze
      const ry = resGeo.peakAmp * (2.15 + r * 0.38) * (0.92 + 0.08 * arcBloom) * s6ArcSqueeze
      const pulse =
        1 +
        0.025 * Math.sin(nowSec * 1.75 - r * 0.55) +
        clickImpulse * (0.08 + r * 0.025)
      const baseAlpha = (0.46 - r * 0.12) * arcBloom * (1 + clickImpulse * 0.45)

      arcEl.style.transform = `translate3d(${cx5.toFixed(1)}px, ${cy5.toFixed(1)}px, 0) scale(${(rx * pulse).toFixed(2)}, ${(ry * pulse).toFixed(2)})`
      arcEl.style.opacity = Math.min(0.85, baseAlpha).toFixed(3)
    }

    // Horizon needle tips track the contracting endpoints cleanly into Stage 06 ports
    let tipLeftX = resGeo.xLeft
    let tipRightX = resGeo.xLeft + resGeo.spanX
    let tipY = resGeo.yMid
    if (uAmp > 0.001) {
      const ampGeo = getAmplificationGeometry(w, svh, tel.fieldLeft, portrait)
      const squeeze = smoothstep01(amplificationDrive)
      const s6Left = resGeo.xLeft + (ampGeo.xLeft - resGeo.xLeft) * (0.72 + 0.28 * squeeze)
      const s6Span = resGeo.spanX + (ampGeo.spanX - resGeo.spanX) * (0.72 + 0.28 * squeeze)
      const s6Y = resGeo.yMid + (ampGeo.yMid - resGeo.yMid) * (0.68 + 0.32 * squeeze)
      tipLeftX = tipLeftX + (s6Left - tipLeftX) * uAmp
      tipRightX = tipRightX + (s6Left + s6Span - tipRightX) * uAmp
      tipY = tipY + (s6Y - tipY) * uAmp
    }

    const s7TipSwallow = smoothstep01(clamp01(uWave * 0.45 + waveSequenceDrive / 0.26))
    const tipAlpha = Math.min(
      0.95,
      uResonance * (0.38 + 0.62 * smoothstep01(resonanceLock)) * glowBoost * (1 - s7TipSwallow)
    )
    const tipScale = (portrait ? 0.72 : 1) * (1 - uAmp * 0.12)
    if (resonanceTipLeftEl.value) {
      resonanceTipLeftEl.value.style.transform = `translate3d(${(tipLeftX + 14 * tipScale).toFixed(1)}px, ${tipY.toFixed(1)}px, 0) scale(${tipScale.toFixed(2)})`
      resonanceTipLeftEl.value.style.opacity = tipAlpha.toFixed(3)
    }
    if (resonanceTipRightEl.value) {
      resonanceTipRightEl.value.style.transform = `translate3d(${(tipRightX - 14 * tipScale).toFixed(1)}px, ${tipY.toFixed(1)}px, 0) scale(${tipScale.toFixed(2)})`
      resonanceTipRightEl.value.style.opacity = tipAlpha.toFixed(3)
    }
  }

  // Stage 06 & 07: Resonator (Upper Arch Lifts in 07), Full Brandsta Blue & Wave Aura
  if (uAmp <= 0.004) {
    if (ampUpperArchGroupEl.value) ampUpperArchGroupEl.value.removeAttribute('transform')
    if (ampUpperHaloEl.value) ampUpperHaloEl.value.style.opacity = '0'
    if (ampUpperBodyEl.value) ampUpperBodyEl.value.style.opacity = '0'
    if (ampUpperSpecEl.value) ampUpperSpecEl.value.style.opacity = '0'
    if (ampLowerHaloEl.value) ampLowerHaloEl.value.style.opacity = '0'
    if (ampLowerBodyEl.value) ampLowerBodyEl.value.style.opacity = '0'
    if (ampLowerSpecEl.value) ampLowerSpecEl.value.style.opacity = '0'
    if (ampFloorGlowEl.value) ampFloorGlowEl.value.style.opacity = '0'
    if (ampBlueAuraEl.value) ampBlueAuraEl.value.style.opacity = '0'
    if (ampRightBlueVolTopEl.value) ampRightBlueVolTopEl.value.style.opacity = '0'
    if (ampRightBlueVolBotEl.value) ampRightBlueVolBotEl.value.style.opacity = '0'
    if (waveClickAuraGlowEl.value) waveClickAuraGlowEl.value.style.opacity = '0'
    if (waveClickArcLeftEl.value) waveClickArcLeftEl.value.style.opacity = '0'
    if (waveClickArcRightEl.value) waveClickArcRightEl.value.style.opacity = '0'
    if (ampGoldRadiateEl.value) ampGoldRadiateEl.value.style.opacity = '0'
    if (ampGoldBaseEl.value) ampGoldBaseEl.value.style.opacity = '0'
    if (ampGoldFlowEl.value) ampGoldFlowEl.value.style.opacity = '0'
    if (ampGoldSpecEl.value) ampGoldSpecEl.value.style.opacity = '0'
    for (let g = 0; g < 3; g++) {
      if (waveGoldHaloEls[g]) waveGoldHaloEls[g]!.style.opacity = '0'
      if (waveGoldSpecEls[g]) waveGoldSpecEls[g]!.style.opacity = '0'
    }
    for (let g = 0; g < 6; g++) {
      if (waveGoldCoreEls[g]) waveGoldCoreEls[g]!.style.opacity = '0'
    }
  } else {
    const { cx, yMid, H, xLeftFull, xRightFull } = getWaveStageGeometry(
      w,
      svh,
      tel.fieldLeft,
      portrait,
      uWave,
      waveSequenceDrive
    )
    const shellGate = smoothstep01((uAmp - 0.16) / 0.84)
    const driveEase = smoothstep01(amplificationDrive)
    const shellDraw = smoothstep01(clamp01(shellGate * 0.34 + amplificationDrive * 0.66))
    const shellAlpha = shellGate * (0.55 + 0.45 * shellDraw)

    const s7ThickBoost = 1 + 0.64 * uWave * smoothstep01(waveSequenceDrive / 0.36)
    const wallThick =
      (0.18 + 0.82 * smoothstep01(clamp01(shellGate * 0.22 + driveEase * 0.78))) * s7ThickBoost
    const effH = H * (1.05 - 0.05 * driveEase)
    const pScale = portrait ? 0.82 : 1
    const s7WaveScale = 1 - (portrait ? 0.22 : 0.12) * uWave
    const s7ClickAura = uWave * smoothstep01(clickImpulse)

    // Stage 06 & 07 Upper-Arch-Only Height Lift (+14% taller crown on both stages, 0px basement shift)
    if (ampUpperArchGroupEl.value) {
      if (shellGate <= 0.002) {
        ampUpperArchGroupEl.value.removeAttribute('transform')
      } else {
        const upperLift = 1 + 0.14 * smoothstep01(clamp01(shellGate * 0.4 + driveEase * 0.6))
        const portLipY = yMid - effH * 0.048
        const ty = portLipY * (1 - upperLift)
        ampUpperArchGroupEl.value.setAttribute(
          'transform',
          `translate(0 ${ty.toFixed(2)}) scale(1 ${upperLift.toFixed(4)})`
        )
      }
    }

    const outerHalf = 0.0235 * wallThick
    const bodyHalf = 0.0155 * wallThick
    const specHalf = 0.007 * wallThick

    if (ampUpperHaloEl.value) {
      ampUpperHaloEl.value.setAttribute(
        'd',
        buildResonatorShellPath(cx, yMid, effH, outerHalf, -outerHalf, true, shellDraw)
      )
      ampUpperHaloEl.value.style.opacity = (shellAlpha * 0.92).toFixed(3)
    }
    if (ampLowerHaloEl.value) {
      ampLowerHaloEl.value.setAttribute(
        'd',
        buildResonatorShellPath(cx, yMid, effH, outerHalf, -outerHalf, false, shellDraw)
      )
      ampLowerHaloEl.value.style.opacity = (shellAlpha * 0.92).toFixed(3)
    }
    if (ampUpperBodyEl.value) {
      ampUpperBodyEl.value.setAttribute(
        'd',
        buildResonatorShellPath(cx, yMid, effH, bodyHalf, -bodyHalf, true, shellDraw)
      )
      ampUpperBodyEl.value.style.opacity = (shellAlpha * 0.96).toFixed(3)
    }
    if (ampLowerBodyEl.value) {
      ampLowerBodyEl.value.setAttribute(
        'd',
        buildResonatorShellPath(cx, yMid, effH, bodyHalf, -bodyHalf, false, shellDraw)
      )
      ampLowerBodyEl.value.style.opacity = (shellAlpha * 0.96).toFixed(3)
    }
    if (ampUpperSpecEl.value) {
      ampUpperSpecEl.value.setAttribute(
        'd',
        buildResonatorShellPath(cx, yMid, effH, specHalf, -specHalf, true, shellDraw)
      )
      ampUpperSpecEl.value.style.opacity = (shellAlpha * 0.88).toFixed(3)
    }
    if (ampLowerSpecEl.value) {
      ampLowerSpecEl.value.setAttribute(
        'd',
        buildResonatorShellPath(cx, yMid, effH, specHalf, -specHalf, false, shellDraw)
      )
      ampLowerSpecEl.value.style.opacity = (shellAlpha * 0.88).toFixed(3)
    }

    if (ampFloorGlowEl.value) {
      const floorY = yMid + effH * 0.325
      const floorScale = (effH / 320) * (1 + 0.06 * Math.sin(nowSec * 2.1) + clickImpulse * 0.25)
      ampFloorGlowEl.value.style.transform = `translate3d(${cx.toFixed(1)}px, ${floorY.toFixed(1)}px, 0) scale(${floorScale.toFixed(3)})`
      ampFloorGlowEl.value.style.opacity = (
        shellAlpha *
        driveEase *
        (0.68 + clickImpulse * 0.25)
      ).toFixed(3)
    }

    // Sovereign Stage 07 Click Wave Aura (field bloom + gliding left/right wavefront crescents)
    if (s7ClickAura <= 0.005) {
      if (waveClickAuraGlowEl.value) waveClickAuraGlowEl.value.style.opacity = '0'
      if (waveClickArcLeftEl.value) waveClickArcLeftEl.value.style.opacity = '0'
      if (waveClickArcRightEl.value) waveClickArcRightEl.value.style.opacity = '0'
    } else {
      const travelRaw = 1 - clamp01(clickImpulse)
      const travelEase = 1 - Math.pow(1 - travelRaw, 2.1)
      const arcFade = Math.sin(clamp01(clickImpulse) * Math.PI * 0.5) * uWave

      if (waveClickAuraGlowEl.value) {
        const auraScale = (effH / 240) * (0.92 + 0.32 * travelEase)
        waveClickAuraGlowEl.value.style.transform = `translate3d(${cx.toFixed(1)}px, ${(yMid - effH * 0.06).toFixed(1)}px, 0) scale(${auraScale.toFixed(3)})`
        waveClickAuraGlowEl.value.style.opacity = (s7ClickAura * 0.78).toFixed(3)
      }

      const xPortL = cx - H * 0.505
      const xPortR = cx + H * 0.505
      const leftSpan = Math.max(24, xPortL - xLeftFull)
      const rightSpan = Math.max(24, xRightFull - xPortR)

      if (waveClickArcLeftEl.value) {
        waveClickArcLeftEl.value.setAttribute(
          'd',
          buildWaveAuraCrescentPath(
            xPortL,
            yMid,
            -1,
            leftSpan * (0.08 + 0.78 * travelEase),
            H * (0.18 + 0.38 * travelEase),
            (3.2 + 2.4 * s7ClickAura) * pScale
          )
        )
        waveClickArcLeftEl.value.style.opacity = (arcFade * 0.72).toFixed(3)
      }
      if (waveClickArcRightEl.value) {
        waveClickArcRightEl.value.setAttribute(
          'd',
          buildWaveAuraCrescentPath(
            xPortR,
            yMid,
            1,
            rightSpan * (0.08 + 0.78 * travelEase),
            H * (0.22 + 0.44 * travelEase),
            (4.0 + 3.0 * s7ClickAura) * pScale
          )
        )
        waveClickArcRightEl.value.style.opacity = (arcFade * 0.82).toFixed(3)
      }
    }

    // Deep Brandsta royal-blue under-body (gradual 05 -> 06 color deepening, sleeker in 06, full in 07)
    if (ampBlueAuraEl.value) {
      populateSpineAndNormals(
        0,
        clickImpulse,
        nowSec,
        1,
        w,
        svh,
        tel.fieldLeft,
        portrait,
        uFreq,
        0,
        uInteract,
        uResonance,
        uAmp,
        uWave
      )
      const auraHalfW =
        (3.3 * (1 - uWave) + 4.45 * s7WaveScale * uWave) * pScale * (1 + s7ClickAura * 0.38)
      ampBlueAuraEl.value.setAttribute(
        'd',
        buildTaperedRibbonFromSpine(
          auraHalfW,
          uMotion,
          uFreq,
          uInteract,
          uResonance,
          uAmp,
          uWave,
          portrait
        )
      )
      const s6GradualOp = 0.16 + 0.52 * driveEase
      const s7FullOp = 0.96
      ampBlueAuraEl.value.style.opacity = Math.min(
        0.96,
        uAmp * (s6GradualOp + (s7FullOp - s6GradualOp) * uWave) + s7ClickAura * 0.14
      ).toFixed(3)
    }

    const s7BlueVolAlpha =
      uWave * smoothstep01((waveSequenceDrive - 0.18) / 0.62) * Math.min(0.95, 0.84 + s7ClickAura * 0.16)
    if (s7BlueVolAlpha <= 0.005) {
      if (ampRightBlueVolTopEl.value) ampRightBlueVolTopEl.value.style.opacity = '0'
      if (ampRightBlueVolBotEl.value) ampRightBlueVolBotEl.value.style.opacity = '0'
    } else {
      const volW = s7WaveScale * pScale * (1 + s7ClickAura * 0.32)
      if (ampRightBlueVolTopEl.value) {
        populateSpineAndNormals(
          7,
          clickImpulse,
          nowSec,
          1,
          w,
          svh,
          tel.fieldLeft,
          portrait,
          uFreq,
          0,
          uInteract,
          uResonance,
          uAmp,
          uWave
        )
        ampRightBlueVolTopEl.value.setAttribute(
          'd',
          buildTaperedRibbonFromSpine(
            4.1 * volW,
            uMotion,
            uFreq,
            uInteract,
            uResonance,
            uAmp,
            uWave,
            portrait
          )
        )
        ampRightBlueVolTopEl.value.style.opacity = s7BlueVolAlpha.toFixed(3)
      }
      if (ampRightBlueVolBotEl.value) {
        populateSpineAndNormals(
          8,
          clickImpulse,
          nowSec,
          1,
          w,
          svh,
          tel.fieldLeft,
          portrait,
          uFreq,
          0,
          uInteract,
          uResonance,
          uAmp,
          uWave
        )
        ampRightBlueVolBotEl.value.setAttribute(
          'd',
          buildTaperedRibbonFromSpine(
            3.75 * volW,
            uMotion,
            uFreq,
            uInteract,
            uResonance,
            uAmp,
            uWave,
            portrait
          )
        )
        ampRightBlueVolBotEl.value.style.opacity = s7BlueVolAlpha.toFixed(3)
      }
    }

    // Top-Edge 24k Molten Gold (Stage 06 peak -> reactive flare -> slides right into port without pause)
    const goldGate = smoothstep01((uAmp - 0.82) / 0.18)
    const goldDrainIntoPort = 1 - uWave * smoothstep01((waveSequenceDrive - 0.32) / 0.24)
    const goldPressure =
      smoothstep01((amplificationDrive - 0.36) / 0.64) * goldGate * goldDrainIntoPort
    const reactiveBoost =
      uWave *
      smoothstep01(waveSequenceDrive / 0.22) *
      (1 - smoothstep01((waveSequenceDrive - 0.42) / 0.18))

    if (goldPressure <= 0.005) {
      if (ampGoldRadiateEl.value) ampGoldRadiateEl.value.style.opacity = '0'
      if (ampGoldBaseEl.value) ampGoldBaseEl.value.style.opacity = '0'
      if (ampGoldFlowEl.value) ampGoldFlowEl.value.style.opacity = '0'
      if (ampGoldSpecEl.value) ampGoldSpecEl.value.style.opacity = '0'
    } else {
      populateStage6PeakExteriorNormals(
        w,
        svh,
        tel.fieldLeft,
        portrait,
        nowSec,
        amplificationDrive,
        clickImpulse * (1 - uWave),
        uResonance,
        uAmp,
        uWave,
        waveSequenceDrive
      )

      const goldPScale = pScale * ((portrait ? 0.76 : 0.84) * (1 - uWave) + uWave)
      const edgeSlim = 1 - uWave * (portrait ? 0.22 : 0.08)
      const goldClickBoost = clickImpulse * (1 - uWave) + s7ClickAura * 0.6
      if (ampGoldRadiateEl.value) {
        if (reactiveBoost <= 0.01) {
          ampGoldRadiateEl.value.style.opacity = '0'
        } else {
          ampGoldRadiateEl.value.setAttribute(
            'd',
            buildStage6MoltenLayerPath(
              goldPressure,
              nowSec,
              goldPScale,
              goldClickBoost,
              3,
              reactiveBoost,
              edgeSlim
            )
          )
          ampGoldRadiateEl.value.style.opacity = Math.min(
            0.82,
            goldPressure * reactiveBoost * 0.88
          ).toFixed(3)
        }
      }
      if (ampGoldBaseEl.value) {
        ampGoldBaseEl.value.setAttribute(
          'd',
          buildStage6MoltenLayerPath(
            goldPressure,
            nowSec,
            goldPScale,
            goldClickBoost,
            0,
            reactiveBoost,
            edgeSlim
          )
        )
        ampGoldBaseEl.value.style.opacity = Math.min(
          0.96,
          goldPressure * (0.86 + goldClickBoost * 0.14)
        ).toFixed(3)
      }
      if (ampGoldFlowEl.value) {
        ampGoldFlowEl.value.setAttribute(
          'd',
          buildStage6MoltenLayerPath(
            goldPressure,
            nowSec,
            goldPScale,
            goldClickBoost,
            1,
            reactiveBoost,
            edgeSlim
          )
        )
        ampGoldFlowEl.value.style.opacity = Math.min(
          1,
          goldPressure * (0.92 + goldClickBoost * 0.12)
        ).toFixed(3)
      }
      if (ampGoldSpecEl.value) {
        ampGoldSpecEl.value.setAttribute(
          'd',
          buildStage6MoltenLayerPath(
            goldPressure,
            nowSec,
            goldPScale,
            goldClickBoost,
            2,
            reactiveBoost,
            edgeSlim
          )
        )
        ampGoldSpecEl.value.style.opacity = Math.min(
          1,
          goldPressure * (0.88 + goldClickBoost * 0.15)
        ).toFixed(3)
      }
    }

    // Stage 07 Right-Side Radiant 24k Gold Wave Plume (zero pause, aura-driven on click)
    const goldOutProg = uWave * smoothstep01((waveSequenceDrive - 0.18) / 0.72)
    if (goldOutProg <= 0.005) {
      for (let g = 0; g < 3; g++) {
        if (waveGoldHaloEls[g]) waveGoldHaloEls[g]!.style.opacity = '0'
        if (waveGoldSpecEls[g]) waveGoldSpecEls[g]!.style.opacity = '0'
      }
      for (let g = 0; g < 6; g++) {
        if (waveGoldCoreEls[g]) waveGoldCoreEls[g]!.style.opacity = '0'
      }
    } else {
      const xPortR = cx + H * 0.505
      const rightOutLen = Math.max(0, xRightFull - xPortR)
      const heroMap = [1, 0, 4] as const
      const goldScale = pScale * s7WaveScale

      for (let h = 0; h < 3; h++) {
        const rIdx = heroMap[h]!
        const haloEl = waveGoldHaloEls[h]
        if (haloEl) {
          haloEl.setAttribute(
            'd',
            buildRightGoldWavePath(
              rIdx,
              xPortR,
              rightOutLen,
              yMid,
              H,
              goldScale,
              nowSec,
              goldOutProg,
              s7ClickAura,
              'halo'
            )
          )
          haloEl.style.opacity = Math.min(
            0.72,
            goldOutProg * (0.38 + s7ClickAura * 0.34)
          ).toFixed(3)
        }
        const specEl = waveGoldSpecEls[h]
        if (specEl) {
          specEl.setAttribute(
            'd',
            buildRightGoldWavePath(
              rIdx,
              xPortR,
              rightOutLen,
              yMid,
              H,
              goldScale,
              nowSec,
              goldOutProg,
              s7ClickAura,
              'spec'
            )
          )
          specEl.style.opacity = Math.min(
            0.86,
            goldOutProg * (0.64 + s7ClickAura * 0.24)
          ).toFixed(3)
        }
      }

      for (let g = 0; g < 6; g++) {
        const coreEl = waveGoldCoreEls[g]
        if (!coreEl) continue
        coreEl.setAttribute(
          'd',
          buildRightGoldWavePath(
            g,
            xPortR,
            rightOutLen,
            yMid,
            H,
            goldScale,
            nowSec,
            goldOutProg,
            s7ClickAura,
            'core'
          )
        )
        const tierAlpha = g === 1 || g === 4 ? 0.98 : g === 0 ? 0.9 : 0.78
        coreEl.style.opacity = Math.min(
          1,
          goldOutProg * (tierAlpha + s7ClickAura * 0.15)
        ).toFixed(3)
      }
    }
  }

  // Beat 7: Scattered Star-Like Blinking Particles (4540ms -> 4980ms)
  for (let j = 0; j < AMBIENT_SPARKS.length; j++) {
    const sp = AMBIENT_SPARKS[j]!
    const el = ambientSparkEls[j]
    if (!el) continue

    const introAlpha = getParticleIntroProgress(j, elapsedMs)
    if (introAlpha <= 0.005) {
      el.style.opacity = '0'
      continue
    }

    const coord = portrait ? sp.portrait : sp.landscape
    const sx = coord[0] * w + (spoutX - coord[0] * w) * heroProg * 0.16
    const sy = coord[1] * svh - heroProg * 28
    el.setAttribute('cx', sx.toFixed(1))
    el.setAttribute('cy', sy.toFixed(1))

    // Crisp starlight blink curve (dips low then glints brightly like real distant stars)
    const rawWave = 0.5 + 0.5 * Math.sin(nowSec * sp.twinkleFreq + sp.twinklePhase)
    const starBlink = sp.baseOpacity * (0.14 + 0.86 * Math.pow(rawWave, 1.85))

    const calmTextZone = j >= 14 ? 1 - heroProg * 0.78 : 1 - heroProg * 0.35
    el.style.opacity = Math.max(0, Math.min(1, starBlink * glowBoost * calmTextZone * introAlpha)).toFixed(2)
  }
}

onMounted(() => {
  mountPerfMs = performance.now()
  unsubscribeTick = onScrollTick(renderFrame)
})

onUnmounted(() => {
  if (unsubscribeTick) {
    unsubscribeTick()
    unsubscribeTick = null
  }
})
</script>

<template>
  <div
    ref="engineStageEl"
    aria-hidden="true"
    class="engine-stage pointer-events-none fixed inset-x-0 top-0 z-0 h-lvh w-full overflow-hidden bg-brand-void select-none"
  >
    <!-- Beat 1 (0ms -> 680ms): Deep Dark-Blue Gradient Fading Smoothly Into Pure Black -->
    <div
      class="atmosphere-gradient-layer absolute inset-0"
      :style="{
        '--grad-delay': `${HERO_CHOREOGRAPHY.gradientDelayMs}ms`,
        '--grad-dur': `${HERO_CHOREOGRAPHY.gradientDurationMs}ms`,
      }"
    />

    <svg
      :viewBox="`0 0 ${svgW} ${svgH}`"
      class="relative z-10 block h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="stageVisualClip">
          <rect ref="clipRectEl" x="0" y="0" :width="svgW" :height="svgH" />
        </clipPath>

        <linearGradient id="wingLeftDown" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="var(--color-brand-deep)" stop-opacity="0.25" />
          <stop offset="22%" stop-color="var(--color-brand-blue)" stop-opacity="0.82" />
          <stop offset="72%" stop-color="var(--color-brand-electric)" stop-opacity="0.96" />
          <stop offset="100%" stop-color="var(--color-brand-ice)" stop-opacity="0.7" />
        </linearGradient>

        <linearGradient id="wingLeftCradle" x1="0%" y1="15%" x2="100%" y2="85%">
          <stop offset="0%" stop-color="var(--color-brand-deep)" stop-opacity="0.2" />
          <stop offset="18%" stop-color="var(--color-brand-blue)" stop-opacity="0.78" />
          <stop offset="58%" stop-color="var(--color-brand-electric)" stop-opacity="0.96" />
          <stop offset="88%" stop-color="var(--color-brand-ice)" stop-opacity="0.82" />
          <stop offset="100%" stop-color="var(--color-brand-frost)" stop-opacity="0.45" />
        </linearGradient>

        <linearGradient id="wingRightDown" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="var(--color-brand-deep)" stop-opacity="0.25" />
          <stop offset="22%" stop-color="var(--color-brand-blue)" stop-opacity="0.82" />
          <stop offset="72%" stop-color="var(--color-brand-electric)" stop-opacity="0.96" />
          <stop offset="100%" stop-color="var(--color-brand-ice)" stop-opacity="0.7" />
        </linearGradient>

        <linearGradient id="wingRightCradle" x1="100%" y1="15%" x2="0%" y2="85%">
          <stop offset="0%" stop-color="var(--color-brand-deep)" stop-opacity="0.2" />
          <stop offset="18%" stop-color="var(--color-brand-blue)" stop-opacity="0.78" />
          <stop offset="58%" stop-color="var(--color-brand-electric)" stop-opacity="0.96" />
          <stop offset="88%" stop-color="var(--color-brand-ice)" stop-opacity="0.82" />
          <stop offset="100%" stop-color="var(--color-brand-frost)" stop-opacity="0.45" />
        </linearGradient>

        <linearGradient id="wakeStreamGrad" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stop-color="var(--color-brand-blue)" stop-opacity="0" />
          <stop offset="45%" stop-color="var(--color-brand-electric)" stop-opacity="0.65" />
          <stop offset="100%" stop-color="var(--color-brand-frost)" stop-opacity="0.98" />
        </linearGradient>

        <radialGradient id="knotOuterBloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--color-brand-electric)" stop-opacity="0.52" />
          <stop offset="34%" stop-color="var(--color-brand-blue)" stop-opacity="0.2" />
          <stop offset="72%" stop-color="var(--color-brand-deep)" stop-opacity="0.04" />
          <stop offset="100%" stop-color="var(--color-brand-obsidian)" stop-opacity="0" />
        </radialGradient>

        <radialGradient id="knotInnerCorona" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
          <stop offset="28%" stop-color="var(--color-brand-frost)" stop-opacity="0.94" />
          <stop offset="64%" stop-color="var(--color-brand-electric)" stop-opacity="0.48" />
          <stop offset="100%" stop-color="var(--color-brand-blue)" stop-opacity="0" />
        </radialGradient>

        <radialGradient id="pulseFieldAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--color-brand-electric)" stop-opacity="0.44" />
          <stop offset="28%" stop-color="var(--color-brand-blue)" stop-opacity="0.18" />
          <stop offset="64%" stop-color="var(--color-brand-deep)" stop-opacity="0.05" />
          <stop offset="100%" stop-color="var(--color-brand-obsidian)" stop-opacity="0" />
        </radialGradient>

        <radialGradient id="pulseSparkCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
          <stop offset="22%" stop-color="var(--color-brand-frost)" stop-opacity="0.96" />
          <stop offset="52%" stop-color="var(--color-brand-electric)" stop-opacity="0.62" />
          <stop offset="100%" stop-color="var(--color-brand-blue)" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Layer 1: Scattered Blinking Star Particles (Hidden at Load Until Beat 7) -->
      <g>
        <circle
          v-for="(sp, sIdx) in AMBIENT_SPARKS"
          :key="sp.id"
          :ref="(el) => setAmbientSparkRef(el, sIdx)"
          :cx="(sp.landscape[0] * svgW).toFixed(1)"
          :cy="(sp.landscape[1] * svgH).toFixed(1)"
          :r="sp.radius"
          class="fill-brand-frost"
          style="opacity: 0"
        />
      </g>

      <!-- Layer 2 & 3: Staggered Left/Right Neural Strands (Hidden at Load Until Beat 2) -->
      <g ref="worldGroupEl">
        <g>
          <template v-for="(strand, idx) in NEURAL_STRANDS" :key="strand.id">
            <path
              :ref="(el) => setSheathRef(el, idx)"
              d="M 0 0 Z"
              class="crossing-blend fill-brand-blue"
              style="opacity: 0"
            />

            <path
              :ref="(el) => setCoreRef(el, idx)"
              d="M 0 0 Z"
              :fill="`url(#${strand.gradientId})`"
              class="crossing-blend"
              style="opacity: 0"
            />

            <path
              :ref="(el) => setSpindleRef(el, idx)"
              d="M 0 0 Z"
              class="crossing-blend fill-brand-ice"
              style="opacity: 0"
            />
          </template>
        </g>

        <g>
          <template v-for="(strand, idx) in NEURAL_STRANDS" :key="`knots-${strand.id}`">
            <g
              v-if="strand.hasTerminalGlow"
              :ref="(el) => setTipGlowRef(el, idx)"
              class="crossing-blend will-change-transform"
              style="opacity: 0"
            >
              <circle cx="0" cy="0" r="17" fill="url(#knotOuterBloom)" />
              <circle cx="0" cy="0" r="5.2" fill="url(#knotInnerCorona)" />
              <circle cx="0" cy="0" r="1.35" class="fill-white" />
            </g>

            <g
              :ref="(el) => setPrimarySpotRef(el, idx)"
              class="crossing-blend will-change-transform"
              style="opacity: 0"
            >
              <circle cx="0" cy="0" :r="strand.spotRadius * 9.5" fill="url(#knotOuterBloom)" />
              <circle cx="0" cy="0" :r="strand.spotRadius * 3.1" fill="url(#knotInnerCorona)" />
              <circle cx="0" cy="0" :r="strand.spotRadius * 0.72" class="fill-white" />
            </g>

            <g
              v-if="strand.hasSecondarySpot"
              :ref="(el) => setSecondarySpotRef(el, idx)"
              class="crossing-blend will-change-transform"
              style="opacity: 0"
            >
              <circle cx="0" cy="0" :r="strand.spotRadius * 7.6" fill="url(#knotOuterBloom)" />
              <circle cx="0" cy="0" :r="strand.spotRadius * 2.5" fill="url(#knotInnerCorona)" />
              <circle cx="0" cy="0" :r="strand.spotRadius * 0.62" class="fill-white" />
            </g>
          </template>
        </g>

        <path
          ref="wakeStreamEl"
          d="M 0 0"
          fill="none"
          stroke="url(#wakeStreamGrad)"
          stroke-width="1.8"
          stroke-linecap="round"
          class="crossing-blend"
          style="opacity: 0"
        />
      </g>

      <!-- Stage 06 & 07 Sculpted Resonator, Deep Brandsta Blue, Migrating 24k Gold & Sovereign Wave Aura -->
      <g class="amplification-stage-layer">
        <defs>
          <linearGradient id="brandstaAmpShellHaloGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stop-color="#96a5b9" stop-opacity="1" />
            <stop offset="50%" stop-color="#8b9ab0" stop-opacity="1" />
            <stop offset="100%" stop-color="#9aa9bd" stop-opacity="1" />
          </linearGradient>
          <linearGradient id="brandstaAmpShellBodyGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stop-color="#c0cddc" />
            <stop offset="50%" stop-color="#b5c2d3" />
            <stop offset="100%" stop-color="#c4d0df" />
          </linearGradient>
          <linearGradient id="brandstaAmpShellSpecGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stop-color="#d7e1ee" stop-opacity="0.95" />
            <stop offset="50%" stop-color="#ced9e7" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#dae4f0" stop-opacity="0.95" />
          </linearGradient>
          <radialGradient id="brandstaAmpFloorBounceGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#dbeafe" stop-opacity="0.55" />
            <stop offset="42%" stop-color="#2563eb" stop-opacity="0.38" />
            <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="brandstaWaveFieldAuraGrad" cx="54%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#388bff" stop-opacity="0.46" />
            <stop offset="45%" stop-color="#0d5eff" stop-opacity="0.26" />
            <stop offset="76%" stop-color="#f59e0b" stop-opacity="0.12" />
            <stop offset="100%" stop-color="#002699" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="brandstaWaveArcBlueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0d5eff" stop-opacity="0" />
            <stop offset="50%" stop-color="#60a5fa" stop-opacity="0.88" />
            <stop offset="100%" stop-color="#0d5eff" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="brandstaWaveArcGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#2563eb" stop-opacity="0" />
            <stop offset="36%" stop-color="#f59e0b" stop-opacity="0.92" />
            <stop offset="64%" stop-color="#60a5fa" stop-opacity="0.85" />
            <stop offset="100%" stop-color="#d97706" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="brandstaAmpRichBlueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#0033cc" stop-opacity="0.42" />
            <stop offset="20%" stop-color="#0047eb" stop-opacity="0.9" />
            <stop offset="50%" stop-color="#0d5eff" stop-opacity="0.97" />
            <stop offset="85%" stop-color="#1464ff" stop-opacity="0.95" />
            <stop offset="100%" stop-color="#0044e0" stop-opacity="0.72" />
          </linearGradient>
          <linearGradient id="brandstaAmpMoltenRadiateGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#ff7b00" stop-opacity="0.55" />
            <stop offset="55%" stop-color="#ffb703" stop-opacity="0.38" />
            <stop offset="100%" stop-color="#ffe57f" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="brandstaAmpMoltenBaseGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#9a3e00" stop-opacity="0.78" />
            <stop offset="48%" stop-color="#d97706" stop-opacity="0.95" />
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="1" />
          </linearGradient>
          <linearGradient id="brandstaAmpMoltenFlowGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#c25e00" stop-opacity="0.72" />
            <stop offset="52%" stop-color="#f59e0b" stop-opacity="0.98" />
            <stop offset="100%" stop-color="#fbbf24" stop-opacity="1" />
          </linearGradient>
          <linearGradient id="brandstaAmpMoltenSpecGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#e08b0b" stop-opacity="0.6" />
            <stop offset="55%" stop-color="#fcd34d" stop-opacity="0.94" />
            <stop offset="100%" stop-color="#fef08a" stop-opacity="0.98" />
          </linearGradient>
          <linearGradient id="brandstaWaveGoldHaloGrad" x1="0%" y1="50%" x2="100%" y2="40%">
            <stop offset="0%" stop-color="#b45309" stop-opacity="0.18" />
            <stop offset="24%" stop-color="#d97706" stop-opacity="0.62" />
            <stop offset="68%" stop-color="#f59e0b" stop-opacity="0.52" />
            <stop offset="100%" stop-color="#b45309" stop-opacity="0.14" />
          </linearGradient>
          <linearGradient id="brandstaWaveGoldCoreGrad" x1="0%" y1="50%" x2="100%" y2="40%">
            <stop offset="0%" stop-color="#9a3e00" stop-opacity="0.82" />
            <stop offset="20%" stop-color="#d97706" stop-opacity="0.98" />
            <stop offset="56%" stop-color="#f59e0b" stop-opacity="1" />
            <stop offset="86%" stop-color="#fbbf24" stop-opacity="0.95" />
            <stop offset="100%" stop-color="#d97706" stop-opacity="0.65" />
          </linearGradient>
          <linearGradient id="brandstaWaveGoldSpecGrad" x1="0%" y1="50%" x2="100%" y2="40%">
            <stop offset="0%" stop-color="#e08b0b" stop-opacity="0.45" />
            <stop offset="30%" stop-color="#fbbf24" stop-opacity="0.92" />
            <stop offset="72%" stop-color="#fde08d" stop-opacity="0.96" />
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.65" />
          </linearGradient>
        </defs>

        <!-- Deep Brandsta Blue Wave Volume -->
        <path ref="ampBlueAuraEl" fill="url(#brandstaAmpRichBlueGrad)" style="opacity: 0" />
        <path ref="ampRightBlueVolTopEl" fill="url(#brandstaAmpRichBlueGrad)" style="opacity: 0" />
        <path ref="ampRightBlueVolBotEl" fill="url(#brandstaAmpRichBlueGrad)" style="opacity: 0" />

        <!-- Resonator Floor Reflection, Sovereign Click Wave Aura & Right-Side Radiant Gold Halo -->
        <g style="mix-blend-mode: plus-lighter">
          <g ref="waveClickAuraGlowEl" style="opacity: 0; will-change: transform, opacity">
            <ellipse cx="0" cy="0" rx="185" ry="135" fill="url(#brandstaWaveFieldAuraGrad)" />
          </g>
          <path ref="waveClickArcLeftEl" fill="url(#brandstaWaveArcBlueGrad)" style="opacity: 0" />
          <path ref="waveClickArcRightEl" fill="url(#brandstaWaveArcGoldGrad)" style="opacity: 0" />
          <g ref="ampFloorGlowEl" style="opacity: 0; will-change: transform, opacity">
            <ellipse cx="0" cy="0" rx="68" ry="16" fill="url(#brandstaAmpFloorBounceGrad)" />
          </g>
          <path ref="ampGoldRadiateEl" fill="url(#brandstaAmpMoltenRadiateGrad)" style="opacity: 0" />
          <path
            v-for="hIdx in WAVE_GOLD_HERO_INDICES"
            :key="`wghalo-${hIdx}`"
            :ref="(el) => setWaveGoldHaloRef(el, hIdx)"
            fill="url(#brandstaWaveGoldHaloGrad)"
            style="opacity: 0"
          />
        </g>

        <!-- Solid Machined Metallic-Gray Resonator Shell (Upper Arch Lifts in Stage 07 Only) -->
        <g ref="ampUpperArchGroupEl">
          <path ref="ampUpperHaloEl" fill="url(#brandstaAmpShellHaloGrad)" style="opacity: 0" />
          <path ref="ampUpperBodyEl" fill="url(#brandstaAmpShellBodyGrad)" style="opacity: 0" />
          <path ref="ampUpperSpecEl" fill="url(#brandstaAmpShellSpecGrad)" style="opacity: 0" />
        </g>
        <path ref="ampLowerHaloEl" fill="url(#brandstaAmpShellHaloGrad)" style="opacity: 0" />
        <path ref="ampLowerBodyEl" fill="url(#brandstaAmpShellBodyGrad)" style="opacity: 0" />
        <path ref="ampLowerSpecEl" fill="url(#brandstaAmpShellSpecGrad)" style="opacity: 0" />

        <!-- Stage 06/07 Top-Edge Molten Gold & Stage 07 Right-Side Propagating 24k Gold Ribbons -->
        <path ref="ampGoldBaseEl" fill="url(#brandstaAmpMoltenBaseGrad)" style="opacity: 0" />
        <path ref="ampGoldFlowEl" fill="url(#brandstaAmpMoltenFlowGrad)" style="opacity: 0" />
        <path ref="ampGoldSpecEl" fill="url(#brandstaAmpMoltenSpecGrad)" style="opacity: 0" />

        <path
          v-for="gIdx in WAVE_GOLD_INDICES"
          :key="`wgcore-${gIdx}`"
          :ref="(el) => setWaveGoldCoreRef(el, gIdx)"
          fill="url(#brandstaWaveGoldCoreGrad)"
          style="opacity: 0"
        />
        <path
          v-for="sIdx in WAVE_GOLD_HERO_INDICES"
          :key="`wgspec-${sIdx}`"
          :ref="(el) => setWaveGoldSpecRef(el, sIdx)"
          fill="url(#brandstaWaveGoldSpecGrad)"
          style="opacity: 0"
        />
      </g>

      <!-- Stage 05 Resonance Concentric Field Arcs & Horizon Pinched Tips -->
      <g class="resonance-field-layer" style="mix-blend-mode: plus-lighter">
        <defs>
          <linearGradient id="brandstaResonanceArcStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#1e6bff" stop-opacity="0" />
            <stop offset="15%" stop-color="#1e6bff" stop-opacity="0" />
            <stop offset="35%" stop-color="#3b9eff" stop-opacity="0.72" />
            <stop offset="50%" stop-color="#8cd6ff" stop-opacity="1" />
            <stop offset="65%" stop-color="#3b9eff" stop-opacity="0.72" />
            <stop offset="85%" stop-color="#1e6bff" stop-opacity="0" />
            <stop offset="100%" stop-color="#1e6bff" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="brandstaResonanceTipGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.92" />
            <stop offset="32%" stop-color="#5cc8ff" stop-opacity="0.58" />
            <stop offset="72%" stop-color="#1e6bff" stop-opacity="0.18" />
            <stop offset="100%" stop-color="#1e6bff" stop-opacity="0" />
          </radialGradient>
        </defs>

        <g
          v-for="rIdx in RESONANCE_ARC_INDICES"
          :key="`rarc-${rIdx}`"
          :ref="(el) => setResonanceArcRef(el, rIdx)"
          style="opacity: 0; will-change: transform, opacity"
        >
          <ellipse
            cx="0"
            cy="0"
            rx="1"
            ry="1"
            fill="none"
            stroke="url(#brandstaResonanceArcStroke)"
            stroke-width="6"
            vector-effect="non-scaling-stroke"
            opacity="0.26"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="1"
            ry="1"
            fill="none"
            stroke="url(#brandstaResonanceArcStroke)"
            stroke-width="1.35"
            vector-effect="non-scaling-stroke"
          />
        </g>

        <g ref="resonanceTipLeftEl" style="opacity: 0; will-change: transform, opacity">
          <ellipse cx="0" cy="0" rx="34" ry="3.2" fill="url(#brandstaResonanceTipGrad)" />
          <ellipse cx="0" cy="0" rx="12" ry="1.1" fill="#e6f7ff" opacity="0.85" />
        </g>
        <g ref="resonanceTipRightEl" style="opacity: 0; will-change: transform, opacity">
          <ellipse cx="0" cy="0" rx="34" ry="3.2" fill="url(#brandstaResonanceTipGrad)" />
          <ellipse cx="0" cy="0" rx="12" ry="1.1" fill="#e6f7ff" opacity="0.85" />
        </g>
      </g>

      <!-- Stage 04 Interaction Crossing Star Glows -->
      <g class="interaction-nodes-layer" style="mix-blend-mode: plus-lighter">
        <defs>
          <radialGradient id="brandstaInteractHaloGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#5cc8ff" stop-opacity="0.52" />
            <stop offset="42%" stop-color="#1e6bff" stop-opacity="0.22" />
            <stop offset="100%" stop-color="#1e6bff" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="brandstaInteractCoreGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.98" />
            <stop offset="36%" stop-color="#bfe8ff" stop-opacity="0.72" />
            <stop offset="72%" stop-color="#1e6bff" stop-opacity="0.26" />
            <stop offset="100%" stop-color="#1e6bff" stop-opacity="0" />
          </radialGradient>
        </defs>
        <g
          v-for="nIdx in INTERACTION_NODE_INDICES"
          :key="`inode-${nIdx}`"
          :ref="(el) => setInteractionNodeRef(el, nIdx)"
          style="opacity: 0; will-change: transform, opacity"
        >
          <circle r="28" fill="url(#brandstaInteractHaloGrad)" />
          <circle r="10.5" fill="url(#brandstaInteractCoreGrad)" />
          <circle r="2.3" fill="#ffffff" />
        </g>
      </g>

      <!-- Layer 4: Newborn Pulse Core & Concentric Magnetic Resonance Rings -->
      <g
        ref="pulseGroupEl"
        class="will-change-transform"
        style="opacity: 0; transform: translate3d(1090px, 440px, 0) scale(0.22)"
      >
        <circle ref="auraCircleEl" cx="0" cy="0" r="210" fill="url(#pulseFieldAura)" />

        <circle
          ref="ring3El"
          cx="0"
          cy="0"
          r="190"
          fill="none"
          class="stroke-brand-electric"
          stroke-width="1"
          style="opacity: 0"
        />
        <circle
          ref="ring2El"
          cx="0"
          cy="0"
          r="128"
          fill="none"
          class="stroke-brand-electric"
          stroke-width="1"
          style="opacity: 0"
        />
        <circle
          ref="ring1El"
          cx="0"
          cy="0"
          r="68"
          fill="none"
          class="stroke-brand-ice"
          stroke-width="1.1"
          style="opacity: 0"
        />

        <circle
          ref="contactWaveEl"
          cx="0"
          cy="0"
          r="24"
          fill="none"
          class="stroke-brand-frost"
          stroke-width="1.35"
          style="opacity: 0"
        />

        <circle cx="0" cy="0" r="30" fill="url(#pulseSparkCore)" class="crossing-blend" />
        <circle cx="0" cy="0" r="4" class="fill-white" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.atmosphere-gradient-layer {
  opacity: 0;
  background-color: var(--color-brand-obsidian);
  background-image:
    radial-gradient(
      ellipse 56% 48% at 50% 48%,
      color-mix(in srgb, var(--color-brand-surface) 92%, transparent) 0%,
      transparent 76%
    ),
    radial-gradient(
      ellipse 44% 42% at 12% 72%,
      color-mix(in srgb, var(--color-brand-blue) 12%, transparent) 0%,
      transparent 72%
    ),
    radial-gradient(
      ellipse 44% 42% at 88% 66%,
      color-mix(in srgb, var(--color-brand-blue) 13%, transparent) 0%,
      transparent 72%
    );
  will-change: opacity;
  animation: atmosphereFadeIn var(--grad-dur, 680ms) cubic-bezier(0.22, 1, 0.36, 1) var(--grad-delay, 0ms) forwards;
}

@keyframes atmosphereFadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

/* ACTIVE OPTION: Electric cyan-ice bloom where ribbons cross */
.crossing-blend {
  mix-blend-mode: plus-lighter;
}

/* BACKWARD-COMPATIBLE OPTION: Uncomment below (and comment above) for softer classic crossings
.crossing-blend {
  mix-blend-mode: screen;
}
*/

</style>