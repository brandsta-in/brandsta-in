<!-- app/components/launch/BrandstaAmbientCanvas.vue -->
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useLenis } from '~/composables/useLenis'
import {
  AMBIENT_CURSOR_PHYSICS,
  AMBIENT_SCROLL_MODULATION,
  AMBIENT_WAVE_PALETTE,
  resolveAmbientViewportProfile,
  type AmbientViewportProfile,
} from '~/data/ambientWaveConfig'

const props = withDefaults(
  defineProps<{
    active?: boolean
  }>(),
  {
    active: true,
  },
)

interface BioluminescentCurrent {
  active: boolean
  age: number
  duration: number
  originU: number
  originV: number
  driftVelU: number
  driftVelV: number
  angle: number
  dir: 1 | -1
  isDeepReceding: boolean
  spanPx: number
  curveAmpPx: number
  spreadPx: number
  waveCycles: number
  twistCycles: number
  phase0: number
  phaseSpeed: number
  twist0: number
  twistSpeed: number
  peakAlpha: number
  zone: number
  seed: number
}

const canvasEl = ref<HTMLCanvasElement | null>(null)
const { onScroll } = useLenis()

let ctx: CanvasRenderingContext2D | null = null
let rafId: number | null = null
let resizeObserver: ResizeObserver | null = null
let logoObserver: ResizeObserver | null = null
let unsubscribeScroll: (() => void) | null = null

let cssW = 1
let cssH = 1
let dpr = 1
let profile: AmbientViewportProfile = resolveAmbientViewportProfile(1440, 900)

// Exact Resonator logo document-space anchor
let logoDocCenterX = 720
let logoDocCenterY = 440
let logoBaseRadius = 260
let hasMeasuredLogo = false

// Pre-baked radial glow, mist & pinpoint micro-particle sprites (zero per-frame allocations)
let logoAuraSprite: HTMLCanvasElement | null = null
let heroVelvetSprite: HTMLCanvasElement | null = null
let cobaltWashSprite: HTMLCanvasElement | null = null
let glacierWashSprite: HTMLCanvasElement | null = null
let currentMistSprite: HTMLCanvasElement | null = null
let causticCoreSprite: HTMLCanvasElement | null = null
let glacierSparkSprite: HTMLCanvasElement | null = null
let electricSparkSprite: HTMLCanvasElement | null = null

// Pre-allocated curve & 3D silk twist scratchpads
const SAMPLES = 52
const spineX = new Float32Array(SAMPLES)
const spineY = new Float32Array(SAMPLES)
const normX = new Float32Array(SAMPLES)
const normY = new Float32Array(SAMPLES)
const bellEnv = new Float32Array(SAMPLES)
const twistTheta = new Float32Array(SAMPLES)

// Zero-GC Ambient Blinking Micro-Particles Buffer
// 8 floats per particle: [u, v, velU, velV, blinkSpeed, blinkPhase, corePx, depthLayer]
const MAX_AMBIENT_PARTICLES = 80
const PARTICLE_STRIDE = 8
const particleBuffer = new Float32Array(MAX_AMBIENT_PARTICLES * PARTICLE_STRIDE)

const POOL_SIZE = 3
const currentPool: BioluminescentCurrent[] = Array.from({ length: POOL_SIZE }, () => ({
  active: false,
  age: 0,
  duration: 10,
  originU: 0.5,
  originV: 0.78,
  driftVelU: 0.004,
  driftVelV: -0.002,
  angle: 0,
  dir: 1,
  isDeepReceding: false,
  spanPx: 760,
  curveAmpPx: 30,
  spreadPx: 28,
  waveCycles: 0.85,
  twistCycles: 1.5,
  phase0: 0,
  phaseSpeed: 0.55,
  twist0: 0,
  twistSpeed: 0.42,
  peakAlpha: 0.6,
  zone: 0,
  seed: 1,
}))

let spawnTimerSec = 0.25
let lastZone = -1
let rngSeed = 0.754877666
let elapsedSec = 0

// Scroll & cursor telemetry
let targetScrollPx = 0
let smoothScrollPx = 0
let targetPageProgress = 0
let smoothPageProgress = 0

let hasFinePointer = false
let ptrX = -9999
let ptrY = -9999
let smoothPtrX = -9999
let smoothPtrY = -9999
let pointerEnergy = 0

let revealBlend = 0.28
let lastTimestamp = 0
let cachedBgColor = '#02050f'
let lastBgKey = -1

function nextRand(): number {
  rngSeed = (rngSeed * 9301 + 49297) % 233280
  return rngSeed / 233280
}

