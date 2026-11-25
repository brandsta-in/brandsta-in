<!-- app/components/launch/BrandstaCatalogue.vue -->
<script setup lang="ts">
import { ref, computed, useId, watch, onMounted, onBeforeUnmount } from 'vue'
import BrandstaCatalogueLightbox from '~/components/launch/BrandstaCatalogueLightbox.vue'
import BrandstaWaveDeckControls from '~/components/launch/BrandstaWaveDeckControls.vue'
import {
  CATALOGUE_CHOREOGRAPHY,
  CATALOGUE_CONTENT,
  CATALOGUE_PHYSICS,
  type CatalogueSlide,
} from '~/data/catalogueConfig'

interface FanProfile {
  maxSide: number
  baseStep: number
  stackStep: number
  gapBoost: number
  scaleDrop: number
}

interface VirtualFanSlot {
  vIndex: number
  realIndex: number
  item: CatalogueSlide
}

const props = withDefaults(
  defineProps<{
    stageReady?: boolean
  }>(),
  {
    stageReady: true,
  },
)

const rawUid = useId()
const safeUid = computed(() => `cat-${rawUid.replace(/[^a-zA-Z0-9_-]/g, '')}`)

const slides = CATALOGUE_CONTENT.slides
const totalSlides = slides.length
const formattedTotal = String(totalSlides).padStart(2, '0')

// DOM Refs & Viewport Profile State
const sectionZoneEl = ref<HTMLElement | null>(null)
const fanStageEl = ref<HTMLElement | null>(null)
const sizingAnchorEl = ref<HTMLElement | null>(null)
const expandTriggerEl = ref<HTMLButtonElement | null>(null)

const isSectionInView = ref(false)
const isLightboxOpen = ref(false)
const lightboxDirection = ref<'next' | 'prev'>('next')
const viewportW = ref(1280)

const revealActive = computed(() => props.stageReady && isSectionInView.value)

// Responsive Symmetric Fan Geometry Tuned for 1:1 Plates Inside Compacted 1280px (80rem) Shell
const fanProfile = computed<FanProfile>(() => {
  const w = viewportW.value

  if (w < 360) {
    return { maxSide: 2, baseStep: 13, stackStep: 9.5, gapBoost: 2, scaleDrop: 0.115 }
  }
  if (w < 480) {
    return { maxSide: 2, baseStep: 14.5, stackStep: 10.5, gapBoost: 2.5, scaleDrop: 0.11 }
  }
  if (w < 640) {
    return { maxSide: 2, baseStep: 18, stackStep: 13, gapBoost: 3.5, scaleDrop: 0.1 }
  }
  if (w < 768) {
    return { maxSide: 2, baseStep: 20, stackStep: 14, gapBoost: 4, scaleDrop: 0.095 }
  }
  if (w < 1024) {
    return { maxSide: 3, baseStep: 23, stackStep: 14, gapBoost: 5, scaleDrop: 0.09 }
  }
  if (w < 1280) {
    return { maxSide: 2, baseStep: 21.5, stackStep: 13.5, gapBoost: 5, scaleDrop: 0.095 }
  }
  // 1280px+ inside compacted 80rem shell: 7 visible plates (-3 .. 0 .. +3)
  return { maxSide: 3, baseStep: 23.5, stackStep: 13.5, gapBoost: 5.5, scaleDrop: 0.088 }
})

// Continuous Unbounded Physics State (0% Idle CPU)
const currentPos = ref(0)
const targetPos = ref(0)
const currentTuck = ref(0)
const isDragging = ref(false)

const hoveredVIndex = ref<number | null>(null)
const pressedVIndex = ref<number | null>(null)

let velocity = 0
let rafId: number | null = null
let lastFrameTs = 0

// Shared Drag Kinematics (Used by Dedicated Touch Engine & Bounded Mouse Engine)
let dragStartX = 0
let dragStartY = 0
let dragStartPos = 0
let lastMoveX = 0
let lastMoveTs = 0
let releaseVelSlidesPerSec = 0
let didDragMove = false
let suppressClickUntil = 0
let isMouseDownOnStage = false
let touchAxis: 'pending' | 'x' | 'y' = 'pending'
let isTouchTracking = false
let wheelLockUntil = 0

let sectionObserver: IntersectionObserver | null = null
let stageResizeObserver: ResizeObserver | null = null
let reducedMotionQuery: MediaQueryList | null = null

function wrapIndex(n: number): number {
  return ((Math.round(n) % totalSlides) + totalSlides) % totalSlides
}

const activeRealIndex = computed(() => wrapIndex(currentPos.value))
const lightboxActiveIndex = computed(() => wrapIndex(targetPos.value))
const activeSlide = computed(() => slides[activeRealIndex.value] ?? slides[0])

const targetTuck = computed(() => {
  if (isDragging.value) return 1
  if (hoveredVIndex.value === null) return 0
  return Math.abs(hoveredVIndex.value - Math.round(currentPos.value)) >= 1
    ? 1
    : 0
})

