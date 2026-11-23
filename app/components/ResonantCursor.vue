<!-- app/components/ResonantCursor.vue -->
<script setup lang="ts">
import { ref, computed, useId, onMounted, onUnmounted } from 'vue'

export type ResonantCursorTier = 'default' | 'hoverable' | 'clickable'
export type ResonantCursorPalette = 'blue' | 'gold' | 'dual'

/**
 * Centralized 3-Tier Signature Kinetic Cursor Physics & Scale Dials
 * Base SVG primary ring diameter = 48px (r=24), outer orbital diameter = 60px (r=30) at scale 1.0
 */
const CURSOR_CONFIG = {
  // Frame-rate-independent exponential tracking rates
  dotFollowRate: 42.0,
  ringFollowRate: 12.5,
  scaleFollowRate: 17.0,
  stretchFollowRate: 14.5,

  // Unpressed tier scales (Default ~32.6px -> Hoverable ~43.2px -> Clickable ~50.4px + 63px orbit)
  defaultScale: 0.68,
  hoverableScale: 0.9,
  clickableScale: 1.05,

  // Pressed inward-cinch scales (paired with compensated thicker strokes in CSS)
  pressedDefaultScale: 0.56,
  pressedHoverableScale: 0.78,
  pressedClickableScale: 0.91,

  // Subtle liquid droplet stretch on fast open-space sweeps (locks to 1:1 circle on hover/click)
  velocityStretchGain: 0.0022,
  maxVelocityStretch: 0.14,

  // Detached click shockwave duration (ms) & loop sleep threshold
  clickPulseDurationMs: 500,
  idleSleepEpsilon: 0.04,
} as const

const TIER_SELECTOR =
  '.cursor-clickable, .cursor-hoverable, .cursor-default, [data-cursor], [data-resonant-hover], a, button, [role="button"]'

const PALETTE_SELECTOR =
  '.cursor-gold, .cursor-astral, .cursor-blue, .cursor-dual, [data-cursor-color], [data-resonant-accent], [data-fluid]'

const uid = useId()

const isEnabled = ref(false)
const isVisible = ref(false)
const activeTier = ref<ResonantCursorTier>('default')
const activePalette = ref<ResonantCursorPalette>('blue')
const isPressed = ref(false)

const dotWrapEl = ref<HTMLDivElement | null>(null)
const ringPosEl = ref<HTMLDivElement | null>(null)
const ringDeformEl = ref<HTMLDivElement | null>(null)
const ringCounterRotEl = ref<HTMLDivElement | null>(null)
const pulsePosEl = ref<HTMLDivElement | null>(null)
const pulseSvgEl = ref<SVGSVGElement | null>(null)

// Explicitly typed as `number` so `as const` config literals never narrow mutable bindings
let targetX: number = 0
let targetY: number = 0
let dotX: number = 0
let dotY: number = 0
let ringX: number = 0
let ringY: number = 0
let currentScale: number = CURSOR_CONFIG.defaultScale
let smoothStretch: number = 0
let lastAngleDeg: number = 0

let rafId: number | null = null
let scrollCheckRafId: number | null = null
let lastTs: number = 0
let isPageHidden = false
let prefersReducedMotion = false
let lastInspectedTarget: EventTarget | null = null

const tierClass = computed(() => `tier-${activeTier.value}`)
const paletteClass = computed(() => `palette-${activePalette.value}`)

const primaryStrokeUrl = computed(() => {
  if (activePalette.value === 'gold') return `url(#cursorRingGold-${uid})`
  return `url(#cursorRingBlue-${uid})`
})

const orbitalStrokeUrl = computed(() => {
  if (activePalette.value === 'dual') return `url(#cursorOrbitDual-${uid})`
  if (activePalette.value === 'gold') return `url(#cursorOrbitGold-${uid})`
  return `url(#cursorOrbitBlue-${uid})`
})

