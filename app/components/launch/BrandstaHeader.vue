<!-- app/components/launch/BrandstaHeader.vue -->
<script setup lang="ts">
import { ref, computed, watch, useId, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useState } from '#imports'
import { useLenis } from '~/composables/useLenis'
import BrandstaSvg from '~/components/BrandstaSvg.vue'
import BrandstaMenuTrigger from '~/components/launch/BrandstaMenuTrigger.vue'
import BrandstaNavOverlay from '~/components/launch/BrandstaNavOverlay.vue'
import BrandstaReelModal from '~/components/launch/BrandstaReelModal.vue'
import { BRANDSTA_HEADER_CHOREOGRAPHY } from '~/data/navigationConfig'

const rawUid = useId()
const safeUid = computed(() => rawUid.replace(/[^a-zA-Z0-9_-]/g, ''))
const overlayId = computed(() => `brandsta-nav-${safeUid.value}`)
const route = useRoute()
const { scrollTo, onScroll } = useLenis()

// Shared with app/pages/index.vue so Header & Hero CTAs enter simultaneously on Beat 5
const isHeroStageActive = useState<boolean>('brandsta-hero-stage-active', () => false)

const isMenuOpen = ref(false)
const isReelOpen = ref(false)
const isScrolled = ref(false)
const hasRevealedOnce = ref(false)
const useDirectRevealTiming = ref(false)

const triggerRef = ref<InstanceType<typeof BrandstaMenuTrigger> | null>(null)
const reelTriggerBtnEl = ref<HTMLButtonElement | null>(null)

let unsubscribeHeaderScroll: (() => void) | null = null
let fallbackRevealTimer: ReturnType<typeof setTimeout> | null = null

const isHeaderEntered = computed(() => hasRevealedOnce.value || isHeroStageActive.value)

const wordmarkStyle = computed(() => ({
  transitionDelay: `${
    useDirectRevealTiming.value
      ? BRANDSTA_HEADER_CHOREOGRAPHY.directRouteDelayMs
      : BRANDSTA_HEADER_CHOREOGRAPHY.wordmarkDelayMs
  }ms`,
  transitionDuration: `${BRANDSTA_HEADER_CHOREOGRAPHY.entranceDurationMs}ms`,
}))

const reelTriggerStyle = computed(() => ({
  transitionDelay: `${
    useDirectRevealTiming.value
      ? BRANDSTA_HEADER_CHOREOGRAPHY.directRouteDelayMs + 35
      : BRANDSTA_HEADER_CHOREOGRAPHY.wordmarkDelayMs + 55
  }ms`,
  transitionDuration: `${BRANDSTA_HEADER_CHOREOGRAPHY.entranceDurationMs}ms`,
}))

const triggerWrapStyle = computed(() => ({
  transitionDelay: `${
    useDirectRevealTiming.value
      ? BRANDSTA_HEADER_CHOREOGRAPHY.directRouteDelayMs + 70
      : BRANDSTA_HEADER_CHOREOGRAPHY.triggerDelayMs
  }ms`,
  transitionDuration: `${BRANDSTA_HEADER_CHOREOGRAPHY.entranceDurationMs}ms`,
}))

function toggleMenu() {
  if (isReelOpen.value) {
    isReelOpen.value = false
  }
  isMenuOpen.value = !isMenuOpen.value
}

function closeMenuAndRestoreFocus() {
  if (!isMenuOpen.value) return
  isMenuOpen.value = false
  triggerRef.value?.focus()
}

function openReelModal() {
  if (isMenuOpen.value) {
    isMenuOpen.value = false
  }
  isReelOpen.value = true
}

function closeReelAndRestoreFocus() {
  if (!isReelOpen.value) return
  isReelOpen.value = false
  reelTriggerBtnEl.value?.focus()
}

function onWordmarkClick(e: MouseEvent) {
  if (isMenuOpen.value) {
    isMenuOpen.value = false
  }
  if (isReelOpen.value) {
    isReelOpen.value = false
  }
  if (route.path === '/') {
    e.preventDefault()
    scrollTo(0)
  }
}

