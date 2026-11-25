<!-- app/components/launch/BrandstaNavOverlay.vue -->
<script setup lang="ts">
import { ref, computed, watch, useId, onBeforeUnmount } from 'vue'
import { useRoute } from '#imports'
import { useLenis } from '~/composables/useLenis'
import BrandstaContactIcon from '~/components/launch/BrandstaContactIcon.vue'
import {
  BRANDSTA_NAV_CONTENT,
  type ContactChannelId,
  type NavPageItem,
} from '~/data/navigationConfig'

const props = defineProps<{
  open: boolean
  overlayId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const { scrollTo } = useLenis()

const rawUid = useId()
const safeUid = computed(() => `ov-${rawUid.replace(/[^a-zA-Z0-9_-]/g, '')}`)

const scrollShellEl = ref<HTMLElement | null>(null)
const clickedPageId = ref<string | null>(null)
const activeIconId = ref<ContactChannelId | null>(null)
const isWaveRippling = ref(false)
let lastRippleTriggerTs = 0

// Outward flanking wing wave geometry (148x24 viewBox, y=12 baseline, lowered optically via CSS)
const WING_SAMPLES = 37
const WING_WIDTH = 148
const WING_MID_Y = 12

function buildWingPath(progress: number, isLeftWing: boolean): string {
  let d = ''
  const rippleActive = progress > 0 && progress < 1
  const frontU = progress * 1.18
  const globalDecay = rippleActive ? Math.pow(1 - progress, 0.7) : 0

  for (let i = 0; i < WING_SAMPLES; i++) {
    const u = i / (WING_SAMPLES - 1)
    const distFromCenter = isLeftWing ? 1 - u : u
    let y = WING_MID_Y

    if (rippleActive) {
      const delta = distFromCenter - frontU
      const packetEnv = Math.exp(-(delta * delta) / 0.052)
      const tipPin = Math.sin(u * Math.PI)
      const osc = Math.sin((distFromCenter * 3.4 - progress * 4.8) * Math.PI * 2)
      y = WING_MID_Y - osc * 6.8 * packetEnv * tipPin * globalDecay
    }

    const x = u * WING_WIDTH
    d += `${i === 0 ? 'M' : ' L'}${x.toFixed(1)} ${y.toFixed(2)}`
  }

  return d
}

const leftWingPath = ref(buildWingPath(0, true))
const rightWingPath = ref(buildWingPath(0, false))

let rippleRafId: number | null = null
let openAutoRippleTimer: ReturnType<typeof setTimeout> | null = null
let rippleStartTs = 0
const RIPPLE_DURATION_MS = 1020
const AUTO_RIPPLE_ON_OPEN_DELAY_MS = 460

function stepWingRipple(ts: number) {
  const elapsed = ts - rippleStartTs
  const p = Math.min(1, Math.max(0, elapsed / RIPPLE_DURATION_MS))

  leftWingPath.value = buildWingPath(p, true)
  rightWingPath.value = buildWingPath(p, false)

  if (p < 1) {
    rippleRafId = window.requestAnimationFrame(stepWingRipple)
  } else {
    rippleRafId = null
    isWaveRippling.value = false
    leftWingPath.value = buildWingPath(0, true)
    rightWingPath.value = buildWingPath(0, false)
  }
}

function clearAutoRippleTimer() {
  if (openAutoRippleTimer !== null) {
    clearTimeout(openAutoRippleTimer)
    openAutoRippleTimer = null
  }
}

function stopWingRipple() {
  clearAutoRippleTimer()
  if (rippleRafId !== null && typeof window !== 'undefined') {
    window.cancelAnimationFrame(rippleRafId)
    rippleRafId = null
  }
  isWaveRippling.value = false
  leftWingPath.value = buildWingPath(0, true)
  rightWingPath.value = buildWingPath(0, false)
}

function triggerBottomWaveRipple() {
  if (typeof window === 'undefined') return
  const now = performance.now()
  if (now - lastRippleTriggerTs < 40) return
  lastRippleTriggerTs = now

  if (rippleRafId !== null) {
    window.cancelAnimationFrame(rippleRafId)
  }
  isWaveRippling.value = true
  rippleStartTs = now
  rippleRafId = window.requestAnimationFrame(stepWingRipple)
}

function onOverlayClick() {
  if (!props.open) return
  triggerBottomWaveRipple()
}

function onPageLinkPress(id: string) {
  clickedPageId.value = id
}

function onPageLinkNavigate(page: NavPageItem, e: MouseEvent) {
  clickedPageId.value = page.id

  // Smoothly scroll via Lenis when targeting a homepage section anchor (/#custom-code) from '/'
  if (page.href.startsWith('/#') && route.path === '/') {
    e.preventDefault()
    const hash = page.href.slice(1)
    emit('close')
    requestAnimationFrame(() => {
      scrollTo(hash)
    })
    return
  }

  emit('close')
}

function onContactPointerDown(id: ContactChannelId) {
  activeIconId.value = id
}

function clearContactActive() {
  activeIconId.value = null
}

function onKeyDown(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

function setDocumentScrollLock(locked: boolean) {
  if (typeof document === 'undefined') return
  document.documentElement.style.overflow = locked ? 'hidden' : ''
  document.body.style.overflow = locked ? 'hidden' : ''
}

watch(
  () => props.open,
  (isOpen) => {
    setDocumentScrollLock(isOpen)
    if (typeof window === 'undefined') return

    if (isOpen) {
      clickedPageId.value = null
      activeIconId.value = null
      if (scrollShellEl.value) {
        scrollShellEl.value.scrollTop = 0
      }
      window.addEventListener('keydown', onKeyDown)

      clearAutoRippleTimer()
      openAutoRippleTimer = setTimeout(() => {
        openAutoRippleTimer = null
        if (props.open) {
          triggerBottomWaveRipple()
        }
      }, AUTO_RIPPLE_ON_OPEN_DELAY_MS)
    } else {
      window.removeEventListener('keydown', onKeyDown)
      stopWingRipple()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  setDocumentScrollLock(false)
  stopWingRipple()
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeyDown)
  }
})
</script>

<template>
  <div
    :id="overlayId"
    role="dialog"
    aria-modal="true"
    aria-label="Brandsta Navigation"
    :aria-hidden="!open"
    :inert="!open"
    class="nav-overlay-root fixed inset-0 z-40 overflow-x-clip"
    :class="open ? 'is-open pointer-events-auto' : 'pointer-events-none'"
    @click="onOverlayClick"
  >
    <!-- Atmospheric Deep Obsidian-Midnight Glass -->
    <div aria-hidden="true" class="nav-overlay-backdrop absolute inset-0 overflow-hidden">
      <div class="nav-aura nav-aura--sapphire" />
      <div class="nav-aura nav-aura--gold" />
    </div>

    <!-- Option A Overflow-Safe CSS Grid Scroll Shell -->
    <div
      ref="scrollShellEl"
      data-lenis-prevent=""
      class="nav-overlay-scroll relative z-10 h-full w-full overflow-x-clip overflow-y-auto"
    >
      <div class="brand-shell nav-overlay-grid">
        <!-- Track 1 (1fr): Symmetrically Spaced & Border-Divided Editorial Stack -->
        <div class="nav-main-stack my-auto flex w-full flex-col items-center text-center">
          <!-- ZONE 1: Flanked Uppercase Page Destinations (FORMATION + CUSTOM CODE) -->
          <nav
            aria-label="Primary pages"
            class="nav-stagger nav-stagger--1 flex w-full flex-col items-center gap-3.5"
          >
            <NuxtLink
              v-for="page in BRANDSTA_NAV_CONTENT.pages"
              :key="page.id"
              :to="page.href"
              class="nav-page-link cursor-clickable cursor-blue group relative inline-flex items-center justify-center rounded-md px-2 py-1.5 font-semibold uppercase not-italic select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-electric/80 lg:cursor-none"
              :class="{ 'is-clicked': clickedPageId === page.id }"
              @pointerdown="onPageLinkPress(page.id)"
              @click="onPageLinkNavigate(page, $event)"
            >
              <span aria-hidden="true" class="page-flank page-flank--left" />

              <span class="nav-page-label-stack inline-grid place-items-center">
                <span class="nav-page-layer nav-page-layer--white">
                  {{ page.label }}
                </span>
                <span aria-hidden="true" class="nav-page-layer nav-page-layer--blue text-gradient-brand-blue">
                  {{ page.label }}
                </span>
                <span aria-hidden="true" class="nav-page-layer nav-page-layer--gold text-gradient-astral-gold">
                  {{ page.label }}
                </span>
              </span>

              <span aria-hidden="true" class="page-flank page-flank--right" />
            </NuxtLink>
          </nav>

          <!-- ARCHITECTURAL BORDER DIVIDER 1 -->
          <div aria-hidden="true" class="nav-zone-divider nav-stagger nav-stagger--2" />

          <!-- ZONE 2: "This is just the beginning. / More waves coming soon." -->
          <p
            class="manifesto-statement nav-stagger nav-stagger--2 m-0 flex flex-col items-center select-none"
            aria-label="This is just the beginning. More waves coming soon."
          >
            <span class="manifesto-line block">
              <span class="font-normal text-white/92">{{ BRANDSTA_NAV_CONTENT.statement.line1LeadWhite }}</span>{{ ' ' }}<em class="manifesto-serif-word brand-accent-serif text-gradient-brand-blue">{{ BRANDSTA_NAV_CONTENT.statement.line1BlueSerif }}</em><span class="font-normal text-white/92">{{ BRANDSTA_NAV_CONTENT.statement.line1EndDot }}</span>
            </span>

            <span class="manifesto-line block">
              <span class="font-normal text-white/92">{{ BRANDSTA_NAV_CONTENT.statement.line2LeadWhite }}</span>{{ ' ' }}<em class="manifesto-serif-word brand-accent-serif text-gradient-astral-gold">{{ BRANDSTA_NAV_CONTENT.statement.line2GoldSerif }}</em>{{ ' ' }}<span class="font-normal text-white/92">{{ BRANDSTA_NAV_CONTENT.statement.line2TailWhite }}</span>
            </span>
          </p>

          <!-- ARCHITECTURAL BORDER DIVIDER 2 -->
          <div aria-hidden="true" class="nav-zone-divider nav-stagger nav-stagger--3" />

          <!-- ZONE 3: Four Standalone Contact Icons (Shared BrandstaContactIcon Primitive) -->
          <nav
            aria-label="Direct contact channels"
            class="nav-stagger nav-stagger--3"
          >
            <ul class="contact-icons-row flex flex-wrap items-center justify-center">
              <li
                v-for="channel in BRANDSTA_NAV_CONTENT.contactChannels"
                :key="channel.id"
              >
                <a
                  :href="channel.href"
                  :target="channel.external ? '_blank' : undefined"
                  :rel="channel.external ? 'noopener noreferrer' : undefined"
                  :aria-label="channel.ariaLabel"
                  class="standalone-icon-link cursor-clickable cursor-gold relative inline-grid place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-bright/80 lg:cursor-none"
                  :class="{ 'is-pressed': activeIconId === channel.id }"
                  @pointerdown="onContactPointerDown(channel.id)"
                  @pointerup="clearContactActive"
                  @pointercancel="clearContactActive"
                  @pointerleave="clearContactActive"
                >
                  <BrandstaContactIcon :channel-id="channel.id" />
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <!-- Track 2 (auto): Spaced "We make waves." + Always-Visible Rippling Flanks -->
        <footer class="nav-bottom-pedestal nav-stagger nav-stagger--4 flex w-full items-center justify-center select-none">
          <button
            type="button"
            aria-label="We make waves — click to send a wave ripple"
            class="wave-signature-trigger cursor-clickable cursor-dual group inline-flex items-center justify-center border-0 bg-transparent px-2 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-electric/80 rounded-md lg:cursor-none"
            :class="{ 'is-rippling': isWaveRippling }"
            @click="triggerBottomWaveRipple"
          >
            <svg
              viewBox="0 0 148 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              class="pedestal-wing-svg overflow-visible"
            >
              <defs>
                <linearGradient
                  :id="`${safeUid}-wing-left`"
                  gradientUnits="userSpaceOnUse"
                  x1="0"
                  y1="12"
                  x2="148"
                  y2="12"
                >
                  <stop offset="0%" stop-color="var(--color-brand-electric)" stop-opacity="0.14" />
                  <stop offset="52%" stop-color="var(--color-brand-electric)" stop-opacity="0.82" />
                  <stop offset="100%" stop-color="var(--color-brand-ice)" stop-opacity="1" />
                </linearGradient>

                <linearGradient
                  :id="`${safeUid}-wing-gold-left`"
                  gradientUnits="userSpaceOnUse"
                  x1="0"
                  y1="12"
                  x2="148"
                  y2="12"
                >
                  <stop offset="0%" stop-color="var(--color-brand-gold)" stop-opacity="0.2" />
                  <stop offset="52%" stop-color="var(--color-brand-gold-bright)" stop-opacity="0.9" />
                  <stop offset="100%" stop-color="var(--color-brand-champagne)" stop-opacity="1" />
                </linearGradient>
              </defs>

              <path
                :d="leftWingPath"
                :stroke="
                  isWaveRippling
                    ? `url(#${safeUid}-wing-gold-left)`
                    : `url(#${safeUid}-wing-left)`
                "
                :stroke-width="isWaveRippling ? '2.1' : '1.7'"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="pedestal-wing-path"
              />
            </svg>

            <span class="pedestal-phrase inline-flex items-baseline whitespace-nowrap">
              <span class="pedestal-sans-word font-medium text-white">{{ BRANDSTA_NAV_CONTENT.bottomSignature.word1FlatWhite }}</span>
              <span class="pedestal-sans-word font-medium text-brand-electric">{{ BRANDSTA_NAV_CONTENT.bottomSignature.word2FlatBlue }}</span>
              <span class="inline-flex items-baseline">
                <em class="pedestal-waves-em brand-accent-serif text-gradient-astral-gold">{{ BRANDSTA_NAV_CONTENT.bottomSignature.word3GoldSerif }}</em><span class="pedestal-gold-dot font-semibold text-gradient-astral-gold">{{ BRANDSTA_NAV_CONTENT.bottomSignature.dotGold }}</span>
              </span>
            </span>

            <svg
              viewBox="0 0 148 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              class="pedestal-wing-svg overflow-visible"
            >
              <defs>
                <linearGradient
                  :id="`${safeUid}-wing-right`"
                  gradientUnits="userSpaceOnUse"
                  x1="0"
                  y1="12"
                  x2="148"
                  y2="12"
                >
                  <stop offset="0%" stop-color="var(--color-brand-ice)" stop-opacity="1" />
                  <stop offset="48%" stop-color="var(--color-brand-electric)" stop-opacity="0.82" />
                  <stop offset="100%" stop-color="var(--color-brand-electric)" stop-opacity="0.14" />
                </linearGradient>

                <linearGradient
                  :id="`${safeUid}-wing-gold-right`"
                  gradientUnits="userSpaceOnUse"
                  x1="0"
                  y1="12"
                  x2="148"
                  y2="12"
                >
                  <stop offset="0%" stop-color="var(--color-brand-champagne)" stop-opacity="1" />
                  <stop offset="48%" stop-color="var(--color-brand-gold-bright)" stop-opacity="0.9" />
                  <stop offset="100%" stop-color="var(--color-brand-gold)" stop-opacity="0.2" />
                </linearGradient>
              </defs>

              <path
                :d="rightWingPath"
                :stroke="
                  isWaveRippling
                    ? `url(#${safeUid}-wing-gold-right)`
                    : `url(#${safeUid}-wing-right)`
                "
                :stroke-width="isWaveRippling ? '2.1' : '1.7'"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="pedestal-wing-path"
              />
            </svg>
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nav-overlay-root {
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 420ms var(--ease-brand-silk),
    visibility 0ms linear 420ms;
}

.nav-overlay-root.is-open {
  opacity: 1;
  visibility: visible;
  transition:
    opacity 420ms var(--ease-brand-silk),
    visibility 0ms linear 0ms;
}

.nav-overlay-backdrop {
  background: linear-gradient(180deg, rgba(2, 5, 14, 0.93) 0%, rgba(2, 5, 14, 0.97) 100%);
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
}

.nav-aura {
  position: absolute;
  border-radius: 9999px;
  pointer-events: none;
  transform: translate3d(0, 0, 0);
}

.nav-aura--sapphire {
  width: min(66vw, 42rem);
  height: min(66vw, 42rem);
  top: -12%;
  right: -10%;
  background: radial-gradient(
    circle,
    rgba(30, 107, 255, 0.15) 0%,
    rgba(0, 48, 179, 0.05) 48%,
    rgba(0, 0, 0, 0) 74%
  );
}

.nav-aura--gold {
  width: min(62vw, 38rem);
  height: min(50vw, 30rem);
  bottom: -10%;
  left: -8%;
  background: radial-gradient(
    circle,
    rgba(245, 158, 11, 0.07) 0%,
    rgba(0, 72, 255, 0.06) 46%,
    rgba(0, 0, 0, 0) 74%
  );
}

.nav-overlay-scroll {
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.nav-overlay-grid {
  display: grid;
  grid-template-rows: 1fr auto;
  min-height: 100%;
  row-gap: clamp(1.5rem, 3.4svh, 2.5rem);
  padding-top: calc(5.15rem + env(safe-area-inset-top, 0px));
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
}

.nav-main-stack {
  --nav-zone-gap: clamp(1.4rem, 3.3svh, 2.35rem);
  gap: var(--nav-zone-gap);
}

.nav-stagger {
  opacity: 0;
  transform: translate3d(0, 16px, 0);
  transition:
    opacity 300ms var(--ease-brand-silk),
    transform 300ms var(--ease-brand-silk);
}

.nav-overlay-root.is-open .nav-stagger {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  transition:
    opacity 560ms var(--ease-brand-silk),
    transform 600ms var(--ease-brand-silk);
}

.nav-overlay-root.is-open .nav-stagger--1 {
  transition-delay: 80ms;
}

.nav-overlay-root.is-open .nav-stagger--2 {
  transition-delay: 165ms;
}

.nav-overlay-root.is-open .nav-stagger--3 {
  transition-delay: 250ms;
}

.nav-overlay-root.is-open .nav-stagger--4 {
  transition-delay: 330ms;
}

/* 1. FLANKED UPPERCASE PAGE LINKS */
.nav-page-link {
  --page-track: 0.25em;
  gap: clamp(0.85rem, 2.4vw, 1.45rem);
  font-size: clamp(1.06rem, min(1.85vw, 2.75svh), 1.42rem);
  letter-spacing: var(--page-track);
  line-height: 1;
  -webkit-tap-highlight-color: transparent;
}

.nav-page-layer {
  grid-area: 1 / 1;
  padding-left: var(--page-track);
  transition:
    opacity 320ms var(--ease-brand-silk),
    filter 320ms var(--ease-brand-silk);
}

.nav-page-layer--white {
  color: #ffffff;
  opacity: 1;
}

.nav-page-layer--blue,
.nav-page-layer--gold {
  opacity: 0;
}

.page-flank {
  display: block;
  width: clamp(2.15rem, 6.8vw, 4.25rem);
  height: 1.5px;
  border-radius: 9999px;
  transition:
    transform 360ms var(--ease-brand-silk),
    background 280ms ease,
    filter 280ms ease;
}

.page-flank--left {
  background: linear-gradient(
    90deg,
    rgba(30, 107, 255, 0.12) 0%,
    rgba(30, 107, 255, 0.72) 56%,
    rgba(124, 180, 255, 0.96) 100%
  );
}

.page-flank--right {
  background: linear-gradient(
    90deg,
    rgba(124, 180, 255, 0.96) 0%,
    rgba(30, 107, 255, 0.72) 44%,
    rgba(30, 107, 255, 0.12) 100%
  );
}

@media (hover: hover) and (pointer: fine) {
  .nav-page-link:not(.is-clicked):hover .nav-page-layer--white,
  .nav-page-link:not(.is-clicked):focus-visible .nav-page-layer--white {
    opacity: 0;
  }

  .nav-page-link:not(.is-clicked):hover .nav-page-layer--blue,
  .nav-page-link:not(.is-clicked):focus-visible .nav-page-layer--blue {
    opacity: 1;
    filter: drop-shadow(0 0 14px rgba(30, 107, 255, 0.42));
  }

  .nav-page-link:not(.is-clicked):hover .page-flank--left,
  .nav-page-link:not(.is-clicked):focus-visible .page-flank--left {
    transform: translate3d(-5px, 0, 0);
    filter: drop-shadow(0 0 8px rgba(30, 107, 255, 0.65));
  }

  .nav-page-link:not(.is-clicked):hover .page-flank--right,
  .nav-page-link:not(.is-clicked):focus-visible .page-flank--right {
    transform: translate3d(5px, 0, 0);
    filter: drop-shadow(0 0 8px rgba(30, 107, 255, 0.65));
  }
}

.nav-page-link:active .nav-page-layer--white,
.nav-page-link:active .nav-page-layer--blue,
.nav-page-link.is-clicked .nav-page-layer--white,
.nav-page-link.is-clicked .nav-page-layer--blue {
  opacity: 0;
}

.nav-page-link:active .nav-page-layer--gold,
.nav-page-link.is-clicked .nav-page-layer--gold {
  opacity: 1;
  filter: drop-shadow(0 0 14px rgba(245, 158, 11, 0.42));
}

.nav-page-link:active .page-flank--left,
.nav-page-link.is-clicked .page-flank--left {
  background: linear-gradient(
    90deg,
    rgba(245, 158, 11, 0.14) 0%,
    rgba(251, 191, 36, 0.82) 56%,
    rgba(254, 240, 138, 1) 100%
  );
}

.nav-page-link:active .page-flank--right,
.nav-page-link.is-clicked .page-flank--right {
  background: linear-gradient(
    90deg,
    rgba(254, 240, 138, 1) 0%,
    rgba(251, 191, 36, 0.82) 44%,
    rgba(245, 158, 11, 0.14) 100%
  );
}

/* ARCHITECTURAL ZONE DIVIDER BORDERS */
.nav-zone-divider {
  width: min(100%, 26rem);
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(30, 107, 255, 0) 0%,
    rgba(30, 107, 255, 0.28) 24%,
    rgba(203, 230, 255, 0.38) 50%,
    rgba(30, 107, 255, 0.28) 76%,
    rgba(30, 107, 255, 0) 100%
  );
}

@media (min-width: 768px) {
  .nav-zone-divider {
    width: min(100%, 31rem);
  }
}

/* 2. TWO-SENTENCE MANIFESTO */
.manifesto-statement {
  gap: 0.24em;
  font-size: clamp(1.24rem, min(2.85vw, 3.9svh), 2.15rem);
  line-height: 1.38;
  letter-spacing: -0.018em;
}

.manifesto-serif-word {
  display: inline-block;
  font-size: 1.15em;
  letter-spacing: -0.01em;
  line-height: 1.1;
  padding: 0.08em 0.15em 0.24em;
  margin: -0.08em -0.11em -0.24em;
}

/* 3. FOUR STANDALONE LARGE CONTACT ICONS */
.contact-icons-row {
  gap: clamp(1.4rem, 3.8vw, 2.45rem);
}

.standalone-icon-link {
  --contact-icon-gold: 0;
  --contact-icon-size: clamp(1.98rem, min(2.8vw, 4.1svh), 2.38rem);
  width: 3rem;
  height: 3rem;
  -webkit-tap-highlight-color: transparent;
  transition: transform 320ms var(--ease-brand-silk);
}

@media (hover: hover) and (pointer: fine) {
  .standalone-icon-link:hover,
  .standalone-icon-link:focus-visible {
    --contact-icon-gold: 1;
    transform: translate3d(0, -3px, 0);
  }
}

.standalone-icon-link:active,
.standalone-icon-link.is-pressed {
  --contact-icon-gold: 1;
  transform: scale(0.92);
}

/* 4. SPACED "We make waves." + ALWAYS-VISIBLE LOWERED RIPPLING FLANKS */
.wave-signature-trigger {
  gap: clamp(0.85rem, 2.4vw, 1.45rem);
  -webkit-tap-highlight-color: transparent;
}

.pedestal-wing-svg {
  width: clamp(3.25rem, 11.8vw, 8.5rem);
  height: 1.5rem;
  flex-shrink: 1;
  transform: translate3d(0, 0.22em, 0);
  filter: drop-shadow(0 0 8px rgba(30, 107, 255, 0.42));
  transition: filter 280ms var(--ease-brand-silk);
}

.wave-signature-trigger.is-rippling .pedestal-wing-svg {
  filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.58));
}

