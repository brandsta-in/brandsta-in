<!-- app/pages/index.vue -->
<script setup lang="ts">
import { ref, useId, onMounted, onBeforeUnmount } from 'vue'
import { useNuxtApp, useSeoMeta, useState } from '#imports'
import { useLenis } from '~/composables/useLenis'
import ResonantFlowButton, {
  type ResonantButtonVariant,
  type ResonantButtonFluid,
  type ResonantButtonSize,
  type ResonantButtonArrow,
} from '~/components/ResonantFlowButton.vue'
import BrandstaHeroResonator from '~/components/launch/BrandstaHeroResonator.vue'
import BrandstaAmbientCanvas from '~/components/launch/BrandstaAmbientCanvas.vue'
import BrandstaHeroEditorial from '~/components/launch/BrandstaHeroEditorial.vue'
import BrandstaMakingWaves from '~/components/launch/BrandstaMakingWaves.vue'
import BrandstaCatalogue from '~/components/launch/BrandstaCatalogue.vue'
import BrandstaFinale from '~/components/launch/BrandstaFinale.vue'
import {
  HERO_EDITORIAL_CONTENT,
  HERO_STAGE_CHOREOGRAPHY,
} from '~/data/heroEditorialConfig'

useSeoMeta({
  title: 'Brandsta | Signature Branding. Amplified.',
  description:
    'Let’s make waves with your dreams. Bring us the dream. Let’s build what’s next, together.',
  ogTitle: 'Brandsta | Signature Branding. Amplified.',
  ogDescription:
    'Let’s make waves with your dreams. Bring us the dream. Let’s build what’s next, together.',
})

const heroUid = useId()
const nuxtApp = useNuxtApp()
const { scrollTo, onScroll } = useLenis()

const startsWithHeroLoader = import.meta.server || Boolean(nuxtApp.isHydrating)
const isHeroLoaderRunning = ref(startsWithHeroLoader)
const isHeroStageActive = useState<boolean>('brandsta-hero-stage-active', () => false)

// Mobile-first 'md' default; 'sm' on short landscape (<= 640px height); 'lg' at 1280px+ tall landscape
const heroCtaSize = ref<ResonantButtonSize>('md')

const scrollCueAnchorEl = ref<HTMLElement | null>(null)

let desktopCtaMedia: MediaQueryList | null = null
let compactLandscapeCtaMedia: MediaQueryList | null = null
let unsubscribeHeroScroll: (() => void) | null = null
let earlyStageTimer: ReturnType<typeof setTimeout> | null = null
let stageActivateRaf: number | null = null

function syncHeroCtaSize() {
  if (compactLandscapeCtaMedia?.matches) {
    heroCtaSize.value = 'sm'
  } else if (desktopCtaMedia?.matches) {
    heroCtaSize.value = 'lg'
  } else {
    heroCtaSize.value = 'md'
  }
}

function activateHeroStage() {
  if (isHeroStageActive.value) return
  if (typeof window !== 'undefined') {
    stageActivateRaf = window.requestAnimationFrame(() => {
      isHeroStageActive.value = true
    })
  } else {
    isHeroStageActive.value = true
  }
}

function onHeroLoaderStateChange(active: boolean) {
  isHeroLoaderRunning.value = active
  if (!active) {
    activateHeroStage()
  }
}

function scrollToNextSection() {
  const target = document.querySelector<HTMLElement>(HERO_EDITORIAL_CONTENT.scrollTargetSelector)
  if (target) {
    scrollTo(target)
  }
}

onMounted(() => {
  desktopCtaMedia = window.matchMedia('(min-width: 1280px) and (orientation: landscape)')
  compactLandscapeCtaMedia = window.matchMedia('(max-height: 640px) and (orientation: landscape)')
  syncHeroCtaSize()

  desktopCtaMedia.addEventListener('change', syncHeroCtaSize)
  compactLandscapeCtaMedia.addEventListener('change', syncHeroCtaSize)

  // Start text reveal early (~1.62s) right as the Resonator settles into its berth
  if (startsWithHeroLoader) {
    earlyStageTimer = setTimeout(() => {
      activateHeroStage()
    }, HERO_STAGE_CHOREOGRAPHY.stageEarlyTriggerMs)
  } else {
    activateHeroStage()
  }

  // Enhanced scroll reaction: downward glide + scale settle + opacity fade on scroll
  unsubscribeHeroScroll = onScroll(({ scroll }) => {
    if (typeof window === 'undefined') return
    const vh = Math.max(1, window.innerHeight)
    const p = Math.min(1, Math.max(0, scroll / vh))

    if (scrollCueAnchorEl.value) {
      const cueProgress = Math.min(1, p / 0.24)
      const cueFade = 1 - cueProgress
      const cueGlideY = cueProgress * 18
      scrollCueAnchorEl.value.style.opacity = cueFade.toFixed(3)
      scrollCueAnchorEl.value.style.transform = `translate3d(-50%, ${cueGlideY.toFixed(1)}px, 0)`
      scrollCueAnchorEl.value.style.pointerEvents = p > 0.2 ? 'none' : 'auto'
    }
  })
})

