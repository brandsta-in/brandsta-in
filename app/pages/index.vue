<!-- app/pages/index.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBrandstaSeo } from '~/composables/useBrandstaSeo'
import { useConvergentScroll, type ConvergentTelemetry } from '~/composables/useConvergentScroll'
import { HERO_CHOREOGRAPHY } from '~/data/heroChoreography'
import ConvergentSignalEngine from '~/components/ConvergentSignalEngine.vue'
import FormationSlider from '~/components/FormationSlider.vue'

type InputModality = 'desktop' | 'touch' | 'hybrid'

interface CueToken {
  text: string
  action?: 'scroll' | 'pulse'
}

useBrandstaSeo({
  title: 'Brandsta | Something is forming.',
  description: 'Something is forming. Every beginning carries a signal. Follow its journey.',
})

const {
  mountScrollEngine,
  onScrollTick,
  scrollToFormation,
  setFormingHovered,
  triggerFormingPulse,
} = useConvergentScroll()

const ORIGIN_CHARS = 'ORIGIN'.split('')
const SOMETHING_CHARS = 'Something'.split('')
const IS_CHARS = 'is'.split('')
const FORMING_CHARS = 'forming.'.split('')
const LEAD_LINE_1_WORDS = 'Every beginning carries a signal.'.split(' ')
const LEAD_LINE_2_WORDS = 'Follow its journey.'.split(' ')

const FORMING_FLASH_DELAY_MS =
  HERO_CHOREOGRAPHY.formingStartMs +
  (FORMING_CHARS.length - 1) * HERO_CHOREOGRAPHY.formingCharStaggerMs -
  Math.round(40 * HERO_CHOREOGRAPHY.tempoScale)

const heroStackEl = ref<HTMLDivElement | null>(null)
const scrollCueEl = ref<HTMLButtonElement | null>(null)
const isFormingActive = ref(false)
const isCueHovered = ref(false)
const isSurfacePulsing = ref(false)
const inputModality = ref<InputModality>('desktop')

const clickRipple = ref<{ active: boolean; x: number; y: number; id: number }>({
  active: false,
  x: 0,
  y: 0,
  id: 0,
})

const cueTokens = computed<CueToken[]>(() => {
  if (inputModality.value === 'hybrid') {
    return [
      { text: 'SCROLL,', action: 'scroll' },
      { text: 'SWIPE', action: 'scroll' },
      { text: 'OR' },
      { text: 'CLICK', action: 'pulse' },
      { text: 'TO' },
      { text: 'WITNESS' },
      { text: 'THE' },
      { text: 'FORMATION' },
    ]
  }
  if (inputModality.value === 'touch') {
    return [
      { text: 'SWIPE', action: 'scroll' },
      { text: 'OR' },
      { text: 'TAP', action: 'pulse' },
      { text: 'TO' },
      { text: 'WITNESS' },
      { text: 'THE' },
      { text: 'FORMATION' },
    ]
  }
  return [
    { text: 'SCROLL', action: 'scroll' },
    { text: 'OR' },
    { text: 'CLICK', action: 'pulse' },
    { text: 'TO' },
    { text: 'WITNESS' },
    { text: 'THE' },
    { text: 'FORMATION' },
  ]
})

function cueTokenDelayMs(idx: number, total: number): number {
  const center = (total - 1) / 2
  const distFromCenter = Math.abs(idx - center)
  return (
    HERO_CHOREOGRAPHY.interactionCueStartMs +
    Math.round(distFromCenter * HERO_CHOREOGRAPHY.interactionCueTokenStaggerMs * 2)
  )
}

let cleanupScroll: (() => void) | null = null
let unsubscribeHeroTick: (() => void) | null = null
let pulseEchoTimer: ReturnType<typeof setTimeout> | null = null
let rippleHideTimer: ReturnType<typeof setTimeout> | null = null

function detectInputModality(): InputModality {
  if (typeof window === 'undefined') return 'desktop'

  const hasCoarseAny = window.matchMedia?.('(any-pointer: coarse)').matches ?? false
  const hasCoarsePrimary = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const hasFineHover = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false
  const hasTouchPoints = (navigator.maxTouchPoints ?? 0) > 0

  if ((hasCoarseAny || hasTouchPoints) && hasFineHover) {
    return 'hybrid'
  }
  if (hasCoarsePrimary && !hasFineHover) {
    return 'touch'
  }
  return 'desktop'
}