const renderedSlots = computed<VirtualFanSlot[]>(() => {
  const centerV = Math.round(currentPos.value)
  const buffer = fanProfile.value.maxSide + 1
  const slots: VirtualFanSlot[] = []

  for (let offset = -buffer; offset <= buffer; offset++) {
    const vIdx = centerV + offset
    const rIdx = ((vIdx % totalSlides) + totalSlides) % totalSlides
    slots.push({
      vIndex: vIdx,
      realIndex: rIdx,
      item: slides[rIdx]!,
    })
  }
  return slots
})

function getSlotPresentation(slot: VirtualFanSlot) {
  const { maxSide, baseStep, stackStep, gapBoost, scaleDrop } = fanProfile.value
  const effectiveOffset = slot.vIndex - currentPos.value
  const absOffset = Math.abs(effectiveOffset)
  const sign = effectiveOffset === 0 ? 0 : effectiveOffset > 0 ? 1 : -1

  if (absOffset > maxSide + 0.55) {
    const parkedX = sign * (baseStep + gapBoost + maxSide * stackStep + 14)
    return {
      isFront: false,
      scrimOpacity: '0.76',
      style: {
        transform: `translate3d(${parkedX.toFixed(1)}%, 0, 0) scale3d(0.6, 0.6, 1)`,
        opacity: '0',
        visibility: 'hidden' as const,
        zIndex: '1',
        pointerEvents: 'none' as const,
      },
    }
  }

  const fanEntrance = revealActive.value ? 1 : 0.16
  const activeGapBoost = gapBoost * (1 - currentTuck.value)

  let translateXPct = 0
  if (absOffset <= 1) {
    translateXPct = sign * absOffset * (baseStep + activeGapBoost)
  } else {
    translateXPct =
      sign * (baseStep + activeGapBoost + (absOffset - 1) * stackStep)
  }
  translateXPct *= fanEntrance

  const isSideHovered =
    hoveredVIndex.value === slot.vIndex &&
    absOffset >= 0.5 &&
    !isDragging.value
  const baseScale = Math.max(0.58, 1 - absOffset * scaleDrop)
  let finalScale = isSideHovered ? baseScale + 0.022 : baseScale

  if (pressedVIndex.value === slot.vIndex) {
    finalScale *= 0.965
  }

  let opacity = 1
  if (absOffset > maxSide) {
    opacity = Math.max(0, 1 - (absOffset - maxSide) * 1.85)
  }

  const zIndex = Math.max(1, 40 - Math.round(absOffset * 6))
  const isFront = absOffset < 0.45

  let scrim = 0
  if (absOffset > 0.02) {
    const rawDim = Math.min(0.76, absOffset * 0.22 + Math.max(0, absOffset - 1) * 0.16)
    scrim = isSideHovered ? Math.max(0.08, rawDim - 0.12) : rawDim
  }

  return {
    isFront,
    scrimOpacity: scrim.toFixed(3),
    style: {
      transform: `translate3d(${translateXPct.toFixed(2)}%, 0, 0) scale3d(${finalScale.toFixed(3)}, ${finalScale.toFixed(3)}, 1)`,
      opacity: opacity.toFixed(3),
      visibility: opacity > 0.005 ? ('visible' as const) : ('hidden' as const),
      zIndex: String(zIndex),
      pointerEvents:
        absOffset > maxSide + 0.15 ? ('none' as const) : ('auto' as const),
    },
  }
}

function stopPhysicsLoop() {
  if (rafId !== null && typeof window !== 'undefined') {
    window.cancelAnimationFrame(rafId)
    rafId = null
  }
}

function stepPhysicsFrame(ts: number) {
  const rawDt = lastFrameTs > 0 ? (ts - lastFrameTs) / 1000 : 1 / 60
  lastFrameTs = ts
  const dt = Math.min(0.05, Math.max(0.001, rawDt))

  const tuckGoal = targetTuck.value
  const tuckDelta = tuckGoal - currentTuck.value
  if (Math.abs(tuckDelta) > 0.002) {
    currentTuck.value +=
      tuckDelta * (1 - Math.exp(-CATALOGUE_PHYSICS.tuckLerpRate * dt))
  } else {
    currentTuck.value = tuckGoal
  }

  if (!isDragging.value) {
    const displacement = targetPos.value - currentPos.value
    const accel =
      displacement * CATALOGUE_PHYSICS.springStiffness -
      velocity * CATALOGUE_PHYSICS.springDamping

    velocity += accel * dt
    currentPos.value += velocity * dt
  }

  const posSettled =
    isDragging.value ||
    (Math.abs(targetPos.value - currentPos.value) <=
      CATALOGUE_PHYSICS.restPositionEpsilon &&
      Math.abs(velocity) <= CATALOGUE_PHYSICS.restVelocityEpsilon)
  const tuckSettled = Math.abs(tuckGoal - currentTuck.value) <= 0.002

  if (!isDragging.value && posSettled) {
    currentPos.value = targetPos.value
    velocity = 0
  }

  if (posSettled && tuckSettled && !isDragging.value) {
    rafId = null
    return
  }

  rafId = window.requestAnimationFrame(stepPhysicsFrame)
}

function wakePhysicsLoop() {
  if (typeof window === 'undefined') return

  if (rafId === null) {
    lastFrameTs = performance.now()
    rafId = window.requestAnimationFrame(stepPhysicsFrame)
  }
}

watch(targetTuck, () => {
  wakePhysicsLoop()
})

