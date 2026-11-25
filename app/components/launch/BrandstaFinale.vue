<!-- app/components/launch/BrandstaFinale.vue -->
<script setup lang="ts">
import { ref, computed, useId, onMounted, onBeforeUnmount } from 'vue'
import ResonantFlowButton from '~/components/ResonantFlowButton.vue'
import BrandstaContactIcon from '~/components/launch/BrandstaContactIcon.vue'
import {
  BRANDSTA_NAV_CONTENT,
  type ContactChannelId,
} from '~/data/navigationConfig'
import { FINALE_CHOREOGRAPHY, FINALE_CONTENT } from '~/data/finaleConfig'

const props = withDefaults(
  defineProps<{
    stageReady?: boolean
  }>(),
  {
    stageReady: true,
  },
)

const rawUid = useId()
const safeUid = computed(() => `fn-${rawUid.replace(/[^a-zA-Z0-9_-]/g, '')}`)

const customCodeZoneEl = ref<HTMLElement | null>(null)
const connectZoneEl = ref<HTMLElement | null>(null)
const footerZoneEl = ref<HTMLElement | null>(null)

const isCustomCodeInView = ref(false)
const isConnectInView = ref(false)
const isFooterInView = ref(false)

const zone1Active = computed(() => props.stageReady && isCustomCodeInView.value)
const zone2Active = computed(() => props.stageReady && isConnectInView.value)
const zone3Active = computed(() => props.stageReady && isFooterInView.value)

const pressedCardId = ref<ContactChannelId | null>(null)
let sectionObserver: IntersectionObserver | null = null

function onCardPointerDown(id: ContactChannelId) {
  pressedCardId.value = id
}

function clearPressedCard() {
  pressedCardId.value = null
}

onMounted(() => {
  if (typeof window === 'undefined') return

  if (!('IntersectionObserver' in window)) {
    isCustomCodeInView.value = true
    isConnectInView.value = true
    isFooterInView.value = true
    return
  }

  const zoneMap = new Map<Element, () => void>()
  if (customCodeZoneEl.value) {
    zoneMap.set(customCodeZoneEl.value, () => {
      isCustomCodeInView.value = true
    })
  }
  if (connectZoneEl.value) {
    zoneMap.set(connectZoneEl.value, () => {
      isConnectInView.value = true
    })
  }
  if (footerZoneEl.value) {
    zoneMap.set(footerZoneEl.value, () => {
      isFooterInView.value = true
    })
  }

  sectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const activate = zoneMap.get(entry.target)
        if (activate) {
          activate()
          sectionObserver?.unobserve(entry.target)
        }
      }
    },
    {
      threshold: FINALE_CHOREOGRAPHY.observerThreshold,
      rootMargin: FINALE_CHOREOGRAPHY.observerRootMargin,
    },
  )

  for (const el of zoneMap.keys()) {
    sectionObserver.observe(el)
  }
})

onBeforeUnmount(() => {
  if (sectionObserver) {
    sectionObserver.disconnect()
    sectionObserver = null
  }
})
</script>