onBeforeUnmount(() => {
  if (desktopCtaMedia) {
    desktopCtaMedia.removeEventListener('change', syncHeroCtaSize)
    desktopCtaMedia = null
  }
  if (compactLandscapeCtaMedia) {
    compactLandscapeCtaMedia.removeEventListener('change', syncHeroCtaSize)
    compactLandscapeCtaMedia = null
  }
  if (unsubscribeHeroScroll) {
    unsubscribeHeroScroll()
    unsubscribeHeroScroll = null
  }
  if (earlyStageTimer !== null) {
    clearTimeout(earlyStageTimer)
    earlyStageTimer = null
  }
  if (stageActivateRaf !== null && typeof window !== 'undefined') {
    window.cancelAnimationFrame(stageActivateRaf)
    stageActivateRaf = null
  }
})

</script>

<template>
  <main id="top" class="relative isolate w-full overflow-x-clip bg-brand-void text-white">
    <!-- Persistent Full-Page Glacier-Blue Wave & Reflection Canvas (Zero CLS, 60/120fps) -->
    <BrandstaAmbientCanvas :active="isHeroStageActive" />

    <!-- =========================================================================
         SECTION 1: FLAGSHIP HERO STAGE
         - Centered Stage Core: Editorial -> Resonator -> Buttons ('md' < 1280px, 'lg' >= 1280px)
         - Separate Bottom Pair: Single-line Triad seated comfortably above Absolute Bottom SCROLL
         ========================================================================= -->
    <section
      aria-labelledby="hero-main-heading"
      class="hero-flagship-section relative z-10 w-full"
    >

      <!-- Centered Main Content Shell (Reserves top Header height & bottom Triad+Scroll dock clearance) -->
      <div class="hero-grid-shell relative z-10 mx-auto w-full">
        <div class="hero-stage-core w-full">
          <!-- Editorial Typography (Centered on Vertical, Left-Aligned on Split) -->
          <div class="hero-editorial-area">
            <BrandstaHeroEditorial :active="isHeroStageActive" />
          </div>

          <!-- Permanent 3D Resonator Berth (Middle on Vertical, Right Column on Split) -->
          <div class="hero-resonator-area">
            <div class="hero-resonator-sizing">
              <BrandstaHeroResonator
                @loader-state-change="onHeroLoaderStateChange"
              />
            </div>
          </div>

          <!-- Dual CTA Buttons ('md' < 1280px, 'lg' >= 1280px) -->
          <div class="hero-actions-area flex flex-wrap items-center">
            <div
              v-reveal-stage="{
                active: isHeroStageActive,
                delay: HERO_STAGE_CHOREOGRAPHY.primaryCtaDelayMs,
                duration: HERO_STAGE_CHOREOGRAPHY.ctaDurationMs,
                rise: '16px',
                scale: 0.965,
              }"
            >
              <ResonantFlowButton
                :label="HERO_EDITORIAL_CONTENT.primaryCta.label"
                :href="HERO_EDITORIAL_CONTENT.primaryCta.href"
                :variant="HERO_EDITORIAL_CONTENT.primaryCta.variant"
                :fluid="HERO_EDITORIAL_CONTENT.primaryCta.fluid"
                :size="heroCtaSize"
                :class="HERO_EDITORIAL_CONTENT.primaryCta.cursorClass"
              />
            </div>

            <div
              v-reveal-stage="{
                active: isHeroStageActive,
                delay: HERO_STAGE_CHOREOGRAPHY.secondaryCtaDelayMs,
                duration: HERO_STAGE_CHOREOGRAPHY.ctaDurationMs,
                rise: '16px',
                scale: 0.965,
              }"
            >
              <ResonantFlowButton
                :label="HERO_EDITORIAL_CONTENT.secondaryCta.label"
                :href="HERO_EDITORIAL_CONTENT.secondaryCta.href"
                :variant="HERO_EDITORIAL_CONTENT.secondaryCta.variant"
                :fluid="HERO_EDITORIAL_CONTENT.secondaryCta.fluid"
                :size="heroCtaSize"
                :class="HERO_EDITORIAL_CONTENT.secondaryCta.cursorClass"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- SEPARATE BOTTOM SET PART A: STRATEGY · CREATIVITY · TECHNOLOGY (Seated cleanly above SCROLL) -->
      <div
        aria-label="Strategy, Creativity, Technology"
        class="hero-triad-dock absolute inset-x-0 z-10 flex flex-nowrap items-center justify-center whitespace-nowrap select-none will-change-[opacity]"
      >
        <template
          v-for="(pillar, idx) in HERO_EDITORIAL_CONTENT.triadPillars"
          :key="pillar"
        >
          <span
            v-reveal-chars="{
              active: isHeroStageActive,
              delay:
                HERO_STAGE_CHOREOGRAPHY.triadBaseDelayMs +
                idx * HERO_STAGE_CHOREOGRAPHY.triadPillarStepMs,
              stagger: HERO_STAGE_CHOREOGRAPHY.triadCharStaggerMs,
              duration: HERO_STAGE_CHOREOGRAPHY.triadDurationMs,
              rise: '0.5em',
            }"
            class="cursor-hoverable cursor-blue brand-triad-label hero-triad-item text-white/82 transition-colors duration-300 hover:text-white lg:cursor-none"
          >
            <span data-reveal-content>{{ pillar }}</span>
          </span>

          <span
            v-if="idx < HERO_EDITORIAL_CONTENT.triadPillars.length - 1"
            v-reveal-stage="{
              active: isHeroStageActive,
              delay:
                HERO_STAGE_CHOREOGRAPHY.triadBaseDelayMs +
                idx * HERO_STAGE_CHOREOGRAPHY.triadPillarStepMs +
                65,
              duration: 460,
              rise: '4px',
              scale: 0.5,
            }"
            aria-hidden="true"
            class="triad-node-dot shrink-0 rounded-full"
          />
        </template>
      </div>

      <!-- SEPARATE BOTTOM SET PART B: Absolute Bottom Parabolic SCROLL Indicator (Downward-Only Hover Boost) -->
      <div
        ref="scrollCueAnchorEl"
        class="hero-scroll-cue-anchor absolute left-1/2 z-10 flex items-end justify-center will-change-[transform,opacity]"
      >
        <div
          v-reveal-stage="{
            active: isHeroStageActive,
            delay: HERO_STAGE_CHOREOGRAPHY.scrollCueDelayMs,
            duration: HERO_STAGE_CHOREOGRAPHY.scrollCueDurationMs,
            rise: '14px',
            scale: 0.96,
          }"
        >
          <button
            type="button"
            aria-label="Scroll to next section"
            class="scroll-cue-btn cursor-clickable cursor-blue group flex flex-col items-center gap-2 px-3 pt-1 pb-1 select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-electric/60 rounded-md lg:cursor-none [@media(max-height:540px)]:gap-1 [@media(max-height:540px)]:pb-0"
            @click.stop="scrollToNextSection"
          >
            <svg
              viewBox="0 0 96 68"
              class="h-[2.75rem] w-[4rem] sm:h-[3.25rem] sm:w-[4.75rem] overflow-visible [@media(max-height:540px)]:h-[2rem] [@media(max-height:540px)]:w-[2.9rem]"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <radialGradient :id="`scrollCueAura-${heroUid}`" cx="50%" cy="66%" r="50%">
                  <stop offset="0%" stop-color="var(--color-brand-electric)" stop-opacity="0.56" />
                  <stop offset="48%" stop-color="var(--color-brand-blue)" stop-opacity="0.22" />
                  <stop offset="100%" stop-color="var(--color-brand-obsidian)" stop-opacity="0" />
                </radialGradient>

                <linearGradient :id="`crescentBellyGrad-${heroUid}`" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stop-color="var(--color-brand-blue)" stop-opacity="0" />
                  <stop offset="20%" stop-color="var(--color-brand-electric)" stop-opacity="0.68" />
                  <stop offset="50%" stop-color="var(--color-brand-frost)" stop-opacity="1" />
                  <stop offset="80%" stop-color="var(--color-brand-electric)" stop-opacity="0.68" />
                  <stop offset="100%" stop-color="var(--color-brand-blue)" stop-opacity="0" />
                </linearGradient>

                <radialGradient :id="`nadirSparkGlow-${heroUid}`" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
                  <stop offset="32%" stop-color="var(--color-brand-ice)" stop-opacity="0.96" />
                  <stop offset="70%" stop-color="var(--color-brand-blue)" stop-opacity="0.54" />
                  <stop offset="100%" stop-color="var(--color-brand-blue)" stop-opacity="0" />
                </radialGradient>
              </defs>

              <!-- Downward-anchored hover bloom (never expands upward toward Triad) -->
              <g class="scroll-cue-aura-group">
                <ellipse
                  cx="48"
                  cy="41"
                  rx="40"
                  ry="25"
                  :fill="`url(#scrollCueAura-${heroUid})`"
                  class="cue-aura"
                />
              </g>

              <g class="scroll-cue-tier scroll-cue-tier--1">
                <path
                  d="M 18 7 Q 48 26 78 7 Q 48 23.2 18 7 Z"
                  :fill="`url(#crescentBellyGrad-${heroUid})`"
                  class="crescent-wave crescent-wave-1"
                />
              </g>

              <g class="scroll-cue-tier scroll-cue-tier--2">
                <path
                  d="M 24 23 Q 48 42.5 72 23 Q 48 38.2 24 23 Z"
                  :fill="`url(#crescentBellyGrad-${heroUid})`"
                  class="crescent-wave crescent-wave-2"
                />
              </g>

              <g class="scroll-cue-tier scroll-cue-tier--3">
                <g class="crescent-wave crescent-wave-3">
                  <path
                    d="M 30 39 Q 48 57.5 66 39 Q 48 52.6 30 39 Z"
                    :fill="`url(#crescentBellyGrad-${heroUid})`"
                  />
                  <circle cx="48" cy="47.4" r="9.5" :fill="`url(#nadirSparkGlow-${heroUid})`" class="scroll-cue-spark-halo" />
                  <circle cx="48" cy="47.4" r="1.75" class="fill-white" />
                </g>
              </g>
            </svg>
          </button>
        </div>
      </div>
    </section>

    <!-- =========================================================================
     SECTION 2: NOW MAKING WAVES + OUR CLIENTELE + CLOSING QUOTE
     ========================================================================= -->
    <BrandstaMakingWaves :stage-ready="!isHeroLoaderRunning" />

    <!-- =========================================================================
     SECTION 3: THE BRANDSTA CATALOGUE (INFINITE DEPTH DECK + LIGHTBOX)
     ========================================================================= -->
    <BrandstaCatalogue :stage-ready="!isHeroLoaderRunning" />

    <!-- =========================================================================
     SECTION 4: CUSTOM CODE + DIRECT CONTACT CARDS + BRANDSTA FOOTER
     ========================================================================= -->
    <BrandstaFinale :stage-ready="!isHeroLoaderRunning" />

  </main>
