// app/composables/useConvergentScroll.ts
import { ref, computed } from 'vue'
import Lenis from 'lenis'
import { FORMATION_STAGES } from '~/data/formationStages'

export type ViewportScrollMode = 'desktop' | 'pwa-fullscreen' | 'mobile-browser'

export interface ConvergentTelemetry {
  vw: number
  vh: number
  svh: number
  isPortrait: boolean
  scrollMode: ViewportScrollMode
  scrollY: number
  velocity: number
  heroProgress: number
  contactProgress: number
  stageProgress: number
  worldOffsetX: number
  hoverPull: number
  clickImpulse: number
  spoutX: number
  spoutY: number
  fieldLeft: number
  fieldTop: number
  fieldWidth: number
  fieldHeight: number
}

export type TickSubscriber = (telemetry: ConvergentTelemetry, dtSec: number, nowSec: number) => void

export const CONVERGENT_CONSTANTS = {
  contactThreshold: 0.94,
  revealEnterThreshold: 0.92,
  revealExitThreshold: 0.84,
  stageScrollVhMultiplier: 1.0,
  /** Mobile browser reaches 1.00 at 0.88*svh and holds locked across a dwell zone up to 1.22*svh */
  browserHeroFinishSvh: 0.88,
  browserDwellEndSvh: 1.22,
  /** Installed Full-Screen PWA has zero browser URL bar, so needs only a light 8% thumb cushion */
  pwaHeroFinishSvh: 0.96,
  pwaDwellEndSvh: 1.08,
  touchSettleDelayMs: 100,
  touchSettleDurationMs: 800,
  lenisLerp: 0.065,
} as const

const DESKTOP_FINE_QUERY = '(min-width: 1024px) and (hover: hover) and (pointer: fine)'
const PWA_STANDALONE_QUERY =
  '(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)'

const SCROLL_SESSION_KEY = 'brandsta:formation:scrollY'
let hasBootedInSpaSession = false

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

const telemetry: ConvergentTelemetry = {
  vw: 1440,
  vh: 900,
  svh: 900,
  isPortrait: false,
  scrollMode: 'desktop',
  scrollY: 0,
  velocity: 0,
  heroProgress: 0,
  contactProgress: 0,
  stageProgress: 0,
  worldOffsetX: 0,
  hoverPull: 0,
  clickImpulse: 0,
  spoutX: 1090,
  spoutY: 440,
  fieldLeft: 640,
  fieldTop: 120,
  fieldWidth: 720,
  fieldHeight: 660,
}

const isPortrait = ref(false)
const scrollMode = ref<ViewportScrollMode>('desktop')
const activeStageIndex = ref(0)
const stageTransitionDirection = ref<'up' | 'down'>('up')
const isFormationSettled = ref(false)
const isFormationTextReady = ref(false)
const attemptedStageIndex = ref<number | null>(null)
const attemptKey = ref(0)

const subscribers = new Set<TickSubscriber>()

let targetHoverPull = 0
let lenisInstance: Lenis | null = null
let rafId: number | null = null
let programmaticScrollRaf: number | null = null
let resizeObserver: ResizeObserver | null = null
let svhProbeEl: HTMLDivElement | null = null
let stickyFrameEl: HTMLElement | null = null
let visualFieldEl: HTMLElement | null = null

let usingWheelSmooth = true
let isTouchActive = false
let touchStartScrollY = 0
let idleSnapTimer: ReturnType<typeof setTimeout> | null = null

let prevScrollY = 0
let lastRafMs = 0
let isDocHidden = false
let attemptTimer: ReturnType<typeof setTimeout> | null = null
let boundaryCooldown = false
let boundaryCooldownTimer: ReturnType<typeof setTimeout> | null = null

let touchStartX = 0
let touchStartY = 0
let touchHandledInGesture = false
let touchStartedAtUnlockedEnd = false

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function getMaxUnlockedIndex(): number {
  let highest = 0
  for (let i = 0; i < FORMATION_STAGES.length; i++) {
    if (FORMATION_STAGES[i]?.unlocked) {
      highest = i
    }
  }
  return highest
}