<template>
  <section
    :id="FINALE_CONTENT.customCode.sectionId"
    aria-labelledby="custom-code-heading"
    class="finale-section relative z-10 w-full select-none overflow-x-clip"
    :class="!stageReady ? 'pointer-events-none' : ''"
  >
    <div class="brand-shell flex flex-col items-center">
      <!-- =====================================================================
           ZONE 1: CUSTOM CODE SHOWCASE ("Built with custom code." -> brandsta.cc)
           ===================================================================== -->
      <div
        ref="customCodeZoneEl"
        class="flex w-full flex-col items-center text-center"
      >
        <!-- Top Sapphire Horizon Hairline + Astral Gold Spark -->
        <div
          aria-hidden="true"
          class="fn-horizon-divider relative mb-10 flex w-full items-center justify-center sm:mb-14"
          :class="{ 'is-revealed': zone1Active }"
        >
          <div class="fn-horizon-line h-px w-full" />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="fn-horizon-spark absolute h-4 w-4 overflow-visible"
          >
            <defs>
              <linearGradient :id="`${safeUid}-spark-1`" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--color-brand-champagne)" />
                <stop offset="50%" stop-color="var(--color-brand-gold-bright)" />
                <stop offset="100%" stop-color="var(--color-brand-gold)" />
              </linearGradient>
            </defs>
            <path
              d="M12 2L14.35 9.65L22 12L14.35 14.35L12 22L9.65 14.35L2 12L9.65 9.65L12 2Z"
              :fill="`url(#${safeUid}-spark-1)`"
            />
          </svg>
        </div>

        <!-- Astral Gold Eyebrow -->
        <div
          v-reveal-stage="{
            active: zone1Active,
            delay: FINALE_CHOREOGRAPHY.eyebrowDelayMs,
            duration: FINALE_CHOREOGRAPHY.eyebrowDurationMs,
            rise: '14px',
            scale: 0.98,
          }"
        >
          <span class="fn-eyebrow font-medium uppercase text-gradient-astral-gold">
            {{ FINALE_CONTENT.customCode.eyebrow }}
          </span>
        </div>

        <!-- Heading: "Built with" (White Inter 600) + "custom code." (Playfair Italic Blue Gradient) -->
        <h2
          id="custom-code-heading"
          :aria-label="FINALE_CONTENT.customCode.headingAriaLabel"
          class="fn-heading m-0 flex flex-col items-center justify-center font-semibold tracking-[-0.032em] text-white sm:flex-row sm:items-baseline sm:gap-[0.28em]"
        >
          <span
            v-reveal-chars="{
              active: zone1Active,
              delay: FINALE_CHOREOGRAPHY.ccHeadingLine1DelayMs,
              stagger: FINALE_CHOREOGRAPHY.ccHeadingCharStaggerMs,
              duration: FINALE_CHOREOGRAPHY.ccHeadingDurationMs,
              rise: '0.46em',
            }"
            class="block whitespace-nowrap"
          >
            <span data-reveal-content>{{ FINALE_CONTENT.customCode.leadWhite }}</span>
          </span>

          <span
            v-reveal-chars="{
              active: zone1Active,
              delay: FINALE_CHOREOGRAPHY.ccHeadingLine2DelayMs,
              stagger: FINALE_CHOREOGRAPHY.ccHeadingCharStaggerMs,
              duration: FINALE_CHOREOGRAPHY.ccHeadingDurationMs,
              rise: '0.46em',
            }"
            class="block whitespace-nowrap"
          >
            <span data-reveal-content>
              <em data-char-gradient="blue" class="brand-accent-serif fn-accent-em font-normal tracking-[-0.01em]">{{ FINALE_CONTENT.customCode.accentBlueSerif }}</em>
            </span>
          </span>
        </h2>

        <!-- Supporting Editorial Copy -->
        <p class="fn-cc-description m-0 font-normal not-italic text-white/82">
          <span
            v-reveal-words="{
              active: zone1Active,
              delay: FINALE_CHOREOGRAPHY.ccBodyDelayMs,
              stagger: FINALE_CHOREOGRAPHY.ccBodyWordStaggerMs,
              duration: FINALE_CHOREOGRAPHY.ccBodyDurationMs,
              rise: '0.46em',
            }"
          >
            <span data-reveal-content>{{ FINALE_CONTENT.customCode.description }}</span>
          </span>
        </p>

        <!-- Three-Node Custom Code Micro-Triad (YOUR PURPOSE · YOUR WORKFLOW · YOUR SYSTEM) -->
        <div
          v-reveal-stage="{
            active: zone1Active,
            delay: FINALE_CHOREOGRAPHY.ccTriadDelayMs,
            duration: FINALE_CHOREOGRAPHY.ccTriadDurationMs,
            rise: '14px',
            scale: 0.98,
          }"
          aria-label="Your purpose, your workflow, your system"
          class="fn-cc-triad flex flex-wrap items-center justify-center"
        >
          <template
            v-for="(item, idx) in FINALE_CONTENT.customCode.triad"
            :key="item"
          >
            <span class="fn-cc-triad-item font-medium uppercase text-white/75">
              {{ item }}
            </span>
            <span
              v-if="idx < FINALE_CONTENT.customCode.triad.length - 1"
              aria-hidden="true"
              class="fn-cc-triad-dot rounded-full"
            />
          </template>
        </div>

        <!-- Biggest Primary Blue ResonantFlowButton -> https://brandsta.cc -->
        <div
          v-reveal-stage="{
            active: zone1Active,
            delay: FINALE_CHOREOGRAPHY.ccCtaDelayMs,
            duration: FINALE_CHOREOGRAPHY.ccCtaDurationMs,
            rise: '16px',
            scale: 0.965,
          }"
          class="fn-cc-cta-slot flex max-w-full items-center justify-center"
        >
          <ResonantFlowButton
            :label="FINALE_CONTENT.customCode.cta.label"
            :href="FINALE_CONTENT.customCode.cta.href"
            target="_blank"
            rel="noopener noreferrer"
            :variant="FINALE_CONTENT.customCode.cta.variant"
            :fluid="FINALE_CONTENT.customCode.cta.fluid"
            :size="FINALE_CONTENT.customCode.cta.size"
            :class="FINALE_CONTENT.customCode.cta.cursorClass"
          />
        </div>
      </div>

      <!-- =====================================================================
           ZONE 2: "This is just the beginning. / More waves coming soon."
                   + "Start a conversation." + 4 DIRECT CONTACT CARDS
           ===================================================================== -->
      <div
        ref="connectZoneEl"
        class="fn-connect-zone flex w-full flex-col items-center"
      >
        <!-- Mid Horizon Spark Divider -->
        <div
          aria-hidden="true"
          class="fn-horizon-divider relative flex w-full items-center justify-center"
          :class="{ 'is-revealed': zone2Active }"
        >
          <div class="fn-horizon-line h-px w-full" />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="fn-horizon-spark absolute h-4 w-4 overflow-visible"
          >
            <defs>
              <linearGradient :id="`${safeUid}-spark-2`" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--color-brand-champagne)" />
                <stop offset="50%" stop-color="var(--color-brand-gold-bright)" />
                <stop offset="100%" stop-color="var(--color-brand-gold)" />
              </linearGradient>
            </defs>
            <path
              d="M12 2L14.35 9.65L22 12L14.35 14.35L12 22L9.65 14.35L2 12L9.65 9.65L12 2Z"
              :fill="`url(#${safeUid}-spark-2)`"
            />
          </svg>
        </div>

        <!-- Manifesto Lead-In (Matched 1:1 to "Different dreams. Distinct identities." Typography) -->
        <p
          :aria-label="FINALE_CONTENT.connect.horizonAriaLabel"
          class="fn-horizon-statement m-0 flex flex-col items-center justify-center text-center font-semibold tracking-[-0.03em] text-white"
        >
          <span
            v-reveal-chars="{
              active: zone2Active,
              delay: FINALE_CHOREOGRAPHY.horizonLine1DelayMs,
              stagger: FINALE_CHOREOGRAPHY.horizonCharStaggerMs,
              duration: FINALE_CHOREOGRAPHY.horizonLineDurationMs,
              rise: '0.46em',
            }"
            class="block whitespace-nowrap"
          >
            <span data-reveal-content>
              <span class="text-white">{{ BRANDSTA_NAV_CONTENT.statement.line1LeadWhite }}</span>{{ ' ' }}<em data-char-gradient="blue" class="brand-accent-serif fn-horizon-em font-normal tracking-[-0.01em]">{{ BRANDSTA_NAV_CONTENT.statement.line1BlueSerif }}</em><span class="text-white">{{ BRANDSTA_NAV_CONTENT.statement.line1EndDot }}</span>
            </span>
          </span>

          <span
            v-reveal-chars="{
              active: zone2Active,
              delay: FINALE_CHOREOGRAPHY.horizonLine2DelayMs,
              stagger: FINALE_CHOREOGRAPHY.horizonCharStaggerMs,
              duration: FINALE_CHOREOGRAPHY.horizonLineDurationMs,
              rise: '0.46em',
            }"
            class="block whitespace-nowrap"
          >
            <span data-reveal-content>
              <span class="text-white">{{ BRANDSTA_NAV_CONTENT.statement.line2LeadWhite }}</span>{{ ' ' }}<em data-char-gradient="gold" class="brand-accent-serif fn-horizon-em font-normal tracking-[-0.01em]">{{ BRANDSTA_NAV_CONTENT.statement.line2GoldSerif }}</em>{{ ' ' }}<span class="text-white">{{ BRANDSTA_NAV_CONTENT.statement.line2TailWhite }}</span>
            </span>
          </span>
        </p>

        <!-- Subtle Sapphire-Gold Stem Connecting Manifesto to "Start a conversation." -->
        <div
          aria-hidden="true"
          class="fn-connect-stem"
          :class="{ 'is-revealed': zone2Active }"
        />

        <!-- Heading: "Start a" (White Inter 600) + "conversation." (Playfair Italic Gold Gradient) -->
        <h2
          :aria-label="FINALE_CONTENT.connect.headingAriaLabel"
          class="fn-connect-heading m-0 flex flex-col items-center justify-center text-center font-semibold tracking-[-0.032em] text-white sm:flex-row sm:items-baseline sm:gap-[0.28em]"
        >
          <span
            v-reveal-chars="{
              active: zone2Active,
              delay: FINALE_CHOREOGRAPHY.connectHeaderDelayMs,
              stagger: FINALE_CHOREOGRAPHY.connectCharStaggerMs,
              duration: FINALE_CHOREOGRAPHY.connectHeaderDurationMs,
              rise: '0.46em',
            }"
            class="block whitespace-nowrap"
          >
            <span data-reveal-content>
              <span class="text-white">{{ FINALE_CONTENT.connect.leadWhite }}</span>{{ ' ' }}<em data-char-gradient="gold" class="brand-accent-serif fn-accent-em font-normal tracking-[-0.01em]">{{ FINALE_CONTENT.connect.accentGoldSerif }}</em>
            </span>
          </span>
        </h2>

        <!-- 4 Contact Cards: Call -> E-mail -> WhatsApp -> Instagram (2x2 <1024px | 4x1 >=1024px) -->
        <nav
          aria-label="Direct Brandsta contact channels"
          class="w-full"
        >
          <ul class="contact-cards-grid m-0 list-none p-0">
            <li
              v-for="(channel, idx) in BRANDSTA_NAV_CONTENT.contactChannels"
              :key="channel.id"
              class="min-w-0"
            >
              <div
                v-reveal-stage="{
                  active: zone2Active,
                  delay:
                    FINALE_CHOREOGRAPHY.contactCardBaseDelayMs +
                    idx * FINALE_CHOREOGRAPHY.contactCardStepMs,
                  duration: FINALE_CHOREOGRAPHY.contactCardDurationMs,
                  rise: '22px',
                  scale: 0.965,
                }"
                class="h-full w-full"
              >
                <a
                  :href="channel.href"
                  :target="channel.external ? '_blank' : undefined"
                  :rel="channel.external ? 'noopener noreferrer' : undefined"
                  :aria-label="channel.ariaLabel"
                  class="contact-channel-card cursor-clickable cursor-gold flex h-full w-full flex-col items-center justify-center text-center no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-bright/80 lg:cursor-none"
                  :class="{ 'is-pressed': pressedCardId === channel.id }"
                  @pointerdown="onCardPointerDown(channel.id)"
                  @pointerup="clearPressedCard"
                  @pointercancel="clearPressedCard"
                  @pointerleave="clearPressedCard"
                >
                  <div class="contact-card-icon-slot flex items-center justify-center">
                    <BrandstaContactIcon :channel-id="channel.id" />
                  </div>

                  <span class="contact-card-title font-bold uppercase text-white">
                    {{ channel.cardTitle }}
                  </span>

                  <span class="contact-card-action font-normal">
                    {{ channel.cardAction }}
                  </span>
                </a>
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- =======================================================================
         ZONE 3: SIGNATURE BRANDSTA FOOTER (EMERGE · EXIST · EVOLVE · ELEVATE)
         ======================================================================= -->
    <footer
      ref="footerZoneEl"
      class="fn-footer relative w-full"
    >
      <!-- Full-Width Crisp Top Hairline Border -->
      <div
        aria-hidden="true"
        class="fn-footer-top-border w-full"
        :class="{ 'is-revealed': zone3Active }"
      />

      <div class="brand-shell fn-footer-inner flex flex-col items-center text-center">
        <!-- 4 Evolution Pillars -->
        <ul
          aria-label="Brandsta Philosophy Pillars"
          class="fn-pillars-list m-0 list-none p-0"
        >
          <li
            v-for="(pillar, idx) in FINALE_CONTENT.footer.pillars"
            :key="pillar.id"
          >
            <div
              v-reveal-stage="{
                active: zone3Active,
                delay:
                  FINALE_CHOREOGRAPHY.footerPillarBaseDelayMs +
                  idx * FINALE_CHOREOGRAPHY.footerPillarStepMs,
                duration: FINALE_CHOREOGRAPHY.footerPillarDurationMs,
                rise: '12px',
                scale: 0.99,
              }"
              class="inline-flex items-baseline justify-center whitespace-nowrap"
            >
              <span
                class="fn-pillar-verb font-bold uppercase"
                :class="
                  pillar.tone === 'gold'
                    ? 'text-gradient-astral-gold'
                    : 'text-brand-electric'
                "
              >
                {{ pillar.verb }}&nbsp;
              </span>
              <span class="fn-pillar-phrase font-medium uppercase text-white/62">
                {{ ' ' }}{{ pillar.phrase }}
              </span>
            </div>
          </li>
        </ul>

        <!-- Copyright Pedestal -->
        <p
          v-reveal-stage="{
            active: zone3Active,
            delay: FINALE_CHOREOGRAPHY.footerCopyrightDelayMs,
            duration: FINALE_CHOREOGRAPHY.footerCopyrightDurationMs,
            rise: '10px',
            scale: 0.99,
          }"
          class="fn-copyright m-0 font-medium uppercase text-white/48"
        >
          {{ FINALE_CONTENT.footer.copyright }}
        </p>
      </div>
    </footer>
  </section>
