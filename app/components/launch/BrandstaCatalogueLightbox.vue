<!-- app/components/launch/BrandstaCatalogueLightbox.vue -->
<script setup lang="ts">
import {
  type ComponentPublicInstance,
  computed,
  nextTick,
  onMounted,
  onBeforeUnmount,
  ref,
  useId,
  watch,
} from 'vue'
import {
  CATALOGUE_PHYSICS,
  type CatalogueSlide,
} from '~/data/catalogueConfig'

const props = defineProps<{
  open: boolean
  activeIndex: number
  direction: 'next' | 'prev'
  slides: readonly CatalogueSlide[]
}>()

const emit = defineEmits<{
  close: []
  next: []
  prev: []
  jump: [index: number]
}>()

const rawUid = useId()
const safeUid = computed(() => `c-lb-${rawUid.replace(/[^a-zA-Z0-9_-]/g, '')}`)

const isClientMounted = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const stageLayerRef = ref<HTMLElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)

// 1x Swipe / Vertical-Dismiss & Release-Continuity state
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)
const lastReleaseSwipeX = ref(0)
const isSwipeDragging = ref(false)
const isSwipeSettling = ref(false)

// Unbounded Full-Bleed Multi-Touch Zoom & 2D Pan state
const zoomScale = ref(1)
const panX = ref(0)
const panY = ref(0)
const isZoomInteracting = ref(false)
const isZoomAnimating = ref(false)

const totalCount = computed(() => props.slides.length)
const formattedTotal = computed(() => String(totalCount.value).padStart(2, '0'))
const currentSlide = computed(() => props.slides[props.activeIndex] ?? props.slides[0] ?? null)
const canNavigateLoop = computed(() => totalCount.value > 1)
const isZoomed = computed(() => zoomScale.value > 1.03 || isZoomInteracting.value)

const stageBoxStyle = computed(() => {
  const baseVars: Record<string, string> = {
    '--lb-swipe-release-x': `${lastReleaseSwipeX.value.toFixed(1)}px`,
  }

  if (zoomScale.value !== 1 || panX.value !== 0 || panY.value !== 0 || isZoomAnimating.value) {
    return {
      ...baseVars,
      transform: `translate3d(${panX.value.toFixed(1)}px, ${panY.value.toFixed(1)}px, 0) scale(${zoomScale.value.toFixed(4)})`,
      transition: isZoomInteracting.value
        ? 'none'
        : `transform ${CATALOGUE_PHYSICS.zoomTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    }
  }

  if (
    !isSwipeDragging.value &&
    !isSwipeSettling.value &&
    dragOffsetX.value === 0 &&
    dragOffsetY.value === 0
  ) {
    return baseVars
  }

  const verticalRatio = Math.min(1, Math.abs(dragOffsetY.value) / 260)
  const scale = 1 - verticalRatio * 0.08
  return {
    ...baseVars,
    transform: `translate3d(${dragOffsetX.value.toFixed(1)}px, ${(dragOffsetY.value * 0.65).toFixed(1)}px, 0) scale(${scale.toFixed(3)})`,
    transition: isSwipeDragging.value
      ? 'none'
      : `transform ${CATALOGUE_PHYSICS.zoomTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  }
})

interface PointerPoint {
  x: number
  y: number
}

const TAP_SLOP_PX = 10
const activePointers = new Map<number, PointerPoint>()
const capturedPointerIds = new Set<number>()

let viewportW = 1
let viewportH = 1
let baseImgW = 0
let baseImgH = 0

// Pinch & 2D Pan snapshots
let pinchStartDist = 1
let pinchStartScale = 1
let pinchStartMidOffsetX = 0
let pinchStartMidOffsetY = 0
let pinchStartPanX = 0
let pinchStartPanY = 0

let panStartClientX = 0
let panStartClientY = 0
let panOriginX = 0
let panOriginY = 0
let panEngaged = false

// Single-pointer gesture & hit-target tracking
let primaryPointerId = -1
let downStartX = 0
let downStartY = 0
let downOnImage = false
let downOnBackdrop = false
let gestureMode: 'none' | 'swipe' | 'pan' | 'pinch' = 'none'
let hadMultiTouch = false
let pointerMovedBeyondTap = false

let swipeStartX = 0
let swipeStartY = 0
let swipeLastX = 0
let swipeLastTime = 0
let swipeVxPxPerMs = 0
let swipeAxis: 'x' | 'y' | null = null

let lastTapTime = 0
let lastTapX = 0
let lastTapY = 0
let lastWheelStepTime = 0
let zoomAnimTimer: ReturnType<typeof setTimeout> | null = null
let swipeSettleTimer: ReturnType<typeof setTimeout> | null = null

function bindActiveSlideImg(el: Element | ComponentPublicInstance | null, slideId: string) {
  if (el && currentSlide.value?.id === slideId) {
    imgRef.value = el as HTMLImageElement
  }
}

function clearZoomAnimTimer() {
  if (zoomAnimTimer !== null) {
    clearTimeout(zoomAnimTimer)
    zoomAnimTimer = null
  }
}

function clearSwipeSettleTimer() {
  if (swipeSettleTimer !== null) {
    clearTimeout(swipeSettleTimer)
    swipeSettleTimer = null
  }
}

function triggerSmoothZoomTransition() {
  clearZoomAnimTimer()
  isZoomAnimating.value = true
  zoomAnimTimer = setTimeout(() => {
    isZoomAnimating.value = false
    zoomAnimTimer = null
  }, CATALOGUE_PHYSICS.zoomTransitionMs + 25)
}

function triggerSwipeSettleBack() {
  clearSwipeSettleTimer()
  isSwipeSettling.value = true
  swipeSettleTimer = setTimeout(() => {
    isSwipeSettling.value = false
    swipeSettleTimer = null
  }, CATALOGUE_PHYSICS.zoomTransitionMs + 25)
}

function stepNextFromControl() {
  lastReleaseSwipeX.value = 0
  emit('next')
}

function stepPrevFromControl() {
  lastReleaseSwipeX.value = 0
  emit('prev')
}

function jumpToSlideFromControl(idx: number) {
  lastReleaseSwipeX.value = 0
  emit('jump', idx)
}

function captureStagePointer(pointerId: number) {
  if (capturedPointerIds.has(pointerId)) return
  const el = stageLayerRef.value
  if (!el) return
  try {
    el.setPointerCapture(pointerId)
    capturedPointerIds.add(pointerId)
  } catch {
    // Ignore if pointer already lifted
  }
}

function releaseStagePointer(pointerId: number) {
  if (!capturedPointerIds.has(pointerId)) return
  capturedPointerIds.delete(pointerId)
  const el = stageLayerRef.value
  if (!el) return
  try {
    if (el.hasPointerCapture(pointerId)) {
      el.releasePointerCapture(pointerId)
    }
  } catch {
    // Ignore if already released
  }
}

function isPointOnImage(clientX: number, clientY: number, target: EventTarget | null): boolean {
  const targetEl = target as HTMLElement | null
  const img = imgRef.value

  if (img) {
    const rect = img.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      )
    }
  }

  return Boolean(targetEl?.closest('.cat-lb-img'))
}