</template>

<style scoped>
/* =========================================================================
   HERO STAGE MULTI-DEVICE ARCHITECTURE
- Centered Stage Core (align-content: center -> zero stretched gaps!)
- Separate Bottom Set: Single-line Triad seated comfortably above Absolute Bottom SCROLL
   ========================================================================= */
.hero-flagship-section {
  --hero-shell-max-w: 90rem; /* 1440px up to 1536px */
  --hero-min-h: max(100svh, 680px);
  --hero-pad-x: 1.15rem;
  --hero-header-h: 3.25rem;
  --hero-bottom-dock-h: 8.75rem;
  --hero-stack-gap: 1.45rem;
  --hero-split-gap: 2.5rem;
  --hero-resonator-w: clamp(9.5rem, 42vw, 11rem);
  --hero-cta-gap: 0.65rem;
  --hero-cta-mt: 0rem;

  /* Bottom Pair Geometry (< 360px ultra-compact single-line Triad + generous gap above SCROLL) */
  --hero-scroll-bottom: 0.65rem;
  --hero-triad-bottom: 5.95rem;
  --hero-triad-pad-x: 0.375rem;
  --hero-triad-gap: 0.4rem;
  --hero-triad-size: 0.52rem;
  --hero-triad-track: 0.13em;
  --hero-triad-dot: 0.25rem;

  min-height: var(--hero-min-h);
  background-color: transparent;
}

