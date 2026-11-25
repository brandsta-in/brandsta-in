<!-- app/components/launch/BrandstaHeroResonator.vue -->
<script setup lang="ts">
import { ref, computed, useId, onMounted, onBeforeUnmount } from 'vue'
import { useNuxtApp } from '#imports'
import {
  RESONATOR_PATHS,
  HERO_LOADER_CHOREOGRAPHY,
  HERO_RESONATOR_ANCHOR_CONFIG,
  type ClickResonancePayload,
} from '~/data/heroResonatorLoaderConfig'

const emit = defineEmits<{
  loaderStateChange: [active: boolean]
  clickResonance: [payload: ClickResonancePayload]
}>()

const uid = useId()
const nuxtApp = useNuxtApp()

// SSR + initial client hydration (`F5`, `Ctrl+Shift+R`, fresh session, new tab) => true (0 mismatch, 0 FOUC).
// Client-side SPA navigation back from internal routes (`/formation` -> `/`) => false (skips immediately).
const startsInLoaderMode = import.meta.server || Boolean(nuxtApp.isHydrating)

const isLoaderActive = ref(startsInLoaderMode)
const isReadyToPaint = ref(!startsInLoaderMode)
const veilOpacity = ref(startsInLoaderMode ? 1 : 0)

const berthAnchorEl = ref<HTMLElement | null>(null)

// Spatial carrier & dead-center forward 3D gimbal state (0° tilt, 100% stationary once settled)
const carrierTx = ref(0)
const carrierTy = ref(0)
const carrierScale = ref(1)

const gimbalRotX = ref<number>(HERO_RESONATOR_ANCHOR_CONFIG.restRotX)
const gimbalRotY = ref<number>(HERO_RESONATOR_ANCHOR_CONFIG.restRotY)
const gimbalRotZ = ref<number>(HERO_RESONATOR_ANCHOR_CONFIG.restRotZ)

const waveRevealWidth = ref(startsInLoaderMode ? 0 : 520)
const waveLeadFlareX = ref(156)
const waveLeadFlareOpacity = ref(0)

const shellOpacity = ref(startsInLoaderMode ? 0 : 1)
const morph3D = ref(startsInLoaderMode ? 0 : 1)
const shellGap = ref(0)
const waveAmbientGlow = ref(startsInLoaderMode ? 0 : 0.24)

// 0.92s Click-Triggered Pakka Brandsta-Blue Wave Aura Intensity (0..1)
const clickAuraLevel = ref(0)

// Faster Left-to-Right Alloy Polish Progress & Opacity (~2-wave interval)
const alloyPolishProgress = ref(0)
const alloyPolishOpacity = ref(0)

// Living inner wave phase
const wavePhaseOffset = ref(0)

// 7 stepped machined silver-slate extrusion slices (backmost slice 7 -> frontmost slice 1)
const TITANIUM_SLICE_FACTORS = [1.0, 0.85, 0.71, 0.57, 0.43, 0.29, 0.14] as const
const WAVE_SLICE_FACTORS = [1.0, 0.8, 0.6, 0.4, 0.2] as const

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function solveCubicBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  const x = clamp(t, 0, 1)
  if (x <= 0) return 0
  if (x >= 1) return 1

  let u = x
  for (let i = 0; i < 6; i++) {
    const inv = 1 - u
    const bx = 3 * inv * inv * u * x1 + 3 * inv * u * u * x2 + u * u * u - x
    if (Math.abs(bx) < 1e-5) break
    const dbx = 3 * inv * inv * x1 + 6 * inv * u * (x2 - x1) + 3 * u * u * (1 - x2)
    if (Math.abs(dbx) < 1e-5) break
    u = clamp(u - bx / dbx, 0, 1)
  }

  const inv = 1 - u
  return 3 * inv * inv * u * y1 + 3 * inv * u * u * y2 + u * u * u
}

function easeCinematicGlide(t: number): number {
  return solveCubicBezier(0.34, 0.0, 0.14, 1.0, t)
}

function easePoisedReveal(t: number): number {
  return solveCubicBezier(0.25, 0.1, 0.2, 1.0, t)
}

function easeVeilDissolve(t: number): number {
  return solveCubicBezier(0.42, 0.0, 0.22, 1.0, t)
}

function easeAlloySweep(t: number): number {
  return solveCubicBezier(0.28, 0.0, 0.22, 1.0, t)
}

function stageProgress(elapsed: number, start: number, duration: number): number {
  return clamp((elapsed - start) / Math.max(0.001, duration), 0, 1)
}

function evaluateClickAuraEnvelope(elapsed: number): number {
  const dur = HERO_RESONATOR_ANCHOR_CONFIG.clickAuraDuration
  if (elapsed <= 0 || elapsed >= dur) return 0
  const u = clamp(elapsed / dur, 0, 1)
  const warped = Math.pow(u, 0.62)
  return Math.pow(Math.sin(Math.PI * warped), 1.32)
}

const carrierStyle = computed(() => ({
  opacity: isReadyToPaint.value ? '1' : '0',
  transform: `translate3d(${carrierTx.value.toFixed(2)}px, ${carrierTy.value.toFixed(2)}px, 0) scale(${carrierScale.value.toFixed(4)})`,
}))

const gimbalStyle = computed(() => ({
  transform: `rotateX(${gimbalRotX.value.toFixed(3)}deg) rotateY(${gimbalRotY.value.toFixed(3)}deg) rotateZ(${gimbalRotZ.value.toFixed(3)}deg)`,
}))