function spawnClickRipple(clientX?: number, clientY?: number) {
  if (typeof clientX !== 'number' || typeof clientY !== 'number') return
  if (clientX === 0 && clientY === 0) return

  if (rippleHideTimer) clearTimeout(rippleHideTimer)
  clickRipple.value = {
    active: true,
    x: clientX,
    y: clientY,
    id: clickRipple.value.id + 1,
  }
  rippleHideTimer = setTimeout(() => {
    clickRipple.value.active = false
  }, 540)
}

function triggerSurfaceResonance(clientX?: number, clientY?: number) {
  triggerFormingPulse()
  spawnClickRipple(clientX, clientY)

  isSurfacePulsing.value = false
  if (pulseEchoTimer) clearTimeout(pulseEchoTimer)

  requestAnimationFrame(() => {
    isSurfacePulsing.value = true
    pulseEchoTimer = setTimeout(() => {
      isSurfacePulsing.value = false
    }, 380)
  })
}

function onRootSurfaceClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (!target) return

  // Skip buttons/links and FormationSlider's visual col (which already fires triggerFormingPulse)
  if (target.closest('button, a, [role="button"], .formation-visual-col')) {
    return
  }

  triggerSurfaceResonance(e.clientX, e.clientY)
}

function onFormingEnter() {
  isFormingActive.value = true
  setFormingHovered(true)
}

function onFormingLeave() {
  isFormingActive.value = false
  if (!isCueHovered.value) {
    setFormingHovered(false)
  }
}

function onFormingClick(e?: MouseEvent) {
  triggerSurfaceResonance(e?.clientX, e?.clientY)
}

function onCueEnter() {
  isCueHovered.value = true
  setFormingHovered(true)
}

function onCueLeave() {
  isCueHovered.value = false
  if (!isFormingActive.value) {
    setFormingHovered(false)
  }
}

function onCueTokenClick(action: 'scroll' | 'pulse', e: MouseEvent) {
  if (action === 'scroll') {
    scrollToFormation()
    return
  }
  triggerSurfaceResonance(e.clientX, e.clientY)
}

function updateHeroScrollParallax(tel: ConvergentTelemetry) {
  const p = tel.heroProgress

  if (heroStackEl.value) {
    const liftY = -p * 26
    const fade = Math.max(0, 1 - Math.max(0, (p - 0.16) / 0.62))
    heroStackEl.value.style.transform = `translate3d(0, ${liftY.toFixed(1)}px, 0)`
    heroStackEl.value.style.opacity = fade.toFixed(3)
    heroStackEl.value.style.pointerEvents = p > 0.45 ? 'none' : 'auto'
  }

  if (scrollCueEl.value) {
    const cueFade = Math.max(0, 1 - p / 0.28)
    scrollCueEl.value.style.opacity = cueFade.toFixed(3)
    scrollCueEl.value.style.pointerEvents = p > 0.25 ? 'none' : 'auto'
  }
}

onMounted(() => {
  inputModality.value = detectInputModality()
  cleanupScroll = mountScrollEngine()
  unsubscribeHeroTick = onScrollTick(updateHeroScrollParallax)
})

onUnmounted(() => {
  setFormingHovered(false)
  if (pulseEchoTimer) {
    clearTimeout(pulseEchoTimer)
    pulseEchoTimer = null
  }
  if (rippleHideTimer) {
    clearTimeout(rippleHideTimer)
    rippleHideTimer = null
  }
  if (unsubscribeHeroTick) {
    unsubscribeHeroTick()
    unsubscribeHeroTick = null
  }
  if (cleanupScroll) {
    cleanupScroll()
    cleanupScroll = null
  }
})
</script>

