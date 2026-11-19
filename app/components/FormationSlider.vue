<!-- app/components/FormationSlider.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useConvergentScroll } from '~/composables/useConvergentScroll'

const {
  stages,
  maxUnlockedIndex,
  scrollMode,
  activeStageIndex,
  stageTransitionDirection,
  isFormationSettled,
  isFormationTextReady,
  attemptedStageIndex,
  attemptKey,
  registerFormationElements,
  scrollToStage,
  triggerFormingPulse,
} = useConvergentScroll()

const HEADER_LETTERS = 'FORMATION'.split('')

const FORMATION_TEMPO_SCALE = 1.0
const fms = (ms: number): number => Math.round(ms * FORMATION_TEMPO_SCALE)

const FORMATION_CHOREOGRAPHY = {
  unitDurationMs: fms(780),
  headerStartMs: fms(0),
  headerCharStaggerMs: fms(36),
  dateStartMs: fms(380),
  counterStartMs: fms(620),
  titleStartMs: fms(880),
  titleCharStaggerMs: fms(72),
  leadStartMs: fms(1380),
  leadWordStaggerMs: fms(80),
  captionStartMs: fms(1880),
  captionWordStaggerMs: fms(60),
  railLineDelayMs: fms(2280),
  railLineDurationMs: fms(920),
  railItemStartMs: fms(2340),
  railItemStaggerMs: fms(52),
  switchCounterMs: fms(120),
  switchTitleStartMs: fms(210),
  switchTitleCharStaggerMs: fms(52),
  switchLeadStartMs: fms(510),
  switchLeadWordStaggerMs: fms(46),
  switchCaptionStartMs: fms(770),
  switchCaptionWordStaggerMs: fms(40),
} as const

const stickyFrameEl = ref<HTMLElement | null>(null)
const visualFieldEl = ref<HTMLDivElement | null>(null)

const activeStage = computed(() => stages[activeStageIndex.value] ?? stages[0]!)

function splitChars(text: string): string[] {
  return text.split('')
}

function splitWords(text: string): string[] {
  return text.trim() ? text.trim().split(/\s+/) : []
}

function titleSizeClass(title: string): string {
  const len = title.trim().length
  if (len >= 12) {
    return 'text-[1.9rem] 2xs:text-[2.15rem] sm:text-[2.95rem] lg:text-[2.5rem] xl:text-[3.25rem] 2xl:text-[3.85rem] [@media(max-height:520px)]:text-[1.65rem]'
  }
  if (len >= 10) {
    return 'text-[2.25rem] 2xs:text-[2.55rem] sm:text-[3.5rem] lg:text-[2.95rem] xl:text-[3.85rem] 2xl:text-[4.45rem] [@media(max-height:520px)]:text-[1.95rem]'
  }
  if (len >= 8) {
    return 'text-[2.65rem] 2xs:text-[3.05rem] sm:text-[4.15rem] lg:text-[3.6rem] xl:text-[4.65rem] 2xl:text-[5.3rem] [@media(max-height:520px)]:text-[2.25rem]'
  }
  return 'text-[3.15rem] 2xs:text-[3.65rem] sm:text-[4.85rem] lg:text-[5.5rem] xl:text-[6.25rem] [@media(max-height:520px)]:text-[2.55rem]'
}

function whisperPositionClass(idx: number): string {
  if (idx === stages.length - 1) return 'right-1.5 justify-end'
  if (idx === 0) return 'left-1.5 justify-start'
  return 'left-1/2 -translate-x-1/2 justify-center'
}

function onKeyDown(e: KeyboardEvent) {
  if (!isFormationTextReady.value) return

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    scrollToStage(Math.min(stages.length - 1, activeStageIndex.value + 1))
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    if (activeStageIndex.value > 0) {
      e.preventDefault()
      scrollToStage(activeStageIndex.value - 1)
    }
  } else if (e.key === 'Home') {
    e.preventDefault()
    scrollToStage(0)
  } else if (e.key === 'End') {
    e.preventDefault()
    let highestUnlocked = 0
    for (let i = 0; i < stages.length; i++) {
      if (stages[i]?.unlocked) highestUnlocked = i
    }
    scrollToStage(highestUnlocked)
  }
}

