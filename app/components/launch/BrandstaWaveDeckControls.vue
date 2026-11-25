<!-- app/components/launch/BrandstaWaveDeckControls.vue -->
<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    virtualPos: number
    size?: 'md' | 'lg'
  }>(),
  {
    size: 'md',
  },
)

const emit = defineEmits<{
  prev: []
  next: []
}>()

const rawUid = useId()
const safeUid = computed(() => `wdc-${rawUid.replace(/[^a-zA-Z0-9_-]/g, '')}`)

interface HarmonicNodeSlot {
  vIndex: number
  style: {
    transform: string
    opacity: string
  }
  goldOpacity: string
  blueOpacity: string
}

function samplePiecewise(
  x: number,
  stops: readonly [number, number][],
): number {
  const first = stops[0]!
  const last = stops[stops.length - 1]!
  if (x <= first[0]) return first[1]
  if (x >= last[0]) return last[1]

  for (let i = 0; i < stops.length - 1; i++) {
    const [x0, y0] = stops[i]!
    const [x1, y1] = stops[i + 1]!
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0)
      return y0 + (y1 - y0) * t
    }
  }
  return last[1]
}

// Scale & Opacity curves: Central crest (d = 0) is significantly larger & tapers smoothly outward
const SCALE_STOPS: readonly [number, number][] = [
  [0.0, 1.42],
  [1.0, 0.8],
  [2.0, 0.56],
  [3.0, 0.36],
  [3.85, 0.15],
]

const OPACITY_STOPS: readonly [number, number][] = [
  [0.0, 1.0],
  [1.0, 0.9],
  [2.0, 0.62],
  [3.0, 0.34],
  [3.75, 0.0],
]

const harmonicNodes = computed<HarmonicNodeSlot[]>(() => {
  const centerInt = Math.round(props.virtualPos)
  const stepPx = props.size === 'lg' ? 19.5 : 17
  const centerClearancePx = props.size === 'lg' ? 4 : 3.2
  const nodes: HarmonicNodeSlot[] = []

  for (let vIdx = centerInt - 4; vIdx <= centerInt + 4; vIdx++) {
    const d = vIdx - props.virtualPos
    const absD = Math.abs(d)
    const sign = d === 0 ? 0 : d > 0 ? 1 : -1

    const xPx =
      d * stepPx + sign * Math.min(1, absD) * centerClearancePx
    const scale = samplePiecewise(absD, SCALE_STOPS)
    const opacity = samplePiecewise(absD, OPACITY_STOPS)
    const goldMix = Math.max(0, Math.min(1, 1 - absD * 1.15))

    nodes.push({
      vIndex: vIdx,
      style: {
        transform: `translate3d(${xPx.toFixed(2)}px, 0, 0) scale3d(${scale.toFixed(3)}, ${scale.toFixed(3)}, 1)`,
        opacity: opacity.toFixed(3),
      },
      goldOpacity: goldMix.toFixed(3),
      blueOpacity: (1 - goldMix).toFixed(3),
    })
  }

  return nodes
})
</script>

