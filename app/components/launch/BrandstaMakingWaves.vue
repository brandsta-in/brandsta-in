<!-- app/components/launch/BrandstaMakingWaves.vue -->
<script setup lang="ts">
import { ref, computed, useId, onMounted, onBeforeUnmount } from 'vue'
import ResonantFlowButton from '~/components/ResonantFlowButton.vue'
import {
  MAKING_WAVES_CHOREOGRAPHY,
  MAKING_WAVES_CONTENT,
} from '~/data/makingWavesConfig'

const props = withDefaults(
  defineProps<{
    stageReady?: boolean
  }>(),
  {
    stageReady: true,
  },
)

const rawUid = useId()
const safeUid = computed(() => `mw-${rawUid.replace(/[^a-zA-Z0-9_-]/g, '')}`)

// Zone-by-zone scroll reveal refs
const wavesHeaderZoneEl = ref<HTMLElement | null>(null)
const spotlightZoneEl = ref<HTMLElement | null>(null)
const clienteleZoneEl = ref<HTMLElement | null>(null)
const quoteZoneEl = ref<HTMLElement | null>(null)

const isWavesHeaderInView = ref(false)
const isSpotlightInView = ref(false)
const isClienteleInView = ref(false)
const isQuoteInView = ref(false)

const zone1Active = computed(() => props.stageReady && isWavesHeaderInView.value)
const zone2Active = computed(() => props.stageReady && isSpotlightInView.value)
const zone3Active = computed(() => props.stageReady && isClienteleInView.value)
const zone4Active = computed(() => props.stageReady && isQuoteInView.value)

const spotlightDescription = computed(
  () =>
    (MAKING_WAVES_CONTENT.spotlight as { description?: string }).description ??
    'A digital showcase of upcoming Koduvayur Ratholsavam 2026.',
)

const spotlightDescDelayMs = computed(
  () => MAKING_WAVES_CHOREOGRAPHY.cardTitleLine2DelayMs + 135,
)

const spotlightCtaDelayMs = computed(() =>
  Math.max(
    MAKING_WAVES_CHOREOGRAPHY.cardCtaDelayMs,
    MAKING_WAVES_CHOREOGRAPHY.cardTitleLine2DelayMs + 255,
  ),
)

// Mobile touch-hover state for color reveal on the 4 Clientele marks
const activeClientId = ref<string | null>(null)

let sectionObserver: IntersectionObserver | null = null

function onClientPointerDown(id: string) {
  activeClientId.value = activeClientId.value === id ? null : id
}

function onDocumentPointerDown(e: PointerEvent) {
  const target = e.target as HTMLElement | null
  if (!target) return

  if (!target.closest('[data-client-item]')) {
    activeClientId.value = null
  }
}

onMounted(() => {
  if (typeof window === 'undefined') return

  document.addEventListener('pointerdown', onDocumentPointerDown, { passive: true })

  if (!('IntersectionObserver' in window)) {
    isWavesHeaderInView.value = true
    isSpotlightInView.value = true
    isClienteleInView.value = true
    isQuoteInView.value = true
    return
  }

  const zoneTargets = new Map<Element, () => void>()
  if (wavesHeaderZoneEl.value) {
    zoneTargets.set(wavesHeaderZoneEl.value, () => {
      isWavesHeaderInView.value = true
    })
  }
  if (spotlightZoneEl.value) {
    zoneTargets.set(spotlightZoneEl.value, () => {
      isSpotlightInView.value = true
    })
  }
  if (clienteleZoneEl.value) {
    zoneTargets.set(clienteleZoneEl.value, () => {
      isClienteleInView.value = true
    })
  }
  if (quoteZoneEl.value) {
    zoneTargets.set(quoteZoneEl.value, () => {
      isQuoteInView.value = true
    })
  }

  sectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const activate = zoneTargets.get(entry.target)
        if (activate) {
          activate()
          sectionObserver?.unobserve(entry.target)
        }
      }
    },
    {
      threshold: MAKING_WAVES_CHOREOGRAPHY.observerThreshold,
      rootMargin: MAKING_WAVES_CHOREOGRAPHY.observerRootMargin,
    },
  )

  for (const el of zoneTargets.keys()) {
    sectionObserver.observe(el)
  }
})