function randRange(min: number, max: number): number {
  return min + (max - min) * nextRand()
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / Math.max(0.0001, edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function seedAmbientParticles() {
  // Stratified golden-ratio distribution so micro-particles appear organically "here and there" without clumping
  const cols = 10
  const rows = 8
  for (let i = 0; i < MAX_AMBIENT_PARTICLES; i++) {
    const base = i * PARTICLE_STRIDE
    const col = i % cols
    const row = Math.floor(i / cols) % rows

    particleBuffer[base] = (col + 0.14 + nextRand() * 0.72) / cols
    particleBuffer[base + 1] = (row + 0.14 + nextRand() * 0.72) / rows
    particleBuffer[base + 2] = randRange(-0.0032, 0.0032)
    particleBuffer[base + 3] = randRange(-0.0028, -0.0006)
    particleBuffer[base + 4] = randRange(0.72, 1.88)
    particleBuffer[base + 5] = randRange(0, Math.PI * 2)
    particleBuffer[base + 6] = randRange(0.72, 1.52)
    particleBuffer[base + 7] = nextRand()
  }
}

function buildSprites() {
  if (typeof document === 'undefined') return

  const makeRadialSprite = (
    size: number,
    stops: ReadonlyArray<readonly [number, string]>,
  ): HTMLCanvasElement => {
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const cCtx = c.getContext('2d')
    if (cCtx) {
      const half = size * 0.5
      const g = cCtx.createRadialGradient(half, half, 0, half, half, half)
      for (const [offset, color] of stops) {
        g.addColorStop(offset, color)
      }
      cCtx.fillStyle = g
      cCtx.fillRect(0, 0, size, size)
    }
    return c
  }

  // 1. Exact Resonator Logo Radial Halo (preserved 1:1)
  logoAuraSprite = makeRadialSprite(256, [
    [0, `rgba(${AMBIENT_WAVE_PALETTE.logoCoreRgb}, 0.34)`],
    [0.28, `rgba(${AMBIENT_WAVE_PALETTE.logoMidRgb}, 0.22)`],
    [0.62, `rgba(${AMBIENT_WAVE_PALETTE.logoOuterRgb}, 0.08)`],
    [1, `rgba(${AMBIENT_WAVE_PALETTE.logoOuterRgb}, 0)`],
  ])

  // 2. Whisper-subtle deep sapphire corner depth (prevents flat navy sheet while avoiding dead black)
  heroVelvetSprite = makeRadialSprite(192, [
    [0, `rgba(${AMBIENT_WAVE_PALETTE.heroVelvetRgb}, 0.10)`],
    [0.48, `rgba(${AMBIENT_WAVE_PALETTE.heroVelvetRgb}, 0.04)`],
    [1, `rgba(${AMBIENT_WAVE_PALETTE.heroVelvetRgb}, 0)`],
  ])

  // 3. Scroll-Alternating Dark Atmospheric Washes
  cobaltWashSprite = makeRadialSprite(160, [
    [0, `rgba(${AMBIENT_WAVE_PALETTE.cobaltWashRgb}, 0.11)`],
    [0.52, `rgba(${AMBIENT_WAVE_PALETTE.cobaltWashRgb}, 0.04)`],
    [1, `rgba(${AMBIENT_WAVE_PALETTE.cobaltWashRgb}, 0)`],
  ])

  glacierWashSprite = makeRadialSprite(160, [
    [0, `rgba(${AMBIENT_WAVE_PALETTE.glacierWashRgb}, 0.09)`],
    [0.52, `rgba(${AMBIENT_WAVE_PALETTE.glacierWashRgb}, 0.035)`],
    [1, `rgba(${AMBIENT_WAVE_PALETTE.glacierWashRgb}, 0)`],
  ])

  // 4. Milder Volumetric Current Mist & Caustic Swell
  currentMistSprite = makeRadialSprite(160, [
    [0, `rgba(${AMBIENT_WAVE_PALETTE.silkElectricRgb}, 0.18)`],
    [0.42, `rgba(${AMBIENT_WAVE_PALETTE.mistDeepRgb}, 0.08)`],
    [0.78, `rgba(${AMBIENT_WAVE_PALETTE.mistDeepRgb}, 0.02)`],
    [1, `rgba(${AMBIENT_WAVE_PALETTE.mistDeepRgb}, 0)`],
  ])

  causticCoreSprite = makeRadialSprite(128, [
    [0, `rgba(${AMBIENT_WAVE_PALETTE.silkGlacierRgb}, 0.30)`],
    [0.36, `rgba(${AMBIENT_WAVE_PALETTE.silkElectricRgb}, 0.11)`],
    [0.75, `rgba(${AMBIENT_WAVE_PALETTE.mistDeepRgb}, 0.025)`],
    [1, `rgba(${AMBIENT_WAVE_PALETTE.mistDeepRgb}, 0)`],
  ])

  // 5. Crisp Sub-Pixel Micro-Particle Star Sprites (24x24: sharp pinpoint center + delicate micro-halo)
  glacierSparkSprite = makeRadialSprite(24, [
    [0, `rgba(${AMBIENT_WAVE_PALETTE.sparkFrostRgb}, 1)`],
    [0.22, `rgba(${AMBIENT_WAVE_PALETTE.sparkGlacierRgb}, 0.88)`],
    [0.48, `rgba(${AMBIENT_WAVE_PALETTE.sparkElectricRgb}, 0.22)`],
    [1, `rgba(${AMBIENT_WAVE_PALETTE.sparkElectricRgb}, 0)`],
  ])

  electricSparkSprite = makeRadialSprite(24, [
    [0, `rgba(${AMBIENT_WAVE_PALETTE.sparkGlacierRgb}, 0.95)`],
    [0.24, `rgba(${AMBIENT_WAVE_PALETTE.sparkElectricRgb}, 0.84)`],
    [0.52, `rgba(${AMBIENT_WAVE_PALETTE.mistDeepRgb}, 0.20)`],
    [1, `rgba(${AMBIENT_WAVE_PALETTE.mistDeepRgb}, 0)`],
  ])
}

function measureLogoAnchor() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const resonatorEl = document.querySelector<HTMLElement>('.hero-resonator-sizing')
  if (resonatorEl) {
    const rect = resonatorEl.getBoundingClientRect()
    if (rect.width > 16 && rect.height > 16) {
      const currentScroll = window.scrollY || document.documentElement.scrollTop || 0
      logoDocCenterX = rect.left + rect.width * 0.5
      logoDocCenterY = rect.top + currentScroll + rect.height * 0.52
      logoBaseRadius = Math.max(rect.width, rect.height) * profile.logoAuraMultiplier
      hasMeasuredLogo = true
      return
    }
  }

  if (!hasMeasuredLogo) {
    const isSplit = cssW >= 1024 && cssW > cssH
    logoDocCenterX = cssW * (isSplit ? 0.74 : 0.5)
    logoDocCenterY = cssH * 0.49
    logoBaseRadius = Math.min(cssW, cssH) * 0.42
  }
}

function rebuildViewport() {
  const canvas = canvasEl.value
  if (!canvas || typeof window === 'undefined') return

  cssW = Math.max(1, window.innerWidth)
  cssH = Math.max(1, window.innerHeight)
  profile = resolveAmbientViewportProfile(cssW, cssH)
  dpr = Math.min(window.devicePixelRatio || 1, profile.dprCap)

  const pixelW = Math.round(cssW * dpr)
  const pixelH = Math.round(cssH * dpr)
  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW
    canvas.height = pixelH
  }

  if (!ctx) {
    ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
  }
  if (!ctx) return

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  measureLogoAnchor()
}