function stepBy(deltaSlides: number) {
  if (deltaSlides === 0) return
  lightboxDirection.value = deltaSlides > 0 ? 'next' : 'prev'
  targetPos.value = Math.round(targetPos.value) + deltaSlides
  wakePhysicsLoop()
}

function goToRealIndex(targetRealIdx: number) {
  const currentReal = wrapIndex(targetPos.value)
  let diff = targetRealIdx - currentReal
  if (diff > totalSlides / 2) diff -= totalSlides
  if (diff < -totalSlides / 2) diff += totalSlides
  if (diff === 0) return
  lightboxDirection.value = diff > 0 ? 'next' : 'prev'
  targetPos.value = Math.round(targetPos.value) + diff
  wakePhysicsLoop()
}

function openLightbox() {
  isLightboxOpen.value = true
}

function closeLightbox() {
  isLightboxOpen.value = false
  expandTriggerEl.value?.focus()
}

function getCardWidthPx(): number {
  return Math.max(200, sizingAnchorEl.value?.clientWidth ?? 300)
}

function beginDragSession(clientX: number, clientY: number) {
  dragStartX = clientX
  dragStartY = clientY
  dragStartPos = currentPos.value
  lastMoveX = clientX
  lastMoveTs = performance.now()
  releaseVelSlidesPerSec = 0
  didDragMove = false
  velocity = 0
}

function updateDragPosition(clientX: number) {
  const dx = clientX - dragStartX
  const dragUnitPx = getCardWidthPx() * CATALOGUE_PHYSICS.dragUnitRatio
  const now = performance.now()
  const dtSec = Math.max(0.004, (now - lastMoveTs) / 1000)
  const instantVel = -(clientX - lastMoveX) / dragUnitPx / dtSec
  releaseVelSlidesPerSec = releaseVelSlidesPerSec * 0.45 + instantVel * 0.55

  lastMoveX = clientX
  lastMoveTs = now

  currentPos.value = dragStartPos - dx / dragUnitPx
  targetPos.value = currentPos.value
}

function commitDragSession() {
  pressedVIndex.value = null
  isDragging.value = false

  if (!didDragMove) {
    targetPos.value = Math.round(currentPos.value)
    wakePhysicsLoop()
    return
  }

  suppressClickUntil = performance.now() + 320

  const idleMs = performance.now() - lastMoveTs
  const effectiveVel = idleMs > 95 ? 0 : releaseVelSlidesPerSec
  velocity = effectiveVel

  const projected =
    currentPos.value + effectiveVel * CATALOGUE_PHYSICS.velocityProjectionSec
  const baseNearest = Math.round(dragStartPos)
  const draggedSlides = currentPos.value - dragStartPos
  let rawSteps = Math.round(projected) - baseNearest

  // Responsive thumb flick & drag snap (14% card width or brisk flick)
  if (rawSteps === 0) {
    if (Math.abs(draggedSlides) > 0.14) {
      rawSteps = Math.sign(draggedSlides)
    } else if (Math.abs(effectiveVel) > 0.75) {
      rawSteps = Math.sign(effectiveVel)
    }
  }

  const clampedSteps = Math.max(
    -CATALOGUE_PHYSICS.maxFlickStepSlides,
    Math.min(CATALOGUE_PHYSICS.maxFlickStepSlides, rawSteps),
  )

  if (clampedSteps !== 0) {
    lightboxDirection.value = clampedSteps > 0 ? 'next' : 'prev'
  }
  targetPos.value = baseNearest + clampedSteps
  wakePhysicsLoop()
}

// =========================================================================
// 1. DEDICATED MOBILE TOUCH ENGINE ({ passive: false } prevents pointercancel)
// =========================================================================
function onStageTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) {
    if (isTouchTracking) {
      isTouchTracking = false
      touchAxis = 'pending'
      commitDragSession()
    }
    return
  }

  const touch = e.touches[0]
  if (!touch) return

  isTouchTracking = true
  touchAxis = 'pending'
  beginDragSession(touch.clientX, touch.clientY)
}

function onStageTouchMove(e: TouchEvent) {
  if (!isTouchTracking || e.touches.length !== 1) return
  const touch = e.touches[0]
  if (!touch) return

  const dx = touch.clientX - dragStartX
  const dy = touch.clientY - dragStartY

  if (touchAxis === 'pending') {
    if (Math.hypot(dx, dy) < 7) return

    // Generous horizontal cone so natural thumb arcs never get hijacked by vertical scroll
    if (Math.abs(dx) * 1.25 >= Math.abs(dy)) {
      touchAxis = 'x'
      isDragging.value = true
      didDragMove = true
      dragStartX = touch.clientX
      lastMoveX = touch.clientX
      lastMoveTs = performance.now()
      wakePhysicsLoop()
    } else {
      touchAxis = 'y'
      isTouchTracking = false
      pressedVIndex.value = null
      return
    }
  }

  if (touchAxis === 'x') {
    if (e.cancelable) e.preventDefault()
    didDragMove = true
    updateDragPosition(touch.clientX)
  }
}

function onStageTouchEnd() {
  if (!isTouchTracking) return
  const wasHorizontal = touchAxis === 'x'
  isTouchTracking = false
  touchAxis = 'pending'

  if (wasHorizontal || isDragging.value) {
    commitDragSession()
  } else {
    pressedVIndex.value = null
  }
}