onBeforeUnmount(() => {
  if (sectionObserver) {
    sectionObserver.disconnect()
    sectionObserver = null
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', onDocumentPointerDown)
  }
})
</script>

<template>
  <section
    :id="MAKING_WAVES_CONTENT.sectionId"
    aria-labelledby="making-waves-heading"
    class="making-waves-section relative z-10 w-full select-none"
    :class="!stageReady ? 'pointer-events-none' : ''"
  >
    <div class="brand-shell flex flex-col items-center">
      <!-- =====================================================================
           ZONE 1: "Now making waves." (Inter 600 White + Playfair Italic Gold)
           ===================================================================== -->
      <div
        ref="wavesHeaderZoneEl"
        class="flex w-full flex-col items-center text-center"
      >
        <h2
          id="making-waves-heading"
          :aria-label="MAKING_WAVES_CONTENT.heading.ariaLabel"
          class="mw-section-heading m-0 font-semibold tracking-[-0.032em] text-white"
        >
          <span
            v-reveal-chars="{
              active: zone1Active,
              delay: MAKING_WAVES_CHOREOGRAPHY.headerDelayMs,
              stagger: MAKING_WAVES_CHOREOGRAPHY.headerCharStaggerMs,
              duration: MAKING_WAVES_CHOREOGRAPHY.headerDurationMs,
              rise: '0.46em',
            }"
            class="block whitespace-nowrap"
          >
            <span data-reveal-content>
              <span class="text-white">{{ MAKING_WAVES_CONTENT.heading.leadWhite }}</span>{{ ' ' }}<em data-char-gradient="gold" class="brand-accent-serif mw-accent-em font-normal tracking-[-0.01em]">{{ MAKING_WAVES_CONTENT.heading.accentGoldSerif }}</em>
            </span>
          </span>
        </h2>
      </div>

      <!-- =====================================================================
           ZONE 2: LIGHTER SHEER GLASS SPOTLIGHT CARD (56rem Ceiling)
           - Airy Sheer Glass Surface + Quiet Hairline Rim
           - Full Button Hover Pass-Through + Gentle Mild Golden Rim on Hover
           ===================================================================== -->
      <div
        ref="spotlightZoneEl"
        class="mw-spotlight-wrap w-full"
      >
        <div
          v-reveal-stage="{
            active: zone2Active,
            delay: MAKING_WAVES_CHOREOGRAPHY.cardStageDelayMs,
            duration: MAKING_WAVES_CHOREOGRAPHY.cardStageDurationMs,
            rise: '26px',
            scale: 0.972,
          }"
          class="w-full"
        >
          <article class="spotlight-card group relative mx-auto w-full overflow-hidden">
            <!-- Stretched Whole-Card Link (z-10 Base Interactive Layer) -->
            <a
              :href="MAKING_WAVES_CONTENT.spotlight.href"
              :aria-label="`Explore ${MAKING_WAVES_CONTENT.spotlight.fullTitle}`"
              target="_blank"
              rel="noopener noreferrer"
              tabindex="-1"
              class="cursor-clickable cursor-gold absolute inset-0 z-10 rounded-[inherit] focus:outline-none lg:cursor-none"
            />

            <!-- Card Content Grid (z-20 + pointer-events-none so CTA Slot Receives Direct Hover) -->
            <div class="spotlight-card-grid pointer-events-none relative z-20">
              <!-- Left / Top Media Frame: 3:2 Ratio on All Devices, Zero Hover Zoom -->
              <div class="spotlight-media-stage relative overflow-hidden">
                <div class="spotlight-media-mask h-full w-full overflow-hidden">
                  <img
                    :src="MAKING_WAVES_CONTENT.spotlight.imageSrc"
                    :alt="MAKING_WAVES_CONTENT.spotlight.imageAlt"
                    width="1200"
                    height="630"
                    loading="lazy"
                    decoding="async"
                    class="spotlight-media-img block h-full w-full object-cover"
                  />
                </div>
              </div>

              <!-- Right / Bottom Sheer Glass Chamber -->
              <div class="spotlight-body relative flex flex-col justify-center">
                <h3
                  :aria-label="MAKING_WAVES_CONTENT.spotlight.fullTitle"
                  class="spotlight-title m-0 font-bold tracking-[-0.028em]"
                >
                  <!-- Line 1: Bold White Sans ("Koduvayur") -->
                  <span
                    v-reveal-chars="{
                      active: zone2Active,
                      delay: MAKING_WAVES_CHOREOGRAPHY.cardTitleLine1DelayMs,
                      stagger: MAKING_WAVES_CHOREOGRAPHY.cardTitleCharStaggerMs,
                      duration: MAKING_WAVES_CHOREOGRAPHY.cardTitleDurationMs,
                      rise: '0.44em',
                    }"
                    class="block whitespace-nowrap text-white"
                  >
                    <span data-reveal-content>{{ MAKING_WAVES_CONTENT.spotlight.titleLine1 }}</span>
                  </span>

                  <!-- Line 2: Bold Non-Italic Astral Gold Gradient ("Ratholsavam") -->
                  <span
                    v-reveal-chars="{
                      active: zone2Active,
                      delay: MAKING_WAVES_CHOREOGRAPHY.cardTitleLine2DelayMs,
                      stagger: MAKING_WAVES_CHOREOGRAPHY.cardTitleCharStaggerMs,
                      duration: MAKING_WAVES_CHOREOGRAPHY.cardTitleDurationMs,
                      rise: '0.44em',
                    }"
                    class="block whitespace-nowrap not-italic"
                  >
                    <span data-reveal-content>
                      <span
                        data-char-gradient="gold"
                        class="text-gradient-astral-gold not-italic"
                      >{{ MAKING_WAVES_CONTENT.spotlight.titleLine2 }}</span>
                    </span>
                  </span>
                </h3>

                <!-- Description (Scales Up to Closing Quote Subline Size at 1536px+) -->
                <p class="spotlight-description m-0 font-normal not-italic text-white/85">
                  <span
                    v-reveal-words="{
                      active: zone2Active,
                      delay: spotlightDescDelayMs,
                      stagger: 26,
                      duration: 580,
                      rise: '0.44em',
                    }"
                  >
                    <span data-reveal-content>{{ spotlightDescription }}</span>
                  </span>
                </p>

                <div
                  v-reveal-stage="{
                    active: zone2Active,
                    delay: spotlightCtaDelayMs,
                    duration: MAKING_WAVES_CHOREOGRAPHY.cardCtaDurationMs,
                    rise: '14px',
                    scale: 0.965,
                  }"
                  class="spotlight-cta-slot pointer-events-auto relative z-30"
                >
                  <ResonantFlowButton
                    :label="MAKING_WAVES_CONTENT.spotlight.cta.label"
                    :href="MAKING_WAVES_CONTENT.spotlight.href"
                    target="_blank"
                    rel="noopener noreferrer"
                    :variant="MAKING_WAVES_CONTENT.spotlight.cta.variant"
                    :fluid="MAKING_WAVES_CONTENT.spotlight.cta.fluid"
                    :size="MAKING_WAVES_CONTENT.spotlight.cta.size"
                    :class="MAKING_WAVES_CONTENT.spotlight.cta.cursorClass"
                  />
                </div>
              </div>
            </div>

            <!-- Unbroken Perimeter Hairline Rim (z-30, pointer-events-none) -->
            <div
              aria-hidden="true"
              class="spotlight-glass-frame pointer-events-none absolute inset-0 z-30 rounded-[inherit]"
            />
          </article>
        </div>
      </div>

      <!-- =====================================================================
           ZONE 3: HORIZON SPARK DIVIDER + "Our clientele." + 2x2 / 4:1 GRID
           ===================================================================== -->
      <div
        ref="clienteleZoneEl"
        class="mw-clientele-zone flex w-full flex-col items-center"
      >
        <!-- Sapphire Horizon Hairline + Crisp Astral Gold Center Spark -->
        <div
          aria-hidden="true"
          class="mw-horizon-divider relative flex w-full items-center justify-center"
          :class="{ 'is-revealed': zone3Active }"
        >
          <div class="mw-horizon-line h-px w-full" />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="mw-horizon-spark absolute h-4 w-4 overflow-visible"
          >
            <defs>
              <linearGradient :id="`${safeUid}-spark-gold`" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--color-brand-champagne)" />
                <stop offset="50%" stop-color="var(--color-brand-gold-bright)" />
                <stop offset="100%" stop-color="var(--color-brand-gold)" />
              </linearGradient>
            </defs>
            <path
              d="M12 2L14.35 9.65L22 12L14.35 14.35L12 22L9.65 14.35L2 12L9.65 9.65L12 2Z"
              :fill="`url(#${safeUid}-spark-gold)`"
            />
          </svg>
        </div>

        <!-- "Our clientele." (Inter 600 White + Playfair Italic Blue Gradient) -->
        <h2
          :aria-label="MAKING_WAVES_CONTENT.clienteleHeading.ariaLabel"
          class="mw-clientele-heading m-0 text-center font-semibold tracking-[-0.032em] text-white"
        >
          <span
            v-reveal-chars="{
              active: zone3Active,
              delay: MAKING_WAVES_CHOREOGRAPHY.clienteleHeaderDelayMs,
              stagger: MAKING_WAVES_CHOREOGRAPHY.clienteleCharStaggerMs,
              duration: MAKING_WAVES_CHOREOGRAPHY.clienteleHeaderDurationMs,
              rise: '0.46em',
            }"
            class="block whitespace-nowrap"
          >
            <span data-reveal-content>
              <span class="text-white">{{ MAKING_WAVES_CONTENT.clienteleHeading.leadWhite }}</span>{{ ' ' }}<em data-char-gradient="blue" class="brand-accent-serif mw-accent-em font-normal tracking-[-0.01em]">{{ MAKING_WAVES_CONTENT.clienteleHeading.accentBlueSerif }}</em>
            </span>
          </span>
        </h2>

        <!-- 2x2 Split-Crosshair Grid (< 1024px) -> 4:1 Single Row (>= 1024px) -->
        <ul
          aria-label="Brandsta Clientele"
          class="clientele-grid m-0 list-none p-0"
        >
          <li
            v-for="(client, idx) in MAKING_WAVES_CONTENT.clientele"
            :key="client.id"
            class="clientele-cell relative flex items-center justify-center"
          >
            <div
              v-reveal-stage="{
                active: zone3Active,
                delay:
                  MAKING_WAVES_CHOREOGRAPHY.clienteleItemBaseDelayMs +
                  idx * MAKING_WAVES_CHOREOGRAPHY.clienteleItemStepMs,
                duration: MAKING_WAVES_CHOREOGRAPHY.clienteleItemDurationMs,
                rise: '20px',
                scale: 0.96,
              }"
              class="flex h-full w-full items-center justify-center"
            >
              <div
                data-client-item
                :class="{ 'is-color-active': activeClientId === client.id }"
                class="clientele-mark-stage cursor-hoverable cursor-blue flex items-center justify-center lg:cursor-none"
                @pointerdown="onClientPointerDown(client.id)"
              >
                <img
                  :src="client.src"
                  :alt="client.alt"
                  :width="client.width"
                  :height="client.height"
                  :style="{
                    '--img-w': client.width,
                    '--img-h': client.height,
                  }"
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                  class="clientele-logo-img block object-contain"
                />
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- =====================================================================
           ZONE 4: CLOSING QUOTE ("Different dreams. Distinct identities." + Subline)
           ===================================================================== -->
      <div
        ref="quoteZoneEl"
        class="mw-quote-zone flex w-full flex-col items-center text-center"
      >
        <p
          :aria-label="MAKING_WAVES_CONTENT.closingQuote.ariaLabel"
          class="mw-quote-display m-0 flex flex-col items-center justify-center font-semibold tracking-[-0.03em] text-white sm:flex-row sm:gap-[0.32em]"
        >
          <!-- Clause 1: Different + Blue Playfair Italic "dreams." -->
          <span
            v-reveal-chars="{
              active: zone4Active,
              delay: MAKING_WAVES_CHOREOGRAPHY.quoteClause1DelayMs,
              stagger: MAKING_WAVES_CHOREOGRAPHY.quoteCharStaggerMs,
              duration: MAKING_WAVES_CHOREOGRAPHY.quoteDisplayDurationMs,
              rise: '0.46em',
            }"
            class="block whitespace-nowrap"
          >
            <span data-reveal-content>
              <span class="text-white">{{ MAKING_WAVES_CONTENT.closingQuote.clause1White }}</span>{{ ' ' }}<em data-char-gradient="blue" class="brand-accent-serif mw-accent-em font-normal tracking-[-0.01em]">{{ MAKING_WAVES_CONTENT.closingQuote.clause1BlueSerif }}</em>
            </span>
          </span>

          <!-- Clause 2: Distinct + Gold Playfair Italic "identities." -->
          <span
            v-reveal-chars="{
              active: zone4Active,
              delay: MAKING_WAVES_CHOREOGRAPHY.quoteClause2DelayMs,
              stagger: MAKING_WAVES_CHOREOGRAPHY.quoteCharStaggerMs,
              duration: MAKING_WAVES_CHOREOGRAPHY.quoteDisplayDurationMs,
              rise: '0.46em',
            }"
            class="block whitespace-nowrap"
          >
            <span data-reveal-content>
              <span class="text-white">{{ MAKING_WAVES_CONTENT.closingQuote.clause2White }}</span>{{ ' ' }}<em data-char-gradient="gold" class="brand-accent-serif mw-accent-em font-normal tracking-[-0.01em]">{{ MAKING_WAVES_CONTENT.closingQuote.clause2GoldSerif }}</em>
            </span>
          </span>
        </p>

        <p class="mw-quote-subline m-0 font-normal not-italic text-white/85">
          <span
            v-reveal-words="{
              active: zone4Active,
              delay: MAKING_WAVES_CHOREOGRAPHY.quoteBodyDelayMs,
              stagger: MAKING_WAVES_CHOREOGRAPHY.quoteWordStaggerMs,
              duration: MAKING_WAVES_CHOREOGRAPHY.quoteBodyDurationMs,
              rise: '0.48em',
            }"
          >
            <span data-reveal-content>{{ MAKING_WAVES_CONTENT.closingQuote.subline }}</span>
          </span>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* =========================================================================
   SECTION RHYTHM & TYPOGRAPHY TOKENS
   ========================================================================= */
