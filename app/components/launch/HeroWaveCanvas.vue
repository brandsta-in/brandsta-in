<!-- app/components/launch/HeroWaveCanvas.vue -->
<template>
  <canvas
    ref="canvasRef"
    class="pointer-events-none absolute inset-0 h-full w-full"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { LAUNCH_HERO_CHOREOGRAPHY, type ApertureAnchors, type HarmonicPillar } from '~/data/launchHeroChoreography'

const props = defineProps<{
  anchors: ApertureAnchors | null
  tempoScale: number
  activePillar: HarmonicPillar
  pulseCount: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

interface LeftStrand {
  edgeOffsetRatio: number
  amp: number
  freq: number
  phase: number
  speed: number
  width: number
  alpha: number
  color: string
}

interface RightStrand {
  endLiftRatio: number
  amp: number
  freq: number
  phase: number
  speed: number
  width: number
  alpha: number
  isGold: boolean
  coreColor: string
  midColor: string
}

const LEFT_STRANDS: LeftStrand[] = [
  { edgeOffsetRatio: -0.11, amp: 18, freq: 2.1, phase: 0.2, speed: 1.35, width: 1.5, alpha: 0.82, color: '#38bdf8' },
  { edgeOffsetRatio: -0.05, amp: 14, freq: 1.7, phase: 1.4, speed: 1.15, width: 1.9, alpha: 0.92, color: '#2563eb' },
  { edgeOffsetRatio: 0.01, amp: 10, freq: 2.5, phase: 2.7, speed: 1.55, width: 1.2, alpha: 0.72, color: '#60a5fa' },
  { edgeOffsetRatio: 0.06, amp: 20, freq: 1.5, phase: 3.9, speed: 1.05, width: 2.2, alpha: 0.88, color: '#1d4ed8' },
  { edgeOffsetRatio: 0.12, amp: 24, freq: 1.9, phase: 5.1, speed: 1.25, width: 1.3, alpha: 0.64, color: '#3b82f6' },
  { edgeOffsetRatio: 0.16, amp: 15, freq: 2.3, phase: 0.8, speed: 0.95, width: 3.6, alpha: 0.22, color: '#2563eb' },
]

const RIGHT_STRANDS: RightStrand[] = [
  { endLiftRatio: -0.22, amp: 28, freq: 1.8, phase: 0.0, speed: 1.45, width: 2.1, alpha: 0.95, isGold: true, coreColor: '#fef3c7', midColor: '#f59e0b' },
  { endLiftRatio: -0.15, amp: 22, freq: 2.2, phase: 1.1, speed: 1.25, width: 1.5, alpha: 0.86, isGold: false, coreColor: '#93c5fd', midColor: '#2563eb' },
  { endLiftRatio: -0.09, amp: 32, freq: 1.5, phase: 2.3, speed: 1.1, width: 2.4, alpha: 0.92, isGold: true, coreColor: '#fde68a', midColor: '#d97706' },
  { endLiftRatio: -0.02, amp: 18, freq: 2.4, phase: 3.4, speed: 1.6, width: 1.3, alpha: 0.78, isGold: true, coreColor: '#fef08a', midColor: '#f59e0b' },
  { endLiftRatio: 0.04, amp: 25, freq: 1.9, phase: 4.5, speed: 1.3, width: 1.8, alpha: 0.88, isGold: false, coreColor: '#60a5fa', midColor: '#1d4ed8' },
  { endLiftRatio: 0.09, amp: 20, freq: 1.6, phase: 5.4, speed: 1.05, width: 1.5, alpha: 0.74, isGold: true, coreColor: '#fcd34d', midColor: '#b45309' },
  { endLiftRatio: -0.12, amp: 30, freq: 1.5, phase: 2.0, speed: 1.15, width: 5.5, alpha: 0.18, isGold: true, coreColor: '#fbbf24', midColor: '#d97706' },
  { endLiftRatio: 0.02, amp: 24, freq: 1.9, phase: 4.2, speed: 1.25, width: 4.8, alpha: 0.16, isGold: false, coreColor: '#3b82f6', midColor: '#1d4ed8' },
]

let ctx: CanvasRenderingContext2D | null = null
let rafId: number | null = null
let io: IntersectionObserver | null = null
let width = 0
let height = 0
let dpr = 1
let mountTimestamp = 0
let isInView = true
let isPageVisible = true
let prefersReducedMotion = false

// Smoothly interpolated mode multipliers
let targetSpeedMult = 1
let currentSpeedMult = 1
let targetGoldBoost = 1
let currentGoldBoost = 1
let targetAmpMult = 1
let currentAmpMult = 1
let shockwaveProgress = -1

function syncPillarTargets(pillar: HarmonicPillar) {
  if (pillar === 'strategy') {
    targetSpeedMult = 0.82
    targetGoldBoost = 0.82
    targetAmpMult = 0.76
  } else if (pillar === 'creativity') {
    targetSpeedMult = 1.18
    targetGoldBoost = 1.32
    targetAmpMult = 1.26
  } else if (pillar === 'technology') {
    targetSpeedMult = 1.65
    targetGoldBoost = 1.05
    targetAmpMult = 1.08
  } else {
    targetSpeedMult = 1
    targetGoldBoost = 1
    targetAmpMult = 1
  }
}

watch(() => props.activePillar, syncPillarTargets, { immediate: true })

watch(
  () => props.pulseCount,
  () => {
    shockwaveProgress = 0
    if (prefersReducedMotion) drawFrame(performance.now())
  },
)

watch(
  () => props.anchors,
  () => {
    resizeCanvas()
    if (prefersReducedMotion) drawFrame(performance.now())
  },
)

function easeOutCubic(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return 1 - Math.pow(1 - c, 3)
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas || ! canvas.parentElement) return
  const rect = canvas.parentElement.getBoundingClientRect()
  width = rect.width
  height = rect.height
  dpr = Math.min(window.devicePixelRatio || 1, 2)

  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  ctx = canvas.getContext('2d', { alpha: true })
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
}