const chamberGlowUrl = computed(() => {
  if (activePalette.value === 'gold') return `url(#cursorChamberGold-${uid})`
  return `url(#cursorChamberBlue-${uid})`
})

function computeTargetScale(): number {
  const tier = activeTier.value
  if (tier === 'clickable') {
    return isPressed.value
      ? CURSOR_CONFIG.pressedClickableScale
      : CURSOR_CONFIG.clickableScale
  }
  if (tier === 'hoverable') {
    return isPressed.value
      ? CURSOR_CONFIG.pressedHoverableScale
      : CURSOR_CONFIG.hoverableScale
  }
  return isPressed.value
    ? CURSOR_CONFIG.pressedDefaultScale
    : CURSOR_CONFIG.defaultScale
}

function resolveTier(el: Element | null): ResonantCursorTier {
  if (!el) return 'default'
  const match = el.closest(TIER_SELECTOR)
  if (!match) return 'default'

  if (match.classList.contains('cursor-default')) return 'default'

  const dataCursor = match.getAttribute('data-cursor')
  const dataResonant = match.getAttribute('data-resonant-hover')

  if (
    match.classList.contains('cursor-hoverable') ||
    dataCursor === 'hoverable' ||
    dataResonant === 'hoverable'
  ) {
    return 'hoverable'
  }

  return 'clickable'
}

function resolvePalette(el: Element | null): ResonantCursorPalette {
  if (!el) return 'blue'
  const match = el.closest(PALETTE_SELECTOR)
  if (match) {
    if (
      match.classList.contains('cursor-dual') ||
      match.getAttribute('data-cursor-color') === 'dual' ||
      match.getAttribute('data-resonant-accent') === 'resonator'
    ) {
      return 'dual'
    }

    if (
      match.classList.contains('cursor-gold') ||
      match.classList.contains('cursor-astral') ||
      match.getAttribute('data-cursor-color') === 'gold' ||
      match.getAttribute('data-resonant-accent') === 'gold' ||
      match.getAttribute('data-fluid') === 'gold'
    ) {
      return 'gold'
    }

    if (
      match.classList.contains('cursor-blue') ||
      match.getAttribute('data-cursor-color') === 'blue' ||
      match.getAttribute('data-resonant-accent') === 'blue' ||
      match.getAttribute('data-fluid') === 'blue'
    ) {
      return 'blue'
    }
  }

  return 'blue'
}

function updateStateFromTarget(rawTarget: EventTarget | null) {
  if (rawTarget === lastInspectedTarget) return
  lastInspectedTarget = rawTarget

  const el = rawTarget instanceof Element ? rawTarget : null
  const nextTier = resolveTier(el)
  const nextPalette = nextTier === 'default' ? 'blue' : resolvePalette(el)

  if (nextTier !== activeTier.value) {
    activeTier.value = nextTier
  }
  if (nextPalette !== activePalette.value) {
    activePalette.value = nextPalette
  }
}

function startLoop() {
  if (rafId !== null || isPageHidden || !isEnabled.value) return
  lastTs = 0
  rafId = window.requestAnimationFrame(tick)
}

function stopLoop() {
  if (rafId !== null) {
    window.cancelAnimationFrame(rafId)
    rafId = null
  }
  lastTs = 0
}