.making-waves-section {
  padding-top: clamp(4.25rem, 8.5svh, 7.25rem);
  padding-bottom: clamp(5rem, 10.5svh, 8.5rem);
}

.mw-section-heading {
  font-size: clamp(1.78rem, 7.6vw, 4.1rem);
  line-height: 1.08;
}

.mw-clientele-heading {
  margin-top: clamp(2.5rem, 5.2svh, 3.85rem);
  font-size: clamp(1.68rem, 7vw, 3.65rem);
  line-height: 1.08;
}

.mw-accent-em {
  font-size: 1.15em;
  line-height: 0.98;
}

/* =========================================================================
   LIGHTER SHEER GLASS SPOTLIGHT CARD (56rem Ceiling)
   - Airy Translucent Glass Surface (0.016 -> 0.024 on Hover, Never Pitch-Black)
   - Slight Lift + Very Mild Diffused Golden Rim & Glow on Hover
   ========================================================================= */
.mw-spotlight-wrap {
  margin-top: clamp(2.1rem, 4.6svh, 3.25rem);
}

.spotlight-card {
  max-width: 56rem;
  border-radius: 1.35rem;
  background-color: rgba(255, 255, 255, 0.016);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow:
    0 20px 46px -18px rgba(0, 0, 0, 0.78),
    0 6px 18px -10px rgba(0, 0, 0, 0.62);
  -webkit-tap-highlight-color: transparent;
  transform: translate3d(0, 0, 0);
  will-change: transform;
  transition:
    transform 460ms var(--ease-brand-silk),
    background-color 460ms var(--ease-brand-silk),
    box-shadow 460ms var(--ease-brand-silk);
}