watch(isHeroStageActive, (active) => {
  if (active) {
    hasRevealedOnce.value = true
  }
})

watch(
  () => route.fullPath,
  () => {
    if (isMenuOpen.value) {
      isMenuOpen.value = false
    }
    if (isReelOpen.value) {
      isReelOpen.value = false
    }
    if (route.path !== '/' && !hasRevealedOnce.value) {
      useDirectRevealTiming.value = true
      hasRevealedOnce.value = true
    }
  },
)

onMounted(() => {
  if (typeof window === 'undefined') return

  isScrolled.value =
    (window.scrollY || document.documentElement.scrollTop || 0) >
    BRANDSTA_HEADER_CHOREOGRAPHY.scrollGlassThresholdPx

  if (route.path !== '/') {
    useDirectRevealTiming.value = true
    hasRevealedOnce.value = true
  } else if (!isHeroStageActive.value) {
    fallbackRevealTimer = setTimeout(() => {
      if (!hasRevealedOnce.value) {
        hasRevealedOnce.value = true
      }
    }, 3600)
  }

  unsubscribeHeaderScroll = onScroll(({ scroll }) => {
    isScrolled.value = scroll > BRANDSTA_HEADER_CHOREOGRAPHY.scrollGlassThresholdPx
  })
})

onBeforeUnmount(() => {
  if (unsubscribeHeaderScroll) {
    unsubscribeHeaderScroll()
    unsubscribeHeaderScroll = null
  }
  if (fallbackRevealTimer !== null) {
    clearTimeout(fallbackRevealTimer)
    fallbackRevealTimer = null
  }
})
</script>

