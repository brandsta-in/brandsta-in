<!-- app/components/launch/LaunchHeader.vue -->
<template>
  <header class="launch-header relative z-30 w-full">
    <div class="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:h-20 sm:px-8 lg:px-12">
      <!-- Left Trigger: 2-Filament Dual-Phase Harmonic (Silver-White + Brandsta Blue) -->
      <button
        type="button"
        class="harmonic-btn group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
        :class="{ 'is-open': isHorizonOpen }"
        :aria-expanded="isHorizonOpen"
        aria-label="Open Brandsta horizon menu"
        @click="$emit('toggle-horizon')"
      >
        <svg
          viewBox="0 0 36 24"
          class="h-6 w-8 overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <!-- Top Strand: Brushed Silver-White -->
          <path
            class="strand strand--silver"
            d="M 3 7.5 C 9.5 3.5, 16.5 11.5, 23 7.5 C 27.5 4.8, 30.8 6.2, 33 7.5"
            stroke="#e2e8f0"
            stroke-width="1.85"
            stroke-linecap="round"
          />
          <!-- Bottom Strand: Asymmetric Brandsta Electric Blue -->
          <path
            class="strand strand--blue"
            d="M 3 16.5 C 9 19.5, 13.5 13.5, 18 11.2 C 21.8 17.5, 26.2 18.2, 30.5 15.8"
            stroke="#3b82f6"
            stroke-width="2"
            stroke-linecap="round"
          />
          <!-- Pinpoint White-Ice Node Spark when Intersected -->
          <circle
            cx="18"
            cy="12"
            r="2"
            fill="#f8fafc"
            class="node-spark"
          />
        </svg>
      </button>

      <!-- Center Wordmark: BRANDSTA (Signature Electric-Blue First 'A') -->
      <NuxtLink
        to="/"
        class="wordmark-link inline-flex items-center py-2 text-[1.08rem] font-bold tracking-[0.26em] text-white select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] sm:text-[1.24rem] sm:tracking-[0.3em]"
        aria-label="Brandsta Home"
      >
        <span>BR</span><span class="text-[#2563eb]">A</span><span>NDSTA</span>
      </NuxtLink>

      <!-- Right Trigger: Icon-Only Signal Bubble (Concierge Contact Overlay) -->
      <button
        type="button"
        class="signal-bubble-btn group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
        :aria-expanded="isContactOpen"
        aria-label="Open direct studio contact channels"
        @click="$emit('toggle-contact')"
      >
        <svg
          viewBox="0 0 38 30"
          class="h-[26px] w-[33px] overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <!-- Brushed-Silver Capsule Speech Rim -->
          <path
            class="bubble-rim"
            d="M 11.5 3.5 H 26.5 C 31.47 3.5 35.5 7.53 35.5 12.5 C 35.5 17.47 31.47 21.5 26.5 21.5 H 16.2 L 9.8 26.2 V 21.3 C 5.66 20.52 2.5 16.88 2.5 12.5 C 2.5 7.53 6.53 3.5 11.5 3.5 Z"
            stroke="rgba(226, 232, 240, 0.78)"
            stroke-width="1.45"
            stroke-linejoin="round"
            fill="rgba(8, 18, 44, 0.55)"
          />
          <!-- Inner Brandsta Live Waveform -->
          <path
            class="bubble-wave"
            d="M 8.5 13 H 12.6 L 14.7 10.2 L 17.2 16.2 L 20.1 7.6 L 23.1 16.5 L 25.5 11.5 L 27.2 13 H 30"
            stroke="#3b82f6"
            stroke-width="1.65"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <!-- Top Horizon Sapphire Hairline + Center Focal Flare -->
    <div class="horizon-line relative h-px w-full overflow-hidden" aria-hidden="true">
      <div class="horizon-rail absolute inset-0" />
      <div class="horizon-flare absolute top-0 left-1/2 h-full w-72 -translate-x-1/2 sm:w-[30rem]" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  isHorizonOpen: boolean
  isContactOpen: boolean
}>()

defineEmits<{
  'toggle-horizon': []
  'toggle-contact': []
}>()
</script>

<style scoped>
/* Beat 5 Entrance (1050ms) */
.launch-header {
  opacity: 0;
  transform: translate3d(0, -10px, 0);
  animation: headerSettle calc(420ms * var(--hero-tempo, 1)) cubic-bezier(0.22, 1, 0.36, 1) calc(1050ms * var(--hero-tempo, 1)) forwards;
}

.horizon-line {
  transform-origin: center;
  transform: scaleX(0);
  animation: horizonUnfurl calc(520ms * var(--hero-tempo, 1)) cubic-bezier(0.22, 1, 0.36, 1) calc(1020ms * var(--hero-tempo, 1)) forwards;
}

.horizon-rail {
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.04) 0%,
    rgba(59, 130, 246, 0.42) 26%,
    rgba(147, 197, 253, 0.85) 50%,
    rgba(59, 130, 246, 0.42) 74%,
    rgba(37, 99, 235, 0.04) 100%
  );
}

.horizon-flare {
  background: radial-gradient(
    ellipse at center,
    rgba(96, 165, 250, 0.95) 0%,
    rgba(37, 99, 235, 0) 72%
  );
}

/* Left Dual-Phase Harmonic Choreography */
.strand {
  transform-box: view-box;
  transform-origin: 18px 12px;
  transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), stroke 280ms ease;
}

.node-spark {
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  transform: scale(0.2);
  transition: opacity 260ms ease, transform 340ms cubic-bezier(0.22, 1, 0.36, 1);
}

@media (hover: hover) {
  .harmonic-btn:hover:not(.is-open) .strand--silver {
    transform: translate3d(2.5px, 0, 0);
    stroke: #ffffff;
  }
  .harmonic-btn:hover:not(.is-open) .strand--blue {
    transform: translate3d(-2.5px, 0, 0);
    stroke: #60a5fa;
  }
}

.harmonic-btn:active .strand--silver {
  transform: scaleX(0.94);
}

/* Intersecting Curved Wave-Node '×' State */
.harmonic-btn.is-open .strand--silver {
  transform: translate3d(0, 4.5px, 0) rotate(28deg);
  stroke: #ffffff;
}

.harmonic-btn.is-open .strand--blue {
  transform: translate3d(1.5px, -3.5px, 0) rotate(-28deg);
  stroke: #60a5fa;
}

.harmonic-btn.is-open .node-spark {
  opacity: 1;
  transform: scale(1);
}

/* Right Signal Bubble Choreography */
.bubble-rim,
.bubble-wave {
  transition: stroke 260ms ease, transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

@media (hover: hover) {
  .signal-bubble-btn:hover .bubble-rim {
    stroke: #ffffff;
  }
  .signal-bubble-btn:hover .bubble-wave {
    stroke: #60a5fa;
    transform: scaleY(1.08);
    transform-origin: center;
  }
}

.signal-bubble-btn:active {
  transform: scale3d(0.95, 0.95, 1);
}

@keyframes headerSettle {
  0% {
    opacity: 0;
    transform: translate3d(0, -10px, 0);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes horizonUnfurl {
  0% {
    transform: scaleX(0);
  }
  100% {
    transform: scaleX(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .launch-header,
  .horizon-line {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
</style>