// =========================================================================
// 2. BOUNDED DESKTOP MOUSE ENGINE (Ends immediately if cursor leaves stage)
// =========================================================================
function onStageMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  isMouseDownOnStage = true
  beginDragSession(e.clientX, e.clientY)
}

function onStageMouseMove(e: MouseEvent) {
  if (!isMouseDownOnStage) return

  // Safety guard if mouse button was released outside without firing mouseup
  if ((e.buttons & 1) === 0) {
    endMouseDrag()
    return
  }

  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY

  if (!didDragMove) {
    if (Math.hypot(dx, dy) < CATALOGUE_PHYSICS.dragThresholdPx) return
    didDragMove = true
    isDragging.value = true
    wakePhysicsLoop()
  }

  updateDragPosition(e.clientX)
}

function endMouseDrag() {
  hoveredVIndex.value = null
  if (!isMouseDownOnStage) {
    pressedVIndex.value = null
    return
  }
  isMouseDownOnStage = false
  commitDragSession()
}

function onStageMouseLeave() {
  // Leaving the slider stage immediately ends any active hold/drag so it never keeps moving
  endMouseDrag()
}

function onCardClick(slot: VirtualFanSlot) {
  if (didDragMove || performance.now() < suppressClickUntil) {
    didDragMove = false
    return
  }

  const delta = slot.vIndex - Math.round(currentPos.value)
  if (delta === 0) {
    openLightbox()
  } else {
    lightboxDirection.value = delta > 0 ? 'next' : 'prev'
    targetPos.value = slot.vIndex
    wakePhysicsLoop()
  }
}

function onStageWheel(e: WheelEvent) {
  if (
    Math.abs(e.deltaX) <= Math.abs(e.deltaY) ||
    Math.abs(e.deltaX) < CATALOGUE_PHYSICS.wheelThresholdPx
  ) {
    return
  }

  e.preventDefault()
  const now = performance.now()
  if (now < wheelLockUntil) return
  wheelLockUntil = now + CATALOGUE_PHYSICS.wheelCooldownMs

  stepBy(e.deltaX > 0 ? 1 : -1)
}

function onSectionKeyDown(e: KeyboardEvent) {
  if (isLightboxOpen.value) return
  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault()
      stepBy(1)
      break
    case 'ArrowLeft':
      e.preventDefault()
      stepBy(-1)
      break
    case 'Home':
      e.preventDefault()
      goToRealIndex(0)
      break
    case 'End':
      e.preventDefault()
      goToRealIndex(totalSlides - 1)
      break
    case 'Enter':
      e.preventDefault()
      openLightbox()
      break
    default:
      if (/^[0-9]$/.test(e.key)) {
        const idx = e.key === '0' ? 9 : parseInt(e.key, 10) - 1
        if (idx < totalSlides) {
          e.preventDefault()
          goToRealIndex(idx)
        }
      }
      break
  }
}

function syncViewportMetrics() {
  if (typeof window !== 'undefined') {
    viewportW.value = window.innerWidth
  }
}

onMounted(() => {
  if (typeof window === 'undefined') return

  const stageEl = fanStageEl.value
  if (stageEl) {
    stageEl.addEventListener('touchstart', onStageTouchStart, { passive: true })
    stageEl.addEventListener('touchmove', onStageTouchMove, { passive: false })
    stageEl.addEventListener('touchend', onStageTouchEnd, { passive: true })
    stageEl.addEventListener('touchcancel', onStageTouchEnd, { passive: true })
  }

  window.addEventListener('mouseup', endMouseDrag, { passive: true })
  window.addEventListener('blur', endMouseDrag)

  syncViewportMetrics()

  if (typeof ResizeObserver !== 'undefined') {
    stageResizeObserver = new ResizeObserver(() => {
      syncViewportMetrics()
    })
    stageResizeObserver.observe(document.documentElement)
  } else {
    ;(window as Window).addEventListener('resize', syncViewportMetrics, {
      passive: true,
    })
  }

  if (!('IntersectionObserver' in window)) {
    isSectionInView.value = true
    return
  }

  if (sectionZoneEl.value) {
    sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          isSectionInView.value = true
          sectionObserver?.disconnect()
          sectionObserver = null
        }
      },
      {
        threshold: CATALOGUE_CHOREOGRAPHY.observerThreshold,
        rootMargin: CATALOGUE_CHOREOGRAPHY.observerRootMargin,
      },
    )
    sectionObserver.observe(sectionZoneEl.value)
  }
})

onBeforeUnmount(() => {
  stopPhysicsLoop()

  const stageEl = fanStageEl.value
  if (stageEl) {
    stageEl.removeEventListener('touchstart', onStageTouchStart)
    stageEl.removeEventListener('touchmove', onStageTouchMove)
    stageEl.removeEventListener('touchend', onStageTouchEnd)
    stageEl.removeEventListener('touchcancel', onStageTouchEnd)
  }

  if (typeof window !== 'undefined') {
    window.removeEventListener('mouseup', endMouseDrag)
    window.removeEventListener('blur', endMouseDrag)
    window.removeEventListener('resize', syncViewportMetrics)
  }

  if (sectionObserver) {
    sectionObserver.disconnect()
    sectionObserver = null
  }
  if (stageResizeObserver) {
    stageResizeObserver.disconnect()
    stageResizeObserver = null
  }
  if (reducedMotionQuery) {
    reducedMotionQuery.removeEventListener('change', syncViewportMetrics)
    reducedMotionQuery = null
  }
})
</script>