<template>
  <div>
    <header
      class="brandsta-header fixed inset-x-0 top-0 z-50 w-full max-w-full"
      :class="{
        'is-scrolled': isScrolled && !isMenuOpen,
        'is-overlay-open': isMenuOpen,
      }"
    >
      <!-- SVG Gradients for Dual-Layer Header Play Trigger (Lifted Luminous Blue -> Astral Gold) -->
      <svg aria-hidden="true" class="pointer-events-none absolute h-0 w-0 overflow-hidden">
        <defs>
          <linearGradient :id="`hdr-play-blue-${safeUid}`" x1="8%" y1="6%" x2="92%" y2="94%">
            <stop offset="0%" stop-color="#dbf0ff" />
            <stop offset="48%" stop-color="#5ca8ff" />
            <stop offset="100%" stop-color="#2979ff" />
          </linearGradient>

          <linearGradient :id="`hdr-play-gold-${safeUid}`" x1="10%" y1="8%" x2="90%" y2="92%">
            <stop offset="0%" stop-color="var(--color-brand-champagne)" />
            <stop offset="50%" stop-color="var(--color-brand-gold-bright)" />
            <stop offset="100%" stop-color="var(--color-brand-gold)" />
          </linearGradient>
        </defs>
      </svg>

      <!-- Single-DOM Adaptive Grid:
           - Mobile (<1024px):  [ Play ] (left) | [ BRANDSTA ] (center) | [ ≈ ] (right)
           - Desktop (>=1024px): [ BRANDSTA ] (left) ........... [ Play ]   [ ≈ ] (right) -->
      <div class="brand-shell brandsta-header-grid h-full min-w-0">
        <!-- 1. Pulsing Video Reel Play Button (Strictly Contained Within Header Height) -->
        <div
          class="header-reel-slot header-entrance-item shrink-0"
          :class="{ 'is-entered': isHeaderEntered }"
          :style="reelTriggerStyle"
        >
          <button
            ref="reelTriggerBtnEl"
            type="button"
            aria-label="Watch Brandsta Film"
            class="header-reel-btn cursor-clickable cursor-gold relative grid place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-bright/80 lg:cursor-none"
            :class="{ 'is-pulse-paused': isMenuOpen || isReelOpen }"
            @click="openReelModal"
          >
            <!-- Bounded Dual Harmonic Pulse Rings (Max 1.34x -> Never Overflows Header Height) -->
            <span aria-hidden="true" class="reel-pulse-ring reel-pulse-ring--1" />
            <span aria-hidden="true" class="reel-pulse-ring reel-pulse-ring--2" />

            <!-- Obsidian-Sapphire Glass Disc -->
            <span aria-hidden="true" class="reel-btn-disc" />

            <!-- Rest Layer: Slightly Lighter Luminous Blue Play Icon -->
            <span aria-hidden="true" class="reel-icon-layer reel-icon-layer--blue">
              <svg viewBox="0 0 24 24" fill="none" class="reel-play-svg block">
                <path
                  d="M8.4 6.35C7.74 5.94 6.9 6.41 6.9 7.19V16.81C6.9 17.59 7.74 18.06 8.4 17.65L16.35 12.84C16.98 12.45 16.98 11.55 16.35 11.16L8.4 6.35Z"
                  :fill="`url(#hdr-play-blue-${safeUid})`"
                />
              </svg>
            </span>

            <!-- Hover / Active Layer: Astral Gold Gradient Play Icon -->
            <span aria-hidden="true" class="reel-icon-layer reel-icon-layer--gold">
              <svg viewBox="0 0 24 24" fill="none" class="reel-play-svg block">
                <path
                  d="M8.4 6.35C7.74 5.94 6.9 6.41 6.9 7.19V16.81C6.9 17.59 7.74 18.06 8.4 17.65L16.35 12.84C16.98 12.45 16.98 11.55 16.35 11.16L8.4 6.35Z"
                  :fill="`url(#hdr-play-gold-${safeUid})`"
                />
              </svg>
            </span>
          </button>
        </div>

        <!-- 2. BrandstaSvg Wordmark (Centered on <1024px, Left-Aligned on >=1024px) -->
        <div
          class="header-wordmark-slot header-entrance-item min-w-0"
          :class="{ 'is-entered': isHeaderEntered }"
          :style="wordmarkStyle"
        >
          <NuxtLink
            to="/"
            aria-label="Brandsta Home"
            class="brandsta-wordmark-link cursor-clickable cursor-blue flex max-w-full items-center py-1.5 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-electric/80 rounded-sm lg:cursor-none"
            @click="onWordmarkClick"
          >
            <BrandstaSvg variant="wordmark" class="brandsta-wordmark-svg block" />
          </NuxtLink>
        </div>

        <!-- 3. Right Menu Sine Waves -> Extended Golden '×' (Scaled Down & True-Centered Vertically) -->
        <div
          class="header-menu-slot header-entrance-item shrink-0"
          :class="{ 'is-entered': isHeaderEntered }"
          :style="triggerWrapStyle"
        >
          <BrandstaMenuTrigger
            ref="triggerRef"
            :open="isMenuOpen"
            :controls-id="overlayId"
            @toggle="toggleMenu"
          />
        </div>
      </div>
    </header>

    <!-- Overflow-Safe Full-Screen Navigation Overlay -->
    <BrandstaNavOverlay
      :open="isMenuOpen"
      :overlay-id="overlayId"
      @close="closeMenuAndRestoreFocus"
    />

    <!-- Brandsta 9:16 Video Modal (/videos/hello-world.mp4) -->
    <BrandstaReelModal
      :open="isReelOpen"
      video-src="/videos/hello-world.mp4"
      @close="closeReelAndRestoreFocus"
    />
  </div>
</template>

<style scoped>
.brandsta-header {
  --menu-svg-w: 2.15rem;
  height: calc(4.4rem + env(safe-area-inset-top, 0px));
  padding-top: env(safe-area-inset-top, 0px);
  overflow: clip;
  background-color: rgba(2, 5, 14, 0);
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
  transition:
    height 360ms var(--ease-brand-silk),
    background-color 360ms var(--ease-brand-silk),
    backdrop-filter 360ms ease,
    box-shadow 360ms ease;
}

.brandsta-header::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    rgba(0, 72, 255, 0) 0%,
    rgba(30, 107, 255, 0.22) 26%,
    rgba(124, 180, 255, 0.36) 50%,
    rgba(30, 107, 255, 0.22) 74%,
    rgba(0, 72, 255, 0) 100%
  );
  transition: opacity 360ms var(--ease-brand-silk);
}