/* Quiet Perimeter Hairline Matching Contact Tiles */
.spotlight-glass-frame {
  border: 1px solid rgba(255, 255, 255, 0.085);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
  transition:
    border-color 460ms var(--ease-brand-silk),
    box-shadow 460ms var(--ease-brand-silk);
}

.spotlight-card-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

/* 3:2 Ratio Maintained Across All Devices (Intrinsic Image: 1200x630) */
.spotlight-media-stage {
  aspect-ratio: 3 / 2;
  width: 100%;
}

/* Stacked (<1024px): Tight Cosine Melt Only on Bottom 16% (84% -> 100%) */
.spotlight-media-mask {
  mask-image: linear-gradient(
    180deg,
    #000000 0%,
    #000000 84%,
    rgba(0, 0, 0, 0.96) 86.5%,
    rgba(0, 0, 0, 0.85) 89%,
    rgba(0, 0, 0, 0.67) 91.5%,
    rgba(0, 0, 0, 0.45) 94%,
    rgba(0, 0, 0, 0.24) 96.2%,
    rgba(0, 0, 0, 0.18) 98.2%,
    rgba(0, 0, 0, 0.01) 100%
  );
  -webkit-mask-image: linear-gradient(
    180deg,
    #000000 0%,
    #000000 84%,
    rgba(0, 0, 0, 0.96) 86.5%,
    rgba(0, 0, 0, 0.85) 89%,
    rgba(0, 0, 0, 0.67) 91.5%,
    rgba(0, 0, 0, 0.45) 94%,
    rgba(0, 0, 0, 0.24) 96.2%,
    rgba(0, 0, 0, 0.18) 98.2%,
    rgba(0, 0, 0, 01) 100%
  );
}