const innerRimBaseColor = computed(() =>
  clickAuraLevel.value > 0.15 ? '#7cc4ff' : '#60baff',
)

const topFrontTransform = computed(() => {
  const y = -shellGap.value
  return Math.abs(y) < 0.01 ? undefined : `translate(0 ${y.toFixed(2)})`
})

const bottomFrontTransform = computed(() => {
  const y = shellGap.value
  return Math.abs(y) < 0.01 ? undefined : `translate(0 ${y.toFixed(2)})`
})

// Symmetrical Inward 3D Depth Nudge on Top Arch
const topExtrudeTransforms = computed(() => {
  const m = morph3D.value
  const gapY = -shellGap.value
  const cx = HERO_RESONATOR_ANCHOR_CONFIG.topPivotX
  const cy = HERO_RESONATOR_ANCHOR_CONFIG.topPivotY
  const tuckX = HERO_RESONATOR_ANCHOR_CONFIG.topInwardTuckX
  const tuckY = HERO_RESONATOR_ANCHOR_CONFIG.topInwardTuckY
  const baseDy = HERO_RESONATOR_ANCHOR_CONFIG.topExtrudeDy

  return TITANIUM_SLICE_FACTORS.map((f) => {
    const d = m * f
    const sx = 1 - tuckX * d
    const sy = 1 - tuckY * d
    const tx = cx * (1 - sx)
    const ty = cy * (1 - sy) + gapY + baseDy * d
    return `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)})`
  })
})

// Symmetrical Inward 3D Depth Nudge on Bottom Cradle
const bottomExtrudeTransforms = computed(() => {
  const m = morph3D.value
  const gapY = shellGap.value
  const cx = HERO_RESONATOR_ANCHOR_CONFIG.bottomPivotX
  const cy = HERO_RESONATOR_ANCHOR_CONFIG.bottomPivotY
  const tuckX = HERO_RESONATOR_ANCHOR_CONFIG.bottomInwardTuckX
  const tuckY = HERO_RESONATOR_ANCHOR_CONFIG.bottomInwardTuckY
  const baseDy = HERO_RESONATOR_ANCHOR_CONFIG.bottomExtrudeDy

  return TITANIUM_SLICE_FACTORS.map((f) => {
    const d = m * f
    const sx = 1 - tuckX * d
    const sy = 1 - tuckY * d
    const tx = cx * (1 - sx)
    const ty = cy * (1 - sy) + gapY + baseDy * d
    return `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)})`
  })
})

// Symmetrical Centered 3D Extrusion for the Core Wave
const waveExtrudeTransforms = computed(() => {
  const m = morph3D.value
  const cx = HERO_RESONATOR_ANCHOR_CONFIG.wavePivotX
  const tuckX =
    HERO_RESONATOR_ANCHOR_CONFIG.waveInwardTuckX *
    HERO_RESONATOR_ANCHOR_CONFIG.waveInwardTuckMultiplier
  const baseDy =
    HERO_RESONATOR_ANCHOR_CONFIG.waveExtrudeDy *
    HERO_RESONATOR_ANCHOR_CONFIG.waveExtrudeDyMultiplier

  return WAVE_SLICE_FACTORS.map((f) => {
    const d = m * f
    const sx = 1 - tuckX * d
    const tx = cx * (1 - sx)
    const ty = baseDy * d
    return `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${sx.toFixed(4)} 1)`
  })
})

// Seamless 2-cycle Brandsta-Blue + Light-Blue wave gradient window (-100%..100% -> 0%..200%)
const waveGradX1 = computed(() => `${(-100 + wavePhaseOffset.value * 100).toFixed(2)}%`)
const waveGradX2 = computed(() => `${(100 + wavePhaseOffset.value * 100).toFixed(2)}%`)

// Crisp Left-to-Right Alloy Polish Sweep Coordinates
const alloySheenCoords = computed(() => {
  const p = alloyPolishProgress.value
  const x1 = -56 + p * 160
  return {
    x1: `${x1.toFixed(1)}%`,
    y1: '0%',
    x2: `${(x1 + 52).toFixed(1)}%`,
    y2: '6%',
  }
})

// Internal measurement & animation scalars (zero GC allocations inside rAF)
let flipDeltaX = 0
let flipDeltaY = 0
let isSplitViewport = true
let isInViewport = true

let rafId: number | null = null
let startTimestamp = 0
let lastTimestamp = 0
let idleElapsed = 0

let baseWavePhase = 0
let pointerNormX = 0
let smoothPointerX = 0
let prevPointerClientX = -1
let prevPointerClientY = -1
let pointerWaveSurge = 0
let frozenPointerPhase = 0
let wasFlowFrozen = false

let clickAuraElapsed = -1
let smoothedAura = 0

let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let selfPulseTimer: ReturnType<typeof setTimeout> | null = null
let previousScrollRestoration: ScrollRestoration | null = null

function setDocumentScrollLock(locked: boolean) {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  const body = document.body
  if (locked) {
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
  } else {
    html.style.overflow = ''
    body.style.overflow = ''
  }
}

function detectSplitLayoutMode(): boolean {
  if (typeof window === 'undefined') return true
  const w = window.innerWidth
  const h = Math.max(1, window.innerHeight)
  const aspect = w / h
  if (w >= 1024) return true
  if (w >= 660 && aspect >= 10 / 11) return true
  if (h <= 540 && w > h) return true
  return false
}