</template>

<style scoped>
/* =========================================================================
   SECTION RHYTHM & HORIZON SPARK DIVIDERS
   ========================================================================= */
.finale-section {
  padding-top: clamp(2.5rem, 5.5svh, 4.5rem);
}

.fn-horizon-divider {
  max-width: 68rem;
  height: 1.25rem;
}

.fn-horizon-line {
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

.fn-horizon-spark {
  opacity: 0;
  transform: scale(0.35) rotate(-24deg);
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.8));
  transition:
    opacity 540ms var(--ease-brand-silk) 220ms,
    transform 680ms var(--ease-brand-crest) 220ms;
}

.fn-horizon-divider.is-revealed .fn-horizon-line {
  transform: scaleX(1);
  opacity: 1;
}

.fn-horizon-divider.is-revealed .fn-horizon-spark {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}

/* =========================================================================
   ZONE 1: CUSTOM CODE SHOWCASE
   ========================================================================= */
.fn-eyebrow {
  font-size: clamp(0.68rem, 1.8vw, 0.84rem);
  letter-spacing: 0.28em;
  line-height: 1.2;
}

.fn-heading {
  margin-top: clamp(0.9rem, 2svh, 1.35rem);
  font-size: clamp(1.95rem, 8vw, 4.05rem);
  line-height: 1.08;
  row-gap: 0.04em;
}