/* Locked 1:1 Artwork — Zero Hover Zoom */
.spotlight-media-img {
  transform: none;
}

.spotlight-body {
  align-items: center;
  text-align: center;
  padding: clamp(0.85rem, 3vw, 1.35rem) clamp(1.25rem, 4.5vw, 2rem) clamp(1.65rem, 4.8vw, 2.2rem);
}

.spotlight-title {
  font-size: clamp(1.55rem, 6.2vw, 2.35rem);
  line-height: 1.08;
}

.spotlight-description {
  margin-top: clamp(0.65rem, 1.5svh, 0.9rem);
  max-width: 22rem;
  font-size: clamp(0.84rem, 2.6vw, 0.95rem);
  line-height: 1.52;
  letter-spacing: -0.005em;
}

.spotlight-cta-slot {
  margin-top: clamp(1.15rem, 2.4svh, 1.5rem);
}

/* Slightly Raised Hover + Airy Glass Lift + Very Mild Soft Golden Rim */
@media (hover: hover) and (pointer: fine) {
  .spotlight-card:hover,
  .spotlight-card:focus-within {
    transform: translate3d(0, -2.5px, 0);
    background-color: rgba(255, 255, 255, 0.024);
    box-shadow:
      0 28px 64px -16px rgba(0, 0, 0, 0.9),
      0 12px 28px -10px rgba(0, 0, 0, 0.8),
      0 0 34px -10px rgba(245, 185, 66, 0.11);
  }

  .spotlight-card:hover .spotlight-glass-frame,
  .spotlight-card:focus-within .spotlight-glass-frame {
    border-color: rgba(251, 203, 106, 0.2);
    box-shadow:
      inset 0 1px 0 rgba(254, 236, 184, 0.1),
      inset 0 0 22px rgba(245, 185, 66, 0.032);
  }
}