.hero-grid-shell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: var(--hero-shell-max-w);
  min-height: var(--hero-min-h);
  padding-inline: var(--hero-pad-x);
  padding-top: var(--hero-header-h);
  padding-bottom: var(--hero-bottom-dock-h);
}

/* Centered Vertical Portrait Stage (< 1024px): Editorial -> Resonator -> Buttons */
.hero-stage-core {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-auto-rows: auto;
  align-content: center;
  justify-items: center;
  row-gap: var(--hero-stack-gap);
  padding-block: 0.5rem;
}

.hero-editorial-area {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  justify-content: center;
  width: 100%;
}

.hero-resonator-area {
  grid-column: 1;
  grid-row: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  overflow: visible;
}

.hero-resonator-sizing {
  width: var(--hero-resonator-w);
  overflow: visible;
}

.hero-actions-area {
  grid-column: 1;
  grid-row: 3;
  width: 100%;
  justify-self: stretch;
  justify-content: center;
  gap: var(--hero-cta-gap);
  margin-top: var(--hero-cta-mt);
}

/* =========================================================================
   SEPARATE BOTTOM PAIR: SINGLE-LINE TRIAD + ABSOLUTE BOTTOM SCROLL CUE
   ========================================================================= */
.hero-triad-dock {
  bottom: var(--hero-triad-bottom);
  padding-inline: var(--hero-triad-pad-x);
  column-gap: var(--hero-triad-gap);
}