function syncViewportAndImageMetrics() {
  if (typeof window === 'undefined') return
  viewportW = Math.max(1, window.innerWidth)
  viewportH = Math.max(1, window.innerHeight)

  const img = imgRef.value
  if (img && img.offsetWidth > 0 && img.offsetHeight > 0) {
    baseImgW = img.offsetWidth
    baseImgH = img.offsetHeight
  }
}

function handleSlideImgLoad(e: Event, slideId: string) {
  if (currentSlide.value?.id !== slideId) return
  imgRef.value = e.currentTarget as HTMLImageElement
  syncViewportAndImageMetrics()
}

function clampPanBounds(rawX: number, rawY: number, scale: number): [number, number] {
  if (scale <= 1.01) return [0, 0]
  syncViewportAndImageMetrics()

  const bw = baseImgW || Math.min(viewportW * 0.85, 760)
  const bh = baseImgH || Math.min(viewportH * 0.78, 760)
  const scaledW = bw * scale
  const scaledH = bh * scale

  const maxX = Math.max((scaledW - bw) * 0.42, (scaledW - viewportW) / 2 + 28)
  const maxY = Math.max((scaledH - bh) * 0.42, (scaledH - viewportH) / 2 + 48)

  return [
    Math.min(maxX, Math.max(-maxX, rawX)),
    Math.min(maxY, Math.max(-maxY, rawY)),
  ]
}

function resetSwipeState(settleSmoothly = false) {
  const hadOffset = dragOffsetX.value !== 0 || dragOffsetY.value !== 0
  isSwipeDragging.value = false
  dragOffsetX.value = 0
  dragOffsetY.value = 0
  swipeAxis = null

  if (settleSmoothly && hadOffset) {
    triggerSwipeSettleBack()
  } else {
    clearSwipeSettleTimer()
    isSwipeSettling.value = false
  }
}

function resetAllTransformState(animate = false) {
  for (const id of Array.from(capturedPointerIds)) {
    releaseStagePointer(id)
  }
  activePointers.clear()
  gestureMode = 'none'
  hadMultiTouch = false
  panEngaged = false
  isZoomInteracting.value = false
  resetSwipeState(false)

  if (animate && (zoomScale.value !== 1 || panX.value !== 0 || panY.value !== 0)) {
    triggerSmoothZoomTransition()
  } else {
    clearZoomAnimTimer()
    isZoomAnimating.value = false
  }

  zoomScale.value = 1
  panX.value = 0
  panY.value = 0
}