function pickCurrentZone(inHeroBand: boolean): {
  u: number
  v: number
  angle: number
  zone: number
} {
  let zone = Math.floor(nextRand() * 3)
  if (zone === lastZone) {
    zone = (zone + 1) % 3
  }
  lastZone = zone

  if (inHeroBand) {
    if (zone === 0) {
      return {
        u: randRange(0.36, 0.64),
        v: randRange(0.77, 0.89),
        angle: randRange(-0.18, 0.16),
        zone,
      }
    }
    if (zone === 1) {
      return {
        u: randRange(0.56, 0.8),
        v: randRange(0.65, 0.82),
        angle: randRange(-0.28, -0.08),
        zone,
      }
    }
    return {
      u: randRange(0.44, 0.76),
      v: randRange(0.14, 0.25),
      angle: randRange(-0.16, 0.18),
      zone,
    }
  }

  if (zone === 0) {
    return {
      u: randRange(0.3, 0.7),
      v: randRange(0.7, 0.86),
      angle: randRange(-0.24, 0.22),
      zone,
    }
  }
  if (zone === 1) {
    return {
      u: randRange(0.26, 0.58),
      v: randRange(0.22, 0.44),
      angle: randRange(-0.22, 0.24),
      zone,
    }
  }
  return {
    u: randRange(0.42, 0.74),
    v: randRange(0.44, 0.68),
    angle: randRange(-0.26, 0.22),
    zone,
  }
}

function spawnBioluminescentCurrent(initialBootstrap = false) {
  const slot = currentPool.find((c) => !c.active)
  if (!slot) return

  const scrollVh = smoothScrollPx / Math.max(1, cssH)
  const inHeroBand = scrollVh < 0.55
  const placement = initialBootstrap
    ? { u: 0.52, v: 0.82, angle: -0.11, zone: 0 }
    : pickCurrentZone(inHeroBand)

  const dir: 1 | -1 = nextRand() < 0.7 ? 1 : -1
  const isDeepReceding = nextRand() < 0.36

  slot.active = true
  slot.duration = randRange(8.6, 12.6)
  slot.age = initialBootstrap ? slot.duration * 0.18 : 0
  slot.originU = placement.u
  slot.originV = placement.v
  slot.driftVelU = dir * randRange(0.0045, 0.0085)
  slot.driftVelV = randRange(-0.0035, 0.0035)
  slot.angle = placement.angle
  slot.dir = dir
  slot.isDeepReceding = isDeepReceding
  slot.spanPx = cssW * randRange(profile.minSpanRatio, profile.maxSpanRatio)
  slot.curveAmpPx = randRange(profile.minCurveAmpPx, profile.maxCurveAmpPx)
  slot.spreadPx = profile.ribbonSpreadPx * randRange(0.85, 1.15)
  slot.waveCycles = randRange(0.68, 1.08)
  slot.twistCycles = randRange(1.25, 1.85)
  slot.phase0 = randRange(0, Math.PI * 2)
  slot.phaseSpeed = randRange(0.38, 0.64) * (isDeepReceding ? -0.85 : 1)
  slot.twist0 = randRange(0, Math.PI * 2)
  slot.twistSpeed = randRange(0.32, 0.54)
  slot.peakAlpha = isDeepReceding ? randRange(0.34, 0.48) : randRange(0.54, 0.72)
  slot.zone = placement.zone
  slot.seed = randRange(1, 100)
}