.spotlight-card:active .spotlight-glass-frame {
  border-color: rgba(251, 203, 106, 0.18);
}

/* Desktop Split (>= 1024px): Tight Smooth Cosine Dissolve on Rightmost 18% (82% -> 100%) */
@media (min-width: 1024px) {
  .spotlight-card {
    border-radius: 1.5rem;
  }

  .spotlight-card-grid {
    grid-template-columns: minmax(0, 1fr) 19.5rem;
    align-items: stretch;
  }

  /* Preserves Full Artwork Through 82%, Smoothly Melts Across Final 18% */
  .spotlight-media-mask {
    mask-image: linear-gradient(
      90deg,
      #000000 0%,
      #000000 82%,
      rgba(0, 0, 0, 0.97) 84.5%,
      rgba(0, 0, 0, 0.89) 87%,
      rgba(0, 0, 0, 0.75) 89.5%,
      rgba(0, 0, 0, 0.56) 92%,
      rgba(0, 0, 0, 0.36) 94.5%,
      rgba(0, 0, 0, 0.18) 96.8%,
      rgba(0, 0, 0, 0.06) 98.6%,
      rgba(0, 0, 0, 0) 100%
    );
    -webkit-mask-image: linear-gradient(
      90deg,
      #000000 0%,
      #000000 82%,
      rgba(0, 0, 0, 0.97) 84.5%,
      rgba(0, 0, 0, 0.89) 87%,
      rgba(0, 0, 0, 0.75) 89.5%,
      rgba(0, 0, 0, 0.56) 92%,
      rgba(0, 0, 0, 0.36) 94.5%,
      rgba(0, 0, 0, 0.18) 96.8%,
      rgba(0, 0, 0, 0.06) 98.6%,
      rgba(0, 0, 0, 0) 100%
    );
  }

  .spotlight-body {
    align-items: flex-start;
    text-align: left;
    padding: 1.85rem 2.15rem 1.85rem 1.25rem;
  }

  .spotlight-title {
    font-size: clamp(1.85rem, 2.3vw, 2.25rem);
  }

  .spotlight-description {
    max-width: 18rem;
    font-size: 0.92rem;
    line-height: 1.52;
  }
}