<template>
  <div
    class="relative min-h-svh w-full bg-brand-void"
    @click="onRootSurfaceClick"
  >
    <!-- Persistent Unified Signal Layer (Black -> Dark Gradient -> 18 Strands -> Star Particles) -->
    <ConvergentSignalEngine />

    <!-- Tactile Bioluminescent Click-Origin Wave Ring (Anywhere Surface Feedback) -->
    <span
      v-if="clickRipple.active"
      :key="clickRipple.id"
      aria-hidden="true"
      class="surface-click-ring pointer-events-none fixed left-0 top-0 z-30 h-14 w-14 rounded-full"
      :style="{
        '--rx': `${clickRipple.x}px`,
        '--ry': `${clickRipple.y}px`,
      }"
    />

    <main class="relative z-10 w-full overflow-x-clip">
      <!-- SECTION 1: 3-ROW CSS GRID HERO -->
      <section
        aria-labelledby="formation-heading"
        class="relative grid min-h-svh w-full grid-rows-[0.82fr_auto_1.18fr] items-center gap-y-5 px-5 py-7 sm:gap-y-7 sm:px-12 sm:py-10 lg:px-20 lg:py-12 [@media(max-height:520px)]:grid-rows-[1fr_auto_1fr] [@media(max-height:520px)]:gap-y-2.5 [@media(max-height:520px)]:py-3.5"
      >
        <!-- Row 1: Top Counter-Weight Track -->
        <div aria-hidden="true" class="w-full" />

        <!-- Row 2: Centered Negative-Space Typography Pocket -->
        <div
          ref="heroStackEl"
          class="relative mx-auto flex w-full max-w-[46rem] flex-col items-center justify-center text-center will-change-transform"
        >
          <!-- Beat 3: ORIGIN Writes Letter-by-Letter (sr-only replaces prohibited span aria-label) -->
          <span
            class="relative mb-6 sm:mb-8 lg:mb-10 inline-flex items-center text-[0.7rem] sm:text-[0.78rem] font-medium uppercase text-white/84 select-none [@media(max-height:520px)]:mb-2.5 [@media(max-height:520px)]:text-[0.62rem]"
          >
            <span class="sr-only">ORIGIN</span>
            <span
              v-for="(ch, pIdx) in ORIGIN_CHARS"
              :key="`prev-${pIdx}`"
              aria-hidden="true"
              class="char-write inline-block mr-[0.44em] last:mr-0"
              :style="{
                '--delay': `${HERO_CHOREOGRAPHY.previewStartMs + pIdx * HERO_CHOREOGRAPHY.previewCharStaggerMs}ms`,
                '--dur': `${HERO_CHOREOGRAPHY.previewCharDurationMs}ms`,
                '--rise': '8px',
              }"
            >{{ ch }}</span>
          </span>

          <!-- Beat 4: Something -> is -> forming. (Clean Accessible Heading + Unhidden Focusable Button) -->
          <h1
            id="formation-heading"
            class="relative text-[2.6rem] 2xs:text-[3.1rem] sm:text-[4.4rem] lg:text-[5.2rem] xl:text-[5.85rem] 2xl:text-[6.35rem] font-bold leading-[1.04] tracking-[-0.035em] text-white select-none [@media(max-height:520px)]:text-[2.3rem]"
          >
            <span class="sr-only">Something is </span>

            <!-- "Something" -->
            <span aria-hidden="true" class="block">
              <span
                v-for="(ch, sIdx) in SOMETHING_CHARS"
                :key="`some-${sIdx}`"
                class="char-write inline-block"
                :style="{
                  '--delay': `${HERO_CHOREOGRAPHY.somethingStartMs + sIdx * HERO_CHOREOGRAPHY.somethingCharStaggerMs}ms`,
                  '--dur': `${HERO_CHOREOGRAPHY.somethingCharDurationMs}ms`,
                  '--rise': '12px',
                }"
              >{{ ch }}</span>
            </span>

            <!-- "is forming." (No aria-hidden here so focusable role="button" stays exposed) -->
            <span class="mt-0.5 sm:mt-1.5 block">
              <span aria-hidden="true" class="inline-flex mr-[0.22em]">
                <span
                  v-for="(ch, iIdx) in IS_CHARS"
                  :key="`is-${iIdx}`"
                  class="char-write inline-block"
                  :style="{
                    '--delay': `${HERO_CHOREOGRAPHY.isStartMs + iIdx * HERO_CHOREOGRAPHY.isCharStaggerMs}ms`,
                    '--dur': `${HERO_CHOREOGRAPHY.isCharDurationMs}ms`,
                    '--rise': '12px',
                  }"
                >{{ ch }}</span>
              </span>

              <span
                data-resonant-hover
                role="button"
                tabindex="0"
                aria-label="forming."
                class="forming-accent relative inline-flex cursor-pointer text-brand-blue focus:outline-none focus-visible:underline"
                :class="{ 'is-resonating': isFormingActive || isSurfacePulsing }"
                @mouseenter="onFormingEnter"
                @mouseleave="onFormingLeave"
                @click.stop="onFormingClick($event)"
                @keydown.enter.prevent="onFormingClick()"
                @keydown.space.prevent="onFormingClick()"
              >
                <!-- One-Shot Brief Glow Flash on Write Completion (Settles to 0) -->
                <span
                  aria-hidden="true"
                  class="forming-write-flash pointer-events-none absolute -inset-x-3 -inset-y-1 -z-10 rounded-full"
                  :style="{ '--flash-delay': `${FORMING_FLASH_DELAY_MS}ms` }"
                />

                <!-- Subtle Tight Halo (0 Opacity in Idle — Fades In Gently on Hover / Surface Pulse) -->
                <span
                  aria-hidden="true"
                  class="forming-hover-halo pointer-events-none absolute -inset-x-2.5 -inset-y-1 -z-10 rounded-full"
                />

                <span
                  v-for="(ch, fIdx) in FORMING_CHARS"
                  :key="`form-${fIdx}`"
                  aria-hidden="true"
                  class="forming-char-write inline-block"
                  :style="{
                    '--delay': `${HERO_CHOREOGRAPHY.formingStartMs + fIdx * HERO_CHOREOGRAPHY.formingCharStaggerMs}ms`,
                    '--dur': `${HERO_CHOREOGRAPHY.formingCharDurationMs}ms`,
                  }"
                >{{ ch }}</span>
              </span>
            </span>
          </h1>

          <!-- Beat 5: Subtitle Writes Word-by-Word (sr-only replaces prohibited p aria-label) -->
          <p
            class="relative mt-5 sm:mt-7 lg:mt-8 max-w-[26rem] text-[0.96rem] 2xs:text-[1.05rem] sm:text-[1.22rem] xl:text-[1.34rem] font-normal leading-[1.58] tracking-[-0.01em] text-white/84 select-none [@media(max-height:520px)]:mt-2.5 [@media(max-height:520px)]:text-[0.88rem]"
          >
            <span class="sr-only">Every beginning carries a signal. Follow its journey.</span>

            <span aria-hidden="true" class="flex flex-wrap justify-center">
              <span
                v-for="(word, w1Idx) in LEAD_LINE_1_WORDS"
                :key="`l1-${w1Idx}`"
                class="char-write inline-block mr-[0.28em] last:mr-0"
                :style="{
                  '--delay': `${HERO_CHOREOGRAPHY.leadLine1StartMs + w1Idx * HERO_CHOREOGRAPHY.leadLine1WordStaggerMs}ms`,
                  '--dur': `${HERO_CHOREOGRAPHY.leadWordDurationMs}ms`,
                  '--rise': '10px',
                }"
              >{{ word }}</span>
            </span>

            <span aria-hidden="true" class="mt-1 flex flex-wrap justify-center">
              <span
                v-for="(word, w2Idx) in LEAD_LINE_2_WORDS"
                :key="`l2-${w2Idx}`"
                class="char-write inline-block mr-[0.28em] last:mr-0"
                :style="{
                  '--delay': `${HERO_CHOREOGRAPHY.leadLine2StartMs + w2Idx * HERO_CHOREOGRAPHY.leadLine2WordStaggerMs}ms`,
                  '--dur': `${HERO_CHOREOGRAPHY.leadWordDurationMs}ms`,
                  '--rise': '10px',
                }"
              >{{ word }}</span>
            </span>
          </p>

          <!-- Beat 5B: Signal Horizon Ignition Interactive Cue (Natural Token Semantics, Zero Prohibited ARIA) -->
          <div
            data-resonant-hover
            class="signal-horizon-cue relative mt-6 sm:mt-8 lg:mt-9 inline-flex max-w-full items-center justify-center gap-2.5 sm:gap-4 px-2 py-1.5 select-none [@media(max-height:520px)]:mt-2.5 [@media(max-height:520px)]:py-0.5"
            :class="{
              'is-cue-hovered': isCueHovered,
              'is-cue-pulsing': isSurfacePulsing,
            }"
            @mouseenter="onCueEnter"
            @mouseleave="onCueLeave"
          >
            <!-- One-Shot Center-Outward Ignition Aura Flash -->
            <span
              aria-hidden="true"
              class="cue-ignition-flash pointer-events-none absolute -inset-x-6 -inset-y-2 -z-10 rounded-full"
              :style="{ '--cue-start': `${HERO_CHOREOGRAPHY.interactionCueStartMs}ms` }"
            />

            <!-- Center-Outward Igniting Tokens (Interactive Verbs + Architectural Copy) -->
            <span
              class="inline-flex flex-wrap items-center justify-center gap-x-[0.52em] gap-y-1 text-[0.58rem] 2xs:text-[0.63rem] sm:text-[0.7rem] font-medium uppercase leading-[1.55] tracking-[0.25em] [@media(max-height:520px)]:text-[0.54rem]"
            >
              <template
                v-for="(token, tIdx) in cueTokens"
                :key="`${inputModality}-${tIdx}-${token.text}`"
              >
                <button
                  v-if="token.action"
                  type="button"
                  data-resonant-hover
                  class="cue-token-ignite cue-verb-btn relative inline-flex items-center font-semibold text-brand-frost cursor-pointer focus:outline-none focus-visible:text-white"
                  :style="{
                    '--tok-delay': `${cueTokenDelayMs(tIdx, cueTokens.length)}ms`,
                    '--tok-dur': `${HERO_CHOREOGRAPHY.interactionCueTokenDurationMs}ms`,
                  }"
                  @click.stop="onCueTokenClick(token.action, $event)"
                >
                  <span class="cue-verb-breathe inline-block">{{ token.text }}</span>
                  <span
                    aria-hidden="true"
                    class="cue-verb-underline pointer-events-none absolute -bottom-0.5 inset-x-0 h-px origin-center"
                  />
                </button>

                <span
                  v-else
                  class="cue-token-ignite inline-block text-white/58 transition-colors duration-300"
                  :class="{ 'text-white/80': isCueHovered }"
                  :style="{
                    '--tok-delay': `${cueTokenDelayMs(tIdx, cueTokens.length)}ms`,
                    '--tok-dur': `${HERO_CHOREOGRAPHY.interactionCueTokenDurationMs}ms`,
                  }"
                >{{ token.text }}</span>
              </template>
            </span>
          </div>
        </div>

        <!-- Row 3: Beat 6 Parabolic Triple-Crescent SCROLL Indicator -->
        <div class="flex w-full items-end justify-center self-end">
          <button
            ref="scrollCueEl"
            type="button"
            data-resonant-hover
            aria-label="Scroll into the Formation"
            class="scroll-cue-btn group flex flex-col items-center gap-3 pt-2 pb-1 cursor-pointer select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-electric/60 rounded-md will-change-opacity [@media(max-height:520px)]:gap-1.5 [@media(max-height:520px)]:pb-0"
            @click.stop="scrollToFormation"
          >
            <span
              class="char-write flex flex-col items-center gap-3 [@media(max-height:520px)]:gap-1.5"
              :style="{
                '--delay': `${HERO_CHOREOGRAPHY.scrollCueStartMs}ms`,
                '--dur': `${HERO_CHOREOGRAPHY.scrollCueDurationMs}ms`,
                '--rise': '14px',
              }"
            >
              <svg
                viewBox="0 0 96 68"
                class="h-[3.4rem] w-[4.8rem] sm:h-[3.95rem] sm:w-[5.6rem] overflow-visible [@media(max-height:520px)]:h-[2.3rem] [@media(max-height:520px)]:w-[3.3rem]"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <defs>
                  <radialGradient id="scrollCueAura" cx="50%" cy="66%" r="50%">
                    <stop offset="0%" stop-color="var(--color-brand-electric)" stop-opacity="0.48" />
                    <stop offset="48%" stop-color="var(--color-brand-blue)" stop-opacity="0.16" />
                    <stop offset="100%" stop-color="var(--color-brand-obsidian)" stop-opacity="0" />
                  </radialGradient>

                  <linearGradient id="crescentBellyGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stop-color="var(--color-brand-blue)" stop-opacity="0" />
                    <stop offset="20%" stop-color="var(--color-brand-electric)" stop-opacity="0.62" />
                    <stop offset="50%" stop-color="var(--color-brand-frost)" stop-opacity="1" />
                    <stop offset="80%" stop-color="var(--color-brand-electric)" stop-opacity="0.62" />
                    <stop offset="100%" stop-color="var(--color-brand-blue)" stop-opacity="0" />
                  </linearGradient>

                  <radialGradient id="nadirSparkGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
                    <stop offset="30%" stop-color="var(--color-brand-ice)" stop-opacity="0.94" />
                    <stop offset="68%" stop-color="var(--color-brand-blue)" stop-opacity="0.48" />
                    <stop offset="100%" stop-color="var(--color-brand-blue)" stop-opacity="0" />
                  </radialGradient>
                </defs>

                <g class="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 [transform-origin:48px_42px]">
                  <ellipse cx="48" cy="41" rx="40" ry="25" fill="url(#scrollCueAura)" class="cue-aura" />
                </g>

                <g class="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-[1.5px]">
                  <path
                    d="M 18 7 Q 48 26 78 7 Q 48 23.2 18 7 Z"
                    fill="url(#crescentBellyGrad)"
                    class="crescent-wave crescent-wave-1"
                  />
                </g>

                <g class="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-[3px]">
                  <path
                    d="M 24 23 Q 48 42.5 72 23 Q 48 38.2 24 23 Z"
                    fill="url(#crescentBellyGrad)"
                    class="crescent-wave crescent-wave-2"
                  />
                </g>

                <g class="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-[4.5px]">
                  <g class="crescent-wave crescent-wave-3">
                    <path
                      d="M 30 39 Q 48 57.5 66 39 Q 48 52.6 30 39 Z"
                      fill="url(#crescentBellyGrad)"
                    />
                    <circle cx="48" cy="47.4" r="9.5" fill="url(#nadirSparkGlow)" />
                    <circle cx="48" cy="47.4" r="1.65" class="fill-white" />
                  </g>
                </g>
              </svg>

              <span
                class="pl-[0.44em] text-[0.62rem] sm:text-[0.68rem] font-medium uppercase tracking-[0.44em] text-white/78 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-[2px] group-hover:text-white"
              >
                SCROLL
              </span>
            </span>
          </button>
        </div>
      </section>

      <!-- SECTION 2: FIXED VIEWPORT FORMATION STAGE + SCROLL RUNWAY -->
      <FormationSlider />
    </main>
  </div>