function zoomAroundClientPoint(
  targetScale: number,
  clientX: number,
  clientY: number,
  animate: boolean,
) {
  syncViewportAndImageMetrics()
  const { minZoomScale, maxZoomScale } = CATALOGUE_PHYSICS
  const clampedScale = Math.min(maxZoomScale, Math.max(minZoomScale, targetScale))

  if (clampedScale <= 1.03) {
    resetAllTransformState(animate)
    return
  }

  const ox = clientX - viewportW / 2
  const oy = clientY - viewportH / 2
  const nextPanX = ox - ((ox - panX.value) / zoomScale.value) * clampedScale
  const nextPanY = oy - ((oy - panY.value) / zoomScale.value) * clampedScale
  const [cx, cy] = clampPanBounds(nextPanX, nextPanY, clampedScale)

  if (animate) triggerSmoothZoomTransition()
  zoomScale.value = clampedScale
  panX.value = cx
  panY.value = cy
}

function toggleDoubleTapZoom(clientX: number, clientY: number) {
  if (zoomScale.value > 1.03 || panX.value !== 0 || panY.value !== 0) {
    resetAllTransformState(true)
  } else {
    syncViewportAndImageMetrics()
    const bw = baseImgW || Math.min(viewportW * 0.8, 760)
    // Scales generously to fill wide 1920px+ screens on double-click while staying crisp on mobile
    const idealFullScale = Math.min(
      3.0,
      Math.max(CATALOGUE_PHYSICS.doubleTapZoomScale, (viewportW * 0.94) / bw),
    )
    zoomAroundClientPoint(idealFullScale, clientX, clientY, true)
  }
}

function snapshotPinchBaseline() {
  const pts = Array.from(activePointers.values())
  if (pts.length < 2) return
  const p1 = pts[0]
  const p2 = pts[1]
  if (!p1 || !p2) return
  syncViewportAndImageMetrics()

  pinchStartDist = Math.max(12, Math.hypot(p2.x - p1.x, p2.y - p1.y))
  pinchStartScale = zoomScale.value
  pinchStartMidOffsetX = (p1.x + p2.x) / 2 - viewportW / 2
  pinchStartMidOffsetY = (p1.y + p2.y) / 2 - viewportH / 2
  pinchStartPanX = panX.value
  pinchStartPanY = panY.value
}

function snapshotSinglePanBaseline(pt: PointerPoint) {
  panStartClientX = pt.x
  panStartClientY = pt.y
  panOriginX = panX.value
  panOriginY = panY.value
}

function handleStagePointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const targetEl = e.target as HTMLElement | null
  if (targetEl?.closest('button')) return

  lastReleaseSwipeX.value = 0
  clearSwipeSettleTimer()
  isSwipeSettling.value = false

  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  // 2+ fingers -> immediately engage unbounded multi-touch pinch + midpoint pan
  if (activePointers.size >= 2) {
    clearZoomAnimTimer()
    isZoomAnimating.value = false
    hadMultiTouch = true
    pointerMovedBeyondTap = true
    panEngaged = true
    gestureMode = 'pinch'
    resetSwipeState(false)
    isZoomInteracting.value = true

    for (const id of activePointers.keys()) {
      captureStagePointer(id)
    }
    snapshotPinchBaseline()
    return
  }

  primaryPointerId = e.pointerId
  downStartX = e.clientX
  downStartY = e.clientY
  downOnImage = isPointOnImage(e.clientX, e.clientY, e.target)
  downOnBackdrop = !downOnImage
  hadMultiTouch = false
  pointerMovedBeyondTap = false
  panEngaged = false

  if (zoomScale.value > 1.03) {
    gestureMode = 'pan'
    snapshotSinglePanBaseline({ x: e.clientX, y: e.clientY })
  } else {
    gestureMode = 'swipe'
    swipeStartX = e.clientX
    swipeStartY = e.clientY
    swipeLastX = e.clientX
    swipeLastTime = performance.now()
    swipeVxPxPerMs = 0
    swipeAxis = null
  }
}