function drawFrame(now: number) {
  if (!ctx || width === 0 || height === 0) return

  const anchors = props.anchors ?? {
    leftX: width * 0.43,
    rightX: width * 0.57,
    slotY: height * 0.53,
    floorY: height * 0.66,
    centerX: width * 0.5,
    emblemWidth: Math.min(width * 0.34, 220),
  }

  ctx.clearRect(0, 0, width, height)

  const tempo = props.tempoScale || 1
  const elapsedMs = prefersReducedMotion ? 5000 : now - mountTimestamp
  const tSec = now * 0.001

  // Smooth spring-lerp toward active pillar physics
  currentSpeedMult += (targetSpeedMult - currentSpeedMult) * 0.06
  currentGoldBoost += (targetGoldBoost - currentGoldBoost) * 0.06
  currentAmpMult += (targetAmpMult - currentAmpMult) * 0.06

  if (shockwaveProgress >= 0) {
    shockwaveProgress += 0.026
    if (shockwaveProgress > 1.25) shockwaveProgress = -1
  }

  const { leftIntakeStartMs, leftIntakeDurationMs, rightEruptionStartMs, rightEruptionDurationMs } =
    LAUNCH_HERO_CHOREOGRAPHY.beats

  const leftProgress = prefersReducedMotion
    ? 1
    : easeOutCubic((elapsedMs - leftIntakeStartMs * tempo) / (leftIntakeDurationMs * tempo))

  const rightProgress = prefersReducedMotion
    ? 1
    : easeOutCubic((elapsedMs - rightEruptionStartMs * tempo) / (rightEruptionDurationMs * tempo))

  if (leftProgress <= 0 && rightProgress <= 0) return

  // Mobile amplitude dampener so compact viewports stay razor-clean
  const viewportScale = Math.min(1, Math.max(0.52, width / 1280))
  const phaseTime = tSec * currentSpeedMult

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  // 1. Obsidian Floor Horizon & Ambient Stage Reflections
  const floorAlpha = rightProgress * 0.85
  if (floorAlpha > 0.01) {
    const floorY = Math.min(height - 24, anchors.floorY + 10)

    // Subtle crisp stage horizon hairline
    const horizonGrad = ctx.createLinearGradient(0, floorY, width, floorY)
    horizonGrad.addColorStop(0, 'rgba(37, 99, 235, 0.03)')
    horizonGrad.addColorStop(0.28, `rgba(37, 99, 235, ${0.2 * floorAlpha})`)
    horizonGrad.addColorStop(0.5, `rgba(148, 163, 184, ${0.26 * floorAlpha})`)
    horizonGrad.addColorStop(0.72, `rgba(245, 158, 11, ${0.22 * floorAlpha * currentGoldBoost})`)
    horizonGrad.addColorStop(1, 'rgba(245, 158, 11, 0.03)')

    ctx.fillStyle = horizonGrad
    ctx.fillRect(0, floorY, width, 1)

    // Left Sapphire Reflection Pool
    const leftPool = ctx.createRadialGradient(
      anchors.leftX * 0.45,
      floorY + 26,
      4,
      anchors.leftX * 0.45,
      floorY + 26,
      Math.max(120, anchors.leftX * 0.55),
    )
    leftPool.addColorStop(0, `rgba(37, 99, 235, ${0.15 * leftProgress})`)
    leftPool.addColorStop(1, 'rgba(4, 10, 26, 0)')
    ctx.fillStyle = leftPool
    ctx.fillRect(0, floorY, anchors.centerX, 95)

    // Center Brushed-Titanium Pedestal Reflection
    const centerPool = ctx.createRadialGradient(
      anchors.centerX,
      floorY + 14,
      2,
      anchors.centerX,
      floorY + 18,
      anchors.emblemWidth * 0.65,
    )
    centerPool.addColorStop(0, `rgba(191, 219, 254, ${0.16 * floorAlpha})`)
    centerPool.addColorStop(0.55, `rgba(29, 78, 216, ${0.09 * floorAlpha})`)
    centerPool.addColorStop(1, 'rgba(4, 10, 26, 0)')
    ctx.fillStyle = centerPool
    ctx.fillRect(anchors.centerX - anchors.emblemWidth, floorY - 6, anchors.emblemWidth * 2, 76)

    // Right Gold + Cobalt Reflection Pool
    const rightSpan = width - anchors.rightX
    const rightPool = ctx.createRadialGradient(
      anchors.rightX + rightSpan * 0.52,
      floorY + 28,
      6,
      anchors.rightX + rightSpan * 0.52,
      floorY + 28,
      Math.max(140, rightSpan * 0.62),
    )
    rightPool.addColorStop(0, `rgba(245, 158, 11, ${0.14 * floorAlpha * currentGoldBoost})`)
    rightPool.addColorStop(0.5, `rgba(37, 99, 235, ${0.09 * floorAlpha})`)
    rightPool.addColorStop(1, 'rgba(4, 10, 26, 0)')
    ctx.fillStyle = rightPool
    ctx.fillRect(anchors.centerX, floorY, width - anchors.centerX, 100)
  }

  // 2. Beat 3A: Left Raw Sapphire Intake Filaments (0 -> leftX)
  if (leftProgress > 0.01 && anchors.leftX > 12) {
    const drawEndX = anchors.leftX * leftProgress
    const steps = width < 640 ? 34 : 56

    for (const s of LEFT_STRANDS) {
      const grad = ctx.createLinearGradient(0, anchors.slotY, anchors.leftX, anchors.slotY)
      grad.addColorStop(0, 'rgba(14, 165, 233, 0.06)')
      grad.addColorStop(0.45, s.color)
      grad.addColorStop(1, '#93c5fd')

      ctx.beginPath()
      for (let i = 0; i <= steps; i++) {
        const u = (i / steps) * leftProgress
        const x = u * anchors.leftX
        // Pinch envelope to 0 right as filaments funnel into the machined left slot
        const pinch = Math.pow(1 - u, 1.35)
        const baseCurve = s.edgeOffsetRatio * height * Math.pow(1 - u, 1.65)
        const wave =
          Math.sin(u * Math.PI * s.freq - phaseTime * s.speed + s.phase) *
          s.amp *
          viewportScale *
          currentAmpMult *
          pinch

        const shockBoost =
          shockwaveProgress >= 0 && shockwaveProgress <= 0.45
            ? Math.exp(-Math.pow(u - shockwaveProgress * 2.2, 2) * 26) * -10 * pinch
            : 0

        const y = anchors.slotY + baseCurve + wave + shockBoost
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }

      ctx.strokeStyle = grad
      ctx.globalAlpha = s.alpha * leftProgress
      ctx.lineWidth = s.width
      ctx.lineCap = 'round'
      ctx.stroke()

      if (drawEndX > 20 && leftProgress < 0.99) {
        ctx.fillStyle = '#bae6fd'
        ctx.globalAlpha = 0.85
        ctx.beginPath()
        ctx.arc(drawEndX, anchors.slotY, 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Focused Sapphire Aperture Beam Glow at Left Slot
    const leftBeam = ctx.createRadialGradient(
      anchors.leftX - 4,
      anchors.slotY,
      1,
      anchors.leftX - 4,
      anchors.slotY,
      28 * viewportScale + 12,
    )
    leftBeam.addColorStop(0, `rgba(186, 230, 253, ${0.72 * leftProgress})`)
    leftBeam.addColorStop(0.45, `rgba(37, 99, 235, ${0.34 * leftProgress})`)
    leftBeam.addColorStop(1, 'rgba(4, 10, 26, 0)')
    ctx.globalAlpha = 1
    ctx.fillStyle = leftBeam
    ctx.beginPath()
    ctx.arc(anchors.leftX - 4, anchors.slotY, 40, 0, Math.PI * 2)
    ctx.fill()
  }

  // 3. Beat 3B: Right Amplified Gold + Electric Blue Eruption (rightX -> width)
  const rightSpan = width - anchors.rightX
  if (rightProgress > 0.01 && rightSpan > 12) {
    const steps = width < 640 ? 38 : 64

    for (const s of RIGHT_STRANDS) {
      const grad = ctx.createLinearGradient(
        anchors.rightX,
        anchors.slotY,
        width,
        anchors.slotY + s.endLiftRatio * height,
      )
      if (s.isGold) {
        grad.addColorStop(0, '#fef3c7')
        grad.addColorStop(0.24, s.coreColor)
        grad.addColorStop(0.68, s.midColor)
        grad.addColorStop(1, 'rgba(245, 158, 11, 0.08)')
      } else {
        grad.addColorStop(0, '#dbeafe')
        grad.addColorStop(0.28, s.coreColor)
        grad.addColorStop(0.72, s.midColor)
        grad.addColorStop(1, 'rgba(37, 99, 235, 0.08)')
      }

      ctx.beginPath()
      for (let i = 0; i <= steps; i++) {
        const u = (i / steps) * rightProgress
        const x = anchors.rightX + u * rightSpan
        // Expand smoothly from tight aperture slot into sweeping harmonic wave
        const bloom = Math.pow(u, 0.78)
        const lift = s.endLiftRatio * height * Math.pow(u, 1.28)
        const wave =
          Math.sin(u * Math.PI * s.freq - phaseTime * s.speed + s.phase) *
          s.amp *
          viewportScale *
          currentAmpMult *
          bloom

        const shockOut =
          shockwaveProgress > 0.32
            ? Math.exp(-Math.pow(u - (shockwaveProgress - 0.32) * 1.45, 2) * 22) * -14 * bloom
            : 0

        const y = anchors.slotY + lift + wave + shockOut
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }

      ctx.strokeStyle = grad
      const boost = s.isGold ? currentGoldBoost : 1
      ctx.globalAlpha = Math.min(1, s.alpha * rightProgress * boost)
      ctx.lineWidth = s.width
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    // Warm Champagne-Gold Transmutation Flare at Right Aperture Exit
    const rightFlare = ctx.createRadialGradient(
      anchors.rightX + 4,
      anchors.slotY,
      1,
      anchors.rightX + 6,
      anchors.slotY,
      36 * viewportScale + 14,
    )
    rightFlare.addColorStop(0, `rgba(254, 243, 199, ${0.88 * rightProgress})`)
    rightFlare.addColorStop(0.38, `rgba(245, 158, 11, ${0.46 * rightProgress * currentGoldBoost})`)
    rightFlare.addColorStop(1, 'rgba(4, 10, 26, 0)')
    ctx.globalAlpha = 1
    ctx.fillStyle = rightFlare
    ctx.beginPath()
    ctx.arc(anchors.rightX + 6, anchors.slotY, 50, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

function tick(now: number) {
  if (!isInView || !isPageVisible || prefersReducedMotion) {
    rafId = null
    return
  }
  drawFrame(now)
  rafId = requestAnimationFrame(tick)
}

function startLoop() {
  if (prefersReducedMotion) {
    drawFrame(performance.now())
    return
  }
  if (rafId === null && isInView && isPageVisible) {
    rafId = requestAnimationFrame(tick)
  }
}

function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

function onVisibilityChange() {
  isPageVisible = document.visibilityState === 'visible'
  if (isPageVisible) startLoop()
  else stopLoop()
}

onMounted(() => {
  prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  mountTimestamp = performance.now()
  resizeCanvas()

  if (canvasRef.value) {
    io = new IntersectionObserver(
      (entries) => {
        isInView = entries[0]?.isIntersecting ?? true
        if (isInView) startLoop()
        else stopLoop()
      },
      { threshold: 0.02 },
    )
    io.observe(canvasRef.value)
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  requestAnimationFrame(() => startLoop())
})

onBeforeUnmount(() => {
  stopLoop()
  io?.disconnect()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>