function detectScrollMode(): ViewportScrollMode {
  if (typeof window === 'undefined') return 'desktop'
  if (window.matchMedia(DESKTOP_FINE_QUERY).matches) return 'desktop'

  const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  if (navStandalone || window.matchMedia(PWA_STANDALONE_QUERY).matches) {
    return 'pwa-fullscreen'
  }
  return 'mobile-browser'
}

function computePortraitMode(w: number, h: number): boolean {
  const isLandscape = w >= 1024 || (w > h && w >= 640)
  return !isLandscape
}

function readStableSvh(): number {
  if (svhProbeEl && svhProbeEl.clientHeight > 0) {
    return svhProbeEl.clientHeight
  }
  return typeof window !== 'undefined' ? Math.max(1, window.innerHeight) : 900
}

function cancelProgrammaticScroll() {
  if (programmaticScrollRaf !== null && typeof window !== 'undefined') {
    window.cancelAnimationFrame(programmaticScrollRaf)
    programmaticScrollRaf = null
  }
  if (idleSnapTimer) {
    clearTimeout(idleSnapTimer)
    idleSnapTimer = null
  }
}

function getHeroFinishPx(svh: number, mode: ViewportScrollMode): number {
  if (mode === 'mobile-browser') return svh * CONVERGENT_CONSTANTS.browserHeroFinishSvh
  if (mode === 'pwa-fullscreen') return svh * CONVERGENT_CONSTANTS.pwaHeroFinishSvh
  return svh
}

function getDwellEndPx(svh: number, mode: ViewportScrollMode): number {
  if (mode === 'mobile-browser') return svh * CONVERGENT_CONSTANTS.browserDwellEndSvh
  if (mode === 'pwa-fullscreen') return svh * CONVERGENT_CONSTANTS.pwaDwellEndSvh
  return svh
}

function getSettledStage0TargetPx(svh: number, mode: ViewportScrollMode): number {
  if (mode === 'mobile-browser') return svh * 1.06
  if (mode === 'pwa-fullscreen') return svh * 1.02
  return svh
}

function saveScrollSession() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(SCROLL_SESSION_KEY, String(Math.round(window.scrollY || 0)))
  } catch {
    // Ignore storage quota / private-browsing restrictions
  }
}