function handleStagePointerMove(e: PointerEvent) {
  if (!activePointers.has(e.pointerId)) return
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (gestureMode === 'pinch' && activePointers.size >= 2) {
    const pts = Array.from(activePointers.values())
    const p1 = pts[0]
    const p2 = pts[1]
    if (!p1 || !p2) return

    const dist = Math.max(8, Math.hypot(p2.x - p1.x, p2.y - p1.y))
    const midOffsetX = (p1.x + p2.x) / 2 - viewportW / 2
    const midOffsetY = (p1.y + p2.y) / 2 - viewportH / 2

    const { maxZoomScale } = CATALOGUE_PHYSICS
    let nextScale = pinchStartScale * (dist / pinchStartDist)

    if (nextScale < 1) {
      nextScale = 1 - (1 - nextScale) * 0.32
      nextScale = Math.max(0.82, nextScale)
    } else if (nextScale > maxZoomScale) {
      nextScale = maxZoomScale + (nextScale - maxZoomScale) * 0.24
    }

    zoomScale.value = nextScale
    panX.value =
      midOffsetX - ((pinchStartMidOffsetX - pinchStartPanX) / pinchStartScale) * nextScale
    panY.value =
      midOffsetY - ((pinchStartMidOffsetY - pinchStartPanY) / pinchStartScale) * nextScale
    return
  }

  if (gestureMode === 'pan' && activePointers.size === 1 && e.pointerId === primaryPointerId) {
    if (!panEngaged) {
      const distFromDown = Math.hypot(e.clientX - downStartX, e.clientY - downStartY)
      if (distFromDown <= TAP_SLOP_PX) return

      clearZoomAnimTimer()
      isZoomAnimating.value = false
      panEngaged = true
      pointerMovedBeyondTap = true
      isZoomInteracting.value = true
      captureStagePointer(e.pointerId)
      snapshotSinglePanBaseline({ x: e.clientX, y: e.clientY })
      return
    }

    const dx = e.clientX - panStartClientX
    const dy = e.clientY - panStartClientY
    const [cx, cy] = clampPanBounds(panOriginX + dx, panOriginY + dy, zoomScale.value)
    panX.value = cx
    panY.value = cy
    return
  }

  if (gestureMode === 'swipe' && activePointers.size === 1 && e.pointerId === primaryPointerId) {
    const rawDx = e.clientX - downStartX
    const rawDy = e.clientY - downStartY

    if (swipeAxis === null) {
      if (Math.hypot(rawDx, rawDy) <= TAP_SLOP_PX) return

      pointerMovedBeyondTap = true
      isSwipeDragging.value = true
      swipeAxis = Math.abs(rawDx) >= Math.abs(rawDy) ? 'x' : 'y'
      swipeStartX = e.clientX
      swipeStartY = e.clientY
      swipeLastX = e.clientX
      swipeLastTime = performance.now()
      captureStagePointer(e.pointerId)
      return
    }

    const dx = e.clientX - swipeStartX
    const dy = e.clientY - swipeStartY
    const now = performance.now()
    const dt = Math.max(1, now - swipeLastTime)
    swipeVxPxPerMs = swipeVxPxPerMs * 0.4 + ((e.clientX - swipeLastX) / dt) * 0.6
    swipeLastX = e.clientX
    swipeLastTime = now

    if (swipeAxis === 'x') {
      dragOffsetX.value = canNavigateLoop.value
        ? dx
        : dx * CATALOGUE_PHYSICS.rubberBandEdgeFactor
      dragOffsetY.value = 0
    } else {
      dragOffsetX.value = dx * 0.18
      dragOffsetY.value = dy
    }
  }
}