<template>
  <section
    :id="CATALOGUE_CONTENT.sectionId"
    ref="sectionZoneEl"
    aria-labelledby="brandsta-catalogue-heading"
    tabindex="0"
    class="catalogue-section relative z-10 w-full select-none overflow-x-clip focus:outline-none"
    :class="!stageReady ? 'pointer-events-none' : ''"
    @keydown="onSectionKeyDown"
  >
    <!-- Live Region for Assistive Tech -->
    <div class="sr-only" aria-live="polite" aria-atomic="true">
      Slide {{ activeSlide?.indexLabel }} of {{ formattedTotal }}: {{ activeSlide?.title }}
    </div>

    <!-- Compacted 1280px (80rem) Shell Pulls "Our wavelength." Right Alongside Fan Stage -->
    <div class="catalogue-shell">
      <div class="catalogue-stage-grid">
        <!-- ===================================================================
             LEFT / TOP EDITORIAL COLUMN
             =================================================================== -->
        <div class="catalogue-editorial flex flex-col">
          <div
            v-reveal-stage="{
              active: revealActive,
              delay: CATALOGUE_CHOREOGRAPHY.eyebrowDelayMs,
              duration: CATALOGUE_CHOREOGRAPHY.eyebrowDurationMs,
              rise: '14px',
              scale: 0.98,
            }"
            class="flex flex-col items-center lg:items-start"
          >
            <span class="cat-eyebrow font-medium uppercase text-gradient-astral-gold">
              {{ CATALOGUE_CONTENT.eyebrow }}
            </span>

            <div
              aria-hidden="true"
              class="cat-eyebrow-spark-wrap relative mt-2.5 flex w-48 items-center justify-center lg:hidden"
            >
              <span class="cat-eyebrow-spark-line block h-px w-full" />
              <svg
                viewBox="0 0 20 20"
                fill="none"
                class="absolute h-3 w-3"
              >
                <defs>
                  <linearGradient :id="`${safeUid}-spark`" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="var(--color-brand-champagne)" />
                    <stop offset="52%" stop-color="var(--color-brand-gold-bright)" />
                    <stop offset="100%" stop-color="var(--color-brand-gold)" />
                  </linearGradient>
                </defs>
                <path
                  d="M10 1.5L12 8L18.5 10L12 12L10 18.5L8 12L1.5 10L8 8L10 1.5Z"
                  :fill="`url(#${safeUid}-spark)`"
                />
              </svg>
            </div>
          </div>

          <h2
            id="brandsta-catalogue-heading"
            :aria-label="CATALOGUE_CONTENT.heading.ariaLabel"
            class="cat-heading m-0 flex flex-row items-baseline justify-center gap-[0.26em] font-semibold tracking-[-0.032em] text-white lg:justify-start"
          >
            <span
              v-reveal-chars="{
                active: revealActive,
                delay: CATALOGUE_CHOREOGRAPHY.headingLine1DelayMs,
                stagger: CATALOGUE_CHOREOGRAPHY.headingCharStaggerMs,
                duration: CATALOGUE_CHOREOGRAPHY.headingDurationMs,
                rise: '0.44em',
              }"
              class="block whitespace-nowrap"
            >
              <span data-reveal-content>{{ CATALOGUE_CONTENT.heading.line1White }}</span>
            </span>

            <span
              v-reveal-chars="{
                active: revealActive,
                delay: CATALOGUE_CHOREOGRAPHY.headingLine2DelayMs,
                stagger: CATALOGUE_CHOREOGRAPHY.headingCharStaggerMs,
                duration: CATALOGUE_CHOREOGRAPHY.headingDurationMs,
                rise: '0.46em',
              }"
              class="block whitespace-nowrap"
            >
              <span data-reveal-content>
                <em data-char-gradient="blue" class="brand-accent-serif cat-heading-em font-normal tracking-[-0.01em]">{{ CATALOGUE_CONTENT.heading.line2BlueSerif }}</em>
              </span>
            </span>
          </h2>

          <div
            aria-hidden="true"
            class="cat-desktop-gold-rule hidden lg:block"
            :class="{ 'is-revealed': revealActive }"
          />

          <div class="cat-sublines flex flex-col">
            <p
              v-for="(line, idx) in CATALOGUE_CONTENT.sublines"
              :key="line"
              class="cat-subline m-0 font-normal not-italic text-white/90"
            >
              <span
                v-reveal-words="{
                  active: revealActive,
                  delay:
                    CATALOGUE_CHOREOGRAPHY.linesBaseDelayMs +
                    idx * CATALOGUE_CHOREOGRAPHY.linesStepMs,
                  stagger: CATALOGUE_CHOREOGRAPHY.linesWordStaggerMs,
                  duration: CATALOGUE_CHOREOGRAPHY.linesDurationMs,
                  rise: '0.46em',
                }"
              >
                <span data-reveal-content>{{ line }}</span>
              </span>
            </p>
          </div>
        </div>

        <!-- ===================================================================
             RIGHT / CENTER SYMMETRIC STACKED FAN STAGE + BRANDSTA CONTROLS
             =================================================================== -->
        <div class="catalogue-showcase-col flex w-full flex-col items-center">
          <div
            v-reveal-stage="{
              active: revealActive,
              delay: CATALOGUE_CHOREOGRAPHY.deckStageDelayMs,
              duration: CATALOGUE_CHOREOGRAPHY.deckStageDurationMs,
              rise: '26px',
              scale: 0.965,
            }"
            class="w-full"
          >
            <div
              ref="fanStageEl"
              role="region"
              aria-roledescription="carousel"
              aria-label="Brandsta Catalogue Slides"
              class="fan-stage-core relative grid w-full place-items-center py-2"
              @wheel="onStageWheel"
              @mousedown="onStageMouseDown"
              @mousemove="onStageMouseMove"
              @mouseup="endMouseDrag"
              @mouseleave="onStageMouseLeave"
            >
              <!-- Invisible 1:1 Sizing Anchor (Guarantees 0.000 CLS on SSR Frame 0) -->
              <div
                ref="sizingAnchorEl"
                aria-hidden="true"
                class="fan-card-footprint pointer-events-none invisible"
              />

              <!-- Virtualized Symmetric Fan Plates -->
              <article
                v-for="slot in renderedSlots"
                :key="slot.vIndex"
                :aria-hidden="!getSlotPresentation(slot).isFront"
                :style="getSlotPresentation(slot).style"
                class="fan-plate-card fan-card-footprint group"
                :class="
                  getSlotPresentation(slot).isFront
                    ? 'is-front cursor-clickable cursor-gold lg:cursor-none'
                    : 'is-side cursor-clickable cursor-blue lg:cursor-none'
                "
                @mousedown="pressedVIndex = slot.vIndex"
                @touchstart.passive="pressedVIndex = slot.vIndex"
                @mouseleave="pressedVIndex = null"
                @mouseenter="hoveredVIndex = slot.vIndex"
                @dragstart.prevent
                @click.stop="onCardClick(slot)"
              >
                <img
                  :src="slot.item.src"
                  :alt="slot.item.alt"
                  :width="slot.item.width"
                  :height="slot.item.height"
                  :loading="Math.abs(slot.vIndex - currentPos) <= 2 ? 'eager' : 'lazy'"
                  decoding="async"
                  draggable="false"
                  class="fan-plate-img block h-full w-full object-cover select-none"
                  @dragstart.prevent
                />

                <!-- GPU Scrim Veil -->
                <div
                  aria-hidden="true"
                  class="fan-plate-scrim pointer-events-none absolute inset-0"
                  :style="{ opacity: getSlotPresentation(slot).scrimOpacity }"
                />

                <!-- Subtle Corner Full-Screen Cue on Center Plate -->
                <div
                  v-if="getSlotPresentation(slot).isFront"
                  aria-hidden="true"
                  class="fan-expand-cue pointer-events-none absolute right-3 bottom-3 inline-flex items-center justify-center rounded-full"
                >
                  <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5 text-white/92">
                    <path
                      d="M3.75 7.25V4.75C3.75 4.19772 4.19772 3.75 4.75 3.75H7.25M12.75 3.75H15.25C15.8023 3.75 16.25 4.19772 16.25 4.75V7.25M16.25 12.75V15.25C16.25 15.8023 15.8023 16.25 15.25 16.25H12.75M7.25 16.25H4.75C4.19772 16.25 3.75 15.8023 3.75 15.25V12.75"
                      stroke="currentColor"
                      stroke-width="1.55"
                      stroke-linecap="round"
                    />
                  </svg>
                </div>
              </article>
            </div>
          </div>

          <!-- Centered Directly Beneath Active Card: Brandsta Capsule + Active Readout -->
          <div
            v-reveal-stage="{
              active: revealActive,
              delay: CATALOGUE_CHOREOGRAPHY.controlsDelayMs,
              duration: CATALOGUE_CHOREOGRAPHY.controlsDurationMs,
              rise: '16px',
              scale: 0.98,
            }"
            class="cat-controls-stack flex flex-col items-center"
          >
            <BrandstaWaveDeckControls
              :virtual-pos="currentPos"
              size="md"
              @prev="stepBy(-1)"
              @next="stepBy(1)"
            />

            <div class="cat-caption-bar flex items-center justify-center gap-2.5 sm:gap-3">
              <span class="cat-tabular text-xs font-semibold tracking-[0.14em] text-brand-ice sm:text-[0.82rem]">
                <span>{{ activeSlide?.indexLabel }}</span>
                <span class="font-normal text-white/42"> / {{ formattedTotal }}</span>
              </span>

              <span aria-hidden="true" class="h-1 w-1 rounded-full bg-brand-electric/75" />

              <div class="relative flex h-5 items-center overflow-hidden">
                <Transition name="cat-title-swap" mode="out-in">
                  <span
                    :key="activeSlide?.id"
                    class="whitespace-nowrap text-xs font-medium tracking-[-0.01em] text-white/92 sm:text-[0.88rem]"
                  >
                    {{ activeSlide?.title }}
                  </span>
                </Transition>
              </div>

              <span aria-hidden="true" class="h-3.5 w-px bg-brand-ice/20" />

              <button
                ref="expandTriggerEl"
                type="button"
                aria-label="Open catalogue slide in full screen"
                class="cat-expand-pill cursor-clickable cursor-gold inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-medium tracking-[0.04em] text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-bright/80 lg:cursor-none"
                @click="openLightbox"
              >
                <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5 shrink-0">
                  <path
                    d="M3.75 7.25V4.75C3.75 4.19772 4.19772 3.75 4.75 3.75H7.25M12.75 3.75H15.25C15.8023 3.75 16.25 4.19772 16.25 4.75V7.25M16.25 12.75V15.25C16.25 15.8023 15.8023 16.25 15.25 16.25H12.75M7.25 16.25H4.75C4.19772 16.25 3.75 15.8023 3.75 15.25V12.75"
                    stroke="currentColor"
                    stroke-width="1.55"
                    stroke-linecap="round"
                  />
                </svg>
                <span class="hidden xs:inline">{{ CATALOGUE_CONTENT.fullscreenLabel }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Unbounded Full-Bleed Pinch + Double-Tap Lightbox -->
    <BrandstaCatalogueLightbox
      :open="isLightboxOpen"
      :active-index="lightboxActiveIndex"
      :direction="lightboxDirection"
      :slides="slides"
      @close="closeLightbox"
      @next="stepBy(1)"
      @prev="stepBy(-1)"
      @jump="goToRealIndex"
    />
  </section>
</template>

<style scoped>
/* =========================================================================
   1280px (80rem) COMPACTED SECTION SHELL & CARD FOOTPRINT MATH
   ========================================================================= */
.catalogue-section {
  --fan-card-w: min(67vw, 17rem);
  padding-top: clamp(3.75rem, 7.5svh, 6.25rem);
  padding-bottom: clamp(4.75rem, 9.5svh, 8rem);
}

.catalogue-shell {
  width: 100%;
  max-width: 80rem; /* Strict 1280px ceiling -> eliminates empty gulf on 1920px+ */
  margin-inline: auto;
  box-sizing: border-box;
  padding-inline: clamp(1.15rem, 3.5vw, 2.5rem);
}

@media (min-width: 375px) {
  .catalogue-section {
    --fan-card-w: min(65vw, 18.25rem);
  }
}

@media (min-width: 480px) {
  .catalogue-section {
    --fan-card-w: min(56vw, 20.5rem);
  }
}

@media (min-width: 640px) {
  .catalogue-section {
    --fan-card-w: min(52vw, 22.5rem);
  }
}

@media (min-width: 768px) {
  .catalogue-section {
    --fan-card-w: min(43vw, 24rem);
  }
}

.catalogue-stage-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  row-gap: clamp(2rem, 4.2svh, 2.85rem);
  justify-items: center;
}