.hero-triad-item {
  font-size: var(--hero-triad-size);
  letter-spacing: var(--hero-triad-track);
}

.triad-node-dot {
  width: var(--hero-triad-dot);
  height: var(--hero-triad-dot);
  background: radial-gradient(circle, #93d5ff 0%, #1e6bff 65%, #0048ff 100%);
  box-shadow: 0 0 10px rgba(30, 107, 255, 0.85);
}

.hero-scroll-cue-anchor {
  bottom: var(--hero-scroll-bottom);
  transform: translate3d(-50%, 0, 0);
}

/* Progressive Downward Translation Hover (Zero Scaling Anywhere) */
.scroll-cue-aura-group,
.scroll-cue-tier {
  transition:
    transform 500ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 500ms cubic-bezier(0.22, 1, 0.36, 1);
}

.scroll-cue-btn:hover .scroll-cue-aura-group,
.scroll-cue-btn:focus-visible .scroll-cue-aura-group {
  transform: translate3d(0, 4px, 0);
  filter: brightness(1.24);
}

.scroll-cue-btn:hover .scroll-cue-tier--1,
.scroll-cue-btn:focus-visible .scroll-cue-tier--1 {
  transform: translate3d(0, 3px, 0);
}

.scroll-cue-btn:hover .scroll-cue-tier--2,
.scroll-cue-btn:focus-visible .scroll-cue-tier--2 {
  transform: translate3d(0, 4px, 0);
}

.scroll-cue-btn:hover .scroll-cue-tier--3,
.scroll-cue-btn:focus-visible .scroll-cue-tier--3 {
  transform: translate3d(0, 5px, 0);
  filter: drop-shadow(0 0 10px rgba(124, 180, 255, 0.52));
}

/* Perpetual Harmonic Wave Cascade (Pure Opacity + Vertical Drift — Zero Scale) */
.cue-aura {
  animation: cueAuraBreathe 3s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

.crescent-wave {
  transform-box: fill-box;
  transform-origin: 50% 50%;
}

.crescent-wave-1 {
  animation: crescentCascade 2.5s cubic-bezier(0.42, 0, 0.28, 1) infinite 0s;
}

.crescent-wave-2 {
  animation: crescentCascade 2.5s cubic-bezier(0.42, 0, 0.28, 1) infinite 0.22s;
}

.crescent-wave-3 {
  animation: crescentCascade 2.5s cubic-bezier(0.42, 0, 0.28, 1) infinite 0.44s;
}

@keyframes cueAuraBreathe {
  0%,
  100% {
    opacity: 0.62;
  }
  50% {
    opacity: 1;
  }
}

@keyframes crescentCascade {
  0%,
  100% {
    opacity: 0.44;
    transform: translate3d(0, -1px, 0);
  }
  45% {
    opacity: 1;
    transform: translate3d(0, 2.5px, 0);
  }
}

/* 2xs (360px–479px): Standard Android & iPhone portrait -> crisp single-line Triad */
@media (min-width: 360px) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 710px);
    --hero-pad-x: 1.35rem;
    --hero-header-h: 4.8rem;
    --hero-bottom-dock-h: 9.15rem;
    --hero-stack-gap: 1.65rem;
    --hero-resonator-w: clamp(10.5rem, 41vw, 12.25rem);
    --hero-cta-gap: 0.75rem;
    --hero-scroll-bottom: 1.5rem;
    --hero-triad-bottom: 6.25rem;
    --hero-triad-pad-x: 0.5rem;
    --hero-triad-gap: 0.5rem;
    --hero-triad-size: 0.56rem;
    --hero-triad-track: 0.16em;
    --hero-triad-dot: 0.3125rem;
  }
}