function handleStagePointerUp(e: PointerEvent) {
  if (!activePointers.has(e.pointerId)) return
  releaseStagePointer(e.pointerId)
  activePointers.delete(e.pointerId)

  // Seamless 2-finger pinch -> 1-finger pan handoff
  if (activePointers.size === 1) {
    const firstEntry = Array.from(activePointers.entries())[0]
    if (firstEntry) {
      primaryPointerId = firstEntry[0]
      if (zoomScale.value > 1.03) {
        gestureMode = 'pan'
        panEngaged = true
        isZoomInteracting.value = true
        snapshotSinglePanBaseline(firstEntry[1])
      } else {
        gestureMode = 'none'
      }
    }
    return
  }

  if (activePointers.size > 1) {
    snapshotPinchBaseline()
    return
  }

  // 1. Check stationary Tap / Double-Tap first
  const now = performance.now()
  if (!hadMultiTouch && !pointerMovedBeyondTap) {
    const currentlyZoomed = zoomScale.value > 1.03 || panX.value !== 0 || panY.value !== 0

    if (downOnImage || currentlyZoomed) {
      const { doubleTapDelayMs, doubleTapMaxDistPx } = CATALOGUE_PHYSICS
      const dt = now - lastTapTime
      const dist = Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY)

      if (lastTapTime > 0 && dt <= doubleTapDelayMs && dist <= doubleTapMaxDistPx) {
        lastTapTime = 0
        isZoomInteracting.value = false
        panEngaged = false
        gestureMode = 'none'
        resetSwipeState(false)
        toggleDoubleTapZoom(e.clientX, e.clientY)
        return
      }

      lastTapTime = now
      lastTapX = e.clientX
      lastTapY = e.clientY
      isZoomInteracting.value = false
      panEngaged = false
      gestureMode = 'none'
      resetSwipeState(false)
      return
    }

    // Stationary single click/tap strictly on empty dark backdrop at 1x -> Close
    if (downOnBackdrop && !currentlyZoomed) {
      lastTapTime = 0
      gestureMode = 'none'
      resetSwipeState(false)
      emit('close')
      return
    }
  } else {
    lastTapTime = 0
  }

  // 2. Settle Pinch or 2D Pan
  if (gestureMode === 'pinch' || gestureMode === 'pan') {
    isZoomInteracting.value = false
    panEngaged = false
    gestureMode = 'none'
    const { maxZoomScale } = CATALOGUE_PHYSICS

    if (zoomScale.value <= 1.03) {
      resetAllTransformState(true)
    } else {
      const settledScale = Math.min(maxZoomScale, zoomScale.value)
      const [cx, cy] = clampPanBounds(panX.value, panY.value, settledScale)
      if (settledScale !== zoomScale.value || cx !== panX.value || cy !== panY.value) {
        triggerSmoothZoomTransition()
        zoomScale.value = settledScale
        panX.value = cx
        panY.value = cy
      }
    }
    return
  }

  // 3. Settle 1x Horizontal Swipe or Vertical Pull-to-Close
  if (gestureMode === 'swipe' && isSwipeDragging.value) {
    const dx = e.clientX - swipeStartX
    const dy = e.clientY - swipeStartY
    const capturedSwipeX = dragOffsetX.value
    const {
      swipeDistanceThresholdPx,
      swipeVelocityThresholdPxPerMs,
      verticalDismissThresholdPx,
    } = CATALOGUE_PHYSICS

    const axis = swipeAxis
    gestureMode = 'none'

    if (axis === 'y' && Math.abs(dy) >= verticalDismissThresholdPx) {
      resetSwipeState(false)
      emit('close')
      return
    }

    if (axis === 'x' && canNavigateLoop.value) {
      const isStrongFlick = Math.abs(swipeVxPxPerMs) >= swipeVelocityThresholdPxPerMs
      if (dx <= -swipeDistanceThresholdPx || (isStrongFlick && swipeVxPxPerMs < 0)) {
        lastReleaseSwipeX.value = capturedSwipeX
        resetSwipeState(false)
        emit('next')
        return
      }
      if (dx >= swipeDistanceThresholdPx || (isStrongFlick && swipeVxPxPerMs > 0)) {
        lastReleaseSwipeX.value = capturedSwipeX
        resetSwipeState(false)
        emit('prev')
        return
      }
    }

    resetSwipeState(true)
  } else {
    gestureMode = 'none'
    resetSwipeState(true)
  }
}

function handleStagePointerCancel(e: PointerEvent) {
  releaseStagePointer(e.pointerId)
  activePointers.delete(e.pointerId)
  if (activePointers.size === 0) {
    isZoomInteracting.value = false
    panEngaged = false
    gestureMode = 'none'
    resetSwipeState(true)
    if (zoomScale.value <= 1.03) {
      resetAllTransformState(true)
    } else {
      const settledScale = Math.min(CATALOGUE_PHYSICS.maxZoomScale, zoomScale.value)
      const [cx, cy] = clampPanBounds(panX.value, panY.value, settledScale)
      zoomScale.value = settledScale
      panX.value = cx
      panY.value = cy
    }
  }
}

function handleWheel(e: WheelEvent) {
  if (!props.open) return
  e.preventDefault()

  // Trackpad pinch (ctrlKey) or scroll-wheel while zoomed -> cursor-anchored free zoom
  if (e.ctrlKey || zoomScale.value > 1.03) {
    const factor = e.deltaY < 0 ? 1.14 : 1 / 1.14
    zoomAroundClientPoint(zoomScale.value * factor, e.clientX, e.clientY, false)
    return
  }

  if (!canNavigateLoop.value) return
  const now = performance.now()
  if (now - lastWheelStepTime < CATALOGUE_PHYSICS.wheelCooldownMs) return

  const primaryDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
  if (Math.abs(primaryDelta) < 14) return

  lastWheelStepTime = now
  if (primaryDelta > 0) {
    stepNextFromControl()
  } else {
    stepPrevFromControl()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.open) return

  switch (e.key) {
    case 'Escape':
      e.preventDefault()
      if (isZoomed.value) {
        resetAllTransformState(true)
      } else {
        emit('close')
      }
      break
    case '0':
    case '-':
      if (isZoomed.value) {
        e.preventDefault()
        resetAllTransformState(true)
      }
      break
    case '+':
    case '=':
      if (!isZoomed.value) {
        e.preventDefault()
        toggleDoubleTapZoom(viewportW / 2, viewportH / 2)
      }
      break
    case 'ArrowRight':
    case 'PageDown':
      e.preventDefault()
      stepNextFromControl()
      break
    case 'ArrowLeft':
    case 'PageUp':
      e.preventDefault()
      stepPrevFromControl()
      break
    case 'Home':
      e.preventDefault()
      jumpToSlideFromControl(0)
      break
    case 'End':
      e.preventDefault()
      jumpToSlideFromControl(totalCount.value - 1)
      break
  }
}