function countActiveCurrents(): number {
  let count = 0
  for (let i = 0; i < POOL_SIZE; i++) {
    if (currentPool[i]?.active) count++
  }
  return count
}

function drawAmbientMicroParticles(dt: number) {
  if (!ctx || !glacierSparkSprite || !electricSparkSprite) return

  const count = Math.min(MAX_AMBIENT_PARTICLES, profile.ambientParticleCount)
  const useCursor = hasFinePointer && smoothPtrX > -1000
  const pRad = AMBIENT_CURSOR_PHYSICS.particleInfluenceRadiusPx
  const invPRad = 1 / pRad

  for (let i = 0; i < count; i++) {
    const base = i * PARTICLE_STRIDE
    let u = (particleBuffer[base] ?? 0) + (particleBuffer[base + 2] ?? 0) * dt
    let v = (particleBuffer[base + 1] ?? 0) + (particleBuffer[base + 3] ?? 0) * dt

    if (u < 0) u += 1
    else if (u >= 1) u -= 1
    if (v < 0) v += 1
    else if (v >= 1) v -= 1

    particleBuffer[base] = u
    particleBuffer[base + 1] = v

    const blinkSpeed = particleBuffer[base + 4] ?? 1
    const blinkPhase = particleBuffer[base + 5] ?? 0
    const corePx = particleBuffer[base + 6] ?? 1
    const depth = particleBuffer[base + 7] ?? 0.5

    // Dual-harmonic gated blink: ~40% rest in darkness at any instant while others wink on & off organically
    const w1 = Math.sin(elapsedSec * blinkSpeed + blinkPhase)
    const w2 = Math.cos(elapsedSec * (blinkSpeed * 0.53) - blinkPhase * 0.72)
    const rawWave = w1 * 0.68 + w2 * 0.32
    const blink = smoothstep(0.14, 0.96, rawWave)
    if (blink < 0.015) continue

    let px = u * cssW
    const parallaxOffset = smoothScrollPx * (0.05 + depth * 0.16)
    let py = (((v * cssH - parallaxOffset) % cssH) + cssH) % cssH

    let cursorBoost = 0
    if (useCursor) {
      const dx = px - smoothPtrX
      const dy = py - smoothPtrY
      const dist = Math.hypot(dx, dy)
      if (dist < pRad) {
        const prox = 1 - dist * invPRad
        const smoothProx = prox * prox * (3 - 2 * prox)
        const invD = 1 / Math.max(1, dist)
        px += dx * invD * smoothProx * AMBIENT_CURSOR_PHYSICS.particlePushPx
        py += dy * invD * smoothProx * AMBIENT_CURSOR_PHYSICS.particlePushPx
        cursorBoost = smoothProx * 0.24
      }
    }

    const sprite = depth > 0.36 ? glacierSparkSprite : electricSparkSprite
    const drawHalf = corePx * (2.15 + blink * 0.55)
    const alpha = Math.min(0.92, (0.28 + depth * 0.48) * blink + cursorBoost) * revealBlend

    ctx.globalAlpha = alpha
    ctx.drawImage(sprite, px - drawHalf, py - drawHalf, drawHalf * 2, drawHalf * 2)
  }
}