function lockStationaryAnchorState() {
  carrierTx.value = 0
  carrierTy.value = 0
  carrierScale.value = 1
  gimbalRotY.value = HERO_RESONATOR_ANCHOR_CONFIG.restRotY
  gimbalRotX.value = HERO_RESONATOR_ANCHOR_CONFIG.restRotX
  gimbalRotZ.value = HERO_RESONATOR_ANCHOR_CONFIG.restRotZ
  shellGap.value = 0
}

function measureBerthToCenterDelta() {
  const el = berthAnchorEl.value
  if (!el || typeof window === 'undefined') return
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const berthCenterX = rect.left + rect.width * 0.5
  const berthCenterY = rect.top + rect.height * 0.5
  flipDeltaX = window.innerWidth * 0.5 - berthCenterX
  flipDeltaY = window.innerHeight * 0.5 - berthCenterY
  isSplitViewport = detectSplitLayoutMode()

  if (!isLoaderActive.value) {
    lockStationaryAnchorState()
  }
}

function triggerClickResonance(clientX = 0, clientY = 0, source: 'self' | 'user' = 'user') {
  if (isLoaderActive.value || (!isInViewport && source !== 'self')) return

  // Trigger 0.92s foreground Pakka Brandsta-blue wave aura + brief flow pause
  clickAuraElapsed = smoothedAura > 0.25 ? 0.08 : 0.0

  const el = berthAnchorEl.value
  let originX = clientX
  let originY = clientY
  if (el) {
    const rect = el.getBoundingClientRect()
    originX = rect.left + rect.width * 0.5
    originY = rect.top + rect.height * 0.54
  }

  emit('clickResonance', {
    timestamp: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    originX,
    originY,
    auraDuration: HERO_RESONATOR_ANCHOR_CONFIG.clickAuraDuration,
    source,
  })

  ensureLoopRunning()
}

function onWindowPointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  triggerClickResonance(e.clientX, e.clientY, 'user')
}

function onWindowPointerMove(e: PointerEvent) {
  if (e.pointerType === 'touch' || typeof window === 'undefined') return
  const w = Math.max(1, window.innerWidth)
  const h = Math.max(1, window.innerHeight)
  pointerNormX = clamp((e.clientX / w) * 2 - 1, -1, 1)

  if (prevPointerClientX >= 0 && prevPointerClientY >= 0) {
    const dx = (e.clientX - prevPointerClientX) / w
    const dy = (e.clientY - prevPointerClientY) / h
    const dist = Math.hypot(dx, dy)
    pointerWaveSurge = Math.min(
      HERO_RESONATOR_ANCHOR_CONFIG.pointerSurgeMax,
      pointerWaveSurge + dist * HERO_RESONATOR_ANCHOR_CONFIG.pointerSurgeGain * 4.2,
    )
  }
  prevPointerClientX = e.clientX
  prevPointerClientY = e.clientY
}

function onWindowPointerLeave() {
  pointerNormX = 0
  prevPointerClientX = -1
  prevPointerClientY = -1
}