function handleViewportResizeOrRotate() {
  if (!props.open) return
  requestAnimationFrame(() => {
    syncViewportAndImageMetrics()
    if (zoomScale.value > 1.03) {
      const [cx, cy] = clampPanBounds(panX.value, panY.value, zoomScale.value)
      panX.value = cx
      panY.value = cy
    }
  })
}

function preloadNeighbors(centerIdx: number) {
  if (typeof window === 'undefined') return
  const len = props.slides.length
  if (len <= 1) return

  for (const offset of [-1, 1, 2]) {
    const wrappedIdx = ((centerIdx + offset) % len + len) % len
    const neighbor = props.slides[wrappedIdx]
    if (neighbor?.src) {
      const img = new Image()
      img.decoding = 'async'
      img.src = neighbor.src
    }
  }
}

function setDocumentScrollLock(locked: boolean) {
  if (typeof document === 'undefined') return
  document.documentElement.style.overflow = locked ? 'hidden' : ''
  document.body.style.overflow = locked ? 'hidden' : ''
}

watch(
  () => [props.open, props.activeIndex] as const,
  async ([isOpen, idx], prevVal) => {
    const wasOpen = prevVal?.[0] ?? false
    if (isOpen !== wasOpen) {
      setDocumentScrollLock(isOpen)
    }

    resetAllTransformState(false)
    baseImgW = 0
    baseImgH = 0
    lastTapTime = 0

    if (!isOpen) {
      imgRef.value = null
      lastReleaseSwipeX.value = 0
      return
    }

    preloadNeighbors(idx)
    await nextTick()
    syncViewportAndImageMetrics()
    if (!wasOpen) {
      rootRef.value?.focus({ preventScroll: true })
    }
  },
)

onMounted(() => {
  isClientMounted.value = true
  if (props.open) {
    setDocumentScrollLock(true)
  }
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleViewportResizeOrRotate, { passive: true })
  window.addEventListener('orientationchange', handleViewportResizeOrRotate, { passive: true })
})

onBeforeUnmount(() => {
  setDocumentScrollLock(false)
  clearZoomAnimTimer()
  clearSwipeSettleTimer()
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleViewportResizeOrRotate)
  window.removeEventListener('orientationchange', handleViewportResizeOrRotate)
})
</script>