</template>

<style scoped>
/* Crisp Letter & Word Write-In (Zero Idle Halo) */
.char-write {
  opacity: 0;
  will-change: transform, opacity;
  animation: crispWriteIn var(--dur, 250ms) cubic-bezier(0.22, 1, 0.36, 1) var(--delay, 0ms) forwards;
}

/* "forming." Letter Write with Momentary Glow Flash -> Clean Settle */
.forming-char-write {
  opacity: 0;
  will-change: transform, opacity;
  animation: formingGlowWrite var(--dur, 340ms) cubic-bezier(0.22, 1, 0.36, 1) var(--delay, 0ms) forwards;
  transition:
    color 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    text-shadow 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Brief 1-Shot Glow Pulse Right as "forming." Completes Writing, Settling to 0 */
.forming-write-flash {
  opacity: 0;
  background: radial-gradient(
    ellipse 56% 52% at 50% 54%,
    color-mix(in srgb, var(--color-brand-electric) 26%, transparent) 0%,
    transparent 72%
  );
  will-change: opacity, transform;
  animation: formingBriefFlash 360ms cubic-bezier(0.22, 1, 0.36, 1) var(--flash-delay, 2960ms) forwards;
}

/* Hover-Only Halo (Completely Off in Idle; Mild & Restrained When Hovered) */
.forming-hover-halo {
  opacity: 0;
  background: radial-gradient(
    ellipse 52% 48% at 50% 55%,
    color-mix(in srgb, var(--color-brand-blue) 14%, transparent) 0%,
    transparent 70%
  );
  transform: scale(0.94);
  transition:
    opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.forming-accent {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.forming-accent.is-resonating {
  transform: translate3d(0, -1.5px, 0);
}

.forming-accent.is-resonating .forming-hover-halo {
  opacity: 1;
  transform: scale(1);
}

.forming-accent.is-resonating .forming-char-write {
  color: var(--color-brand-electric);
  text-shadow: 0 0 24px color-mix(in srgb, var(--color-brand-electric) 48%, transparent);
}

.forming-accent:active {
  transform: translate3d(0, 0.5px, 0) scale(0.985);
}

/* Tactile Bioluminescent Click-Origin Ring */
.surface-click-ring {
  border: 1px solid color-mix(in srgb, var(--color-brand-ice) 62%, transparent);
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--color-brand-electric) 24%, transparent) 0%,
    transparent 70%
  );
  will-change: transform, opacity;
  animation: surfaceRingExpand 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

/* Beat 5B: Signal Horizon Ignition Entrance & Interactive States */
.cue-ignition-flash {
  opacity: 0;
  background: radial-gradient(
    ellipse 54% 58% at 50% 50%,
    color-mix(in srgb, var(--color-brand-electric) 28%, transparent) 0%,
    color-mix(in srgb, var(--color-brand-blue) 10%, transparent) 48%,
    transparent 76%
  );
  will-change: transform, opacity;
  animation: cueHorizonFlash 640ms cubic-bezier(0.22, 1, 0.36, 1) var(--cue-start, 3800ms) forwards;
}

.cue-wing {
  opacity: 0;
  transform: scaleX(0);
  will-change: transform, opacity;
  animation: cueWingUnfurl var(--wing-dur, 540ms) cubic-bezier(0.22, 1, 0.36, 1) var(--wing-delay, 3800ms) forwards;
  transition:
    filter 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.cue-wing--left {
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--color-brand-blue) 68%, transparent) 52%,
    var(--color-brand-frost) 100%
  );
}

