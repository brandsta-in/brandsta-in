<!-- app/components/SignalFieldSvg.vue -->
<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  amplified?: boolean
}>()

const emit = defineEmits<{
  (e: 'pulse'): void
}>()

const FIELD_PHYSICS = {
  lerp: 0.075,
  outerShift: 22,
  midShift: 14,
  coreShift: 8,
} as const

const containerEl = ref<HTMLDivElement | null>(null)
const outerGroupEl = ref<SVGGElement | null>(null)
const midGroupEl = ref<SVGGElement | null>(null)
const coreGroupEl = ref<SVGGElement | null>(null)

const isPaused = ref(false)
const isBursting = ref(false)
const burstKey = ref(0)

let normX = 0
let normY = 0
let curX = 0
let curY = 0
let rafId: number | null = null
let burstTimer: ReturnType<typeof setTimeout> | null = null
let prefersReducedMotion = false

function triggerBurst() {
  burstKey.value += 1
  isBursting.value = true
  emit('pulse')

  if (burstTimer) clearTimeout(burstTimer)
  burstTimer = setTimeout(() => {
    isBursting.value = false
  }, 950)
}

defineExpose({
  triggerBurst,
})

watch(
  () => props.amplified,
  (val) => {
    if (val) {
      triggerBurst()
    }
  }
)

function startParallaxLoop() {
  if (rafId !== null || isPaused.value || prefersReducedMotion) return
  rafId = window.requestAnimationFrame(stepParallax)
}

function stopParallaxLoop() {
  if (rafId !== null) {
    window.cancelAnimationFrame(rafId)
    rafId = null
  }
}

function stepParallax() {
  rafId = null
  if (isPaused.value || prefersReducedMotion) return

  curX += (normX - curX) * FIELD_PHYSICS.lerp
  curY += (normY - curY) * FIELD_PHYSICS.lerp

  if (outerGroupEl.value) {
    outerGroupEl.value.style.transform = `translate3d(${curX * FIELD_PHYSICS.outerShift}px, ${curY * FIELD_PHYSICS.outerShift}px, 0)`
  }
  if (midGroupEl.value) {
    midGroupEl.value.style.transform = `translate3d(${curX * FIELD_PHYSICS.midShift}px, ${curY * FIELD_PHYSICS.midShift}px, 0)`
  }
  if (coreGroupEl.value) {
    coreGroupEl.value.style.transform = `translate3d(${curX * FIELD_PHYSICS.coreShift}px, ${curY * FIELD_PHYSICS.coreShift}px, 0)`
  }

  if (Math.abs(normX - curX) + Math.abs(normY - curY) > 0.002) {
    startParallaxLoop()
  }
}

function onWindowPointerMove(e: PointerEvent) {
  if (prefersReducedMotion || !containerEl.value) return
  const rect = containerEl.value.getBoundingClientRect()
  const centerX = rect.left + rect.width * 0.5
  const centerY = rect.top + rect.height * 0.5
  const maxRadius = Math.max(window.innerWidth, window.innerHeight) * 0.5

  normX = Math.max(-1, Math.min(1, (e.clientX - centerX) / maxRadius))
  normY = Math.max(-1, Math.min(1, (e.clientY - centerY) / maxRadius))
  startParallaxLoop()
}

function onPointerLeave() {
  normX = 0
  normY = 0
  startParallaxLoop()
}

function onVisibilityChange() {
  isPaused.value = document.visibilityState === 'hidden'
  if (isPaused.value) {
    stopParallaxLoop()
  } else {
    startParallaxLoop()
  }
}