.brandsta-header.is-scrolled {
  height: calc(3.85rem + env(safe-area-inset-top, 0px));
  background-color: rgba(2, 5, 14, 0.76);
  backdrop-filter: blur(14px) saturate(135%);
  -webkit-backdrop-filter: blur(14px) saturate(135%);
  box-shadow: 0 12px 32px -16px rgba(0, 4, 16, 0.88);
}

.brandsta-header.is-scrolled::after {
  opacity: 1;
}

/* =========================================================================
   RESPONSIVE SINGLE-DOM HEADER GRID (Zero Baseline Strut Offset)
   ========================================================================= */
.brandsta-header-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 0.5rem;
}

.header-reel-slot,
.header-wordmark-slot,
.header-menu-slot {
  display: flex;
  align-items: center;
  line-height: 0;
}

.header-reel-slot {
  grid-column: 1;
  grid-row: 1;
  justify-self: start;
}

.header-wordmark-slot {
  grid-column: 2;
  grid-row: 1;
  justify-self: center;
}

.header-menu-slot {
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
}

/* True Vertical Centering + Calibrated Smaller Hamburger Size Across Viewports */
.brandsta-header .header-menu-slot.header-entrance-item :deep(button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  padding-block: 0;
  vertical-align: middle;
}

.brandsta-header .header-menu-slot.header-entrance-item :deep(svg) {
  display: block;
  width: var(--menu-svg-w);
  height: calc(var(--menu-svg-w) * 2 / 3);
}

.header-entrance-item {
  opacity: 0;
  transform: translate3d(0, -12px, 0);
  pointer-events: none;
  transition-property: opacity, transform;
  transition-timing-function: var(--ease-brand-silk);
}

.header-entrance-item.is-entered {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  pointer-events: auto;
}

/* =========================================================================
   CONTAINED PULSING REEL PLAY BUTTON
   ========================================================================= */
.header-reel-btn {
  --reel-btn-size: 2.1rem;
  --reel-gold-mix: 0;
  width: var(--reel-btn-size);
  height: var(--reel-btn-size);
  padding: 0;
  border: 0;
  line-height: 0;
  background: transparent;
  -webkit-tap-highlight-color: transparent;
  transition: transform 280ms var(--ease-brand-silk);
}

.reel-btn-disc {
  grid-area: 1 / 1;
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  border: 1px solid rgba(124, 180, 255, 0.46);
  background: radial-gradient(
    circle at 50% 38%,
    rgba(16, 38, 90, 0.72) 0%,
    rgba(3, 8, 22, 0.88) 100%
  );
  box-shadow: inset 0 1px 0 rgba(203, 230, 255, 0.18);
  transition:
    border-color 300ms var(--ease-brand-silk),
    box-shadow 300ms var(--ease-brand-silk);
}

.reel-pulse-ring {
  grid-area: 1 / 1;
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  pointer-events: none;
  will-change: transform, opacity;
  animation: headerReelPulse 2.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}

.reel-pulse-ring--1 {
  border: 1px solid rgba(124, 180, 255, 0.62);
}

.reel-pulse-ring--2 {
  border: 1px solid rgba(251, 191, 36, 0.48);
  animation-delay: 1.4s;
}

.header-reel-btn.is-pulse-paused .reel-pulse-ring {
  animation-play-state: paused;
  opacity: 0;
}

@keyframes headerReelPulse {
  0% {
    transform: scale3d(1, 1, 1);
    opacity: 0.72;
  }
  78% {
    transform: scale3d(1.34, 1.34, 1);
    opacity: 0;
  }
  100% {
    transform: scale3d(1.34, 1.34, 1);
    opacity: 0;
  }
}

.reel-icon-layer {
  grid-area: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition:
    opacity 300ms var(--ease-brand-silk),
    filter 300ms var(--ease-brand-silk);
}

.reel-icon-layer--blue {
  opacity: calc(1 - var(--reel-gold-mix));
  filter: drop-shadow(0 0 7px rgba(92, 168, 255, 0.52));
}