function drawBioluminescentCurrent(cur: BioluminescentCurrent, sectionScale: number) {
  if (!ctx) return

  const lifeT = Math.min(1, cur.age / cur.duration)
  const fadeIn = smoothstep(0, 0.3, lifeT)
  const fadeOut = 1 - smoothstep(0.62, 1, lifeT)
  const currentAlpha = fadeIn * fadeOut * cur.peakAlpha * sectionScale * revealBlend

  if (currentAlpha < 0.012) return

  const centerU = cur.originU + cur.driftVelU * cur.age
  const centerV = cur.originV + cur.driftVelV * cur.age

  const cosA = Math.cos(cur.angle)
  const sinA = Math.sin(cur.angle)
  const nx = -sinA
  const ny = cosA

  const halfSpan = cur.spanPx * 0.5
  const startX = centerU * cssW - cosA * halfSpan
  const startY = centerV * cssH - sinA * halfSpan
  const endX = centerU * cssW + cosA * halfSpan
  const endY = centerV * cssH + sinA * halfSpan

  const livePhase = cur.phase0 + cur.age * cur.phaseSpeed * cur.dir
  const liveTwist = cur.twist0 + cur.age * cur.twistSpeed * cur.dir
  const swellFocusU = 0.5 + 0.22 * Math.sin(cur.seed + lifeT * Math.PI * 1.3 * cur.dir)

  let cursorNearBoost = 0
  const useCursor = hasFinePointer && smoothPtrX > -1000
  const invInfluence = 1 / AMBIENT_CURSOR_PHYSICS.influenceRadiusPx

  for (let i = 0; i < SAMPLES; i++) {
    const u = i / (SAMPLES - 1)
    const dist = u * cur.spanPx

    const env = Math.pow(Math.sin(u * Math.PI), 1.32)
    bellEnv[i] = env

    const primaryCurve =
      Math.sin(u * Math.PI * 2 * cur.waveCycles - livePhase) * 0.78 +
      Math.cos(u * Math.PI * 1.35 * cur.waveCycles + livePhase * 0.6) * 0.22

    let sx = startX + cosA * dist + nx * (primaryCurve * cur.curveAmpPx * env)
    let sy = startY + sinA * dist + ny * (primaryCurve * cur.curveAmpPx * env)

    if (useCursor) {
      const dx = sx - smoothPtrX
      const dy = sy - smoothPtrY
      const d = Math.hypot(dx, dy)
      if (d < AMBIENT_CURSOR_PHYSICS.influenceRadiusPx) {
        const prox = 1 - d * invInfluence
        const smoothProx = prox * prox * (3 - 2 * prox)
        const push = smoothProx * AMBIENT_CURSOR_PHYSICS.maxPartingPx * env
        const invD = 1 / Math.max(1, d)
        sx += dx * invD * push
        sy += dy * invD * push
        if (smoothProx > cursorNearBoost) cursorNearBoost = smoothProx
      }
    }

    spineX[i] = sx
    spineY[i] = sy
    normX[i] = nx
    normY[i] = ny
    twistTheta[i] = u * Math.PI * cur.twistCycles - liveTwist
  }

  const boostedAlpha = Math.min(
    1,
    currentAlpha + cursorNearBoost * AMBIENT_CURSOR_PHYSICS.shimmerBoost * fadeIn * fadeOut,
  )

  // 1. Volumetric Submerged Mist along the Current Belly
  if (currentMistSprite) {
    const stamps = profile.mistStampCount
    const mistRx = Math.max(64, cur.spanPx * 0.13)
    const mistRy = Math.max(34, cur.spreadPx * 1.85)

    for (let m = 0; m < stamps; m++) {
      const uSample = 0.18 + (0.64 * m) / Math.max(1, stamps - 1)
      const idx = Math.min(SAMPLES - 1, Math.round(uSample * (SAMPLES - 1)))
      const env = bellEnv[idx] ?? 0
      const mx = spineX[idx] ?? 0
      const my = spineY[idx] ?? 0

      ctx.globalAlpha = boostedAlpha * env * (cur.isDeepReceding ? 0.24 : 0.36)
      ctx.drawImage(currentMistSprite, mx - mistRx, my - mistRy, mistRx * 2, mistRy * 2)
    }
  }

  // 2. Soft Caustic Swell Gleam
  if (causticCoreSprite) {
    const cIdx = Math.min(SAMPLES - 1, Math.max(0, Math.round(swellFocusU * (SAMPLES - 1))))
    const cx = spineX[cIdx] ?? 0
    const cy = spineY[cIdx] ?? 0
    const cRx = Math.max(54, cur.spanPx * 0.095)
    const cRy = Math.max(26, cur.spreadPx * 1.3)

    ctx.globalAlpha = boostedAlpha * (cur.isDeepReceding ? 0.22 : 0.38)
    ctx.drawImage(causticCoreSprite, cx - cRx, cy - cRy, cRx * 2, cRy * 2)
  }

  // 3. 3D Twisted Gossamer Silk Ribbon Mesh
  const chordGrad = ctx.createLinearGradient(startX, startY, endX, endY)
  const swellLeft = Math.max(0.14, swellFocusU - 0.22)
  const swellRight = Math.min(0.86, swellFocusU + 0.22)

  chordGrad.addColorStop(0, `rgba(${AMBIENT_WAVE_PALETTE.mistDeepRgb}, 0)`)
  chordGrad.addColorStop(swellLeft, `rgba(${AMBIENT_WAVE_PALETTE.silkElectricRgb}, 0.58)`)
  chordGrad.addColorStop(swellFocusU, `rgba(${AMBIENT_WAVE_PALETTE.silkGlacierRgb}, 0.92)`)
  chordGrad.addColorStop(swellRight, `rgba(${AMBIENT_WAVE_PALETTE.silkElectricRgb}, 0.58)`)
  chordGrad.addColorStop(1, `rgba(${AMBIENT_WAVE_PALETTE.mistDeepRgb}, 0)`)

  ctx.strokeStyle = chordGrad
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const strands = profile.strandCount
  const midStrand = Math.floor(strands * 0.5)

  for (let s = 0; s < strands; s++) {
    const sigma = strands <= 1 ? 0 : (s / (strands - 1)) * 2 - 1
    const strandPhase = sigma * 1.22
    const distFromCenter = Math.abs(sigma)
    const isCoreThread = s === midStrand

    ctx.globalAlpha = isCoreThread
      ? boostedAlpha * 0.74
      : boostedAlpha * (0.2 + (1 - distFromCenter) * 0.32)
    ctx.lineWidth = isCoreThread ? 1.15 : distFromCenter > 0.65 ? 0.65 : 0.82

    ctx.beginPath()
    for (let i = 0; i < SAMPLES; i++) {
      const env = bellEnv[i] ?? 0
      const theta = (twistTheta[i] ?? 0) + strandPhase
      const ribbonOffset = Math.sin(theta) * cur.spreadPx * env
      const px = (spineX[i] ?? 0) + (normX[i] ?? 0) * ribbonOffset
      const py = (spineY[i] ?? 0) + (normY[i] ?? 0) * ribbonOffset

      if (i === 0) {
        ctx.moveTo(px, py)
      } else {
        ctx.lineTo(px, py)
      }
    }
    ctx.stroke()
  }

  // 4. Suspended Plankton Dust Drifting Inside the Silk Mesh
  ctx.fillStyle = `rgb(${AMBIENT_WAVE_PALETTE.causticFrostRgb})`
  const motes = profile.moteCount
  for (let m = 0; m < motes; m++) {
    const baseU = ((m + 0.5) / motes + cur.age * 0.018 * cur.dir + cur.seed * 0.13) % 1
    const uPos = baseU < 0 ? baseU + 1 : baseU
    if (uPos < 0.08 || uPos > 0.92) continue

    const idx = Math.min(SAMPLES - 1, Math.round(uPos * (SAMPLES - 1)))
    const env = bellEnv[idx] ?? 0
    if (env < 0.14) continue

    const motePhase = m * 2.39996 + liveTwist * 0.85
    const lateral = Math.sin(motePhase) * cur.spreadPx * 1.12 * env
    const mx = (spineX[idx] ?? 0) + (normX[idx] ?? 0) * lateral
    const my = (spineY[idx] ?? 0) + (normY[idx] ?? 0) * lateral

    const twinkle = 0.35 + 0.65 * Math.sin(cur.age * 2.2 + m * 1.7)
    const size = m % 3 === 0 ? 1.25 : 0.9

    ctx.globalAlpha = boostedAlpha * env * twinkle * 0.5
    ctx.fillRect(mx - size * 0.5, my - size * 0.5, size, size)
  }
}