onMounted(() => {
  registerFormationElements(stickyFrameEl.value, visualFieldEl.value)
})

onUnmounted(() => {
  registerFormationElements(null, null)
})
</script>

<template>
  <!-- Invisible Scroll Runway Spacer (Adapts Cleanly to Desktop, Standalone Full-Screen PWA & Mobile Browser) -->
  <section
    id="formation"
    aria-label="Brandsta Formation Timeline"
    :data-scroll-mode="scrollMode"
    class="formation-runway relative w-full select-none pointer-events-none"
    :style="{ '--extra-stages': maxUnlockedIndex }"
  >
    <!-- Option B: Viewport-Pinned Fixed Formation Frame (Zero Half-Scrolled Clipping, Zero Rail Cut-Off) -->
    <div
      ref="stickyFrameEl"
      tabindex="0"
      class="formation-frame fixed inset-x-0 top-0 z-20 grid h-svh w-full grid-rows-[auto_1fr_auto] overflow-x-clip bg-transparent px-6 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-12 sm:py-10 lg:px-20 lg:py-12 2xl:px-28 focus:outline-none pointer-events-none [@media(max-height:520px)]:py-3.5"
      :class="isFormationTextReady ? 'is-revealed' : 'is-concealed'"
      :style="{
        '--unit-dur': `${FORMATION_CHOREOGRAPHY.unitDurationMs}ms`,
        '--rail-delay': `${FORMATION_CHOREOGRAPHY.railLineDelayMs}ms`,
        '--rail-dur': `${FORMATION_CHOREOGRAPHY.railLineDurationMs}ms`,
      }"
      @keydown="onKeyDown"
    >
      <!-- Row 1: Letter-Wave FORMATION & Dynamic Daily Date Header -->
      <header
        class="relative z-10 mx-auto flex w-full max-w-[90rem] items-center justify-between select-none"
        :class="isFormationTextReady ? 'pointer-events-auto' : 'pointer-events-none'"
      >
        <span
          aria-label="FORMATION"
          class="inline-flex items-center text-[0.7rem] sm:text-xs font-medium uppercase text-white/84 select-none"
        >
          <span
            v-for="(ch, cIdx) in HEADER_LETTERS"
            :key="`hdr-${cIdx}`"
            aria-hidden="true"
            class="wave-unit inline-block mr-[0.38em] last:mr-0"
            :style="{
              '--enter-y': '12px',
              '--stagger-ms': `${FORMATION_CHOREOGRAPHY.headerStartMs + cIdx * FORMATION_CHOREOGRAPHY.headerCharStaggerMs}ms`,
            }"
          >{{ ch }}</span>
        </span>

        <div class="grid grid-cols-1 grid-rows-1 items-center justify-items-end">
          <Transition :name="stageTransitionDirection === 'up' ? 'date-fade-up' : 'date-fade-down'">
            <time
              :key="activeStage.dateLabel"
              class="wave-unit col-start-1 row-start-1 text-[0.7rem] sm:text-xs font-medium uppercase tracking-[0.26em] text-white/84 tabular-nums select-none"
              :style="{
                '--enter-y': '12px',
                '--stagger-ms': `${FORMATION_CHOREOGRAPHY.dateStartMs}ms`,
              }"
            >
              {{ activeStage.dateLabel }}
            </time>
          </Transition>
        </div>
      </header>

      <!-- Row 2: Aspect-Aware Stage Grid (Top-Aligned Editorial on Portrait Clear of Lower Filaments) -->
      <div class="formation-stage-grid relative z-10 mx-auto h-full w-full max-w-[90rem] pt-4 pb-2 sm:py-5 lg:py-2 [@media(max-height:520px)]:py-1">
        <div
          class="formation-copy-col grid grid-cols-1 grid-rows-1 items-start lg:items-center"
          :class="isFormationTextReady ? 'pointer-events-auto' : 'pointer-events-none'"
        >
          <Transition :name="stageTransitionDirection === 'up' ? 'stage-fade-up' : 'stage-fade-down'">
            <article
              :key="activeStage.slug"
              class="stage-editorial-card col-start-1 row-start-1 flex flex-col items-start justify-center"
            >
              <span
                class="wave-unit stage-stagger-unit eyebrow-resonance text-lg sm:text-xl lg:text-[1.35rem] font-bold tracking-[0.06em] text-brand-blue tabular-nums select-none [@media(max-height:520px)]:text-sm"
                :style="{
                  '--enter-y': '16px',
                  '--stagger-ms': `${FORMATION_CHOREOGRAPHY.counterStartMs}ms`,
                  '--stage-stagger-ms': `${FORMATION_CHOREOGRAPHY.switchCounterMs}ms`,
                }"
              >
                {{ activeStage.number }} / 07
              </span>

              <h2
                :aria-label="activeStage.title"
                class="mt-1.5 sm:mt-3 inline-flex whitespace-nowrap font-bold uppercase leading-[0.95] tracking-[-0.02em] text-white select-none [@media(max-height:520px)]:mt-1"
                :class="titleSizeClass(activeStage.title)"
              >
                <span
                  v-for="(ch, charIdx) in splitChars(activeStage.title)"
                  :key="`${activeStage.slug}-char-${charIdx}`"
                  data-resonant-hover
                  aria-hidden="true"
                  class="wave-unit stage-stagger-unit title-char-outer inline-block"
                  :style="{
                    '--enter-y': '30px',
                    '--enter-scale': '0.9',
                    '--stagger-ms': `${FORMATION_CHOREOGRAPHY.titleStartMs + charIdx * FORMATION_CHOREOGRAPHY.titleCharStaggerMs}ms`,
                    '--stage-stagger-ms': `${FORMATION_CHOREOGRAPHY.switchTitleStartMs + charIdx * FORMATION_CHOREOGRAPHY.switchTitleCharStaggerMs}ms`,
                  }"
                >
                  <span
                    class="title-char-harmonic inline-block"
                    :style="{ animationDelay: `${charIdx * 170}ms` }"
                  >{{ ch }}</span>
                </span>
              </h2>

              <p
                :aria-label="activeStage.lead"
                class="mt-3.5 sm:mt-6 flex flex-wrap text-[1.06rem] 2xs:text-[1.14rem] sm:text-[1.35rem] xl:text-[1.5rem] font-semibold leading-[1.35] tracking-[-0.01em] text-white/95 select-none [@media(max-height:520px)]:mt-2 [@media(max-height:520px)]:text-[0.96rem]"
              >
                <span
                  v-for="(word, wIdx) in splitWords(activeStage.lead)"
                  :key="`${activeStage.slug}-lead-${wIdx}`"
                  aria-hidden="true"
                  class="wave-unit stage-stagger-unit inline-block mr-[0.27em] last:mr-0"
                  :style="{
                    '--enter-y': '16px',
                    '--stagger-ms': `${FORMATION_CHOREOGRAPHY.leadStartMs + wIdx * FORMATION_CHOREOGRAPHY.leadWordStaggerMs}ms`,
                    '--stage-stagger-ms': `${FORMATION_CHOREOGRAPHY.switchLeadStartMs + wIdx * FORMATION_CHOREOGRAPHY.switchLeadWordStaggerMs}ms`,
                  }"
                >{{ word }}</span>
              </p>

              <p
                :aria-label="activeStage.caption"
                class="mt-2 sm:mt-3 flex max-w-[20.5rem] sm:max-w-[23rem] flex-wrap text-[0.93rem] sm:text-[1.1rem] xl:text-[1.2rem] italic font-normal leading-[1.52] text-white/68 select-none [@media(max-height:520px)]:mt-1 [@media(max-height:520px)]:text-[0.84rem]"
              >
                <span
                  v-for="(word, wIdx) in splitWords(activeStage.caption)"
                  :key="`${activeStage.slug}-cap-${wIdx}`"
                  aria-hidden="true"
                  class="wave-unit stage-stagger-unit inline-block mr-[0.27em] last:mr-0"
                  :style="{
                    '--enter-y': '14px',
                    '--stagger-ms': `${FORMATION_CHOREOGRAPHY.captionStartMs + wIdx * FORMATION_CHOREOGRAPHY.captionWordStaggerMs}ms`,
                    '--stage-stagger-ms': `${FORMATION_CHOREOGRAPHY.switchCaptionStartMs + wIdx * FORMATION_CHOREOGRAPHY.switchCaptionWordStaggerMs}ms`,
                  }"
                >{{ word }}</span>
              </p>
            </article>
          </Transition>
        </div>

        <!-- Open Spout & Pulse Click Zone -->
        <div
          ref="visualFieldEl"
          data-resonant-hover
          aria-hidden="true"
          class="formation-visual-col h-full w-full min-h-[12rem] [@media(max-height:520px)]:min-h-[7.5rem]"
          :class="isFormationSettled && isFormationTextReady ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'"
          @click="triggerFormingPulse"
        />
      </div>

      <!-- Row 3 Spacer: Keeps Row 2 editorial & visual centering locked inside h-svh -->
      <div aria-hidden="true" class="h-10 sm:h-11 [@media(max-height:520px)]:h-7" />

      <!-- Option 1: True-Bottom Pinned 01–07 Navigation Rail -->
      <footer
        class="fixed inset-x-0 bottom-0 z-30 w-full px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-12 sm:pb-10 lg:px-20 lg:pb-12 2xl:px-28 select-none [@media(max-height:520px)]:pb-3.5"
        :class="isFormationTextReady ? 'pointer-events-auto' : 'pointer-events-none'"
      >
        <span aria-live="polite" class="sr-only">
          {{ attemptedStageIndex !== null ? `Stage ${stages[attemptedStageIndex]?.number} is still forming.` : '' }}
        </span>

        <nav
          aria-label="Formation stages 01 through 07"
          class="relative mx-auto w-full max-w-[90rem] pt-2 pb-0.5 select-none [@media(max-height:520px)]:pt-1"
        >
          <div class="flex w-full items-end justify-between select-none">
            <button
              v-for="(item, idx) in stages"
              :key="item.number"
              type="button"
              data-resonant-hover
              :aria-current="activeStageIndex === idx ? 'step' : undefined"
              :aria-label="item.unlocked ? `Stage ${item.number}: ${item.title}` : `Stage ${item.number} — Still forming`"
              class="wave-unit group relative -mx-1.5 px-1.5 pt-2 pb-3 text-left cursor-pointer select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue/70 rounded-sm [@media(max-height:520px)]:pb-2"
              :style="{
                '--enter-y': '14px',
                '--stagger-ms': `${FORMATION_CHOREOGRAPHY.railItemStartMs + idx * FORMATION_CHOREOGRAPHY.railItemStaggerMs}ms`,
              }"
              @click="scrollToStage(idx)"
            >
              <span
                v-if="!item.unlocked && attemptedStageIndex === idx"
                :key="`whisper-${attemptKey}`"
                aria-hidden="true"
                class="pointer-events-none absolute bottom-full mb-1.5 flex whitespace-nowrap select-none"
                :class="whisperPositionClass(idx)"
              >
                <span
                  class="still-forming-whisper text-[0.58rem] sm:text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-brand-blue select-none"
                >
                  STILL FORMING.
                </span>
              </span>

              <span class="relative inline-block w-7 sm:w-11 text-xs sm:text-[0.84rem] tabular-nums tracking-[0.06em] select-none">
                <span
                  class="select-none transition-colors duration-300"
                  :class="
                    activeStageIndex === idx
                      ? 'font-semibold text-brand-blue'
                      : item.unlocked
                        ? 'font-medium text-white/75 group-hover:text-white'
                        : 'font-normal text-white/62 group-hover:text-white/85'
                  "
                >
                  {{ item.number }}
                </span>

                <span
                  v-if="attemptedStageIndex === idx"
                  :key="`num-pulse-${attemptKey}`"
                  aria-hidden="true"
                  class="attempt-number-pulse pointer-events-none absolute inset-0 font-semibold text-brand-blue select-none"
                >
                  {{ item.number }}
                </span>
              </span>

              <span
                aria-hidden="true"
                class="pointer-events-none absolute bottom-0 left-1.5 h-[2.5px] w-7 sm:w-11 overflow-hidden"
              >
                <span
                  v-if="item.unlocked"
                  class="active-stage-bar block h-full w-full origin-left bg-brand-blue transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  :class="activeStageIndex === idx ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-35 group-hover:bg-white/35'"
                />

                <span
                  v-if="!item.unlocked && attemptedStageIndex === idx"
                  :key="`bar-pulse-${attemptKey}`"
                  class="attempt-underline block h-full w-full origin-left bg-brand-blue"
                />
              </span>
            </button>
          </div>

          <div
            aria-hidden="true"
            class="rail-hairline h-px w-full origin-left bg-white/18"
          />
        </nav>
      </footer>
    </div>
  </section>