/* =========================================================================
   EDITORIAL TYPOGRAPHY ("THE BRANDSTA CATALOGUE" + "Our wavelength." + 3 Lines)
   ========================================================================= */
.catalogue-editorial {
  align-items: center;
  text-align: center;
}

.cat-eyebrow {
  font-size: clamp(0.68rem, 1.8vw, 0.84rem);
  letter-spacing: 0.28em;
  line-height: 1.2;
}

.cat-eyebrow-spark-line {
  background: linear-gradient(
    90deg,
    rgba(245, 158, 11, 0) 0%,
    rgba(251, 191, 36, 0.45) 50%,
    rgba(245, 158, 11, 0) 100%
  );
}

.cat-heading {
  margin-top: clamp(1rem, 2.2svh, 1.4rem);
  font-size: clamp(2.05rem, 8.4vw, 3.75rem);
  line-height: 1.04;
}

.cat-heading-em {
  font-size: 1.13em;
  line-height: 0.98;
}

.cat-desktop-gold-rule {
  width: 3.35rem;
  height: 2px;
  margin-top: 1.35rem;
  border-radius: 9999px;
  background: linear-gradient(
    90deg,
    var(--color-brand-champagne) 0%,
    var(--color-brand-gold-bright) 55%,
    var(--color-brand-gold) 100%
  );
  transform: scaleX(0);
  transform-origin: left center;
  opacity: 0;
  transition:
    transform 680ms var(--ease-brand-crest) 320ms,
    opacity 520ms var(--ease-brand-silk) 320ms;
}