/* 2XL+ (>= 1536px): Paragraph Font Size Matched 1:1 to Closing Quote Subline (1.1rem) */
@media (min-width: 1536px) {
  .spotlight-card-grid {
    grid-template-columns: minmax(0, 1fr) 22rem;
  }

  .spotlight-body {
    padding: 2rem 2.25rem 2rem 1.35rem;
  }

  .spotlight-description {
    max-width: 20.5rem;
    font-size: 1.1rem;
    line-height: 1.62;
    letter-spacing: 0.005em;
  }
}

/* =========================================================================
   SAPPHIRE HORIZON DIVIDER + ASTRAL GOLD SPARK
   ========================================================================= */
.mw-clientele-zone {
  margin-top: clamp(3.5rem, 7.5svh, 5.75rem);
}

.mw-horizon-divider {
  max-width: 68rem;
  height: 1.25rem;
}

.mw-horizon-line {
  transform: scaleX(0);
  transform-origin: center;
  opacity: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 72, 255, 0) 0%,
    rgba(30, 107, 255, 0.42) 24%,
    rgba(124, 180, 255, 0.85) 50%,
    rgba(30, 107, 255, 0.42) 76%,
    rgba(0, 72, 255, 0) 100%
  );
  transition:
    transform 860ms var(--ease-brand-crest),
    opacity 620ms var(--ease-brand-silk);
}

.mw-horizon-spark {
  opacity: 0;
  transform: scale(0.35) rotate(-24deg);
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.8));
  transition:
    opacity 540ms var(--ease-brand-silk) 220ms,
    transform 680ms var(--ease-brand-crest) 220ms;
}

.mw-horizon-divider.is-revealed .mw-horizon-line {
  transform: scaleX(1);
  opacity: 1;
}

.mw-horizon-divider.is-revealed .mw-horizon-spark {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}

/* =========================================================================
   CLIENTELE SHOWCASE
   - Mobile (< 1024px): Strict 2x2 Grid with Split Vertical & Split Horizontal Dividers
   - Desktop (>= 1024px): Unchanged 4:1 Single Row with Vertical Dividers Only
   ========================================================================= */
.clientele-grid {
  --client-logo-h: 5.75rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
  max-width: 36rem;
  margin-top: clamp(1.35rem, 3.4svh, 2.25rem);
  row-gap: 0;
}

@media (min-width: 360px) {
  .clientele-grid {
    --client-logo-h: 6.5rem;
  }
}

@media (min-width: 640px) {
  .clientele-grid {
    --client-logo-h: 7.75rem;
  }
}