.fn-accent-em {
  font-size: 1.14em;
  line-height: 0.98;
}

.fn-cc-description {
  margin-top: clamp(1.15rem, 2.4svh, 1.65rem);
  max-width: 44rem;
  font-size: clamp(0.95rem, 1.45vw, 1.18rem);
  line-height: 1.62;
  letter-spacing: -0.005em;
}

.fn-cc-triad {
  margin-top: clamp(1.25rem, 2.5svh, 1.75rem);
  column-gap: clamp(0.5rem, 1.6vw, 1.05rem);
  row-gap: 0.45rem;
}

.fn-cc-triad-item {
  font-size: clamp(0.56rem, 1.4vw, 0.75rem);
  letter-spacing: 0.24em;
}

.fn-cc-triad-dot {
  width: 0.3125rem;
  height: 0.3125rem;
  background: radial-gradient(circle, #93d5ff 0%, #1e6bff 65%, #0048ff 100%);
  box-shadow: 0 0 10px rgba(30, 107, 255, 0.85);
}

.fn-cc-cta-slot {
  margin-top: clamp(1.85rem, 3.8svh, 2.5rem);
}

@media (max-width: 359px) {
  .fn-cc-cta-slot {
    transform: scale(0.9);
    transform-origin: center top;
  }
}

/* =========================================================================
   ZONE 2: MANIFESTO LEAD-IN (Matched 1:1 to Closing Quote Scale) + CONNECT
   ========================================================================= */
.fn-connect-zone {
  margin-top: clamp(3.85rem, 8svh, 6.25rem);
}

.fn-horizon-statement {
  margin-top: clamp(2.4rem, 5svh, 3.65rem);
  font-size: clamp(1.5rem, 6.5vw, 2.15rem);
  line-height: 1.16;
  row-gap: 0.08em;
}

@media (min-width: 640px) {
  .fn-horizon-statement {
    font-size: clamp(1.42rem, 3.5vw, 2.85rem);
    line-height: 1.12;
  }
}

.fn-horizon-em {
  font-size: 1.15em;
  line-height: 0.98;
}

.fn-connect-stem {
  width: 3.25rem;
  height: 1px;
  margin-top: clamp(1.65rem, 3.4svh, 2.4rem);
  background: linear-gradient(
    90deg,
    rgba(30, 107, 255, 0) 0%,
    rgba(124, 180, 255, 0.65) 50%,
    rgba(251, 191, 36, 0) 100%
  );
  transform: scaleX(0);
  opacity: 0;
  transition:
    transform 680ms var(--ease-brand-crest) 360ms,
    opacity 520ms var(--ease-brand-silk) 360ms;
}

.fn-connect-stem.is-revealed {
  transform: scaleX(1);
  opacity: 1;
}

.fn-connect-heading {
  margin-top: clamp(1.55rem, 3.2svh, 2.35rem);
  font-size: clamp(1.75rem, 7.2vw, 3.55rem);
  line-height: 1.08;
}

/* 1-col (<340px) -> Strict 2x2 (340px–1023px) -> Strict 4x1 (>=1024px) */
.contact-cards-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.85rem;
  width: 100%;
  max-width: 44rem;
  margin-inline: auto;
  margin-top: clamp(2rem, 4.4svh, 3.15rem);
}