.cat-desktop-gold-rule.is-revealed {
  transform: scaleX(1);
  opacity: 1;
}

.cat-sublines {
  margin-top: clamp(1.1rem, 2.3svh, 1.55rem);
  gap: 0.28em;
}

.cat-subline {
  font-size: clamp(1rem, 3.8vw, 1.35rem);
  line-height: 1.42;
  letter-spacing: -0.012em;
}

/* =========================================================================
   SYMMETRIC 1:1 STACKED FAN STAGE
   ========================================================================= */
.fan-stage-core {
  touch-action: pan-y;
}

.fan-card-footprint {
  grid-area: 1 / 1;
  width: var(--fan-card-w);
  height: var(--fan-card-w);
  aspect-ratio: 1 / 1;
}

.fan-plate-card {
  position: relative;
  border-radius: clamp(0.95rem, 1.8vw, 1.35rem);
  overflow: hidden;
  background-color: #02050e;
  border: 1px solid rgba(124, 180, 255, 0.22);
  box-shadow: 0 22px 50px -20px rgba(0, 0, 0, 0.94);
  touch-action: pan-y;
  will-change: transform, opacity;
  -webkit-tap-highlight-color: transparent;
  transition:
    border-color 320ms var(--ease-brand-silk),
    box-shadow 360ms var(--ease-brand-silk);
}