/* xs (480px–639px): Large phones & phablets */
@media (min-width: 480px) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 750px);
    --hero-pad-x: 2rem;
    --hero-header-h: 4rem;
    --hero-bottom-dock-h: 9.5rem;
    --hero-stack-gap: 1.85rem;
    --hero-resonator-w: clamp(11.75rem, 35vw, 14rem);
    --hero-cta-gap: 0.85rem;
    --hero-scroll-bottom: 0.75rem;
    --hero-triad-bottom: 6.5rem;
    --hero-triad-pad-x: 1rem;
    --hero-triad-gap: 0.75rem;
    --hero-triad-size: 0.62rem;
    --hero-triad-track: 0.21em;
    --hero-triad-dot: 0.35rem;
  }
}

/* sm (640px–767px): Small portrait tablets */
@media (min-width: 640px) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 810px);
    --hero-pad-x: 2.5rem;
    --hero-header-h: 4.5rem;
    --hero-bottom-dock-h: 10.25rem;
    --hero-stack-gap: 2rem;
    --hero-resonator-w: clamp(13.25rem, 31vw, 15.75rem);
    --hero-cta-gap: 0.95rem;
    --hero-scroll-bottom: 0.85rem;
    --hero-triad-bottom: 7.25rem;
    --hero-triad-gap: 0.95rem;
    --hero-triad-size: 0.68rem;
    --hero-triad-track: 0.25em;
    --hero-triad-dot: 0.375rem;
  }
}

/* md (768px–1023px): iPad & portrait tablets */
@media (min-width: 768px) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 860px);
    --hero-pad-x: 3.25rem;
    --hero-header-h: 4.7rem;
    --hero-bottom-dock-h: 10.5rem;
    --hero-stack-gap: 2.15rem;
    --hero-resonator-w: clamp(14.5rem, 29vw, 17.25rem);
    --hero-triad-bottom: 7.45rem;
    --hero-triad-gap: 1.1rem;
    --hero-triad-size: 0.72rem;
    --hero-triad-track: 0.27em;
  }
}

/* UNFOLDED FOLDABLE PORTRAIT-SQUARE (600px–1023px, aspect 4/5 to 10/11) */
@media (min-width: 600px) and (max-width: 1023px) and (min-aspect-ratio: 4/5) and (max-aspect-ratio: 10/11) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 770px);
    --hero-header-h: 3.5rem;
    --hero-bottom-dock-h: 9.75rem;
    --hero-stack-gap: 1.5rem;
    --hero-resonator-w: clamp(12rem, min(30vw, 25svh), 14.5rem);
  }
}

/* =========================================================================
   HORIZONTAL SPLIT MODES (Left Editorial + Left CTAs | Right Resonator)
   ========================================================================= */