</template>

<style scoped>
/* 1. Default Mobile Browser Runway: Full-screen lvh + 22svh dwell pocket */
.formation-runway {
  height: calc(100lvh + 22svh + (var(--extra-stages, 0) * 100svh));
}

/* 2. Installed Standalone / Full-Screen PWA Condition: Already full screen, light 8svh thumb cushion */
@media (display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui) {
  .formation-runway {
    height: calc(108svh + (var(--extra-stages, 0) * 100svh));
  }
}

.formation-runway[data-scroll-mode='pwa-fullscreen'] {
  height: calc(108svh + (var(--extra-stages, 0) * 100svh));
}

/* 3. Desktop Mouse / Trackpad Condition: Exact 100svh per stage */
@media (min-width: 1024px) and (hover: hover) and (pointer: fine) {
  .formation-runway {
    height: calc(124svh + (var(--extra-stages, 0) * 100svh));
  }
}

.formation-runway[data-scroll-mode='desktop'] {
  height: calc(124svh + (var(--extra-stages, 0) * 100svh));
}

/* Orientation Parity with useConvergentScroll.ts */
.formation-stage-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(12rem, 1fr);
  gap: 0.5rem;
  align-items: start;
}

.formation-copy-col {
  grid-column: 1 / -1;
}

.formation-visual-col {
  grid-column: 1 / -1;
}

