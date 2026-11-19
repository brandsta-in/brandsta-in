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

const RIBBON_SAMPLES = 56
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
  const outerLeft = portrait ? w * 0.055 : Math.max(w * 0.425, fieldLeft + 8)
  const outerRight = portrait ? w * 0.945 : w * 0.962
  const yTop = portrait ? svh * 0.575 : svh * 0.445
  const yBot = portrait ? svh * 0.755 : svh * 0.635
  const waveAmp = portrait ? svh * 0.028 : svh * 0.033

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
  clickImpulse: number,
  nowSec: number,
  growU: number,
  uFreq = 0,
  freqOffset = 0
) {
  for (let k = 0; k <= RIBBON_SAMPLES; k++) {
    const u = (k / RIBBON_SAMPLES) * growU
    const [px, py] = sampleCatmullRomScratch(u)
    if (uFreq <= 0.0001) {
      sampleX[k] = px
      sampleY[k] = py
    } else {
      const env = Math.sin(Math.PI * (k / RIBBON_SAMPLES))
      const fx = stage3SpineX[k]! + stage3NormX[k]! * freqOffset * env
      const fy = stage3SpineY[k]! + stage3NormY[k]! * freqOffset * env
      sampleX[k] = px + (fx - px) * uFreq
      sampleY[k] = py + (fy - py) * uFreq
    }
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
    const rippleCycles = 3.5 + uFreq * 3.0
    for (let k = 1; k < RIBBON_SAMPLES; k++) {
      const u = k / RIBBON_SAMPLES
      const ripple =
        Math.sin(u * Math.PI * rippleCycles - nowSec * 14) *
        Math.sin(Math.PI * u) *
        clickImpulse *
        6.5
      sampleX[k] = sampleX[k]! + normX[k]! * ripple
      sampleY[k] = sampleY[k]! + normY[k]! * ripple
    }
  }
}