function renderFrame(timestamp: number) {
  if (!ctx) return

  const dt = lastTimestamp > 0 ? Math.min(0.05, (timestamp - lastTimestamp) / 1000) : 0.016
  lastTimestamp = timestamp
  elapsedSec += dt

  // Smooth exponential scroll & stage-reveal damping
  const scrollAlpha = 1 - Math.exp(-dt * AMBIENT_SCROLL_MODULATION.scrollSmoothingRate)
  smoothScrollPx += (targetScrollPx - smoothScrollPx) * scrollAlpha
  smoothPageProgress += (targetPageProgress - smoothPageProgress) * scrollAlpha

  const targetReveal = props.active ? 1 : 0.34
  revealBlend += (targetReveal - revealBlend) * (1 - Math.exp(-dt * 2.4))

  if (hasFinePointer && ptrX > -1000) {
    const pAlpha = 1 - Math.exp(-dt * AMBIENT_CURSOR_PHYSICS.pointerLerpRate)
    if (smoothPtrX < -1000) {
      smoothPtrX = ptrX
      smoothPtrY = ptrY
    } else {
      const moveDist = Math.hypot(ptrX - smoothPtrX, ptrY - smoothPtrY)
      smoothPtrX += (ptrX - smoothPtrX) * pAlpha
      smoothPtrY += (ptrY - smoothPtrY) * pAlpha
      pointerEnergy = Math.min(1, pointerEnergy * Math.exp(-dt * 3.2) + moveDist * 0.008)
    }
  }

  const scrollVh = smoothScrollPx / Math.max(1, cssH)

  // =========================================================================
  // 1. DEEP OBSIDIAN-MIDNIGHT BASE (#02050f) + SCROLL-ALTERNATING DEPTH
  // =========================================================================
  const heroWeight = 1 - smoothstep(0, AMBIENT_SCROLL_MODULATION.heroBaseHandoffVh, scrollVh)
  const scrollOsc =
    0.5 + 0.5 * Math.sin(scrollVh * AMBIENT_SCROLL_MODULATION.lumaCyclePerVh - 0.4)

  const scrollR =
    AMBIENT_WAVE_PALETTE.scrollFloorRgb[0] +
    (AMBIENT_WAVE_PALETTE.scrollCrestRgb[0] - AMBIENT_WAVE_PALETTE.scrollFloorRgb[0]) * scrollOsc
  const scrollG =
    AMBIENT_WAVE_PALETTE.scrollFloorRgb[1] +
    (AMBIENT_WAVE_PALETTE.scrollCrestRgb[1] - AMBIENT_WAVE_PALETTE.scrollFloorRgb[1]) * scrollOsc
  const scrollB =
    AMBIENT_WAVE_PALETTE.scrollFloorRgb[2] +
    (AMBIENT_WAVE_PALETTE.scrollCrestRgb[2] - AMBIENT_WAVE_PALETTE.scrollFloorRgb[2]) * scrollOsc

  const finalR = Math.round(
    scrollR + (AMBIENT_WAVE_PALETTE.heroBaseRgb[0] - scrollR) * heroWeight,
  )
  const finalG = Math.round(
    scrollG + (AMBIENT_WAVE_PALETTE.heroBaseRgb[1] - scrollG) * heroWeight,
  )
  const finalB = Math.round(
    scrollB + (AMBIENT_WAVE_PALETTE.heroBaseRgb[2] - scrollB) * heroWeight,
  )

  const bgKey = (finalR << 16) | (finalG << 8) | finalB
  if (bgKey !== lastBgKey) {
    lastBgKey = bgKey
    cachedBgColor = `rgb(${finalR}, ${finalG}, ${finalB})`
  }

  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.fillStyle = cachedBgColor
  ctx.fillRect(0, 0, cssW, cssH)

  ctx.globalCompositeOperation = 'lighter'

  // 1B. Whisper-subtle sapphire corner depth on Hero (zero flat navy wash)
  if (heroVelvetSprite && heroWeight > 0.01) {
    const isSplit = cssW >= 1024 && cssW > cssH
    const vx = cssW * (isSplit ? 0.22 : 0.5)
    const vy = cssH * (isSplit ? 0.42 : 0.26)
    const vRadius = Math.max(cssW, cssH) * 0.52

    ctx.globalAlpha = heroWeight * 0.52
    ctx.drawImage(heroVelvetSprite, vx - vRadius, vy - vRadius * 0.8, vRadius * 2, vRadius * 1.6)
  }

  // 1C. Scroll-Alternating Off-Axis Cobalt & Glacier Atmospheric Washes
  if (cobaltWashSprite && glacierWashSprite && scrollVh > 0.05) {
    const washIn = smoothstep(0.05, 0.5, scrollVh)
    const sweepX =
      cssW * (0.5 + 0.36 * Math.sin(scrollVh * AMBIENT_SCROLL_MODULATION.washSweepCyclePerVh))
    const sweepY =
      cssH *
      (0.5 + 0.22 * Math.cos(scrollVh * AMBIENT_SCROLL_MODULATION.washSweepCyclePerVh * 0.76))
    const toneMix =
      0.5 + 0.5 * Math.sin(scrollVh * AMBIENT_SCROLL_MODULATION.toneBlendCyclePerVh + 0.5)
    const washRx = Math.max(cssW, cssH) * 0.62
    const washRy = washRx * 0.78

    ctx.globalAlpha = washIn * (0.4 + 0.6 * scrollOsc) * (1 - toneMix * 0.5)
    ctx.drawImage(cobaltWashSprite, sweepX - washRx, sweepY - washRy, washRx * 2, washRy * 2)

    ctx.globalAlpha = washIn * (0.35 + 0.65 * scrollOsc) * toneMix * 0.88
    ctx.drawImage(
      glacierWashSprite,
      cssW - sweepX - washRx * 0.92,
      cssH - sweepY - washRy * 0.92,
      washRx * 1.84,
      washRy * 1.84,
    )
  }

  // =========================================================================
  // 2. EXACT RESONATOR LOGO RADIAL HALO (SHRINKS & FADES TO NOTHING ON SCROLL)
  // =========================================================================
  if (logoAuraSprite && scrollVh < AMBIENT_SCROLL_MODULATION.logoAuraFadeEndVh) {
    const fadeProgress = Math.min(
      1,
      Math.max(0, scrollVh / AMBIENT_SCROLL_MODULATION.logoAuraFadeEndVh),
    )
    const remain = Math.pow(1 - fadeProgress, 1.65)
    const liveRadius =
      logoBaseRadius *
      (AMBIENT_SCROLL_MODULATION.logoAuraMinScale +
        (1 - AMBIENT_SCROLL_MODULATION.logoAuraMinScale) * remain)
    const liveCenterY = logoDocCenterY - smoothScrollPx

    ctx.globalAlpha = remain * (0.64 + 0.36 * revealBlend)
    ctx.drawImage(
      logoAuraSprite,
      logoDocCenterX - liveRadius,
      liveCenterY - liveRadius,
      liveRadius * 2,
      liveRadius * 2,
    )
  }

  // =========================================================================
  // 3. TWINKLING BIOLUMINESCENT MICRO-PARTICLES FIELD
  // =========================================================================
  drawAmbientMicroParticles(dt)

  // Subtle submerged water-glow following desktop cursor motion
  if (hasFinePointer && currentMistSprite && smoothPtrX > -1000 && pointerEnergy > 0.01) {
    const ptrR = 135
    ctx.globalAlpha = pointerEnergy * AMBIENT_CURSOR_PHYSICS.ambientCursorGlowAlpha * revealBlend
    ctx.drawImage(currentMistSprite, smoothPtrX - ptrR, smoothPtrY - ptrR, ptrR * 2, ptrR * 2)
  }

  // =========================================================================
  // 4. MILDER SUBMERGED BIOLUMINESCENT SILK CURRENTS (SWELL IN, DRIFT, RECEDE)
  // =========================================================================
  const heroToMid = smoothstep(0, 0.75, scrollVh)
  const footerSwell = smoothstep(
    AMBIENT_SCROLL_MODULATION.footerAmplificationStart,
    1,
    smoothPageProgress,
  )
  const midBlend =
    AMBIENT_SCROLL_MODULATION.heroCurrentScale +
    (AMBIENT_SCROLL_MODULATION.midCurrentScale - AMBIENT_SCROLL_MODULATION.heroCurrentScale) *
      heroToMid
  const sectionScale =
    midBlend + (AMBIENT_SCROLL_MODULATION.footerCurrentScale - midBlend) * footerSwell

  if (props.active) {
    spawnTimerSec -= dt
    const activeCount = countActiveCurrents()
    const maxAllowed =
      scrollVh < 0.45
        ? Math.min(2, profile.maxConcurrentCurrents)
        : profile.maxConcurrentCurrents

    if (spawnTimerSec <= 0 && activeCount < maxAllowed) {
      spawnBioluminescentCurrent(false)
      spawnTimerSec = randRange(profile.minPauseSec, profile.maxPauseSec)
    } else if (spawnTimerSec <= 0) {
      spawnTimerSec = randRange(0.8, 1.6)
    }
  }

  for (let i = 0; i < POOL_SIZE; i++) {
    const cur = currentPool[i]
    if (!cur || !cur.active) continue

    cur.age += dt
    if (cur.age >= cur.duration) {
      cur.active = false
      continue
    }
    drawBioluminescentCurrent(cur, sectionScale)
  }

  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

function loop(timestamp: number) {
  renderFrame(timestamp)
  rafId = window.requestAnimationFrame(loop)
}

function startLoop() {
  if (rafId !== null || typeof window === 'undefined') return
  lastTimestamp = 0
  rafId = window.requestAnimationFrame(loop)
}

function stopLoop() {
  if (rafId !== null && typeof window !== 'undefined') {
    window.cancelAnimationFrame(rafId)
    rafId = null
  }
}

function onVisibilityChange() {
  if (typeof document === 'undefined') return
  if (document.hidden) {
    stopLoop()
  } else {
    startLoop()
  }
}

function onWindowPointerMove(e: PointerEvent) {
  if (!hasFinePointer) return
  ptrX = e.clientX
  ptrY = e.clientY
}

function syncScrollMetrics(scroll: number, limit?: number) {
  if (typeof window === 'undefined') return
  const vh = Math.max(1, cssH || window.innerHeight)
  const maxScroll =
    limit && limit > 0
      ? limit
      : Math.max(1, document.documentElement.scrollHeight - vh)

  targetScrollPx = Math.max(0, scroll)
  targetPageProgress = Math.min(1, Math.max(0, scroll / maxScroll))
}

watch(
  () => props.active,
  (isActive) => {
    if (isActive) {
      measureLogoAnchor()
      if (countActiveCurrents() === 0) {
        spawnBioluminescentCurrent(true)
      }
    }
  },
)

onMounted(() => {
  if (typeof window === 'undefined') return

  hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches

  seedAmbientParticles()
  buildSprites()
  rebuildViewport()

  const initialScroll = window.scrollY || 0
  syncScrollMetrics(initialScroll)
  smoothScrollPx = targetScrollPx
  smoothPageProgress = targetPageProgress

  if (props.active && countActiveCurrents() === 0) {
    spawnBioluminescentCurrent(true)
  }

  unsubscribeScroll = onScroll(({ scroll, limit }) => {
    syncScrollMetrics(scroll, limit)
  })

  resizeObserver = new ResizeObserver(() => {
    rebuildViewport()
    syncScrollMetrics(window.scrollY || 0)
  })
  if (canvasEl.value?.parentElement) {
    resizeObserver.observe(canvasEl.value.parentElement)
  }

  const resonatorEl = document.querySelector<HTMLElement>('.hero-resonator-sizing')
  if (resonatorEl) {
    logoObserver = new ResizeObserver(() => {
      measureLogoAnchor()
    })
    logoObserver.observe(resonatorEl)
  }

  if (hasFinePointer) {
    window.addEventListener('pointermove', onWindowPointerMove, { passive: true })
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  startLoop()
})

onBeforeUnmount(() => {
  stopLoop()
  if (unsubscribeScroll) {
    unsubscribeScroll()
    unsubscribeScroll = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (logoObserver) {
    logoObserver.disconnect()
    logoObserver = null
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointermove', onWindowPointerMove)
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
})
</script>

<template>
  <div
    aria-hidden="true"
    class="ambient-canvas-host pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
  >
    <canvas ref="canvasEl" class="block h-full w-full" />
  </div>
</template>