<template>
  <Teleport v-if="isClientMounted" to="body">
    <Transition name="cat-lb-fade">
      <div
        v-if="open && currentSlide"
        ref="rootRef"
        data-lenis-prevent=""
        role="dialog"
        aria-modal="true"
        aria-label="The Brandsta Catalogue Viewer"
        tabindex="-1"
        class="cat-lb-backdrop fixed inset-0 z-[85] overflow-hidden touch-none select-none focus:outline-none"
        @wheel="handleWheel"
      >
        <!-- Astral Gold Close Gradient -->
        <svg aria-hidden="true" class="pointer-events-none absolute h-0 w-0 overflow-hidden">
          <defs>
            <linearGradient :id="`${safeUid}-close-gold`" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--color-brand-champagne)" />
              <stop offset="50%" stop-color="var(--color-brand-gold-bright)" />
              <stop offset="100%" stop-color="var(--color-brand-gold)" />
            </linearGradient>
          </defs>
        </svg>

        <!-- Top Absolute Header: Counter fades out on zoom; only [ 1× ] + [ × ] stay visible when zoomed -->
        <header
          class="cat-lb-top pointer-events-none absolute inset-x-0 top-0 z-30 mx-auto flex w-full max-w-[92rem] items-center justify-between px-4 pt-3.5 pb-1.5 sm:px-7 sm:pt-4"
        >
          <span
            class="rounded-full bg-[#020614]/62 px-3 py-1 text-[0.76rem] font-medium tracking-[0.12em] text-white/80 tabular-nums backdrop-blur-md transition-opacity duration-200 sm:text-[0.8rem]"
            :class="isZoomed ? 'opacity-0' : 'opacity-100'"
            aria-live="polite"
          >
            {{ currentSlide.indexLabel }} / {{ formattedTotal }}
          </span>

          <div class="pointer-events-auto flex items-center gap-2">
            <button
              v-if="isZoomed"
              type="button"
              aria-label="Reset zoom"
              class="cursor-clickable cursor-gold flex h-10 items-center justify-center rounded-full border border-brand-gold-bright/40 bg-[#030816]/75 px-3 text-[0.72rem] font-semibold tracking-[0.08em] text-white tabular-nums backdrop-blur-md transition-all duration-200 hover:border-brand-champagne hover:text-brand-champagne active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-bright lg:cursor-none"
              @click.stop="resetAllTransformState(true)"
            >
              1×
            </button>

            <button
              type="button"
              aria-label="Close catalogue viewer"
              class="cursor-clickable cursor-gold flex h-10 w-10 items-center justify-center rounded-full border border-brand-gold-bright/40 bg-[#030816]/75 backdrop-blur-md transition-all duration-250 hover:scale-105 hover:border-brand-champagne active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-bright lg:cursor-none"
              @click.stop="emit('close')"
            >
              <svg viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none">
                <path
                  d="M6 6L18 18M18 6L6 18"
                  :stroke="`url(#${safeUid}-close-gold)`"
                  stroke-width="1.85"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <!-- Desktop / Landscape Side Navigation Arrows (Hidden cleanly when zoomed) -->
        <button
          v-if="canNavigateLoop"
          type="button"
          aria-label="Previous catalogue slide"
          class="cat-lb-side-nav cursor-clickable cursor-blue left-4 z-20 hidden h-11 w-11 items-center justify-center rounded-full border border-brand-ice/28 bg-[#030816]/65 text-white/90 backdrop-blur-md transition-all duration-250 hover:scale-105 hover:border-brand-gold-bright/70 hover:text-brand-champagne active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-electric sm:left-6 lg:left-8 lg:cursor-none"
          :class="isZoomed ? 'pointer-events-none opacity-0' : 'opacity-100'"
          @click.stop="stepPrevFromControl"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 5.25 8.25 12 15 18.75" />
          </svg>
        </button>

        <button
          v-if="canNavigateLoop"
          type="button"
          aria-label="Next catalogue slide"
          class="cat-lb-side-nav cursor-clickable cursor-blue right-4 z-20 hidden h-11 w-11 items-center justify-center rounded-full border border-brand-ice/28 bg-[#030816]/65 text-white/90 backdrop-blur-md transition-all duration-250 hover:scale-105 hover:border-brand-gold-bright/70 hover:text-brand-champagne active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-electric sm:right-6 lg:right-8 lg:cursor-none"
          :class="isZoomed ? 'pointer-events-none opacity-0' : 'opacity-100'"
          @click.stop="stepNextFromControl"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5.25 15.75 12 9 18.75" />
          </svg>
        </button>

        <!-- Unbounded Full-Bleed Stage: z-10 at rest, rises to z-25 OVER footer when zoomed -->
        <div
          ref="stageLayerRef"
          class="cat-lb-stage-layer absolute inset-0 flex items-center justify-center"
          :class="isZoomed ? 'z-25' : 'z-10'"
          @pointerdown="handleStagePointerDown"
          @pointermove="handleStagePointerMove"
          @pointerup="handleStagePointerUp"
          @pointercancel="handleStagePointerCancel"
        >
          <div
            class="cat-lb-stage-box will-change-transform"
            :style="stageBoxStyle"
          >
            <Transition :name="direction === 'next' ? 'cat-slide-next' : 'cat-slide-prev'">
              <img
                :key="currentSlide.id"
                :ref="(el) => bindActiveSlideImg(el, currentSlide!.id)"
                :src="currentSlide.src"
                :alt="currentSlide.alt"
                :width="currentSlide.width"
                :height="currentSlide.height"
                draggable="false"
                decoding="async"
                class="cat-lb-img block rounded-md border border-brand-ice/26 bg-[#02050e] object-contain shadow-[0_28px_80px_rgba(0,0,0,0.88)]"
                :class="
                  isZoomed
                    ? 'cursor-move'
                    : isSwipeDragging
                      ? 'cursor-grabbing'
                      : 'cursor-grab'
                "
                @load="(e) => handleSlideImgLoad(e, currentSlide!.id)"
                @dragstart.prevent
              />
            </Transition>
          </div>
        </div>

        <!-- Bottom Caption & Portrait Nav (Fades to 0% on zoom so zoomed image fills screen cleanly) -->
        <footer
          class="cat-lb-bottom pointer-events-none absolute inset-x-0 bottom-0 z-15 mx-auto flex w-full max-w-4xl flex-col items-center gap-2.5 px-4 pt-2 pb-4 text-center transition-opacity duration-200 sm:px-8 sm:pb-5"
          :class="isZoomed ? 'opacity-0' : 'opacity-100'"
        >
          <p
            class="m-0 line-clamp-2 max-w-2xl rounded-md bg-[#020614]/58 px-3.5 py-1 text-[0.82rem] font-medium leading-relaxed text-white/88 backdrop-blur-md sm:text-[0.88rem]"
            aria-live="polite"
          >
            {{ currentSlide.title }}
          </p>

          <div
            v-if="canNavigateLoop && !isZoomed"
            class="cat-lb-mobile-nav pointer-events-auto flex items-center justify-center gap-4"
          >
            <button
              type="button"
              aria-label="Previous catalogue slide"
              class="cursor-clickable cursor-blue flex h-10 w-14 items-center justify-center rounded-full border border-brand-ice/30 bg-[#030816]/72 text-white backdrop-blur-md transition-all active:scale-95"
              @click.stop="stepPrevFromControl"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-4.5 w-4.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 5.25 8.25 12 15 18.75" />
              </svg>
            </button>

            <button
              type="button"
              aria-label="Next catalogue slide"
              class="cursor-clickable cursor-blue flex h-10 w-14 items-center justify-center rounded-full border border-brand-ice/30 bg-[#030816]/72 text-white backdrop-blur-md transition-all active:scale-95"
              @click.stop="stepNextFromControl"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-4.5 w-4.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5.25 15.75 12 9 18.75" />
              </svg>
            </button>
          </div>
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cat-lb-backdrop {
  background: radial-gradient(
    ellipse at center,
    rgba(6, 15, 38, 0.92) 0%,
    rgba(2, 5, 14, 0.97) 74%,
    #01030a 100%
  );
  backdrop-filter: blur(18px) saturate(135%);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
}