@media (min-width: 340px) {
  .contact-cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(0.75rem, 2.4vw, 1.25rem);
  }
}

@media (min-width: 1024px) {
  .contact-cards-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    max-width: 78rem;
    gap: clamp(1.1rem, 1.8vw, 1.6rem);
  }
}

@media (min-width: 1537px) and (orientation: landscape) {
  .contact-cards-grid {
    max-width: 84rem;
  }
}

.contact-channel-card {
  --contact-icon-gold: 0;
  --contact-icon-size: clamp(1.85rem, 2.4vw, 2.2rem);
  min-height: clamp(8.75rem, 15vw, 10.75rem);
  padding: clamp(1.25rem, 2.6vw, 1.85rem) clamp(0.75rem, 1.8vw, 1.35rem);
  border-radius: 1.2rem;
  border: 1px solid rgba(148, 184, 255, 0.14);
  background: linear-gradient(
    180deg,
    rgba(7, 13, 28, 0.78) 0%,
    rgba(3, 6, 15, 0.9) 100%
  );
  box-shadow:
    0 20px 48px -22px rgba(0, 0, 0, 0.92),
    inset 0 1px 0 rgba(203, 230, 255, 0.06);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  -webkit-tap-highlight-color: transparent;
  transition:
    transform 360ms var(--ease-brand-silk),
    border-color 340ms var(--ease-brand-silk),
    box-shadow 360ms var(--ease-brand-silk),
    background 360ms var(--ease-brand-silk);
}