/* UNFOLDED FOLDABLE SQUARE-TO-WIDE (660px–1023px, aspect >= 10/11) */
@media (min-width: 660px) and (max-width: 1023px) and (min-aspect-ratio: 10/11) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 650px);
    --hero-pad-x: 2.25rem;
    --hero-header-h: 4rem;
    --hero-bottom-dock-h: 9.5rem;
    --hero-split-gap: 2rem;
    --hero-resonator-w: clamp(12.75rem, min(30vw, 37svh), 16.75rem);
    --hero-cta-mt: 1.45rem;
  }

  .hero-stage-core {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    column-gap: var(--hero-split-gap);
    row-gap: 0;
    align-items: center;
  }

  .hero-editorial-area {
    grid-column: 1;
    grid-row: 1;
    justify-content: flex-start;
  }

  .hero-actions-area {
    grid-column: 1;
    grid-row: 2;
    justify-content: flex-start;
  }

  .hero-resonator-area {
    grid-column: 2;
    grid-row: 1 / 3;
  }
}

/* COMPACT ROTATED MOBILE LANDSCAPE (max-height: 540px) */
@media (max-width: 1023px) and (max-height: 540px) and (orientation: landscape) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 480px);
    --hero-pad-x: 2rem;
    --hero-header-h: 2.5rem;
    --hero-bottom-dock-h: 6.25rem;
    --hero-split-gap: 1.5rem;
    --hero-resonator-w: clamp(9.25rem, 34svh, 12.25rem);
    --hero-cta-gap: 0.65rem;
    --hero-cta-mt: 0.9rem;
    --hero-scroll-bottom: 0.35rem;
    --hero-triad-bottom: 4.35rem;
    --hero-triad-size: 0.56rem;
    --hero-triad-track: 0.22em;
  }

  .hero-stage-core {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    column-gap: var(--hero-split-gap);
    row-gap: 0;
    align-items: center;
  }

  .hero-editorial-area {
    grid-column: 1;
    grid-row: 1;
    justify-content: flex-start;
  }

  .hero-actions-area {
    grid-column: 1;
    grid-row: 2;
    justify-content: flex-start;
  }

  .hero-resonator-area {
    grid-column: 2;
    grid-row: 1 / 3;
  }
}

/* LARGE PORTRAIT TABLETS & VERTICAL DISPLAYS (1024px+ Portrait — iPad Pro 13, 1280px+ Portrait):
   Inherits standard 1-col centered portrait flow with svh-capped Resonator so it never looks oversized */
@media (min-width: 1024px) and (orientation: portrait) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 900px);
    --hero-pad-x: 3.75rem;
    --hero-header-h: 5.35rem;
    --hero-bottom-dock-h: 10.75rem;
    --hero-stack-gap: 2.25rem;
    --hero-resonator-w: clamp(15.5rem, min(28vw, 24svh), 18.75rem);
    --hero-cta-gap: 1rem;
    --hero-scroll-bottom: 0.9rem;
    --hero-triad-bottom: 7.65rem;
    --hero-triad-gap: 1.2rem;
    --hero-triad-size: 0.75rem;
    --hero-triad-track: 0.3em;
    --hero-triad-dot: 0.375rem;
  }
}

/* lg (1024px–1279px Landscape): Laptops & Landscape Tablets (Buttons stay 'md') */
@media (min-width: 1024px) and (orientation: landscape) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 730px);
    --hero-pad-x: 3.75rem;
    --hero-header-h: 5.35rem;
    --hero-bottom-dock-h: 10.25rem;
    --hero-split-gap: 2.75rem;
    --hero-resonator-w: clamp(19.5rem, min(33.5vw, 52svh), 25.5rem);
    --hero-cta-gap: 0.95rem;
    --hero-cta-mt: 1.75rem;
    --hero-scroll-bottom: 0.85rem;
    --hero-triad-bottom: 7.35rem;
    --hero-triad-gap: 1.25rem;
    --hero-triad-size: 0.76rem;
    --hero-triad-track: 0.35em;
    --hero-triad-dot: 0.375rem;
  }

  .hero-stage-core {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    column-gap: var(--hero-split-gap);
    row-gap: 0;
    align-items: center;
  }

  /* Locks Editorial + CTAs together across the row seam while centering the pair against Resonator */
  .hero-editorial-area {
    grid-column: 1;
    grid-row: 1;
    align-self: end;
    justify-content: flex-start;
  }

  .hero-actions-area {
    grid-column: 1;
    grid-row: 2;
    align-self: start;
    justify-content: flex-start;
  }

  .hero-resonator-area {
    grid-column: 2;
    grid-row: 1 / 3;
    align-self: center;
  }
}

