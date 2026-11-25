<!-- app/components/launch/BrandstaMenuTrigger.vue -->
<script setup lang="ts">
import { ref, computed, watch, useId, onMounted, onBeforeUnmount } from 'vue'
import { SINE_TRIGGER_PHYSICS } from '~/data/navigationConfig'

const props = defineProps<{
  open: boolean
  controlsId: string
}>()

const emit = defineEmits<{
  toggle: []
}>()

const rawUid = useId()
const safeUid = computed(() => `trig-${rawUid.replace(/[^a-zA-Z0-9_-]/g, '')}`)
const buttonEl = ref<HTMLButtonElement | null>(null)

defineExpose({
  focus: () => buttonEl.value?.focus(),
})

function buildWavePath(isBottom: boolean, morph: number, phase: number): string {
  const {
    viewBoxWidth,
    samplePoints,
    waveCycles,
    waveStartX,
    waveEndX,
    topWaveY,
    bottomWaveY,
    waveAmplitude,
    crossInsetX,
    crossTopY,
    crossBottomY,
  } = SINE_TRIGGER_PHYSICS

  const baseY = isBottom ? bottomWaveY : topWaveY
  const targetStartX = crossInsetX
  const targetEndX = viewBoxWidth - crossInsetX
  const targetStartY = isBottom ? crossBottomY : crossTopY
  const targetEndY = isBottom ? crossTopY : crossBottomY

  const waveEnvelope = Math.pow(1 - morph, 1.45)
  let d = ''

  for (let i = 0; i < samplePoints; i++) {
    const u = i / (samplePoints - 1)
    const waveX = waveStartX + (waveEndX - waveStartX) * u
    const edgeTaper = 0.42 + 0.58 * Math.sin(u * Math.PI)
    const sineOffset =
      Math.sin(u * Math.PI * 2 * waveCycles - phase) * waveAmplitude * edgeTaper * waveEnvelope
    const waveY = baseY - sineOffset

    const crossX = targetStartX + (targetEndX - targetStartX) * u
    const crossY = targetStartY + (targetEndY - targetStartY) * u

    const x = waveX + (crossX - waveX) * morph
    const y = waveY + (crossY - waveY) * morph

    d += `${i === 0 ? 'M' : ' L'}${x.toFixed(2)} ${y.toFixed(2)}`
  }

  return d
}

const topPathD = ref(buildWavePath(false, props.open ? 1 : 0, 0))
const bottomPathD = ref(buildWavePath(true, props.open ? 1 : 0, 0))
const isHovered = ref(false)
const hasFineHover = ref(false)

let currentMorph = props.open ? 1 : 0
let targetMorph = props.open ? 1 : 0
let morphStartVal = currentMorph
let morphStartTime = 0
let isMorphing = false

let hoverPhase = 0
let rafId: number | null = null
let lastTs = 0

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5)
}

function updatePaths() {
  topPathD.value = buildWavePath(false, currentMorph, hoverPhase)
  bottomPathD.value = buildWavePath(true, currentMorph, hoverPhase)
}

function tick(ts: number) {
  const dt = lastTs > 0 ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016
  lastTs = ts

  if (isMorphing) {
    const elapsed = ts - morphStartTime
    const rawT = Math.min(1, Math.max(0, elapsed / SINE_TRIGGER_PHYSICS.morphDurationMs))
    const eased = easeOutQuint(rawT)
    currentMorph = morphStartVal + (targetMorph - morphStartVal) * eased
    if (rawT >= 1) {
      currentMorph = targetMorph
      isMorphing = false
    }
  }

  const shouldAnimateHoverWave = hasFineHover.value && isHovered.value && currentMorph < 0.98
  if (shouldAnimateHoverWave) {
    hoverPhase = (hoverPhase + dt * SINE_TRIGGER_PHYSICS.hoverWaveSpeedRadPerSec) % (Math.PI * 2)
  }

  updatePaths()

  if (isMorphing || shouldAnimateHoverWave) {
    rafId = window.requestAnimationFrame(tick)
  } else {
    rafId = null
    lastTs = 0
  }
}

function ensureLoop() {
  if (rafId !== null || typeof window === 'undefined') return
  lastTs = 0
  rafId = window.requestAnimationFrame(tick)
}