.cue-wing--right {
  background: linear-gradient(
    90deg,
    var(--color-brand-frost) 0%,
    color-mix(in srgb, var(--color-brand-blue) 68%, transparent) 48%,
    transparent 100%
  );
}

.signal-horizon-cue.is-cue-hovered .cue-wing,
.signal-horizon-cue.is-cue-pulsing .cue-wing {
  filter: drop-shadow(0 0 8px var(--color-brand-electric));
}

.cue-token-ignite {
  opacity: 0;
  will-change: transform, opacity;
  animation: cueTokenIgnite var(--tok-dur, 420ms) cubic-bezier(0.22, 1, 0.36, 1) var(--tok-delay, 3800ms) forwards;
}

.cue-verb-btn {
  transition:
    color 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    text-shadow 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.cue-verb-breathe {
  animation: cueVerbAmbient 3.4s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
}

.cue-verb-underline {
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--color-brand-electric) 50%,
    transparent 100%
  );
  opacity: 0.45;
  transform: scaleX(0.42);
  transition:
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.cue-verb-btn:hover,
.signal-horizon-cue.is-cue-pulsing .cue-verb-btn {
  color: #ffffff;
  transform: translate3d(0, -1px, 0);
  text-shadow: 0 0 16px color-mix(in srgb, var(--color-brand-electric) 68%, transparent);
}