function resolveInitialScrollY(): number {
  if (typeof window === 'undefined') return 0

  const navEntry = performance.getEntriesByType?.('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined
  const navType = navEntry?.type ?? 'navigate'

  // Same-tab reload OR fresh initial visit -> always start cleanly at top (0, 0)
  if (!hasBootedInSpaSession && (navType === 'reload' || navType === 'navigate')) {
    hasBootedInSpaSession = true
    try {
      window.sessionStorage.removeItem(SCROLL_SESSION_KEY)
    } catch {
      // Ignore private-browsing restrictions
    }
    isFormationSettled.value = false
    isFormationTextReady.value = false
    activeStageIndex.value = 0
    window.scrollTo(0, 0)
    return 0
  }

  hasBootedInSpaSession = true

  // Only restore saved scroll for SPA route returns or Back/Forward history navigation
  try {
    const saved = Number(window.sessionStorage.getItem(SCROLL_SESSION_KEY) ?? '0')
    if (Number.isFinite(saved) && saved > 0) {
      window.scrollTo(0, saved)
      return saved
    }
  } catch {
    // Ignore private-browsing restrictions
  }

  return 0
}

function measureGeometry() {
  if (typeof window === 'undefined') return

  const w = Math.max(1, window.innerWidth)
  const liveVh = Math.max(1, window.innerHeight)
  const svh = Math.max(1, readStableSvh())
  const mode = detectScrollMode()
  const portrait = computePortraitMode(w, svh)

  telemetry.vw = w
  telemetry.vh = liveVh
  telemetry.svh = svh
  telemetry.scrollMode = mode
  telemetry.isPortrait = portrait

  if (scrollMode.value !== mode) scrollMode.value = mode
  if (isPortrait.value !== portrait) isPortrait.value = portrait

  if (stickyFrameEl && visualFieldEl) {
    const frameRect = stickyFrameEl.getBoundingClientRect()
    const fieldRect = visualFieldEl.getBoundingClientRect()

    const relLeft = fieldRect.left - frameRect.left
    const relTop = fieldRect.top - frameRect.top
    const fw = Math.max(1, fieldRect.width)
    const fh = Math.max(1, fieldRect.height)

    telemetry.fieldLeft = relLeft
    telemetry.fieldTop = relTop
    telemetry.fieldWidth = fw
    telemetry.fieldHeight = fh

    if (portrait) {
      // Anchor Portrait spout strictly to stable svh so URL-bar expand/collapse shifts 0.0px
      telemetry.spoutX = w * 0.77
      telemetry.spoutY = Math.max(relTop + svh * 0.19, svh * 0.69)
    } else {
      telemetry.spoutX = relLeft + fw * 0.74
      telemetry.spoutY = svh * 0.5
    }
  } else {
    if (portrait) {
      telemetry.fieldLeft = 0
      telemetry.fieldTop = svh * 0.46
      telemetry.fieldWidth = w
      telemetry.fieldHeight = svh * 0.4
      telemetry.spoutX = w * 0.77
      telemetry.spoutY = svh * 0.69
    } else {
      telemetry.fieldLeft = w * 0.42
      telemetry.fieldTop = svh * 0.14
      telemetry.fieldWidth = w * 0.54
      telemetry.fieldHeight = svh * 0.72
      telemetry.spoutX = w * 0.755
      telemetry.spoutY = svh * 0.5
    }
  }

  lenisInstance?.resize()
  updateScrollMath(window.scrollY || 0, telemetry.velocity)
}

function updateScrollMath(scrollY: number, velocity: number) {
  const svh = Math.max(1, telemetry.svh)
  const mode = telemetry.scrollMode
  const maxUnlocked = getMaxUnlockedIndex()

  telemetry.scrollY = scrollY
  telemetry.velocity = velocity

  const heroSpanPx = getHeroFinishPx(svh, mode)
  const heroProg = clamp(scrollY / heroSpanPx, 0, 1)
  telemetry.heroProgress = heroProg

  const cThresh = CONVERGENT_CONSTANTS.contactThreshold
  telemetry.contactProgress =
    heroProg <= cThresh ? 0 : clamp((heroProg - cThresh) / (1 - cThresh), 0, 1)

  const stageStartPx = getDwellEndPx(svh, mode)
  const stageScrollSpanPx = svh * CONVERGENT_CONSTANTS.stageScrollVhMultiplier
  const rawStageProg =
    maxUnlocked > 0 ? clamp((scrollY - stageStartPx) / stageScrollSpanPx, 0, maxUnlocked) : 0

  telemetry.stageProgress = rawStageProg

  const worldUnitPx = telemetry.isPortrait ? telemetry.vw * 0.86 : telemetry.fieldWidth * 0.92
  telemetry.worldOffsetX = -rawStageProg * worldUnitPx

  // Hysteresis lock: prevents minor upward thumb nudges / URL bar toggles from blinking Pulse or text
  if (!isFormationSettled.value && heroProg >= cThresh) {
    isFormationSettled.value = true
  } else if (isFormationSettled.value && heroProg < CONVERGENT_CONSTANTS.revealExitThreshold) {
    isFormationSettled.value = false
  }

  if (!isFormationTextReady.value && heroProg >= CONVERGENT_CONSTANTS.revealEnterThreshold) {
    isFormationTextReady.value = true
  } else if (isFormationTextReady.value && heroProg < CONVERGENT_CONSTANTS.revealExitThreshold) {
    isFormationTextReady.value = false
  }

  const nextStageIdx = Math.round(rawStageProg)
  if (nextStageIdx !== activeStageIndex.value) {
    stageTransitionDirection.value = nextStageIdx > activeStageIndex.value ? 'up' : 'down'
    activeStageIndex.value = nextStageIdx
  }
}

export function useConvergentScroll() {
  const unlockedStages = computed(() => FORMATION_STAGES.filter((s) => s.unlocked))
  const maxUnlockedIndex = computed(() => getMaxUnlockedIndex())

  function setFormingHovered(hovered: boolean) {
    targetHoverPull = hovered ? 1 : 0
  }

  function triggerFormingPulse() {
    telemetry.clickImpulse = 1
  }

  function triggerStillForming(requestedIndex?: number) {
    const maxUnlocked = getMaxUnlockedIndex()
    if (maxUnlocked >= FORMATION_STAGES.length - 1) return

    const fallbackNext = maxUnlocked + 1
    const targetIdx =
      requestedIndex !== undefined
        ? clamp(requestedIndex, fallbackNext, FORMATION_STAGES.length - 1)
        : fallbackNext

    if (!FORMATION_STAGES[targetIdx] || FORMATION_STAGES[targetIdx].unlocked) return

    attemptedStageIndex.value = targetIdx
    attemptKey.value += 1

    if (attemptTimer) clearTimeout(attemptTimer)
    attemptTimer = setTimeout(() => {
      attemptedStageIndex.value = null
    }, 1750)
  }

  function triggerBoundaryStillFormingWithCooldown() {
    if (boundaryCooldown) return
    boundaryCooldown = true
    triggerStillForming(getMaxUnlockedIndex() + 1)

    if (boundaryCooldownTimer) clearTimeout(boundaryCooldownTimer)
    boundaryCooldownTimer = setTimeout(() => {
      boundaryCooldown = false
    }, 720)
  }

  function scrollToPosition(targetY: number, durationMs = 950, softEaseInOut = false) {
    if (typeof window === 'undefined') return
    cancelProgrammaticScroll()

    const easeFn = softEaseInOut
      ? (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
      : (t: number) => 1 - Math.pow(1 - t, 4)

    if (lenisInstance && usingWheelSmooth) {
      lenisInstance.resize()
      lenisInstance.scrollTo(targetY, {
        duration: durationMs / 1000,
        easing: easeFn,
      })
      return
    }

    const startY = window.scrollY || 0
    const delta = targetY - startY
    if (Math.abs(delta) < 1.5) return
    const startMs = performance.now()

    const step = (now: number) => {
      const t = clamp((now - startMs) / durationMs, 0, 1)
      window.scrollTo(0, startY + delta * easeFn(t))
      if (t < 1) {
        programmaticScrollRaf = window.requestAnimationFrame(step)
      } else {
        programmaticScrollRaf = null
      }
    }
    programmaticScrollRaf = window.requestAnimationFrame(step)
  }

  function scheduleTouchMagneticSettle() {
    if (telemetry.scrollMode === 'desktop') return
    if (idleSnapTimer) clearTimeout(idleSnapTimer)

    idleSnapTimer = setTimeout(() => {
      if (isTouchActive || programmaticScrollRaf !== null) return

      // Wait another brief beat if native touch momentum is still coasting fast
      if (Math.abs(telemetry.velocity) > 55) {
        scheduleTouchMagneticSettle()
        return
      }

      const hp = telemetry.heroProgress
      if (hp <= 0.02 || hp >= 0.995) return

      const currentY = window.scrollY || 0
      const movedDown = currentY >= touchStartScrollY
      const svh = telemetry.svh
      const settleTarget = getSettledStage0TargetPx(svh, telemetry.scrollMode)

      if (movedDown) {
        scrollToPosition(
          hp >= 0.16 ? settleTarget : 0,
          CONVERGENT_CONSTANTS.touchSettleDurationMs,
          true
        )
      } else {
        scrollToPosition(
          hp <= 0.86 ? 0 : settleTarget,
          CONVERGENT_CONSTANTS.touchSettleDurationMs,
          true
        )
      }
    }, CONVERGENT_CONSTANTS.touchSettleDelayMs)
  }

  function scrollToFormation() {
    scrollToPosition(getSettledStage0TargetPx(telemetry.svh, telemetry.scrollMode), 1150)
  }

  function scrollToStage(index: number) {
    const stage = FORMATION_STAGES[index]
    if (!stage) return

    if (!stage.unlocked) {
      triggerStillForming(index)
      return
    }

    const svh = telemetry.svh
    const mode = telemetry.scrollMode
    if (index === 0) {
      scrollToPosition(getSettledStage0TargetPx(svh, mode), 950)
      return
    }

    const dwellEnd = getDwellEndPx(svh, mode)
    scrollToPosition(
      dwellEnd + index * svh * CONVERGENT_CONSTANTS.stageScrollVhMultiplier,
      950
    )
  }

  function registerFormationElements(frame: HTMLElement | null, field: HTMLElement | null) {
    stickyFrameEl = frame
    visualFieldEl = field
    if (resizeObserver) {
      resizeObserver.disconnect()
      if (frame) resizeObserver.observe(frame)
      if (field) resizeObserver.observe(field)
    }
    measureGeometry()
  }

  function onScrollTick(fn: TickSubscriber): () => void {
    subscribers.add(fn)
    fn(telemetry, 0.016, typeof performance !== 'undefined' ? performance.now() / 1000 : 0)
    return () => {
      subscribers.delete(fn)
    }
  }

  function onWindowWheel(e: WheelEvent) {
    usingWheelSmooth = true
    cancelProgrammaticScroll()

    const maxUnlocked = getMaxUnlockedIndex()
    const atEndOfUnlocked =
      telemetry.heroProgress >= 0.99 && telemetry.stageProgress >= maxUnlocked - 0.02

    const pushingForward = e.deltaY > 24 || e.deltaX > 24
    if (atEndOfUnlocked && pushingForward && maxUnlocked < FORMATION_STAGES.length - 1) {
      triggerBoundaryStillFormingWithCooldown()
    }
  }

  function onWindowTouchStart(e: TouchEvent) {
    usingWheelSmooth = false
    isTouchActive = true
    cancelProgrammaticScroll()

    const touch = e.touches[0]
    if (!touch) return
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    touchStartScrollY = window.scrollY || 0
    touchHandledInGesture = false

    const maxUnlocked = getMaxUnlockedIndex()
    touchStartedAtUnlockedEnd =
      telemetry.heroProgress >= 0.99 && telemetry.stageProgress >= maxUnlocked - 0.02
  }

  function onWindowTouchMove(e: TouchEvent) {
    if (touchHandledInGesture || telemetry.heroProgress < 0.95) return
    const touch = e.touches[0]
    if (!touch) return

    const dx = touch.clientX - touchStartX
    const dy = touch.clientY - touchStartY
    const maxUnlocked = getMaxUnlockedIndex()

    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      touchHandledInGesture = true
      if (dx < 0) {
        scrollToStage(Math.min(FORMATION_STAGES.length - 1, activeStageIndex.value + 1))
      } else if (activeStageIndex.value > 0) {
        scrollToStage(activeStageIndex.value - 1)
      }
      return
    }

    if (touchStartedAtUnlockedEnd && dy < -42 && maxUnlocked < FORMATION_STAGES.length - 1) {
      touchHandledInGesture = true
      triggerBoundaryStillFormingWithCooldown()
    }
  }

  function onWindowTouchEnd() {
    isTouchActive = false
    scheduleTouchMagneticSettle()
  }

  function onNativeScroll() {
    if (!usingWheelSmooth && !isTouchActive && programmaticScrollRaf === null) {
      scheduleTouchMagneticSettle()
    }
  }

  function rafStep(nowMs: number) {
    rafId = null
    if (isDocHidden) return

    const dtSec = lastRafMs > 0 ? clamp((nowMs - lastRafMs) / 1000, 0.001, 0.05) : 0.016
    lastRafMs = nowMs

    const hoverFactor = 1 - Math.exp(-7.5 * dtSec)
    telemetry.hoverPull += (targetHoverPull - telemetry.hoverPull) * hoverFactor
    if (Math.abs(targetHoverPull - telemetry.hoverPull) < 0.001) {
      telemetry.hoverPull = targetHoverPull
    }

    if (telemetry.clickImpulse > 0) {
      telemetry.clickImpulse = Math.max(0, telemetry.clickImpulse - dtSec * 1.12)
    }

    if (lenisInstance && usingWheelSmooth) {
      lenisInstance.raf(nowMs)
      prevScrollY = lenisInstance.scroll
      updateScrollMath(lenisInstance.scroll, lenisInstance.velocity)
    } else if (typeof window !== 'undefined') {
      const nativeY = window.scrollY || 0
      const instVel = (nativeY - prevScrollY) / Math.max(0.001, dtSec)
      const smoothedVel = telemetry.velocity * 0.6 + instVel * 0.4
      prevScrollY = nativeY
      if (lenisInstance && Math.abs(lenisInstance.scroll - nativeY) > 1) {
        lenisInstance.scrollTo(nativeY, { immediate: true })
      }
      updateScrollMath(nativeY, smoothedVel)
    }

    const nowSec = nowMs / 1000
    subscribers.forEach((fn) => fn(telemetry, dtSec, nowSec))

    rafId = window.requestAnimationFrame(rafStep)
  }

  function startRaf() {
    if (rafId !== null || isDocHidden || typeof window === 'undefined') return
    lastRafMs = performance.now()
    rafId = window.requestAnimationFrame(rafStep)
  }

  function stopRaf() {
    if (rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function onVisibilityChange() {
    isDocHidden = document.visibilityState === 'hidden'
    if (isDocHidden) {
      saveScrollSession()
      stopRaf()
    } else {
      startRaf()
    }
  }

  function onPageHide() {
    saveScrollSession()
  }

  function onPageShow(e: PageTransitionEvent) {
    if (e.persisted) {
      isDocHidden = false
      measureGeometry()
      startRaf()
    }
  }

  function onWindowResize() {
    measureGeometry()
  }

  function onOrientationChange() {
    setTimeout(() => measureGeometry(), 120)
  }

  function mountScrollEngine(): () => void {
    if (typeof window === 'undefined') return () => {}

    const initialMode = detectScrollMode()
    scrollMode.value = initialMode
    telemetry.scrollMode = initialMode
    usingWheelSmooth = initialMode === 'desktop'
    isDocHidden = document.visibilityState === 'hidden'

    svhProbeEl = document.createElement('div')
    svhProbeEl.setAttribute('aria-hidden', 'true')
    svhProbeEl.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:100svh;pointer-events:none;visibility:hidden;z-index:-1;'
    document.body.appendChild(svhProbeEl)

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    const startScrollY = resolveInitialScrollY()
    prevScrollY = startScrollY

    svhProbeEl = document.createElement('div')
    svhProbeEl.setAttribute('aria-hidden', 'true')
    svhProbeEl.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:100svh;pointer-events:none;visibility:hidden;z-index:-1;'
    document.body.appendChild(svhProbeEl)

    lenisInstance = new Lenis({
      lerp: CONVERGENT_CONSTANTS.lenisLerp,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1.0,
      autoRaf: false,
    })
    lenisInstance.scrollTo(startScrollY, { immediate: true })

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        measureGeometry()
      })
      if (stickyFrameEl) resizeObserver.observe(stickyFrameEl)
      if (visualFieldEl) resizeObserver.observe(visualFieldEl)
    }

    measureGeometry()

    window.addEventListener('resize', onWindowResize, { passive: true })
    window.addEventListener('pagehide', onPageHide, { passive: true })
    window.addEventListener('pageshow', onPageShow, { passive: true })
    window.addEventListener('orientationchange', onOrientationChange, { passive: true })
    window.addEventListener('wheel', onWindowWheel, { passive: true })
    window.addEventListener('scroll', onNativeScroll, { passive: true })
    window.addEventListener('touchstart', onWindowTouchStart, { passive: true })
    window.addEventListener('touchmove', onWindowTouchMove, { passive: true })
    window.addEventListener('touchend', onWindowTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onWindowTouchEnd, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)

    startRaf()

    return () => {
      stopRaf()
      cancelProgrammaticScroll()
      if (lenisInstance) {
        lenisInstance.destroy()
        lenisInstance = null
      }
      if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
      }
      if (svhProbeEl) {
        svhProbeEl.remove()
        svhProbeEl = null
      }
      if (attemptTimer) clearTimeout(attemptTimer)
      if (boundaryCooldownTimer) clearTimeout(boundaryCooldownTimer)

      window.removeEventListener('resize', onWindowResize)
      saveScrollSession()
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('orientationchange', onOrientationChange)
      window.removeEventListener('wheel', onWindowWheel)
      window.removeEventListener('scroll', onNativeScroll)
      window.removeEventListener('touchstart', onWindowTouchStart)
      window.removeEventListener('touchmove', onWindowTouchMove)
      window.removeEventListener('touchend', onWindowTouchEnd)
      window.removeEventListener('touchcancel', onWindowTouchEnd)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }

  return {
    telemetry,
    stages: FORMATION_STAGES,
    unlockedStages,
    maxUnlockedIndex,
    scrollMode,
    isPortrait,
    activeStageIndex,
    stageTransitionDirection,
    isFormationSettled,
    isFormationTextReady,
    attemptedStageIndex,
    attemptKey,
    mountScrollEngine,
    registerFormationElements,
    onScrollTick,
    scrollToFormation,
    scrollToStage,
    triggerStillForming,
    setFormingHovered,
    triggerFormingPulse,
  }
}