onMounted(() => {
  prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.addEventListener('pointermove', onWindowPointerMove, { passive: true })
  document.addEventListener('mouseleave', onPointerLeave, { passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  stopParallaxLoop()
  if (burstTimer) clearTimeout(burstTimer)
  window.removeEventListener('pointermove', onWindowPointerMove)
  document.removeEventListener('mouseleave', onPointerLeave)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div
    ref="containerEl"
    data-resonant-hover
    role="button"
    tabindex="0"
    aria-label="Interactive signal core — activate to pulse the signal"
    class="signal-stage relative flex items-center justify-center select-none cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1e6bff]/60 rounded-full"
    :class="{ 'is-paused': isPaused, 'is-amplified': amplified || isBursting }"
    @click="triggerBurst"
    @keydown.enter.prevent="triggerBurst"
    @keydown.space.prevent="triggerBurst"
  >
    <svg
      viewBox="0 0 600 600"
      class="w-full h-full max-w-[22rem] 2xs:max-w-[24rem] sm:max-w-[30rem] lg:max-w-[36rem] xl:max-w-[40rem] overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- Deep Atmospheric Bioluminescent Field (Pure SVG Gradient, Zero Filter Blur Repaints) -->
        <radialGradient id="signalAtmosphere" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#0a58ff" stop-opacity="0.52" />
          <stop offset="22%" stop-color="#0048ff" stop-opacity="0.26" />
          <stop offset="52%" stop-color="#002b99" stop-opacity="0.09" />
          <stop offset="82%" stop-color="#02050e" stop-opacity="0" />
        </radialGradient>

        <!-- Tight Core Corona -->
        <radialGradient id="signalCorona" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
          <stop offset="16%" stop-color="#8ec5ff" stop-opacity="0.92" />
          <stop offset="44%" stop-color="#0048ff" stop-opacity="0.55" />
          <stop offset="100%" stop-color="#0048ff" stop-opacity="0" />
        </radialGradient>

        <!-- Shockwave Gradient -->
        <linearGradient id="wavePulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0048ff" stop-opacity="0" />
          <stop offset="50%" stop-color="#8ec5ff" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#0048ff" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Layer 1: Outer Harmonic Field -->
      <g ref="outerGroupEl" class="parallax-layer">
        <!-- Breathing Deep Aura -->
        <circle
          cx="300"
          cy="300"
          r="275"
          fill="url(#signalAtmosphere)"
          class="aura-breathe origin-center"
        />

        <!-- 4 Concentric Resonance Field Rings -->
        <circle
          cx="300"
          cy="300"
          r="225"
          fill="none"
          stroke="rgba(30, 107, 255, 0.08)"
          stroke-width="1"
          class="ring-harmonic ring-delay-3 origin-center"
        />
        <circle
          cx="300"
          cy="300"
          r="172"
          fill="none"
          stroke="rgba(30, 107, 255, 0.13)"
          stroke-width="1"
          class="ring-harmonic ring-delay-2 origin-center"
        />

        <!-- Slow Clockwise Orbital Telemetry Arc -->
        <g class="orbit-cw origin-center">
          <circle
            cx="300"
            cy="300"
            r="172"
            fill="none"
            stroke="rgba(124, 180, 255, 0.28)"
            stroke-width="1.1"
            stroke-dasharray="42 228 18 252"
            stroke-linecap="round"
          />
          <circle cx="300" cy="128" r="2" fill="#7cb4ff" opacity="0.7" />
          <circle cx="300" cy="472" r="1.75" fill="#1e6bff" opacity="0.55" />
        </g>
      </g>

      <!-- Layer 2: Mid Resonance Chamber -->
      <g ref="midGroupEl" class="parallax-layer">
        <circle
          cx="300"
          cy="300"
          r="120"
          fill="none"
          stroke="rgba(48, 124, 255, 0.18)"
          stroke-width="1"
          class="ring-harmonic ring-delay-1 origin-center"
        />
        <circle
          cx="300"
          cy="300"
          r="72"
          fill="none"
          stroke="rgba(96, 165, 250, 0.24)"
          stroke-width="1"
          class="ring-harmonic origin-center"
        />

        <!-- Counter-Clockwise Inner Arc -->
        <g class="orbit-ccw origin-center">
          <circle
            cx="300"
            cy="300"
            r="120"
            fill="none"
            stroke="rgba(142, 197, 255, 0.34)"
            stroke-width="1.15"
            stroke-dasharray="28 160 12 176"
            stroke-linecap="round"
          />
          <circle cx="420" cy="300" r="2" fill="#8ec5ff" opacity="0.8" />
        </g>

        <!-- Continuous Autonomous Signal Ripple -->
        <circle
          cx="300"
          cy="300"
          r="52"
          fill="none"
          stroke="rgba(56, 139, 255, 0.42)"
          stroke-width="1.2"
          class="signal-ripple origin-center"
        />

        <!-- Interactive Click / Hover Shockwave -->
        <circle
          v-if="isBursting"
          :key="burstKey"
          cx="300"
          cy="300"
          r="64"
          fill="none"
          stroke="#7cb4ff"
          stroke-width="1.6"
          class="burst-shockwave origin-center"
        />
      </g>

      <!-- Layer 3: Bioluminescent Signal Core + Hidden Brandsta Signature Wave -->
      <g ref="coreGroupEl" class="parallax-layer">
        <!-- Subtle Emerging Brandsta Heartbeat Wave (Amplifies on Hover/Tap) -->
        <path
          d="M 246 300 L 274 300 Q 281 292 287 303 L 296 281 L 305 316 L 313 295 Q 319 304 326 300 L 354 300"
          fill="none"
          stroke="url(#wavePulseGrad)"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="core-waveform"
        />

        <!-- Inner Corona Glow -->
        <circle
          cx="300"
          cy="300"
          r="38"
          fill="url(#signalCorona)"
          class="core-corona origin-center"
        />

        <!-- White-Hot Signal Origin Point -->
        <circle
          cx="300"
          cy="300"
          r="4.2"
          fill="#ffffff"
          class="core-spark origin-center"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.signal-stage {
  width: 100%;
  aspect-ratio: 1 / 1;
  max-height: 58dvh;
}

.parallax-layer {
  will-change: transform;
}

.origin-center {
  transform-box: view-box;
  transform-origin: 300px 300px;
}

.aura-breathe {
  will-change: transform, opacity;
  animation: auraBreathe 6.4s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
}

.core-corona {
  will-change: transform, opacity;
  animation: coronaPulse 3.2s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.core-spark {
  will-change: transform;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.core-waveform {
  opacity: 0.16;
  transform-box: view-box;
  transform-origin: 300px 300px;
  transform: scaleX(0.84);
  transition: opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1), transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.signal-stage:hover .core-waveform,
.signal-stage.is-amplified .core-waveform {
  opacity: 0.92;
  transform: scaleX(1.08);
}

.signal-stage:hover .core-corona,
.signal-stage.is-amplified .core-corona {
  transform: scale(1.38);
}

.signal-stage:hover .core-spark,
.signal-stage.is-amplified .core-spark {
  transform: scale(1.32);
}

.orbit-cw {
  will-change: transform;
  animation: spinCw 38s linear infinite;
}

.orbit-ccw {
  will-change: transform;
  animation: spinCcw 26s linear infinite;
}

.ring-harmonic {
  will-change: transform, opacity;
  animation: ringBreathe 5.2s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
}

.ring-delay-1 {
  animation-delay: -1.2s;
}

.ring-delay-2 {
  animation-delay: -2.4s;
}

.ring-delay-3 {
  animation-delay: -3.6s;
}

.signal-ripple {
  will-change: transform, opacity;
  animation: rippleExpand 4.6s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}

.burst-shockwave {
  will-change: transform, opacity;
  animation: burstExpand 0.92s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.is-paused * {
  animation-play-state: paused !important;
}

@keyframes auraBreathe {
  0% {
    opacity: 0.78;
    transform: scale(0.92);
  }
  100% {
    opacity: 1;
    transform: scale(1.08);
  }
}

@keyframes coronaPulse {
  0% {
    opacity: 0.82;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1.16);
  }
}

@keyframes ringBreathe {
  0% {
    opacity: 0.55;
    transform: scale(0.985);
  }
  100% {
    opacity: 1;
    transform: scale(1.02);
  }
}

@keyframes rippleExpand {
  0% {
    opacity: 0.65;
    transform: scale(0.45);
  }
  80% {
    opacity: 0.08;
  }
  100% {
    opacity: 0;
    transform: scale(3.6);
  }
}

@keyframes burstExpand {
  0% {
    opacity: 0.95;
    transform: scale(0.35);
  }
  100% {
    opacity: 0;
    transform: scale(3.85);
  }
}

@keyframes spinCw {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes spinCcw {
  from {
    transform: rotate(360deg);
  }
  to {
    transform: rotate(0deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .aura-breathe,
  .core-corona,
  .orbit-cw,
  .orbit-ccw,
  .ring-harmonic,
  .signal-ripple,
  .burst-shockwave {
    animation: none !important;
  }
}
</style>