.contact-card-icon-slot {
  transition: transform 360ms var(--ease-brand-silk);
}

.contact-card-title {
  margin-top: clamp(0.85rem, 1.6vw, 1.1rem);
  font-size: clamp(0.72rem, 1.1vw, 0.86rem);
  letter-spacing: 0.08em;
  line-height: 1.2;
}

.contact-card-action {
  margin-top: 0.42rem;
  font-size: clamp(0.78rem, 1.15vw, 0.95rem);
  line-height: 1.35;
  color: rgba(186, 206, 238, 0.62);
  transition: color 320ms var(--ease-brand-silk);
}

@media (hover: hover) and (pointer: fine) {
  .contact-channel-card:hover,
  .contact-channel-card:focus-visible {
    --contact-icon-gold: 1;
    transform: translate3d(0, -4px, 0);
    border-color: rgba(251, 191, 36, 0.42);
    box-shadow:
      0 26px 56px -20px rgba(0, 0, 0, 0.96),
      0 0 32px -12px rgba(245, 158, 11, 0.24),
      inset 0 1px 0 rgba(254, 240, 138, 0.18);
  }

  .contact-channel-card:hover .contact-card-icon-slot,
  .contact-channel-card:focus-visible .contact-card-icon-slot {
    transform: translate3d(0, -2px, 0);
  }

  .contact-channel-card:hover .contact-card-action,
  .contact-channel-card:focus-visible .contact-card-action {
    color: rgba(255, 255, 255, 0.9);
  }
}