/* Portrait mobile resting optical balance */
.cat-lb-stage-layer {
  padding-bottom: 2.25rem;
}

/* CSS Grid 1/1 stack keeps outgoing & incoming slides overlapped with zero clipping box */
.cat-lb-stage-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  place-items: center;
}

.cat-lb-stage-box > * {
  grid-area: 1 / 1;
}

/* Definite 1:1 Square Bounds at 1x -> Unbounded Free Scaling on Zoom */
.cat-lb-img {
  --lb-base-size: min(92vw, calc(100dvh - 12.25rem), 50rem);
  width: var(--lb-base-size);
  height: var(--lb-base-size);
  aspect-ratio: 1 / 1;
}

@media (min-width: 768px), (orientation: landscape) {
  .cat-lb-stage-layer {
    padding-bottom: 0;
  }

  .cat-lb-side-nav {
    display: flex;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  .cat-lb-mobile-nav {
    display: none;
  }

  .cat-lb-img {
    --lb-base-size: min(80vw, calc(100dvh - 7.75rem), 50rem);
  }
}

@media (max-height: 540px) and (orientation: landscape) {
  .cat-lb-top {
    padding-top: 0.45rem;
    padding-bottom: 0.2rem;
  }

  .cat-lb-bottom {
    padding-top: 0.2rem;
    padding-bottom: 0.45rem;
  }

  .cat-lb-img {
    --lb-base-size: min(74vw, calc(100dvh - 5.25rem), 50rem);
  }
}

.cat-lb-fade-enter-active,
.cat-lb-fade-leave-active {
  transition: opacity 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.cat-lb-fade-enter-from,
.cat-lb-fade-leave-to {
  opacity: 0;
}

/* Simultaneous Silk Cross-Glide */
.cat-slide-next-enter-active,
.cat-slide-prev-enter-active {
  z-index: 2;
  transition:
    opacity 230ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 250ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, opacity;
}

.cat-slide-next-leave-active,
.cat-slide-prev-leave-active {
  z-index: 1;
  pointer-events: none;
  transition:
    opacity 210ms cubic-bezier(0.35, 0, 0.8, 0.5),
    transform 230ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, opacity;
}

.cat-slide-next-enter-from {
  opacity: 0;
  transform: translate3d(42px, 0, 0) scale(0.99);
}

.cat-slide-next-leave-from {
  opacity: 1;
  transform: translate3d(var(--lb-swipe-release-x, 0px), 0, 0) scale(1);
}

.cat-slide-next-leave-to {
  opacity: 0;
  transform: translate3d(calc(var(--lb-swipe-release-x, 0px) - 42px), 0, 0) scale(0.99);
}

.cat-slide-prev-enter-from {
  opacity: 0;
  transform: translate3d(-42px, 0, 0) scale(0.99);
}

.cat-slide-prev-leave-from {
  opacity: 1;
  transform: translate3d(var(--lb-swipe-release-x, 0px), 0, 0) scale(1);
}

.cat-slide-prev-leave-to {
  opacity: 0;
  transform: translate3d(calc(var(--lb-swipe-release-x, 0px) + 42px), 0, 0) scale(0.99);
}

</style>