function stopLoop() {
  if (rafId !== null && typeof window !== 'undefined') {
    window.cancelAnimationFrame(rafId)
    rafId = null
    lastTs = 0
  }
}

watch(
  () => props.open,
  (nextOpen) => {
    targetMorph = nextOpen ? 1 : 0
    if (typeof window === 'undefined') {
      currentMorph = targetMorph
      updatePaths()
      return
    }
    morphStartVal = currentMorph
    morphStartTime = performance.now()
    isMorphing = true
    ensureLoop()
  },
)

function onPointerEnter() {
  if (!hasFineHover.value) return
  isHovered.value = true
  if (!props.open) {
    ensureLoop()
  }
}

function onPointerLeave() {
  isHovered.value = false
}

const strokeUrl = computed(() => {
  if (props.open) return `url(#${safeUid.value}-gold)`
  if (isHovered.value) return `url(#${safeUid.value}-blue)`
  return '#ffffff'
})

onMounted(() => {
  if (typeof window === 'undefined') return
  hasFineHover.value = window.matchMedia('(hover: hover) and (pointer: fine)').matches
})

onBeforeUnmount(() => {
  stopLoop()
})
</script>

<template>
  <button
    ref="buttonEl"
    type="button"
    :aria-expanded="open"
    :aria-controls="controlsId"
    :aria-label="open ? 'Close navigation menu' : 'Open navigation menu'"
    class="sine-menu-trigger relative inline-flex shrink-0 items-center justify-center border-0 bg-transparent p-0 shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-electric/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-obsidian rounded-md lg:cursor-none"
    :class="open ? 'cursor-clickable cursor-gold is-open' : 'cursor-clickable cursor-blue'"
    @click="emit('toggle')"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
  >
    <svg
      viewBox="0 0 48 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      class="sine-trigger-svg overflow-visible"
    >
      <defs>
        <linearGradient :id="`${safeUid}-blue`" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="var(--color-brand-ice)" />
          <stop offset="50%" stop-color="var(--color-brand-electric)" />
          <stop offset="100%" stop-color="var(--color-brand-blue)" />
        </linearGradient>

        <linearGradient :id="`${safeUid}-gold`" x1="12%" y1="8%" x2="88%" y2="92%">
          <stop offset="0%" stop-color="var(--color-brand-champagne)" />
          <stop offset="46%" stop-color="var(--color-brand-gold-bright)" />
          <stop offset="100%" stop-color="var(--color-brand-gold)" />
        </linearGradient>
      </defs>

      <path
        :d="topPathD"
        :stroke="strokeUrl"
        stroke-width="2.1"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="sine-trigger-path"
      />
      <path
        :d="bottomPathD"
        :stroke="strokeUrl"
        stroke-width="2.1"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="sine-trigger-path"
      />
    </svg>
  </button>
</template>

<style scoped>
.sine-menu-trigger {
  width: 2.9rem;
  height: 2.55rem;
  -webkit-tap-highlight-color: transparent;
  transition: transform 280ms var(--ease-brand-silk);
}

.sine-menu-trigger:active {
  transform: scale(0.93);
}

.sine-trigger-svg {
  width: 2.65rem;
  height: 1.75rem;
  transition:
    filter 320ms var(--ease-brand-silk),
    transform 360ms var(--ease-brand-silk);
}

.sine-trigger-path {
  transition: stroke 260ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .sine-menu-trigger:not(.is-open):hover .sine-trigger-svg {
    filter: drop-shadow(0 0 10px rgba(30, 107, 255, 0.65));
  }

  .sine-menu-trigger.is-open:hover .sine-trigger-svg {
    transform: scale(1.07);
    filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.6));
  }
}

.sine-menu-trigger.is-open .sine-trigger-svg {
  filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.42));
}

@media (min-width: 768px) {
  .sine-menu-trigger {
    width: 3.2rem;
    height: 2.75rem;
  }

  .sine-trigger-svg {
    width: 2.95rem;
    height: 1.95rem;
  }
}

@media (max-height: 640px) and (orientation: landscape) {
  .sine-menu-trigger {
    width: 2.55rem;
    height: 2.15rem;
  }

  .sine-trigger-svg {
    width: 2.3rem;
    height: 1.52rem;
  }
}
</style>