.contact-channel-card:active,
.contact-channel-card.is-pressed {
  --contact-icon-gold: 1;
  transform: scale(0.975);
  border-color: rgba(251, 191, 36, 0.48);
}

.contact-channel-card:active .contact-card-action,
.contact-channel-card.is-pressed .contact-card-action {
  color: rgba(255, 255, 255, 0.92);
}

/* =========================================================================
   ZONE 3: SIGNATURE FOOTER (EMERGE · EXIST · EVOLVE · ELEVATE + COPYRIGHT)
   ========================================================================= */
.fn-footer {
  margin-top: clamp(4.25rem, 8.8svh, 6.75rem);
}

.fn-footer-top-border {
  height: 1px;
  opacity: 0;
  background: linear-gradient(
    90deg,
    rgba(148, 184, 255, 0.04) 0%,
    rgba(148, 184, 255, 0.15) 20%,
    rgba(203, 230, 255, 0.22) 50%,
    rgba(148, 184, 255, 0.15) 80%,
    rgba(148, 184, 255, 0.04) 100%
  );
  transition: opacity 720ms var(--ease-brand-silk);
}

.fn-footer-top-border.is-revealed {
  opacity: 1;
}

.fn-footer-inner {
  padding-top: clamp(2.15rem, 4.2svh, 3rem);
  padding-bottom: calc(clamp(2.25rem, 4.5svh, 3.25rem) + env(safe-area-inset-bottom, 0px));
}

.fn-pillars-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  row-gap: 0.65rem;
  justify-items: center;
  width: 100%;
}

@media (min-width: 640px) and (max-width: 1023px) {
  .fn-pillars-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-width: 42rem;
    column-gap: 2rem;
    row-gap: 0.85rem;
  }
}

@media (min-width: 1024px) {
  .fn-pillars-list {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: center;
    column-gap: clamp(1.4rem, 2.6vw, 2.85rem);
  }
}

.fn-pillar-verb,
.fn-pillar-phrase {
  font-size: clamp(0.66rem, 1.05vw, 0.8rem);
  letter-spacing: 0.15em;
  line-height: 1.4;
}

.fn-copyright {
  margin-top: clamp(1.35rem, 2.6svh, 1.85rem);
  font-size: clamp(0.6rem, 0.9vw, 0.7rem);
  letter-spacing: 0.18em;
  line-height: 1.4;
}
</style>