.reel-icon-layer--gold {
  opacity: var(--reel-gold-mix);
  filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.58));
}

.reel-play-svg {
  width: 0.96rem;
  height: 0.96rem;
  transform: translate3d(0.8px, 0, 0);
}

@media (hover: hover) and (pointer: fine) {
  .header-reel-btn:hover,
  .header-reel-btn:focus-visible {
    --reel-gold-mix: 1;
    transform: scale(1.05);
  }

  .header-reel-btn:hover .reel-btn-disc,
  .header-reel-btn:focus-visible .reel-btn-disc {
    border-color: rgba(254, 240, 138, 0.78);
    box-shadow:
      0 0 14px -3px rgba(251, 191, 36, 0.42),
      inset 0 1px 0 rgba(254, 240, 138, 0.28);
  }
}

.header-reel-btn:active {
  --reel-gold-mix: 1;
  transform: scale(0.93);
}

/* =========================================================================
   WORDMARK & BREAKPOINT CALIBRATION
   ========================================================================= */
.brandsta-wordmark-link {
  line-height: 0;
  -webkit-tap-highlight-color: transparent;
}

.brandsta-wordmark-svg {
  height: 1.06rem;
  width: auto;
  max-width: 100%;
  transition: filter 280ms var(--ease-brand-silk);
}

@media (hover: hover) and (pointer: fine) {
  .brandsta-wordmark-link:hover .brandsta-wordmark-svg {
    filter: drop-shadow(0 0 10px rgba(30, 107, 255, 0.44));
  }
}

@media (min-width: 360px) {
  .brandsta-wordmark-svg {
    height: 1.22rem;
  }
}

@media (min-width: 390px) {
  .brandsta-header {
    --menu-svg-w: 2.26rem;
  }

  .brandsta-wordmark-svg {
    height: 1.32rem;
  }
}

@media (min-width: 480px) {
  .brandsta-header {
    --menu-svg-w: 2.34rem;
  }

  .brandsta-wordmark-svg {
    height: 1.48rem;
  }
}

@media (min-width: 768px) {
  .brandsta-header {
    --menu-svg-w: 2.44rem;
  }

  .brandsta-wordmark-svg {
    height: 1.65rem;
  }
}

/* Desktop (>=1024px): Play Button Shifted Left via Wider Gap + Slightly Trimmed Hamburger */
@media (min-width: 1024px) {
  .brandsta-header {
    --menu-svg-w: 2.62rem;
    height: calc(5.15rem + env(safe-area-inset-top, 0px));
  }

  .brandsta-header.is-scrolled {
    height: calc(4.35rem + env(safe-area-inset-top, 0px));
  }

  .brandsta-header-grid {
    grid-template-columns: minmax(0, 1fr) auto auto;
    column-gap: 1.45rem;
  }

  .header-wordmark-slot {
    grid-column: 1;
    justify-self: start;
  }

  .header-reel-slot {
    grid-column: 2;
    justify-self: end;
  }

  .header-menu-slot {
    grid-column: 3;
    justify-self: end;
  }

  .header-reel-btn {
    --reel-btn-size: 2.5rem;
  }

  .reel-play-svg {
    width: 1.1rem;
    height: 1.1rem;
  }

  .brandsta-wordmark-svg {
    height: 1.78rem;
  }
}

@media (min-width: 1280px) and (orientation: landscape) {
  .brandsta-header-grid {
    column-gap: 1.65rem;
  }

  .brandsta-wordmark-svg {
    height: 1.82rem;
  }
}

/* Short Landscape Compact Header Guard (<= 640px height) */
@media (max-height: 640px) and (orientation: landscape) {
  .brandsta-header,
  .brandsta-header.is-scrolled {
    --menu-svg-w: 2.05rem;
    height: calc(3.4rem + env(safe-area-inset-top, 0px));
  }

  .header-reel-btn {
    --reel-btn-size: 1.85rem;
  }

  .reel-play-svg {
    width: 0.86rem;
    height: 0.86rem;
  }

  .brandsta-wordmark-svg {
    height: 1.24rem;
  }
}
</style>