<template>
  <div
    class="wave-deck-capsule inline-flex items-center select-none"
    :class="size === 'lg' ? 'is-lg' : 'is-md'"
  >
    <!-- Shared SVG Gradients for Sculpted 4-Point Brandsta Harmonic Crests -->
    <svg aria-hidden="true" class="pointer-events-none absolute h-0 w-0 overflow-hidden">
      <defs>
        <linearGradient :id="`${safeUid}-crest-gold`" x1="10%" y1="5%" x2="90%" y2="95%">
          <stop offset="0%" stop-color="var(--color-brand-champagne)" />
          <stop offset="48%" stop-color="var(--color-brand-gold-bright)" />
          <stop offset="100%" stop-color="var(--color-brand-gold)" />
        </linearGradient>

        <linearGradient :id="`${safeUid}-crest-blue`" x1="10%" y1="5%" x2="90%" y2="95%">
          <stop offset="0%" stop-color="var(--color-brand-ice)" />
          <stop offset="52%" stop-color="var(--color-brand-electric)" />
          <stop offset="100%" stop-color="var(--color-brand-blue)" />
        </linearGradient>
      </defs>
    </svg>

    <!-- Immediate Left Trigger ('<') -->
    <button
      type="button"
      aria-label="Previous catalogue slide"
      class="wdc-arrow-btn cursor-clickable cursor-blue inline-flex shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-electric/80 lg:cursor-none"
      @click="emit('prev')"
    >
      <svg viewBox="0 0 24 24" fill="none" class="wdc-arrow-svg">
        <path
          d="M14.25 6.75L8.75 12L14.25 17.25"
          stroke="currentColor"
          stroke-width="1.85"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <!-- Strictly Non-Clickable Sliding Brandsta Harmonic Crest Track (Center Crest Larger & Gold) -->
    <div
      aria-hidden="true"
      class="wdc-harmonic-window pointer-events-none relative grid place-items-center overflow-hidden"
    >
      <!-- Subtle Center Resonance Halo Behind Active Crest -->
      <span class="wdc-center-aura pointer-events-none absolute rounded-full" />

      <span
        v-for="node in harmonicNodes"
        :key="node.vIndex"
        :style="node.style"
        class="wdc-crest-slot pointer-events-none grid place-items-center"
      >
        <!-- Sapphire-Ice Flank Layer -->
        <svg
          viewBox="0 0 24 24"
          fill="none"
          class="wdc-crest-svg wdc-crest-svg--blue"
          :style="{ opacity: node.blueOpacity }"
        >
          <path
            d="M12 1.5C13.45 8.25 15.75 10.55 22.5 12C15.75 13.45 13.45 15.75 12 22.5C10.55 15.75 8.25 13.45 1.5 12C8.25 10.55 10.55 8.25 12 1.5Z"
            :fill="`url(#${safeUid}-crest-blue)`"
          />
        </svg>

        <!-- Astral-Gold Central Active Layer -->
        <svg
          viewBox="0 0 24 24"
          fill="none"
          class="wdc-crest-svg wdc-crest-svg--gold"
          :style="{ opacity: node.goldOpacity }"
        >
          <path
            d="M12 1.5C13.45 8.25 15.75 10.55 22.5 12C15.75 13.45 13.45 15.75 12 22.5C10.55 15.75 8.25 13.45 1.5 12C8.25 10.55 10.55 8.25 12 1.5Z"
            :fill="`url(#${safeUid}-crest-gold)`"
          />
        </svg>
      </span>
    </div>

    <!-- Immediate Right Trigger ('>') -->
    <button
      type="button"
      aria-label="Next catalogue slide"
      class="wdc-arrow-btn cursor-clickable cursor-blue inline-flex shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-electric/80 lg:cursor-none"
      @click="emit('next')"
    >
      <svg viewBox="0 0 24 24" fill="none" class="wdc-arrow-svg">
        <path
          d="M9.75 6.75L15.25 12L9.75 17.25"
          stroke="currentColor"
          stroke-width="1.85"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.wave-deck-capsule {
  padding: 0.32rem;
  gap: 0.45rem;
  border-radius: 9999px;
  border: 1px solid rgba(124, 180, 255, 0.22);
  background: linear-gradient(
    180deg,
    rgba(6, 13, 32, 0.84) 0%,
    rgba(2, 6, 16, 0.94) 100%
  );
  box-shadow:
    0 18px 42px -16px rgba(0, 0, 0, 0.92),
    inset 0 1px 0 rgba(203, 230, 255, 0.1);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.wave-deck-capsule.is-lg {
  padding: 0.38rem;
  gap: 0.6rem;
}

.wdc-arrow-btn {
  width: 2.35rem;
  height: 2.35rem;
  color: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(124, 180, 255, 0.32);
  background: radial-gradient(
    circle at 50% 45%,
    rgba(16, 38, 90, 0.62) 0%,
    rgba(4, 10, 26, 0.88) 100%
  );
  -webkit-tap-highlight-color: transparent;
  transition:
    transform 240ms var(--ease-brand-silk),
    border-color 240ms ease,
    box-shadow 240ms ease,
    color 240ms ease;
}

.wave-deck-capsule.is-lg .wdc-arrow-btn {
  width: 2.6rem;
  height: 2.6rem;
}

.wdc-arrow-svg {
  width: 1.05rem;
  height: 1.05rem;
}

@media (hover: hover) and (pointer: fine) {
  .wdc-arrow-btn:hover {
    color: var(--color-brand-champagne);
    border-color: rgba(254, 240, 138, 0.68);
    box-shadow: 0 0 18px -3px rgba(251, 191, 36, 0.38);
    transform: translate3d(0, -1px, 0);
  }
}

.wdc-arrow-btn:active {
  transform: scale(0.91);
}

/* Masked 7-Node Harmonic Window */
.wdc-harmonic-window {
  width: 7.75rem;
  height: 2.1rem;
  mask-image: linear-gradient(
    90deg,
    transparent 0%,
    #000 13%,
    #000 87%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent 0%,
    #000 13%,
    #000 87%,
    transparent 100%
  );
}

.wave-deck-capsule.is-lg .wdc-harmonic-window {
  width: 8.85rem;
  height: 2.3rem;
}

.wdc-center-aura {
  width: 1.5rem;
  height: 1.5rem;
  background: radial-gradient(
    circle,
    rgba(251, 191, 36, 0.24) 0%,
    rgba(30, 107, 255, 0.12) 55%,
    rgba(0, 0, 0, 0) 76%
  );
}

.wdc-crest-slot {
  grid-area: 1 / 1;
  width: 0.82rem;
  height: 0.82rem;
  will-change: transform, opacity;
}

.wave-deck-capsule.is-lg .wdc-crest-slot {
  width: 0.9rem;
  height: 0.9rem;
}

.wdc-crest-svg {
  grid-area: 1 / 1;
  width: 100%;
  height: 100%;
}

.wdc-crest-svg--blue {
  filter: drop-shadow(0 0 6px rgba(30, 107, 255, 0.48));
}

.wdc-crest-svg--gold {
  filter: drop-shadow(0 0 9px rgba(251, 191, 36, 0.82));
}
</style>