function tickFrame(ts: number) {
  if (!startTimestamp) startTimestamp = ts
  if (!lastTimestamp) lastTimestamp = ts
  const dt = Math.min(0.04, (ts - lastTimestamp) / 1000)
  lastTimestamp = ts

  const totalElapsed = (ts - startTimestamp) / 1000

  // Smooth pointer horizontal focus & kinetic decay
  const ptrAlpha = 1 - Math.exp(-HERO_RESONATOR_ANCHOR_CONFIG.pointerDampingRate * dt)
  smoothPointerX += (pointerNormX - smoothPointerX) * ptrAlpha
  if (pointerWaveSurge > 0.001) {
    pointerWaveSurge *= Math.exp(-HERO_RESONATOR_ANCHOR_CONFIG.pointerSurgeDecay * dt)
    if (pointerWaveSurge < 0.001) pointerWaveSurge = 0
  }

  if (isLoaderActive.value) {
    // 1. Calm dead-center 2D Brandsta wave left-to-right sweep
    const pWave = easePoisedReveal(
      stageProgress(
        totalElapsed,
        HERO_LOADER_CHOREOGRAPHY.waveDrawStart,
        HERO_LOADER_CHOREOGRAPHY.waveDrawDuration,
      ),
    )
    waveRevealWidth.value = pWave * 516
    waveLeadFlareX.value = 156 + pWave * 498
    waveLeadFlareOpacity.value = Math.sin(Math.PI * pWave) * 0.82

    // 2. Dead-center 2D bright-white shells materialize around the wave
    const pShellAppear = easePoisedReveal(
      stageProgress(
        totalElapsed,
        HERO_LOADER_CHOREOGRAPHY.shell2DAppearStart,
        HERO_LOADER_CHOREOGRAPHY.shell2DAppearDuration,
      ),
    )
    shellOpacity.value = pShellAppear

    // 3. Weighted cinematic FLIP glide (Dead-Center -> Exact Permanent Hero Berth)
    const rawGlide = stageProgress(
      totalElapsed,
      HERO_LOADER_CHOREOGRAPHY.spatialGlideStart,
      HERO_LOADER_CHOREOGRAPHY.spatialGlideDuration,
    )
    const pGlide = easeCinematicGlide(rawGlide)
    const startScale = isSplitViewport
      ? HERO_LOADER_CHOREOGRAPHY.centerIgnitionScaleDesktop
      : HERO_LOADER_CHOREOGRAPHY.centerIgnitionScaleCompact

    carrierTx.value = lerp(flipDeltaX, 0, pGlide)
    carrierTy.value = lerp(flipDeltaY, 0, pGlide)
    carrierScale.value = lerp(startScale, 1.0, pGlide)

    // 4. Centered symmetrical inward 2D -> 3D extrusion & magnetic clamp
    const pMorph = easeCinematicGlide(
      stageProgress(
        totalElapsed,
        HERO_LOADER_CHOREOGRAPHY.morph3DStart,
        HERO_LOADER_CHOREOGRAPHY.morph3DDuration,
      ),
    )
    morph3D.value = pMorph

    const pClamp = easeCinematicGlide(
      stageProgress(
        totalElapsed,
        HERO_LOADER_CHOREOGRAPHY.magneticClampStart,
        HERO_LOADER_CHOREOGRAPHY.magneticClampDuration,
      ),
    )
    shellGap.value = lerp(HERO_LOADER_CHOREOGRAPHY.initialOpenShellGap, 0, pClamp)

    gimbalRotY.value = HERO_RESONATOR_ANCHOR_CONFIG.restRotY
    gimbalRotX.value = HERO_RESONATOR_ANCHOR_CONFIG.restRotX
    gimbalRotZ.value = HERO_RESONATOR_ANCHOR_CONFIG.restRotZ

    const lockPulse = Math.sin(Math.PI * clamp((pClamp - 0.3) / 0.7, 0, 1))
    waveAmbientGlow.value = pMorph * 0.24 + lockPulse * 0.22

    alloyPolishProgress.value = pMorph
    alloyPolishOpacity.value = Math.sin(Math.PI * pMorph) * 0.78

    // 5. Dissolve #040a1a obsidian loader veil
    const pVeil = easeVeilDissolve(
      stageProgress(
        totalElapsed,
        HERO_LOADER_CHOREOGRAPHY.veilFadeStart,
        HERO_LOADER_CHOREOGRAPHY.veilFadeDuration,
      ),
    )
    veilOpacity.value = 1 - pVeil

    baseWavePhase =
      (baseWavePhase + dt * HERO_RESONATOR_ANCHOR_CONFIG.waveBaseFlowSpeed * 1.25) % 1
    wavePhaseOffset.value = baseWavePhase

    if (totalElapsed >= HERO_LOADER_CHOREOGRAPHY.totalLoaderDuration) {
      isLoaderActive.value = false
      veilOpacity.value = 0
      morph3D.value = 1
      shellOpacity.value = 1
      alloyPolishOpacity.value = 0
      waveRevealWidth.value = 520
      waveLeadFlareOpacity.value = 0
      lockStationaryAnchorState()
      setDocumentScrollLock(false)
      emit('loaderStateChange', false)

      selfPulseTimer = setTimeout(() => {
        triggerClickResonance(0, 0, 'self')
      }, HERO_RESONATOR_ANCHOR_CONFIG.selfPulseDelayMs)
    }
  } else {
    // =========================================================================
    // STAGE 3: PURE FLUSH MONUMENT ANCHOR + ALLOY SHEEN + LIVING INNER WAVE
    // =========================================================================
    idleElapsed += dt

    // 1. Advance 0.92s Click-Triggered Foreground Wave Aura
    let targetAura = 0
    if (clickAuraElapsed >= 0) {
      clickAuraElapsed += dt
      if (clickAuraElapsed >= HERO_RESONATOR_ANCHOR_CONFIG.clickAuraDuration) {
        clickAuraElapsed = -1
        targetAura = 0
      } else {
        targetAura = evaluateClickAuraEnvelope(clickAuraElapsed)
      }
    }

    const auraTrack = 1 - Math.exp(-HERO_RESONATOR_ANCHOR_CONFIG.clickAuraSmoothingRate * dt)
    smoothedAura += (targetAura - smoothedAura) * auraTrack
    if (clickAuraElapsed < 0 && smoothedAura < 0.002) {
      smoothedAura = 0
    }
    clickAuraLevel.value = Number(smoothedAura.toFixed(4))

    // 2. Brief Wave-Flow Pause while Pakka Brandsta-Blue Wave Aura Holds
    const flowPauseMultiplier = 1 - smoothstep(0.10, 0.42, smoothedAura)
    const activeWaveSpeed =
      (HERO_RESONATOR_ANCHOR_CONFIG.waveBaseFlowSpeed + pointerWaveSurge) * flowPauseMultiplier

    baseWavePhase = (baseWavePhase + dt * activeWaveSpeed) % 1

    const livePtrShift = smoothPointerX * HERO_RESONATOR_ANCHOR_CONFIG.pointerPhaseInfluence
    if (flowPauseMultiplier < 0.08 && !wasFlowFrozen) {
      frozenPointerPhase = livePtrShift
      wasFlowFrozen = true
    } else if (flowPauseMultiplier >= 0.08) {
      wasFlowFrozen = false
    }

    const effectivePtrShift = lerp(frozenPointerPhase, livePtrShift, flowPauseMultiplier)
    wavePhaseOffset.value = (baseWavePhase + effectivePtrShift + 1) % 1

    const harmonicPulse = 0.5 + 0.5 * Math.sin(idleElapsed * 1.35)
    waveAmbientGlow.value = 0.22 + harmonicPulse * 0.07 + pointerWaveSurge * 0.16

    // 3. Left-to-Right Alloy Polish Sweep on a Near 2-Wave Interval (~5.18s period, 1.45s sweep)
    const polishElapsed = idleElapsed - HERO_RESONATOR_ANCHOR_CONFIG.alloyPolishInitialDelay
    if (polishElapsed < 0) {
      alloyPolishOpacity.value = 0
    } else {
      const cyclePos = polishElapsed % HERO_RESONATOR_ANCHOR_CONFIG.alloyPolishPeriod
      const sweepDur = HERO_RESONATOR_ANCHOR_CONFIG.alloyPolishSweepDuration
      if (cyclePos <= sweepDur) {
        const rawSweep = cyclePos / sweepDur
        alloyPolishProgress.value = easeAlloySweep(rawSweep)
        alloyPolishOpacity.value =
          Math.sin(Math.PI * rawSweep) *
          HERO_RESONATOR_ANCHOR_CONFIG.alloyPolishPeakOpacity *
          (1 - smoothedAura * 0.5)
      } else {
        alloyPolishOpacity.value = 0
      }
    }
  }

  if (isLoaderActive.value || isInViewport) {
    rafId = requestAnimationFrame(tickFrame)
  } else {
    rafId = null
    lastTimestamp = 0
  }
}