@media (min-width: 1024px), (orientation: landscape) and (min-width: 640px) {
  .formation-stage-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    grid-template-rows: minmax(0, 1fr);
    gap: 1.5rem;
    align-items: center;
  }

  .formation-copy-col {
    grid-column: span 5 / span 5;
    align-self: center;
  }

  .formation-visual-col {
    grid-column: span 7 / span 7;
  }
}

/* Staggered In-Place Reveal & Fast Rewind Dissolve */
.wave-unit {
  will-change: transform, opacity;
  transition:
    opacity var(--unit-dur, 780ms) cubic-bezier(0.22, 1, 0.36, 1) var(--stagger-ms, 0ms),
    transform var(--unit-dur, 780ms) cubic-bezier(0.22, 1, 0.36, 1) var(--stagger-ms, 0ms);
}

.is-concealed .wave-unit {
  opacity: 0;
  transform: translate3d(0, var(--enter-y, 18px), 0) scale(var(--enter-scale, 1));
  transition-delay: 0ms !important;
  transition-duration: 0.28s !important;
}

.is-concealed .stage-stagger-unit {
  animation: none !important;
}

.is-revealed .wave-unit {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
}

.rail-hairline {
  will-change: transform, opacity;
  transition:
    transform var(--rail-dur, 920ms) cubic-bezier(0.22, 1, 0.36, 1) var(--rail-delay, 2280ms),
    opacity 560ms cubic-bezier(0.22, 1, 0.36, 1) var(--rail-delay, 2280ms);
}

