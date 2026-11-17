<!-- app/components/ResonantCursor.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const CURSOR_PHYSICS = {
  dotLerp: 0.45,
  ringLerp: 0.14,
  idleThreshold: 0.05,
} as const

const isEnabled = ref(false)
const isVisible = ref(false)
const isHoveringInteractive = ref(false)
const isPressed = ref(false)

const dotEl = ref<HTMLDivElement | null>(null)
const ringEl = ref<HTMLDivElement | null>(null)

let targetX = 0
let targetY = 0
let dotX = 0
let dotY = 0
let ringX = 0
let ringY = 0
let rafId: number | null = null
let isPageHidden = false

function startLoop() {
  if (rafId !== null || isPageHidden || !isEnabled.value) return
  rafId = window.requestAnimationFrame(tick)
}

function stopLoop() {
  if (rafId !== null) {
    window.cancelAnimationFrame(rafId)
    rafId = null
  }
}

function tick() {
  rafId = null
  if (isPageHidden || !isEnabled.value) return

  dotX += (targetX - dotX) * CURSOR_PHYSICS.dotLerp
  dotY += (targetY - dotY) * CURSOR_PHYSICS.dotLerp
  ringX += (targetX - ringX) * CURSOR_PHYSICS.ringLerp
  ringY += (targetY - ringY) * CURSOR_PHYSICS.ringLerp

  if (dotEl.value) {
    dotEl.value.style.transform = `translate3d(${dotX}px, ${dotY}px, 0)`
  }

  if (ringEl.value) {
    const scale = isPressed.value ? 0.82 : isHoveringInteractive.value ? 1.65 : 1
    ringEl.value.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) scale(${scale})`
  }

  const delta = Math.abs(targetX - ringX) + Math.abs(targetY - ringY)
  if (delta > CURSOR_PHYSICS.idleThreshold || isPressed.value) {
    startLoop()
  }
}

function onPointerMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  targetX = e.clientX
  targetY = e.clientY

  if (!isVisible.value) {
    dotX = targetX
    dotY = targetY
    ringX = targetX
    ringY = targetY
    isVisible.value = true
  }

  const target = e.target as HTMLElement | null
  const interactive = Boolean(target?.closest('[data-resonant-hover], a, button'))
  if (interactive !== isHoveringInteractive.value) {
    isHoveringInteractive.value = interactive
  }

  startLoop()
}

function onPointerDown() {
  isPressed.value = true
  startLoop()
}

function onPointerUp() {
  isPressed.value = false
  startLoop()
}

function onPointerLeaveWindow() {
  isVisible.value = false
}

function onVisibilityChange() {
  isPageHidden = document.visibilityState === 'hidden'
  if (isPageHidden) {
    stopLoop()
  }
}

onMounted(() => {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!finePointer || reducedMotion) return

  isEnabled.value = true
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('pointerup', onPointerUp, { passive: true })
  document.addEventListener('mouseleave', onPointerLeaveWindow, { passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  stopLoop()
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointerup', onPointerUp)
  document.removeEventListener('mouseleave', onPointerLeaveWindow)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div
    v-if="isEnabled"
    aria-hidden="true"
    class="pointer-events-none fixed inset-0 z-50 overflow-hidden transition-opacity duration-300"
    :class="isVisible ? 'opacity-100' : 'opacity-0'"
  >
    <div ref="ringEl" class="cursor-ring">
      <div
        class="cursor-ring-inner"
        :class="isHoveringInteractive ? 'is-active' : ''"
      />
    </div>
    <div ref="dotEl" class="cursor-dot">
      <div class="cursor-dot-inner" />
    </div>
  </div>
</template>

<style scoped>
.cursor-ring,
.cursor-dot {
  position: fixed;
  top: 0;
  left: 0;
  will-change: transform;
  pointer-events: none;
}

.cursor-ring {
  transition: transform 0.12s cubic-bezier(0.22, 1, 0.36, 1);
}

.cursor-ring-inner {
  width: 36px;
  height: 36px;
  margin-left: -18px;
  margin-top: -18px;
  border-radius: 9999px;
  border: 1px solid rgba(30, 107, 255, 0.45);
  background: radial-gradient(circle, rgba(0, 72, 255, 0.14) 0%, rgba(0, 72, 255, 0) 72%);
  transition: border-color 0.25s ease, background-color 0.25s ease;
}

.cursor-ring-inner.is-active {
  border-color: rgba(124, 180, 255, 0.85);
  background: radial-gradient(circle, rgba(0, 72, 255, 0.28) 0%, rgba(0, 72, 255, 0) 75%);
}

.cursor-dot-inner {
  width: 6px;
  height: 6px;
  margin-left: -3px;
  margin-top: -3px;
  border-radius: 9999px;
  background-color: #ffffff;
  box-shadow: 0 0 12px rgba(0, 72, 255, 0.95);
}
</style>