.pedestal-wing-path {
  transition: stroke-width 240ms ease;
}

.pedestal-phrase {
  column-gap: 0.38em;
  font-size: clamp(1.18rem, min(2.05vw, 2.95svh), 1.58rem);
  transition:
    transform 320ms var(--ease-brand-silk),
    filter 320ms var(--ease-brand-silk);
}

.pedestal-sans-word {
  letter-spacing: 0.048em;
}

.pedestal-waves-em {
  display: inline-block;
  font-size: 1.18em;
  letter-spacing: 0.02em;
  padding: 0.06em 0.13em 0.14em 0.02em;
  margin: -0.06em -0.09em -0.14em 0;
}

.pedestal-gold-dot {
  margin-left: 0.02em;
}

@media (hover: hover) and (pointer: fine) {
  .wave-signature-trigger:hover .pedestal-phrase {
    filter: drop-shadow(0 0 12px rgba(30, 107, 255, 0.35));
  }
}

.wave-signature-trigger.is-rippling .pedestal-phrase {
  filter: drop-shadow(0 0 16px rgba(251, 191, 36, 0.42));
}

.wave-signature-trigger:active .pedestal-phrase {
  transform: scale(0.97);
}

@media (max-height: 640px) and (orientation: landscape) {
  .nav-overlay-grid {
    row-gap: 0.9rem;
    padding-top: calc(3.75rem + env(safe-area-inset-top, 0px));
    padding-bottom: calc(0.85rem + env(safe-area-inset-bottom, 0px));
  }

  .nav-main-stack {
    --nav-zone-gap: 0.95rem;
  }

  .standalone-icon-link {
    width: 2.55rem;
    height: 2.55rem;
  }
}
</style>