.is-concealed .rail-hairline {
  opacity: 0;
  transform: scaleX(0);
  transition-delay: 0ms !important;
  transition-duration: 0.25s !important;
}

.is-revealed .rail-hairline {
  opacity: 1;
  transform: scaleX(1);
}

/* Stage Vertical Cross-Fades */
.stage-fade-up-enter-active,
.stage-fade-down-enter-active {
  transition: opacity 1.4s linear;
}

.stage-fade-up-leave-active,
.stage-fade-down-leave-active {
  pointer-events: none;
  transition:
    opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, opacity;
}

.stage-fade-up-leave-to {
  opacity: 0;
  transform: translate3d(0, -22px, 0);
}

.stage-fade-down-leave-to {
  opacity: 0;
  transform: translate3d(0, 22px, 0);
}

.stage-fade-up-enter-active .stage-stagger-unit {
  opacity: 0;
  animation: stageUnitRiseUp 0.68s cubic-bezier(0.22, 1, 0.36, 1) var(--stage-stagger-ms, 0ms) forwards;
}

.stage-fade-down-enter-active .stage-stagger-unit {
  opacity: 0;
  animation: stageUnitRiseDown 0.68s cubic-bezier(0.22, 1, 0.36, 1) var(--stage-stagger-ms, 0ms) forwards;
}