function tick(ts: number) {
  rafId = null
  if (isPageHidden || !isEnabled.value) return

  const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 1 / 60
  lastTs = ts

  const dotAlpha = 1 - Math.exp(-CURSOR_CONFIG.dotFollowRate * dt)
  const ringAlpha = 1 - Math.exp(-CURSOR_CONFIG.ringFollowRate * dt)
  const scaleAlpha = 1 - Math.exp(-CURSOR_CONFIG.scaleFollowRate * dt)
  const stretchAlpha = 1 - Math.exp(-CURSOR_CONFIG.stretchFollowRate * dt)

  dotX += (targetX - dotX) * dotAlpha
  dotY += (targetY - dotY) * dotAlpha

  const dx = targetX - ringX
  const dy = targetY - ringY
  ringX += dx * ringAlpha
  ringY += dy * ringAlpha

  const desiredScale = computeTargetScale()
  currentScale += (desiredScale - currentScale) * scaleAlpha

  const dist = Math.hypot(dx, dy)
  const targetStretch =
    activeTier.value !== 'default' || isPressed.value || prefersReducedMotion
      ? 0
      : Math.min(CURSOR_CONFIG.maxVelocityStretch, dist * CURSOR_CONFIG.velocityStretchGain)
  smoothStretch += (targetStretch - smoothStretch) * stretchAlpha

  if (dist > 0.35 && smoothStretch > 0.002) {
    lastAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  }

  if (dotWrapEl.value) {
    dotWrapEl.value.style.transform = `translate3d(${dotX.toFixed(2)}px, ${dotY.toFixed(2)}px, 0)`
  }

  if (ringPosEl.value) {
    ringPosEl.value.style.transform = `translate3d(${ringX.toFixed(2)}px, ${ringY.toFixed(2)}px, 0)`
  }

  if (ringDeformEl.value) {
    if (smoothStretch > 0.002) {
      const sx = currentScale * (1 + smoothStretch)
      const sy = currentScale / Math.sqrt(1 + smoothStretch)
      ringDeformEl.value.style.transform = `rotate(${lastAngleDeg.toFixed(1)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`
      if (ringCounterRotEl.value) {
        ringCounterRotEl.value.style.transform = `rotate(${(-lastAngleDeg).toFixed(1)}deg)`
      }
    } else {
      ringDeformEl.value.style.transform = `scale(${currentScale.toFixed(4)})`
      if (ringCounterRotEl.value) {
        ringCounterRotEl.value.style.transform = 'none'
      }
    }
  }

  const posDelta = Math.abs(targetX - ringX) + Math.abs(targetY - ringY)
  const scaleDelta = Math.abs(desiredScale - currentScale)

  if (
    posDelta > CURSOR_CONFIG.idleSleepEpsilon ||
    scaleDelta > 0.002 ||
    smoothStretch > 0.002 ||
    isPressed.value
  ) {
    rafId = window.requestAnimationFrame(tick)
  } else {
    lastTs = 0
  }
}

function triggerClickShockwave(x: number, y: number) {
  if (prefersReducedMotion || !pulsePosEl.value || !pulseSvgEl.value) return

  pulsePosEl.value.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
  const startScale =
    activeTier.value === 'clickable'
      ? 0.9
      : activeTier.value === 'hoverable'
        ? 0.76
        : 0.56
  const endScale =
    activeTier.value === 'clickable'
      ? 1.62
      : activeTier.value === 'hoverable'
        ? 1.4
        : 1.22

  pulseSvgEl.value.animate(
    [
      { transform: `scale(${startScale})`, opacity: 0.82 },
      { transform: `scale(${endScale})`, opacity: 0 },
    ],
    {
      duration: CURSOR_CONFIG.clickPulseDurationMs,
      easing: 'cubic-bezier(0.16, 0.86, 0.24, 1)',
      fill: 'forwards',
    },
  )
}

function onPointerMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  targetX = e.clientX
  targetY = e.clientY

  updateStateFromTarget(e.target)

  if (!isVisible.value) {
    dotX = targetX
    dotY = targetY
    ringX = targetX
    ringY = targetY
    currentScale = computeTargetScale()
    isVisible.value = true
  }

  startLoop()
}

function onPointerDown(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || e.button !== 0) return
  isPressed.value = true
  updateStateFromTarget(e.target)
  triggerClickShockwave(e.clientX, e.clientY)
  startLoop()
}

function onPointerUp(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  isPressed.value = false
  startLoop()
}