.cue-verb-btn:hover .cue-verb-underline,
.cue-verb-btn:focus-visible .cue-verb-underline,
.signal-horizon-cue.is-cue-pulsing .cue-verb-underline {
  opacity: 1;
  transform: scaleX(1);
}

.cue-verb-btn:active {
  transform: translate3d(0, 0.5px, 0) scale(0.96);
}

.cue-aura {
  will-change: opacity, transform;
  transform-box: fill-box;
  transform-origin: center;
  animation: cueAuraBreathe 3.2s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
}

.crescent-wave {
  will-change: transform, opacity;
}

.crescent-wave-1 {
  animation: crescentCascade1 2.5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

.crescent-wave-2 {
  animation: crescentCascade2 2.5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

.crescent-wave-3 {
  animation: crescentCascade3 2.5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

@keyframes crispWriteIn {
  0% {
    opacity: 0;
    transform: translate3d(0, var(--rise, 10px), 0);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes formingGlowWrite {
  0% {
    opacity: 0;
    color: var(--color-brand-ice);
    transform: translate3d(0, 12px, 0);
    text-shadow: 0 0 0 transparent;
  }
  52% {
    opacity: 1;
    color: var(--color-brand-frost);
    transform: translate3d(0, -1px, 0);
    text-shadow:
      0 0 18px color-mix(in srgb, var(--color-brand-ice) 78%, transparent),
      0 0 34px color-mix(in srgb, var(--color-brand-blue) 62%, transparent);
  }
  100% {
    opacity: 1;
    color: var(--color-brand-blue);
    transform: translate3d(0, 0, 0);
    text-shadow: 0 0 12px color-mix(in srgb, var(--color-brand-blue) 18%, transparent);
  }
}

@keyframes formingBriefFlash {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  42% {
    opacity: 1;
    transform: scale(1.04);
  }
  100% {
    opacity: 0;
    transform: scale(1);
  }
}

@keyframes surfaceRingExpand {
  0% {
    opacity: 0.92;
    transform: translate3d(calc(var(--rx, 0px) - 50%), calc(var(--ry, 0px) - 50%), 0) scale(0.22);
  }
  100% {
    opacity: 0;
    transform: translate3d(calc(var(--rx, 0px) - 50%), calc(var(--ry, 0px) - 50%), 0) scale(1.75);
  }
}

@keyframes cueHorizonFlash {
  0% {
    opacity: 0;
    transform: scaleX(0.25) scaleY(0.7);
  }
  38% {
    opacity: 0.95;
    transform: scaleX(1.04) scaleY(1);
  }
  100% {
    opacity: 0;
    transform: scaleX(1.18) scaleY(1.05);
  }
}

@keyframes cueWingUnfurl {
  0% {
    opacity: 0;
    transform: scaleX(0);
  }
  55% {
    opacity: 1;
    transform: scaleX(1.08);
  }
  100% {
    opacity: 0.78;
    transform: scaleX(1);
  }
}

@keyframes cueTokenIgnite {
  0% {
    opacity: 0;
    transform: translate3d(0, 7px, 0) scale(0.94);
    filter: brightness(1.85);
  }
  50% {
    opacity: 1;
    transform: translate3d(0, -0.5px, 0) scale(1.01);
    filter: brightness(1.35);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
    filter: brightness(1);
  }
}

@keyframes cueVerbAmbient {
  0% {
    text-shadow: 0 0 8px color-mix(in srgb, var(--color-brand-blue) 18%, transparent);
  }
  100% {
    text-shadow: 0 0 14px color-mix(in srgb, var(--color-brand-electric) 46%, transparent);
  }
}

@keyframes cueAuraBreathe {
  0% {
    opacity: 0.65;
    transform: scale(0.92);
  }
  100% {
    opacity: 1;
    transform: scale(1.08);
  }
}

@keyframes crescentCascade1 {
  0%, 100% {
    opacity: 0.24;
    transform: translate3d(0, -1.5px, 0);
  }
  28% {
    opacity: 0.72;
    transform: translate3d(0, 1.5px, 0);
  }
  65% {
    opacity: 0.28;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes crescentCascade2 {
  0%, 100% {
    opacity: 0.42;
    transform: translate3d(0, -1.5px, 0);
  }
  44% {
    opacity: 0.96;
    transform: translate3d(0, 2px, 0);
  }
  78% {
    opacity: 0.48;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes crescentCascade3 {
  0%, 100% {
    opacity: 0.55;
    transform: translate3d(0, -1px, 0);
  }
  60% {
    opacity: 1;
    transform: translate3d(0, 2.5px, 0);
  }
  88% {
    opacity: 0.62;
    transform: translate3d(0, 0.5px, 0);
  }
}
</style>