.clientele-cell {
  padding-inline: clamp(0.75rem, 2.8vw, 1.75rem);
  padding-block: clamp(0.95rem, 2.4vw, 1.35rem);
}

@media (max-width: 1023px) {
  .clientele-cell:nth-child(odd)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 14%;
    bottom: 14%;
    width: 1px;
    pointer-events: none;
    background: linear-gradient(
      180deg,
      rgba(124, 180, 255, 0) 0%,
      rgba(124, 180, 255, 0.25) 50%,
      rgba(124, 180, 255, 0) 100%
    );
  }

  .clientele-cell:nth-child(-n + 2)::before {
    content: '';
    position: absolute;
    left: 14%;
    right: 14%;
    bottom: 0;
    height: 1px;
    pointer-events: none;
    background: linear-gradient(
      90deg,
      rgba(124, 180, 255, 0) 0%,
      rgba(124, 180, 255, 0.25) 50%,
      rgba(124, 180, 255, 0) 100%
    );
  }
}

@media (min-width: 1024px) {
  .clientele-grid {
    --client-logo-h: 8rem;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    max-width: 74rem;
    margin-top: clamp(2rem, 4.4svh, 3.25rem);
    row-gap: 0;
  }

  .clientele-cell {
    padding-block: 0.35rem;
  }

  .clientele-cell:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 12%;
    bottom: 12%;
    width: 1px;
    pointer-events: none;
    background: linear-gradient(
      180deg,
      rgba(124, 180, 255, 0) 0%,
      rgba(124, 180, 255, 0.26) 50%,
      rgba(124, 180, 255, 0) 100%
    );
  }
}

@media (min-width: 1280px) {
  .clientele-grid {
    --client-logo-h: 8.75rem;
  }
}

@media (min-width: 1537px) and (orientation: landscape) {
  .clientele-grid {
    --client-logo-h: 9.25rem;
    max-width: 82rem;
  }
}

.clientele-mark-stage {
  height: calc(var(--client-logo-h) + 0.7rem);
  width: 100%;
  padding: 0.35rem;
  -webkit-tap-highlight-color: transparent;
}

.clientele-logo-img {
  height: var(--client-logo-h);
  width: calc(var(--client-logo-h) * var(--img-w, 180) / var(--img-h, 180));
  max-width: 100%;
  opacity: 0.9;
  filter: grayscale(1) brightness(1.3);
  transform: translate3d(0, 0, 0) scale(1);
  will-change: transform, filter, opacity;
  transition:
    filter 460ms var(--ease-brand-silk),
    opacity 420ms var(--ease-brand-silk),
    transform 460ms var(--ease-brand-silk);
}

@media (hover: hover) and (pointer: fine) {
  .clientele-mark-stage:hover .clientele-logo-img {
    opacity: 1;
    filter: grayscale(0) brightness(1) drop-shadow(0 10px 26px rgba(30, 107, 255, 0.24));
    transform: translate3d(0, -4px, 0) scale(1.04);
  }
}

.clientele-mark-stage:active .clientele-logo-img,
.clientele-mark-stage.is-color-active .clientele-logo-img {
  opacity: 1;
  filter: grayscale(0) brightness(1) drop-shadow(0 10px 26px rgba(30, 107, 255, 0.26));
  transform: translate3d(0, -3px, 0) scale(1.03);
}

/* =========================================================================
   CLOSING QUOTE ("Different dreams. Distinct identities." + Subline)
   ========================================================================= */
.mw-quote-zone {
  margin-top: clamp(3.5rem, 7.2svh, 5.5rem);
}

.mw-quote-display {
  font-size: clamp(1.5rem, 6.5vw, 2.15rem);
  line-height: 1.16;
  row-gap: 0.08em;
}

@media (min-width: 640px) {
  .mw-quote-display {
    font-size: clamp(1.42rem, 3.5vw, 2.85rem);
    line-height: 1.12;
  }
}

.mw-quote-subline {
  margin-top: clamp(0.85rem, 1.8svh, 1.25rem);
  max-width: 44rem;
  font-size: clamp(0.88rem, 1.35vw, 1.1rem);
  line-height: 1.62;
  letter-spacing: 0.005em;
}
</style>