function onWindowScroll() {
  if (!isVisible.value || isPageHidden || scrollCheckRafId !== null) return
  scrollCheckRafId = window.requestAnimationFrame(() => {
    scrollCheckRafId = null
    if (!isVisible.value) return
    const elUnderPointer = document.elementFromPoint(targetX, targetY)
    lastInspectedTarget = null
    updateStateFromTarget(elUnderPointer)
    startLoop()
  })
}

function onPointerLeaveWindow() {
  isVisible.value = false
  isPressed.value = false
  lastInspectedTarget = null
}

function onWindowBlur() {
  isPressed.value = false
}

function onVisibilityChange() {
  isPageHidden = document.visibilityState === 'hidden'
  if (isPageHidden) {
    stopLoop()
  } else if (isVisible.value) {
    startLoop()
  }
}

onMounted(() => {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  if (!finePointer) return

  prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  isEnabled.value = true

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('pointerup', onPointerUp, { passive: true })
  window.addEventListener('scroll', onWindowScroll, { passive: true })
  window.addEventListener('blur', onWindowBlur, { passive: true })
  document.addEventListener('mouseleave', onPointerLeaveWindow, { passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  stopLoop()
  if (scrollCheckRafId !== null) {
    window.cancelAnimationFrame(scrollCheckRafId)
    scrollCheckRafId = null
  }
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('scroll', onWindowScroll)
  window.removeEventListener('blur', onWindowBlur)
  document.removeEventListener('mouseleave', onPointerLeaveWindow)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div
    v-if="isEnabled"
    aria-hidden="true"
    class="resonant-cursor-stage pointer-events-none fixed inset-0 overflow-hidden transition-opacity duration-300"
    :class="[
      isVisible ? 'opacity-100' : 'opacity-0',
      tierClass,
      paletteClass,
      isPressed ? 'is-pressed' : '',
    ]"
  >
    <!-- Detached Concentric Harmonic Click Shockwave -->
    <div ref="pulsePosEl" class="cursor-anchor">
      <svg
        ref="pulseSvgEl"
        viewBox="0 0 72 72"
        class="cursor-pulse-svg"
      >
        <circle
          cx="36"
          cy="36"
          r="24"
          fill="none"
          :stroke="primaryStrokeUrl"
          stroke-width="2.15"
        />
      </svg>
    </div>

    <!-- 3-Tier Kinetic Optical Ring + Orbital Arcs + Vernier Ticks -->
    <div ref="ringPosEl" class="cursor-anchor">
      <div ref="ringDeformEl" class="cursor-deform">
        <div ref="ringCounterRotEl" class="cursor-counter-rot">
          <svg
            viewBox="0 0 72 72"
            class="cursor-ring-svg"
          >
            <defs>
              <!-- Primary Optical Rim Gradients -->
              <linearGradient :id="`cursorRingBlue-${uid}`" x1="14%" y1="10%" x2="86%" y2="90%">
                <stop offset="0%" stop-color="#e0f2fe" stop-opacity="0.96" />
                <stop offset="46%" stop-color="#3898ff" stop-opacity="0.92" />
                <stop offset="100%" stop-color="#0048ff" stop-opacity="0.96" />
              </linearGradient>

              <linearGradient :id="`cursorRingGold-${uid}`" x1="14%" y1="10%" x2="86%" y2="90%">
                <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.98" />
                <stop offset="48%" stop-color="#fbbf24" stop-opacity="0.95" />
                <stop offset="100%" stop-color="#d97706" stop-opacity="0.95" />
              </linearGradient>

              <!-- Outer Kinetic Orbital Arc Gradients -->
              <linearGradient :id="`cursorOrbitBlue-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#bae6fd" />
                <stop offset="50%" stop-color="#2979ff" />
                <stop offset="100%" stop-color="#7cc4ff" />
              </linearGradient>

              <linearGradient :id="`cursorOrbitGold-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fef3c7" />
                <stop offset="50%" stop-color="#f59e0b" />
                <stop offset="100%" stop-color="#fde68a" />
              </linearGradient>

              <!-- Optional Dual-Harmonic Signature (Sapphire Blue <-> 24K Gold) -->
              <linearGradient :id="`cursorOrbitDual-${uid}`" x1="6%" y1="14%" x2="94%" y2="86%">
                <stop offset="0%" stop-color="#bae6fd" />
                <stop offset="36%" stop-color="#1870ff" />
                <stop offset="68%" stop-color="#f59e0b" />
                <stop offset="100%" stop-color="#fde68a" />
              </linearGradient>

              <!-- Subtle Chamber Lens Glows -->
              <radialGradient :id="`cursorChamberBlue-${uid}`" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#0048ff" stop-opacity="0.24" />
                <stop offset="68%" stop-color="#1870ff" stop-opacity="0.09" />
                <stop offset="100%" stop-color="#0048ff" stop-opacity="0" />
              </radialGradient>

              <radialGradient :id="`cursorChamberGold-${uid}`" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.24" />
                <stop offset="68%" stop-color="#d97706" stop-opacity="0.09" />
                <stop offset="100%" stop-color="#b45309" stop-opacity="0" />
              </radialGradient>
            </defs>

            <!-- Inner Acoustic Chamber Lens Sheen -->
            <circle
              cx="36"
              cy="36"
              r="23.5"
              :fill="chamberGlowUrl"
              class="cursor-chamber-fill"
            />

            <!-- Primary Sculpted Optical Ring -->
            <circle
              cx="36"
              cy="36"
              r="24"
              fill="none"
              :stroke="primaryStrokeUrl"
              class="cursor-primary-circle"
            />

            <!-- 4 Cardinal Vernier Lock Ticks (Clickable Tier Exclusive) -->
            <g class="cursor-vernier-ticks" :stroke="primaryStrokeUrl">
              <line x1="36" y1="12" x2="36" y2="15.8" />
              <line x1="60" y1="36" x2="56.2" y2="36" />
              <line x1="36" y1="60" x2="36" y2="56.2" />
              <line x1="12" y1="36" x2="15.8" y2="36" />
            </g>

            <!-- Opposing Kinetic Orbital Arcs (Clickable Tier Exclusive, Compositor-Spun) -->
            <g class="cursor-orbital-rotator">
              <circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                :stroke="orbitalStrokeUrl"
                stroke-linecap="round"
                stroke-dasharray="30 64.25 30 64.25"
                class="cursor-orbital-arcs"
              />
            </g>
          </svg>
        </div>
      </div>
    </div>

    <!-- Precision Core Photon Point -->
    <div ref="dotWrapEl" class="cursor-anchor">
      <div class="cursor-dot-core" />
    </div>
  </div>
</template>

<style scoped>
.resonant-cursor-stage {
  z-index: 9999;
}

.cursor-anchor {
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  will-change: transform;
}

.cursor-deform,
.cursor-counter-rot {
  width: 0;
  height: 0;
  will-change: transform;
}

.cursor-ring-svg,
.cursor-pulse-svg {
  display: block;
  width: 72px;
  height: 72px;
  margin-left: -36px;
  margin-top: -36px;
  overflow: visible;
}

.cursor-pulse-svg {
  opacity: 0;
  transform-origin: 50% 50%;
  will-change: transform, opacity;
}

/* =========================================================================
   CHAMBER GLOW PROGRESSION ACROSS TIERS
   ========================================================================= */
.cursor-chamber-fill {
  opacity: 0.54;
  transition: opacity 0.22s ease;
}

.tier-hoverable .cursor-chamber-fill {
  opacity: 0.82;
}

.tier-clickable .cursor-chamber-fill {
  opacity: 1;
}

/* =========================================================================
   SCREEN-COMPENSATED PRIMARY RING THICKNESS (STEPS UP PER TIER & ON CLICK)
   - Default (scale 0.68): 2.45 * 0.68 = 1.67px | Pressed (0.56): 4.85 * 0.56 = 2.72px
   - Hoverable (scale 0.90): 2.40 * 0.90 = 2.16px | Pressed (0.78): 3.90 * 0.78 = 3.04px
   - Clickable (scale 1.05): 2.38 * 1.05 = 2.50px | Pressed (0.91): 3.85 * 0.91 = 3.50px
   ========================================================================= */
.cursor-primary-circle {
  stroke-width: 2.45;
  opacity: 0.8;
  transition:
    stroke-width 0.16s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease;
}

.tier-default.is-pressed .cursor-primary-circle {
  stroke-width: 4.85;
  opacity: 0.98;
}

.tier-hoverable .cursor-primary-circle {
  stroke-width: 2.4;
  opacity: 0.92;
}

.tier-hoverable.is-pressed .cursor-primary-circle {
  stroke-width: 3.9;
  opacity: 1;
}

.tier-clickable .cursor-primary-circle {
  stroke-width: 2.38;
  opacity: 0.98;
}

.tier-clickable.is-pressed .cursor-primary-circle {
  stroke-width: 3.85;
  opacity: 1;
}

/* =========================================================================
   CARDINAL VERNIER TICKS & KINETIC ORBITAL ARCS (CLICKABLE TIER EXCLUSIVE)
   ========================================================================= */
.cursor-vernier-ticks {
  stroke-width: 1.6;
  stroke-linecap: round;
  opacity: 0;
  transform-origin: 36px 36px;
  transform: scale(0.9);
  transition:
    opacity 0.22s ease,
    stroke-width 0.16s ease,
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.tier-clickable .cursor-vernier-ticks {
  opacity: 0.84;
  transform: scale(1);
}

.tier-clickable.is-pressed .cursor-vernier-ticks {
  stroke-width: 2.25;
  opacity: 1;
  transform: scale(0.93);
}

.cursor-orbital-rotator {
  transform-origin: 36px 36px;
  animation: cursor-orbit-glide 7.2s linear infinite;
  animation-play-state: paused;
}

.tier-clickable .cursor-orbital-rotator {
  animation-play-state: running;
}

.cursor-orbital-arcs {
  stroke-width: 2.1;
  opacity: 0;
  transform-origin: 36px 36px;
  transform: scale(0.86);
  transition:
    opacity 0.24s ease,
    stroke-width 0.16s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.tier-clickable .cursor-orbital-arcs {
  opacity: 0.94;
  transform: scale(1);
}

.tier-clickable.is-pressed .cursor-orbital-arcs {
  stroke-width: 2.92;
  opacity: 1;
  transform: scale(0.95);
}

/* =========================================================================
   CORE PHOTON DOT & BRAND PALETTE GLOWS
   ========================================================================= */
.cursor-dot-core {
  width: 6px;
  height: 6px;
  margin-left: -3px;
  margin-top: -3px;
  border-radius: 9999px;
  background-color: #ffffff;
  box-shadow:
    0 0 10px color-mix(in srgb, var(--color-brand-blue, #0048ff) 94%, transparent),
    0 0 3px rgba(255, 255, 255, 0.92);
  transition:
    transform 0.16s cubic-bezier(0.22, 1, 0.36, 1),
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.tier-hoverable .cursor-dot-core {
  transform: scale(0.88);
}

.tier-clickable .cursor-dot-core {
  transform: scale(0.78);
}

.is-pressed .cursor-dot-core {
  transform: scale(1.26);
}

.palette-gold .cursor-dot-core {
  background-color: #fffbeb;
  box-shadow:
    0 0 11px rgba(245, 158, 11, 0.94),
    0 0 3px rgba(254, 243, 199, 0.96);
}

.palette-dual .cursor-dot-core {
  background-color: #ffffff;
  box-shadow:
    0 0 12px rgba(24, 112, 255, 0.95),
    0 0 18px rgba(251, 191, 36, 0.42);
}

@keyframes cursor-orbit-glide {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cursor-orbital-rotator {
    animation: none;
  }
}
</style>