function ensureLoopRunning() {
  if (rafId === null && typeof window !== 'undefined') {
    lastTimestamp = 0
    rafId = requestAnimationFrame(tickFrame)
  }
}

defineExpose({
  triggerClickResonance,
})

onMounted(() => {
  isSplitViewport = detectSplitLayoutMode()

  if (isLoaderActive.value) {
    if ('scrollRestoration' in window.history) {
      previousScrollRestoration = window.history.scrollRestoration
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
    setDocumentScrollLock(true)
    emit('loaderStateChange', true)

    measureBerthToCenterDelta()
    carrierTx.value = flipDeltaX
    carrierTy.value = flipDeltaY
    carrierScale.value = isSplitViewport
      ? HERO_LOADER_CHOREOGRAPHY.centerIgnitionScaleDesktop
      : HERO_LOADER_CHOREOGRAPHY.centerIgnitionScaleCompact
    gimbalRotX.value = 0
    gimbalRotY.value = 0
    gimbalRotZ.value = 0
    shellGap.value = HERO_LOADER_CHOREOGRAPHY.initialOpenShellGap
    isReadyToPaint.value = true
  } else {
    lockStationaryAnchorState()
    emit('loaderStateChange', false)
    selfPulseTimer = setTimeout(() => {
      triggerClickResonance(0, 0, 'self')
    }, HERO_RESONATOR_ANCHOR_CONFIG.spaReturnPulseDelayMs)
  }

  window.addEventListener('pointerdown', onWindowPointerDown, { passive: true })
  window.addEventListener('pointermove', onWindowPointerMove, { passive: true })
  window.addEventListener('pointerleave', onWindowPointerLeave, { passive: true })

  if (typeof ResizeObserver !== 'undefined' && berthAnchorEl.value) {
    resizeObserver = new ResizeObserver(() => {
      measureBerthToCenterDelta()
    })
    resizeObserver.observe(document.documentElement)
  }

  if (typeof IntersectionObserver !== 'undefined' && berthAnchorEl.value) {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? true
        isInViewport = visible
        if (visible) ensureLoopRunning()
      },
      { threshold: 0.04 },
    )
    intersectionObserver.observe(berthAnchorEl.value)
  }

  ensureLoopRunning()
})

onBeforeUnmount(() => {
  setDocumentScrollLock(false)
  if (
    previousScrollRestoration &&
    typeof window !== 'undefined' &&
    'scrollRestoration' in window.history
  ) {
    window.history.scrollRestoration = previousScrollRestoration
  }
  window.removeEventListener('pointerdown', onWindowPointerDown)
  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('pointerleave', onWindowPointerLeave)
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
  if (selfPulseTimer !== null) {
    clearTimeout(selfPulseTimer)
    selfPulseTimer = null
  }
})
</script>