function buildTaperedRibbonFromSpine(
  peakHalfWidth: number,
  cometBlend = 0,
  freqBlend = 0
): string {
  let d = `M ${sampleX[0]!.toFixed(1)} ${sampleY[0]!.toFixed(1)}`
  for (let k = 1; k < RIBBON_SAMPLES; k++) {
    const s2Env = taperEnv[k]! + (cometTaperEnv[k]! - taperEnv[k]!) * cometBlend
    const env = s2Env + (freqTaperEnv[k]! - s2Env) * freqBlend
    const hw = peakHalfWidth * env
    const lx = sampleX[k]! + normX[k]! * hw
    const ly = sampleY[k]! + normY[k]! * hw
    d += ` L ${lx.toFixed(1)} ${ly.toFixed(1)}`
  }
  d += ` L ${sampleX[RIBBON_SAMPLES]!.toFixed(1)} ${sampleY[RIBBON_SAMPLES]!.toFixed(1)}`
  for (let k = RIBBON_SAMPLES - 1; k >= 1; k--) {
    const s2Env = taperEnv[k]! + (cometTaperEnv[k]! - taperEnv[k]!) * cometBlend
    const env = s2Env + (freqTaperEnv[k]! - s2Env) * freqBlend
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
  freqBlend = 0
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
  return s2Out + (freqOut * freqScale - s2Out) * freqBlend
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
      const snakeSpeed = portrait ? w * 0.34 : Math.max(185, tel.fieldWidth * 0.28)
      const snakeDrive = smoothstep01((stageProg - 1.49) / 0.09)
      stage3TravelPx += dtSec * snakeSpeed * (1 + clickImpulse * 0.65) * snakeDrive
    }
    updateStage3SnakeSpine(stage3TravelPx, waveSpanScale)
    const s3HeadX = stage3SpineX[RIBBON_SAMPLES]!
    const s3HeadY = stage3SpineY[RIBBON_SAMPLES]!
    activePulseX = s2HeadX + (s3HeadX - s2HeadX) * uFreq
    activePulseY = s2HeadY + (s3HeadY - s2HeadY) * uFreq
  }

  const cometWidthScale = 1 - uMotion * 0.28 - uFreq * 0.16
  const bundleSheathGain = 1 - uMotion * 0.66 - uFreq * 0.08
  const bundleCoreGain = 1 - uMotion * 0.64 - uFreq * 0.06
  const bundleSpotGain = 1 - uMotion * 0.62 - uFreq * 0.04

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
      spec.stage1Fan * 0.85 + Math.sin(nowSec * spec.driftFreq + spec.driftPhase) * 0.35
    populateSpineAndNormals(clickImpulse, nowSec, growU, uFreq, freqMicroOffset)

    const introFade = Math.min(1, growU / 0.28)
    const funnelRefine = (1 - heroProg * 0.28) * cometWidthScale
    const sheathRefine = 1 - heroProg * 0.34

    const sheathEl = sheathPathEls[i]
    if (sheathEl) {
      sheathEl.setAttribute(
        'd',
        buildTaperedRibbonFromSpine(spec.maxWidth * 3.2 * funnelRefine, uMotion, uFreq)
      )
      sheathEl.style.opacity = Math.min(
        0.65,
        spec.sheathOpacity * sheathRefine * glowBoost * introFade * bundleSheathGain
      ).toFixed(2)
    }

    const coreEl = corePathEls[i]
    if (coreEl) {
      coreEl.setAttribute(
        'd',
        buildTaperedRibbonFromSpine(spec.maxWidth * 0.55 * funnelRefine, uMotion, uFreq)
      )
      coreEl.style.opacity = Math.min(
        1,
        spec.coreOpacity * glowBoost * introFade * bundleCoreGain
      ).toFixed(2)
    }

    const activePhase = growU < 0.995 ? growU * 0.92 : p1Phase
    const p1Alpha = spotEnvelopeAlpha(activePhase, kissEase, uMotion, uFreq) * introFade * bundleSpotGain

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
            : spotEnvelopeAlpha(p2Phase, kissEase, uMotion, uFreq) *
              0.85 *
              ((growU - 0.65) / 0.35) *
              bundleSpotGain
        const [sx2, sy2] = sampleActiveSpine(p2Phase, growU)
        const convergeSpotScale = spotScale * (1 - heroProg * 0.18) * (1 - uFreq * 0.22)
        sSpotEl.style.transform = `translate3d(${sx2.toFixed(1)}px, ${sy2.toFixed(1)}px, 0) scale(${convergeSpotScale.toFixed(3)})`
        sSpotEl.style.opacity = Math.min(1, p2Alpha * glowBoost).toFixed(2)
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
      const stage3CoreShrink = 1 - uFreq * 0.56
      const coreScale = (0.22 + 0.78 * kissEase) * breathe * stage3CoreShrink * (1 + clickImpulse * 0.28)
      const headAlpha = Math.min(1, kissEase * (1 - uFreq * 0.28 + clickImpulse * uFreq * 0.22))

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
          contactWaveEl.value.style.opacity = (Math.sin(Math.PI * waveProg) * 0.45).toFixed(3)
        } else {
          contactWaveEl.value.style.opacity = '0'
        }
      }

      if (wakeStreamEl.value) {
        wakeStreamEl.value.style.opacity = '0'
      }

      // if (wakeStreamEl.value) {
      //   if (uMotion > 0.02) {
      //     let wd = ''
      //     for (let s = 0; s <= WAKE_SAMPLES; s++) {
      //       const u = s / WAKE_SAMPLES
      //       const [cx, cy] = sampleCatmullRomFrom(cometSpineX, cometSpineY, u)
      //       wd += s === 0 ? `M ${cx.toFixed(1)} ${cy.toFixed(1)}` : ` L ${cx.toFixed(1)} ${cy.toFixed(1)}`
      //     }
      //     wakeStreamEl.value.setAttribute('d', wd)
      //     wakeStreamEl.value.style.opacity = (uMotion * 0.44).toFixed(2)
      //   } else {
      //     wakeStreamEl.value.style.opacity = '0'
      //   }
      // }
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