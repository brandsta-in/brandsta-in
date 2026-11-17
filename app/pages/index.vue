<!-- app/pages/index.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useBrandstaSeo } from '~/composables/useBrandstaSeo'
import SignalFieldSvg from '~/components/SignalFieldSvg.vue'

useBrandstaSeo({
  title: 'Brandsta | Something is forming.',
  description: 'Something is forming. Every beginning carries a signal. Follow its journey.',
})

const isWordHovered = ref(false)
const signalRef = ref<InstanceType<typeof SignalFieldSvg> | null>(null)

function amplifySignal() {
  signalRef.value?.triggerBurst()
}
</script>

<template>
  <main
    class="relative grid h-dvh min-h-[36rem] w-full grid-rows-[auto_1fr_auto] overflow-hidden bg-[#02050e] px-6 pt-7 pb-0 sm:px-12 sm:pt-10 lg:px-20 lg:pt-12 2xl:px-28"
  >
    <!-- Subtle Edge Vignette Depth -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_52%,rgba(0,72,255,0.08)_0%,rgba(2,5,14,0)_62%)]"
    />

    <!-- Row 1: Minimalist PREVIEW Top Bar -->
    <header
      v-motion-hero-micro-up
      class="relative z-10 mx-auto flex w-full max-w-[90rem] items-center justify-between"
    >
      <span
        data-resonant-hover
        class="inline-flex items-center gap-3 text-[0.72rem] sm:text-xs font-medium uppercase tracking-[0.32em] text-white/78 select-none cursor-default transition-colors duration-300 hover:text-white"
        @mouseenter="amplifySignal"
      >
        PREVIEW
      </span>

      <!-- Quiet Live Resonance Status Node (Balances Frame Without Scroll Arrow) -->
      <span
        aria-hidden="true"
        class="inline-flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.26em] text-white/40 select-none"
      >
        <span class="signal-beacon h-1.5 w-1.5 rounded-full bg-[#0048ff]" />
      </span>
    </header>

    <!-- Row 2: Responsive 2-Column Desktop / Stacked Mobile Stage -->
    <section
      aria-labelledby="formation-heading"
      class="relative z-10 mx-auto grid w-full max-w-[90rem] grid-cols-1 items-center gap-4 lg:grid-cols-12 lg:gap-8"
    >
      <!-- Left Copy Column -->
      <div class="flex flex-col items-start justify-center pt-4 sm:pt-6 lg:col-span-6 lg:pt-0">
        <h1
          id="formation-heading"
          v-motion-hero-scale-in
          class="text-[2.65rem] 2xs:text-[3.1rem] sm:text-[4.25rem] lg:text-[4.75rem] xl:text-[5.5rem] 2xl:text-[6rem] font-bold leading-[1.03] tracking-[-0.035em] text-white"
        >
          <span class="block">Something</span>
          <span class="block mt-0.5 sm:mt-1">
            is
            <span
              data-resonant-hover
              role="button"
              tabindex="0"
              aria-label="forming — interact to resonate signal"
              class="forming-accent relative inline-block text-[#0048ff] cursor-pointer focus:outline-none focus-visible:underline"
              @mouseenter="isWordHovered = true"
              @mouseleave="isWordHovered = false"
              @click="amplifySignal"
              @keydown.enter.prevent="amplifySignal"
              @keydown.space.prevent="amplifySignal"
            >forming.</span>
          </span>
        </h1>

        <p
          v-motion-hero-fade-up
          class="mt-5 sm:mt-7 lg:mt-8 max-w-[26rem] text-[0.98rem] 2xs:text-[1.05rem] sm:text-[1.25rem] xl:text-[1.42rem] font-normal leading-[1.52] tracking-[-0.01em] text-white/82"
        >
          <span class="block">Every beginning carries a signal.</span>
          <span class="block mt-0.5">Follow its journey.</span>
        </p>
      </div>

      <!-- Right Living Signal Field Column -->
      <div class="flex items-center justify-center lg:col-span-6">
        <SignalFieldSvg
          ref="signalRef"
          :amplified="isWordHovered"
        />
      </div>
    </section>

    <!-- Row 3: Bottom Anchor Signal Pin -->
    <footer
      aria-hidden="true"
      class="relative z-10 flex flex-col items-center justify-end pointer-events-none"
    >
      <div class="relative flex flex-col items-center">
        <!-- Glowing Blue Pin Tip -->
        <span class="pin-node h-2 w-2 rounded-full bg-[#0048ff]" />
        <!-- Vertical Hairline Filament with Rising Light Packet -->
        <div class="relative h-10 sm:h-14 w-px overflow-hidden bg-white/25">
          <span class="pin-stream absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-transparent via-[#60a5fa] to-white" />
        </div>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.forming-accent {
  text-shadow: 0 0 34px rgba(0, 72, 255, 0.42);
  transition: color 0.35s cubic-bezier(0.22, 1, 0.36, 1), transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.forming-accent:hover,
.forming-accent:active {
  color: #2970ff;
  transform: translate3d(2px, 0, 0);
}

.signal-beacon {
  box-shadow: 0 0 10px rgba(0, 72, 255, 0.95);
  will-change: transform, opacity;
  animation: beaconPulse 2.8s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
}

.pin-node {
  box-shadow: 0 0 12px rgba(0, 72, 255, 0.95);
  will-change: transform, opacity;
  animation: beaconPulse 2.4s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
}

.pin-stream {
  will-change: transform, opacity;
  animation: streamRise 2.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}

@keyframes beaconPulse {
  0% {
    opacity: 0.55;
    transform: scale(0.88);
  }
  100% {
    opacity: 1;
    transform: scale(1.22);
  }
}

@keyframes streamRise {
  0% {
    opacity: 0;
    transform: translate3d(0, 24px, 0);
  }
  45% {
    opacity: 0.95;
  }
  100% {
    opacity: 0;
    transform: translate3d(0, -56px, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .signal-beacon,
  .pin-node,
  .pin-stream {
    animation: none !important;
  }
}
</style>