.fan-plate-card.is-front {
  border-color: rgba(124, 180, 255, 0.56);
  box-shadow:
    0 30px 70px -18px rgba(0, 2, 12, 0.96),
    0 0 38px -12px rgba(30, 107, 255, 0.34),
    inset 0 1px 0 rgba(203, 230, 255, 0.22);
}

.fan-plate-img {
  touch-action: pan-y;
  -webkit-user-drag: none;
  transition: transform 620ms var(--ease-brand-silk);
}

.fan-plate-scrim {
  background-color: #020614;
  will-change: opacity;
}

.fan-expand-cue {
  width: 2rem;
  height: 2rem;
  border: 1px solid rgba(254, 240, 138, 0.38);
  background: rgba(4, 10, 26, 0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  opacity: 0.78;
  transition:
    opacity 260ms var(--ease-brand-silk),
    transform 260ms var(--ease-brand-silk),
    border-color 260ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .fan-plate-card.is-front:hover {
    border-color: rgba(254, 240, 138, 0.64);
    box-shadow:
      0 34px 76px -18px rgba(0, 2, 12, 0.98),
      0 0 40px -12px rgba(245, 158, 11, 0.28),
      0 0 48px -16px rgba(30, 107, 255, 0.34);
  }

  .fan-plate-card.is-front:hover .fan-plate-img {
    transform: scale3d(1.028, 1.028, 1);
  }

  .fan-plate-card.is-front:hover .fan-expand-cue {
    opacity: 1;
    border-color: rgba(254, 240, 138, 0.78);
    transform: scale(1.06);
  }

  .fan-plate-card.is-side:hover {
    border-color: rgba(124, 180, 255, 0.46);
  }
}

/* =========================================================================
   DESKTOP SPLIT (>= 1024px Inside Compacted 1280px Shell)
   max-content left column + tight gap keeps "Our wavelength." close to fan
   ========================================================================= */
@media (min-width: 1024px) {
  .catalogue-section {
    --fan-card-w: clamp(16.75rem, min(26vw, 54svh), 19.75rem);
  }

  .catalogue-stage-grid {
    grid-template-columns: max-content minmax(0, 42.5rem);
    justify-content: center;
    column-gap: clamp(1.75rem, 3vw, 3.25rem);
    row-gap: 0;
    align-items: center;
  }

  .catalogue-editorial {
    grid-column: 1;
    grid-row: 1;
    align-items: flex-start;
    text-align: left;
    padding-bottom: 2.75rem;
  }

  .catalogue-showcase-col {
    grid-column: 2;
    grid-row: 1;
  }

  .cat-heading {
    margin-top: 1.05rem;
    font-size: clamp(2.05rem, 2.7vw, 3.05rem);
  }

  .cat-subline {
    font-size: clamp(1.05rem, 1.3vw, 1.32rem);
  }
}

@media (min-width: 1280px) and (orientation: landscape) {
  .catalogue-section {
    --fan-card-w: clamp(19.75rem, 56svh, 22.5rem);
  }

  .catalogue-stage-grid {
    grid-template-columns: max-content minmax(0, 43.5rem);
    column-gap: 3rem;
  }
}

@media (max-height: 640px) and (orientation: landscape) {
  .catalogue-section {
    --fan-card-w: min(50svh, 17.5rem);
  }
}

/* =========================================================================
   BOTTOM CONTROLS & CAPTION BAR
   ========================================================================= */
.cat-controls-stack {
  margin-top: clamp(1.25rem, 2.6svh, 1.85rem);
  gap: 0.8rem;
}

.cat-tabular {
  font-variant-numeric: tabular-nums;
}

.cat-expand-pill {
  border: 1px solid rgba(148, 184, 255, 0.22);
  background: rgba(6, 14, 34, 0.58);
  -webkit-tap-highlight-color: transparent;
  transition:
    color 240ms ease,
    border-color 240ms ease,
    box-shadow 240ms ease,
    transform 240ms var(--ease-brand-silk);
}

@media (hover: hover) and (pointer: fine) {
  .cat-expand-pill:hover {
    color: var(--color-brand-champagne);
    border-color: rgba(254, 240, 138, 0.6);
    box-shadow: 0 0 16px -4px rgba(251, 191, 36, 0.34);
  }
}

.cat-expand-pill:active {
  transform: scale(0.93);
}

.cat-title-swap-enter-active,
.cat-title-swap-leave-active {
  transition:
    opacity 180ms var(--ease-brand-silk),
    transform 180ms var(--ease-brand-silk);
}

.cat-title-swap-enter-from {
  opacity: 0;
  transform: translate3d(0, 5px, 0);
}

.cat-title-swap-leave-to {
  opacity: 0;
  transform: translate3d(0, -5px, 0);
}

</style>