@keyframes stageUnitRiseUp {
  0% {
    opacity: 0;
    transform: translate3d(0, var(--enter-y, 18px), 0) scale(var(--enter-scale, 1));
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes stageUnitRiseDown {
  0% {
    opacity: 0;
    transform: translate3d(0, calc(var(--enter-y, 18px) * -1), 0) scale(var(--enter-scale, 1));
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

.date-fade-up-enter-active,
.date-fade-up-leave-active,
.date-fade-down-enter-active,
.date-fade-down-leave-active {
  transition:
    opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

.date-fade-up-enter-from,
.date-fade-down-leave-to {
  opacity: 0;
  transform: translate3d(0, 10px, 0);
}

.date-fade-up-leave-to,
.date-fade-down-enter-from {
  opacity: 0;
  transform: translate3d(0, -10px, 0);
}

/* Semantic Token Glows */
.eyebrow-resonance {
  text-shadow: 0 0 22px color-mix(in srgb, var(--color-brand-blue) 48%, transparent);
}

.title-char-outer:hover .title-char-harmonic {
  transform: translate3d(0, -5px, 0) scale(1.03);
  text-shadow: 0 0 28px color-mix(in srgb, var(--color-brand-blue) 60%, transparent);
}

.title-char-harmonic {
  will-change: transform;
  animation: charHarmonicWave 3.8s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), text-shadow 0.25s ease;
}

.is-concealed .title-char-harmonic {
  animation-play-state: paused !important;
}

.active-stage-bar {
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-brand-blue) 78%, transparent);
}

.still-forming-whisper {
  text-shadow: 0 0 18px color-mix(in srgb, var(--color-brand-blue) 58%, transparent);
  will-change: transform, opacity;
  animation: whisperFade 1.72s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.attempt-number-pulse {
  text-shadow: 0 0 16px color-mix(in srgb, var(--color-brand-blue) 88%, transparent);
  will-change: opacity;
  animation: numberPulseBlue 0.96s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.attempt-underline {
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-brand-blue) 88%, transparent);
  will-change: transform, opacity;
  animation: attemptReachRetreat 0.94s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes charHarmonicWave {
  0% {
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(0, -3px, 0);
  }
}

@keyframes whisperFade {
  0% {
    opacity: 0;
    transform: translate3d(0, 5px, 0);
  }
  18% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
  72% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
  100% {
    opacity: 0;
    transform: translate3d(0, -2px, 0);
  }
}

@keyframes numberPulseBlue {
  0% {
    opacity: 0;
  }
  24% {
    opacity: 1;
  }
  56% {
    opacity: 0.88;
  }
  100% {
    opacity: 0;
  }
}

@keyframes attemptReachRetreat {
  0% {
    opacity: 0.95;
    transform: scaleX(0);
  }
  32% {
    opacity: 1;
    transform: scaleX(0.28);
  }
  52% {
    opacity: 0.95;
    transform: scaleX(0.28);
  }
  100% {
    opacity: 0;
    transform: scaleX(0);
  }
}

</style>