<template>
  <!-- Permanent Hero Berth Reference Box (Never transformed -> 0.000 CLS & exact FLIP coordinates) -->
  <div
    ref="berthAnchorEl"
    class="resonator-berth-anchor relative aspect-578/584 w-full overflow-visible select-none"
    :class="isLoaderActive ? 'z-50' : 'z-20'"
  >
    <!-- Full-Viewport Obsidian Loader Curtain -->
    <div
      v-if="isLoaderActive || veilOpacity > 0.004"
      aria-hidden="true"
      class="loader-obsidian-veil pointer-events-none fixed inset-0 z-40"
      :style="{ opacity: veilOpacity.toFixed(3) }"
    />

    <!-- GPU FLIP Spatial Carrier -->
    <div
      class="resonator-spatial-carrier relative z-50 h-full w-full overflow-visible"
      :style="carrierStyle"
    >
      <!-- 3D Perspective Lens -->
      <div class="resonator-perspective-stage relative z-10 h-full w-full overflow-visible">
        <div
          class="resonator-3d-gimbal relative h-full w-full overflow-visible"
          :style="gimbalStyle"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            :viewBox="RESONATOR_PATHS.viewBox"
            role="img"
            aria-label="Brandsta 3D Resonator Anchor"
            focusable="false"
            class="relative z-10 block h-full w-full overflow-visible"
          >
            <defs>
              <!-- Single-Source Master Geometry Definitions -->
              <path :id="`topArchGeo-${uid}`" :d="RESONATOR_PATHS.topArch" />
              <path :id="`botCradleGeo-${uid}`" :d="RESONATOR_PATHS.bottomCradle" />
              <path :id="`innerWaveGeo-${uid}`" :d="RESONATOR_PATHS.innerWave" />

              <!-- Beat 1 Left-to-Right Wave Ignition Clip -->
              <clipPath :id="`waveIgnitionClip-${uid}`">
                <rect
                  x="152"
                  y="195"
                  :width="waveRevealWidth.toFixed(1)"
                  height="210"
                />
              </clipPath>

              <!-- 2D Crisp Gradient Bright-White Opening Fill -->
              <linearGradient :id="`blueprint2DFill-${uid}`" x1="22%" y1="0%" x2="78%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="56%" stop-color="#f2f7ff" />
                <stop offset="100%" stop-color="#d8e6f8" />
              </linearGradient>

              <!-- 3D Sculpted Gradient Bright-White Front Face -->
              <linearGradient :id="`titaniumFace-${uid}`" x1="24%" y1="0%" x2="76%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="34%" stop-color="#f8fbff" />
                <stop offset="68%" stop-color="#e5effc" />
                <stop offset="90%" stop-color="#cfdff4" />
                <stop offset="100%" stop-color="#dce9fa" />
              </linearGradient>

              <!-- Faster Left-to-Right Cool Alloy Polish Band (~2-Wave Interval) -->
              <linearGradient
                :id="`titaniumAlloyPolish-${uid}`"
                :x1="alloySheenCoords.x1"
                :y1="alloySheenCoords.y1"
                :x2="alloySheenCoords.x2"
                :y2="alloySheenCoords.y2"
              >
                <stop offset="0%" stop-color="#c4d7f0" stop-opacity="0" />
                <stop offset="32%" stop-color="#9cb5d6" stop-opacity="0.28" />
                <stop offset="50%" stop-color="#ffffff" stop-opacity="0.86" />
                <stop offset="68%" stop-color="#8dadde" stop-opacity="0.30" />
                <stop offset="100%" stop-color="#dce9fa" stop-opacity="0" />
              </linearGradient>

              <!-- Symmetrical Machined Silver-Slate 3D Extrusion Sidewalls -->
              <linearGradient :id="`titaniumSidewall-${uid}`" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stop-color="#6c80a1" />
                <stop offset="38%" stop-color="#899ebe" />
                <stop offset="74%" stop-color="#46597a" />
                <stop offset="100%" stop-color="#2f4160" />
              </linearGradient>

              <!-- Crisp Specular White-Ice Chamfer Rim -->
              <linearGradient :id="`chamferRim-${uid}`" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.92" />
                <stop offset="52%" stop-color="#e0eeff" stop-opacity="0.58" />
                <stop offset="100%" stop-color="#9cc2f5" stop-opacity="0.48" />
              </linearGradient>

              <!-- Living Brandsta Blue + Crisp Light Glacier Blue Wave -->
              <linearGradient
                :id="`livingWaveGrad-${uid}`"
                :x1="waveGradX1"
                y1="12%"
                :x2="waveGradX2"
                y2="0%"
              >
                <stop offset="0%" stop-color="#00268c" />
                <stop offset="11%" stop-color="#0048ff" />
                <stop offset="20%" stop-color="#1870ff" />
                <stop offset="27%" stop-color="#8ad4ff" />
                <stop offset="34%" stop-color="#125dfd" />
                <stop offset="42%" stop-color="#003ee0" />
                <stop offset="50%" stop-color="#00268c" />
                <stop offset="61%" stop-color="#0048ff" />
                <stop offset="70%" stop-color="#1870ff" />
                <stop offset="77%" stop-color="#8ad4ff" />
                <stop offset="84%" stop-color="#125dfd" />
                <stop offset="92%" stop-color="#003ee0" />
                <stop offset="100%" stop-color="#00268c" />
              </linearGradient>

              <!-- 0.92s Click-Paused Pakka Bright Brandsta-Blue Wave Lock Fill -->
              <linearGradient :id="`pakkaClickWaveGrad-${uid}`" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#0040eb" />
                <stop offset="26%" stop-color="#0048ff" />
                <stop offset="50%" stop-color="#1f75ff" />
                <stop offset="74%" stop-color="#0048ff" />
                <stop offset="100%" stop-color="#0040eb" />
              </linearGradient>

              <!-- Extruded 3D Brandsta-Cobalt Wave Underside -->
              <linearGradient
                :id="`waveSidewall-${uid}`"
                gradientUnits="userSpaceOnUse"
                x1="406"
                y1="220"
                x2="406"
                y2="366"
              >
                <stop offset="0%" stop-color="#002b99" />
                <stop offset="58%" stop-color="#003fd6" />
                <stop offset="100%" stop-color="#1464ff" />
              </linearGradient>

              <!-- Horizontal Luminance Taper: Zero at ends -> Faint on curves -> Solid in center -->
              <linearGradient
                :id="`waveCurveMaskGrad-${uid}`"
                gradientUnits="userSpaceOnUse"
                x1="162"
                y1="0"
                x2="648"
                y2="0"
              >
                <stop offset="0%" stop-color="#000000" />
                <stop offset="12%" stop-color="#0a0a0a" />
                <stop offset="24%" stop-color="#4d4d4d" />
                <stop offset="38%" stop-color="#d4d4d4" />
                <stop offset="50%" stop-color="#ffffff" />
                <stop offset="62%" stop-color="#d4d4d4" />
                <stop offset="76%" stop-color="#4d4d4d" />
                <stop offset="88%" stop-color="#0a0a0a" />
                <stop offset="100%" stop-color="#000000" />
              </linearGradient>

              <!-- Tighter Center-Only Luminance Bell for the Extra Center Padding -->
              <linearGradient
                :id="`waveCenterMaskGrad-${uid}`"
                gradientUnits="userSpaceOnUse"
                x1="162"
                y1="0"
                x2="648"
                y2="0"
              >
                <stop offset="0%" stop-color="#000000" />
                <stop offset="28%" stop-color="#000000" />
                <stop offset="40%" stop-color="#b8b8b8" />
                <stop offset="50%" stop-color="#ffffff" />
                <stop offset="60%" stop-color="#b8b8b8" />
                <stop offset="72%" stop-color="#000000" />
                <stop offset="100%" stop-color="#000000" />
              </linearGradient>

              <mask
                :id="`waveCurveDepthMask-${uid}`"
                maskUnits="userSpaceOnUse"
                x="150"
                y="210"
                width="510"
                height="175"
              >
                <rect x="150" y="210" width="510" height="175" :fill="`url(#waveCurveMaskGrad-${uid})`" />
              </mask>

              <mask
                :id="`waveCenterFocusMask-${uid}`"
                maskUnits="userSpaceOnUse"
                x="150"
                y="210"
                width="510"
                height="175"
              >
                <rect x="150" y="210" width="510" height="175" :fill="`url(#waveCenterMaskGrad-${uid})`" />
              </mask>

              <!-- Leading Brandsta-Blue Photon Point for Beat 1 Wave Sweep -->
              <radialGradient :id="`waveLeadFlare-${uid}`" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#bae6fd" stop-opacity="0.90" />
                <stop offset="38%" stop-color="#38bdf8" stop-opacity="0.58" />
                <stop offset="72%" stop-color="#0048ff" stop-opacity="0.28" />
                <stop offset="100%" stop-color="#0048ff" stop-opacity="0" />
              </radialGradient>
            </defs>

            <!-- =====================================================
                 GROUP 1: SYMMETRICAL INWARD-TUCKED 3D SIDEWALLS
                 ===================================================== -->
            <g
              v-if="morph3D > 0.01"
              :opacity="(shellOpacity * morph3D).toFixed(3)"
              :class="isLoaderActive ? '' : 'resonator-svg-hit cursor-clickable cursor-blue'"
            >
              <use
                v-for="(tStr, idx) in topExtrudeTransforms"
                :key="`top-ext-${idx}`"
                :href="`#topArchGeo-${uid}`"
                :transform="tStr"
                :fill="`url(#titaniumSidewall-${uid})`"
                :opacity="(0.68 + (idx / TITANIUM_SLICE_FACTORS.length) * 0.28).toFixed(2)"
              />
              <use
                v-for="(tStr, idx) in bottomExtrudeTransforms"
                :key="`bot-ext-${idx}`"
                :href="`#botCradleGeo-${uid}`"
                :transform="tStr"
                :fill="`url(#titaniumSidewall-${uid})`"
                :opacity="(0.68 + (idx / TITANIUM_SLICE_FACTORS.length) * 0.28).toFixed(2)"
              />
            </g>

            <!-- =====================================================
                 GROUP 2: SOLID GRADIENT BRIGHT-WHITE FRONT ANCHOR
                 + FASTER LEFT-TO-RIGHT ALLOY POLISH (~2-WAVE INTERVAL)
                 ===================================================== -->
            <g
              :opacity="shellOpacity.toFixed(3)"
              :class="isLoaderActive ? '' : 'resonator-svg-hit cursor-clickable cursor-blue'"
            >
              <!-- Top Arch -->
              <g :transform="topFrontTransform">
                <use
                  :href="`#topArchGeo-${uid}`"
                  :fill="`url(#blueprint2DFill-${uid})`"
                />
                <use
                  :href="`#topArchGeo-${uid}`"
                  :fill="`url(#titaniumFace-${uid})`"
                  :opacity="morph3D.toFixed(3)"
                />
                <use
                  v-if="alloyPolishOpacity > 0.004"
                  :href="`#topArchGeo-${uid}`"
                  :fill="`url(#titaniumAlloyPolish-${uid})`"
                  :opacity="(morph3D * alloyPolishOpacity).toFixed(3)"
                />
                <use
                  :href="`#topArchGeo-${uid}`"
                  fill="none"
                  :stroke="`url(#chamferRim-${uid})`"
                  :stroke-width="(0.9 + morph3D * 0.35).toFixed(2)"
                  :opacity="(0.55 + morph3D * 0.35).toFixed(3)"
                />
              </g>

              <!-- Bottom Cradle -->
              <g :transform="bottomFrontTransform">
                <use
                  :href="`#botCradleGeo-${uid}`"
                  :fill="`url(#blueprint2DFill-${uid})`"
                />
                <use
                  :href="`#botCradleGeo-${uid}`"
                  :fill="`url(#titaniumFace-${uid})`"
                  :opacity="morph3D.toFixed(3)"
                />
                <use
                  v-if="alloyPolishOpacity > 0.004"
                  :href="`#botCradleGeo-${uid}`"
                  :fill="`url(#titaniumAlloyPolish-${uid})`"
                  :opacity="(morph3D * alloyPolishOpacity).toFixed(3)"
                />
                <use
                  :href="`#botCradleGeo-${uid}`"
                  fill="none"
                  :stroke="`url(#chamferRim-${uid})`"
                  :stroke-width="(0.9 + morph3D * 0.35).toFixed(2)"
                  :opacity="(0.55 + morph3D * 0.35).toFixed(3)"
                />
              </g>
            </g>

            <!-- =====================================================
                 GROUP 3: FOREGROUND BRANDSTA-BLUE WAVE + WAVE AURA
                 ===================================================== -->
            <g
              :clip-path="`url(#waveIgnitionClip-${uid})`"
              :class="isLoaderActive ? '' : 'resonator-svg-hit cursor-clickable cursor-gold'"
            >
              <!-- Wave-Contour Aura -->
              <use
                :href="`#innerWaveGeo-${uid}`"
                fill="none"
                stroke="#0048ff"
                :stroke-width="(11 + clickAuraLevel * 12).toFixed(1)"
                stroke-linejoin="round"
                :opacity="(0.18 + waveAmbientGlow * 0.38 + clickAuraLevel * 0.44).toFixed(3)"
                class="wave-aura-blur pointer-events-none"
              />

              <!-- Tight Pakka-Blue Inner Wave Aura Halo on Click -->
              <use
                v-if="clickAuraLevel > 0.004"
                :href="`#innerWaveGeo-${uid}`"
                fill="none"
                stroke="#2979ff"
                stroke-width="6.5"
                stroke-linejoin="round"
                :opacity="(clickAuraLevel * 0.72).toFixed(3)"
                class="wave-click-core-blur pointer-events-none"
              />

              <!-- 3D Extruded Wave Underside: Faint & shallow on curves, slightly deeper in center -->
              <g v-if="morph3D > 0.01" :opacity="morph3D.toFixed(3)">
                <g :mask="`url(#waveCenterFocusMask-${uid})`">
                  <use
                    v-for="(wStr, idx) in waveExtrudeTransforms.slice(0, 2)"
                    :key="`wave-ext-center-${idx}`"
                    :href="`#innerWaveGeo-${uid}`"
                    :transform="wStr"
                    :fill="`url(#waveSidewall-${uid})`"
                    :stroke="idx === 0 ? '#3b9eff' : undefined"
                    :stroke-width="idx === 0 ? '0.65' : undefined"
                    :stroke-opacity="idx === 0 ? '0.42' : undefined"
                  />
                </g>

                <g :mask="`url(#waveCurveDepthMask-${uid})`">
                  <use
                    v-for="(wStr, idx) in waveExtrudeTransforms.slice(2)"
                    :key="`wave-ext-curve-${idx}`"
                    :href="`#innerWaveGeo-${uid}`"
                    :transform="wStr"
                    :fill="`url(#waveSidewall-${uid})`"
                  />
                </g>
              </g>

              <!-- Primary Living Brandsta-Blue + Light-Blue Wave Fill -->
              <use
                :href="`#innerWaveGeo-${uid}`"
                :fill="`url(#livingWaveGrad-${uid})`"
              />

              <!-- 0.92s Click-Paused Pakka Bright Brandsta-Blue Lock Overlay -->
              <use
                v-if="clickAuraLevel > 0.004"
                :href="`#innerWaveGeo-${uid}`"
                :fill="`url(#pakkaClickWaveGrad-${uid})`"
                :opacity="(clickAuraLevel * 0.88).toFixed(3)"
              />

              <!-- Crisp Dimensional Flush Edge Bevel -->
              <use
                :href="`#innerWaveGeo-${uid}`"
                fill="none"
                :stroke="innerRimBaseColor"
                :stroke-width="(1.0 + clickAuraLevel * 0.45).toFixed(2)"
                :opacity="(0.18 + morph3D * 0.24 + clickAuraLevel * 0.42).toFixed(3)"
              />
            </g>

            <!-- Beat 1 Leading-Edge Ignition Point -->
            <circle
              v-if="waveLeadFlareOpacity > 0.01"
              :cx="waveLeadFlareX.toFixed(1)"
              cy="308"
              r="32"
              :fill="`url(#waveLeadFlare-${uid})`"
              :opacity="waveLeadFlareOpacity.toFixed(3)"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loader-obsidian-veil {
  background:
    radial-gradient(circle at 50% 50%, rgba(6, 20, 56, 0.38) 0%, rgba(4, 10, 26, 0.98) 62%, #040a1a 100%),
    #040a1a;
  will-change: opacity;
}

.resonator-spatial-carrier {
  transform-origin: 50% 50%;
  backface-visibility: hidden;
  will-change: transform, opacity;
}

.resonator-perspective-stage {
  perspective: 1180px;
  perspective-origin: 50% 50%;
}

.resonator-3d-gimbal {
  transform-style: preserve-3d;
  transform-origin: 50% 50%;
  backface-visibility: hidden;
  will-change: transform;
  filter: drop-shadow(0 20px 38px rgba(0, 8, 28, 0.72));
}

.wave-aura-blur {
  filter: blur(5px);
}

.wave-click-core-blur {
  filter: blur(2.5px);
}

.resonator-svg-hit {
  pointer-events: visiblePainted;
  cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
  .resonator-svg-hit {
    cursor: none;
  }
}
</style>