/* xl (1280px–1536px Landscape): Standard Desktops & 1536px Monitors (Buttons promote to 'lg') */
@media (min-width: 1280px) and (orientation: landscape) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 770px);
    --hero-pad-x: 4.5rem;
    --hero-header-h: 5.65rem;
    --hero-bottom-dock-h: 10.75rem;
    --hero-split-gap: 3.25rem;
    --hero-resonator-w: clamp(22.5rem, min(33vw, 55svh), 29.5rem);
    --hero-cta-gap: 1.05rem;
    --hero-cta-mt: 1.85rem;
    --hero-triad-bottom: 7.55rem;
    --hero-triad-size: 0.8rem;
    --hero-triad-track: 0.36em;
  }
}

/* 2xl+ (1536px and above Landscape): Shift entire left stack (Editorial + CTAs) downward together */
@media (min-width: 1536px) and (orientation: landscape) {
  .hero-flagship-section {
    --hero-left-shift-y: clamp(1.75rem, 3.8svh, 2.75rem);
  }

  .hero-editorial-area,
  .hero-actions-area {
    transform: translate3d(0, var(--hero-left-shift-y), 0);
  }
}

/* Exact 1536px Landscape ceiling polish */
@media (min-width: 1536px) and (max-width: 1536px) and (orientation: landscape) {
  .hero-flagship-section {
    --hero-pad-x: 5rem;
    --hero-split-gap: 3.5rem;
    --hero-resonator-w: clamp(24.5rem, min(31vw, 56svh), 30.5rem);
    --hero-triad-size: 0.83rem;
  }
}

/* SHORT-HEIGHT DESKTOP / WINDOWS LAPTOP GUARD (e.g., 1366x768 or 1536x864 @ 125% scale) */
@media (min-width: 1024px) and (max-height: 760px) and (orientation: landscape) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 670px);
    --hero-header-h: 4.5rem;
    --hero-bottom-dock-h: 8.75rem;
    --hero-resonator-w: clamp(17.5rem, min(31vw, 48svh), 23.5rem);
    --hero-cta-mt: 1.35rem;
    --hero-scroll-bottom: 0.55rem;
    --hero-triad-bottom: 6.35rem;
    --hero-triad-size: 0.72rem;
    --hero-left-shift-y: 1.15rem;
  }
}

/* > 1536px Landscape (1600px, 1920px Full HD, 2560px+): Symmetric outer margins, wider center gulf & scaled Resonator */
@media (min-width: 1537px) and (orientation: landscape) {
  .hero-flagship-section {
    --hero-shell-max-w: 106rem;
    --hero-min-h: max(100svh, 830px);
    --hero-pad-x: 3.5rem;
    --hero-header-h: 6rem;
    --hero-bottom-dock-h: 11.25rem;
    --hero-split-gap: 5.5rem;
    --hero-resonator-w: clamp(27.5rem, min(32.5vw, 59svh), 34.5rem);
    --hero-cta-gap: 1.15rem;
    --hero-cta-mt: 2rem;
    --hero-scroll-bottom: 1rem;
    --hero-triad-bottom: 7.85rem;
    --hero-triad-gap: 1.4rem;
    --hero-triad-size: 0.86rem;
    --hero-triad-track: 0.38em;
  }

  .hero-resonator-area {
    justify-content: flex-end;
  }

  .hero-resonator-sizing {
    margin-right: -2.1rem;
  }
}

/* SHORT LANDSCAPE BUTTON RHYTHM (<= 640px height, rotated phones + 1024x600):
   Placed last so it survives all min-width cascades alongside ctaSize = 'sm' */
@media (max-height: 640px) and (orientation: landscape) {
  .hero-flagship-section {
    --hero-cta-gap: 0.65rem;
    --hero-cta-mt: 1.05rem;
    --hero-left-shift-y: 0rem;
  }
}

/* MID-SHORT LANDSCAPE GUARD (541px–640px height, e.g. 1024x600 / 960x600):
   Compacts vertical chrome without overriding <= 540px rotated-phone rules */
@media (min-height: 541px) and (max-height: 640px) and (orientation: landscape) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 560px);
    --hero-header-h: 3.25rem;
    --hero-bottom-dock-h: 7.5rem;
    --hero-resonator-w: clamp(14rem, min(28vw, 44svh), 19.5rem);
    --hero-scroll-bottom: 0.45rem;
    --hero-triad-bottom: 5.35rem;
    --hero-triad-size: 0.68rem;
  }
}
</style>