<!-- app/components/launch/BrandstaHeroEditorial.vue -->
<script setup lang="ts">
import {
  HERO_EDITORIAL_CONTENT,
  HERO_STAGE_CHOREOGRAPHY,
} from '~/data/heroEditorialConfig'

defineProps<{
  active: boolean
}>()
</script>

<template>
  <div class="hero-editorial-stack flex w-full flex-col select-none">
    <!-- BEAT 2: Primary Semantic H1 (SIGNATURE = White, BRANDING. = Crisp Sapphire, AMPLIFIED. = Gold) -->
    <div class="hero-kicker-row flex items-center gap-2.5">
      <span
        v-reveal-stage="{
          active,
          delay: HERO_STAGE_CHOREOGRAPHY.kickerDelayMs,
          duration: 480,
          rise: '6px',
          scale: 0.7,
        }"
        aria-hidden="true"
        class="kicker-signal-dot relative h-2 w-2 shrink-0 rounded-full"
      />

      <h1
        id="hero-main-heading"
        v-reveal-chars="{
          active,
          delay: HERO_STAGE_CHOREOGRAPHY.kickerDelayMs,
          stagger: HERO_STAGE_CHOREOGRAPHY.kickerStaggerMs,
          duration: HERO_STAGE_CHOREOGRAPHY.kickerDurationMs,
          rise: '0.52em',
        }"
        class="cursor-hoverable cursor-blue brand-kicker hero-kicker-text m-0 lg:cursor-none"
      >
        <span data-reveal-content>
          <span data-char-color="#ffffff">{{ HERO_EDITORIAL_CONTENT.kickerWhite }}</span>{{ ' ' }}<span data-char-color="#2982ff">{{ HERO_EDITORIAL_CONTENT.kickerBlue }}</span>{{ ' ' }}<span data-char-color="#fbbf24">{{ HERO_EDITORIAL_CONTENT.kickerGold }}</span>
        </span>
      </h1>
    </div>

    <!-- BEAT 3: Strictly Two-Line Display H2 (Line 1 Left-to-Right -> Line 2 Left-to-Right) -->
    <h2
      :aria-label="HERO_EDITORIAL_CONTENT.headlineAriaLabel"
      class="hero-display-h1 font-semibold tracking-[-0.032em] text-white"
    >
      <!-- Line 1: Let’s make waves -->
      <span
        v-reveal-chars="{
          active,
          delay: HERO_STAGE_CHOREOGRAPHY.headlineLine1DelayMs,
          stagger: HERO_STAGE_CHOREOGRAPHY.headlineStaggerMs,
          duration: HERO_STAGE_CHOREOGRAPHY.headlineDurationMs,
          rise: '0.46em',
        }"
        class="hero-h1-line block whitespace-nowrap"
      >
        <span data-reveal-content>
          <span class="text-white">{{ HERO_EDITORIAL_CONTENT.line1Lead }}</span>{{ ' ' }}<em data-char-gradient="gold" class="brand-accent-serif hero-accent-em font-normal tracking-[-0.01em]">{{ HERO_EDITORIAL_CONTENT.line1GoldAccent }}</em>
        </span>
      </span>

      <!-- Line 2: with your dreams. -->
      <span
        v-reveal-chars="{
          active,
          delay: HERO_STAGE_CHOREOGRAPHY.headlineLine2DelayMs,
          stagger: HERO_STAGE_CHOREOGRAPHY.headlineStaggerMs,
          duration: HERO_STAGE_CHOREOGRAPHY.headlineDurationMs,
          rise: '0.46em',
        }"
        class="hero-h1-line block whitespace-nowrap"
      >
        <span data-reveal-content>
          <span class="text-white">{{ HERO_EDITORIAL_CONTENT.line2Bridge }}</span>{{ ' ' }}<em data-char-gradient="blue" class="brand-accent-serif hero-accent-em font-normal tracking-[-0.01em]">{{ HERO_EDITORIAL_CONTENT.line2BlueAccent }}</em>
        </span>
      </span>
    </h2>

    <!-- BEAT 4: Single <p> Holding Both Regular Non-Italic Spans in Matching Color -->
    <p class="hero-subtitle-line font-normal not-italic text-white/84">
      <span
        v-reveal-words="{
          active,
          delay: HERO_STAGE_CHOREOGRAPHY.leadSentenceDelayMs,
          stagger: HERO_STAGE_CHOREOGRAPHY.sentenceWordStaggerMs,
          duration: HERO_STAGE_CHOREOGRAPHY.sentenceDurationMs,
          rise: '0.5em',
        }"
        class="font-normal not-italic text-white/84"
      >
        <span data-reveal-content>{{ HERO_EDITORIAL_CONTENT.leadSentence }}</span>
      </span>
      <br class="sm:hidden" />
      <span class="hidden sm:inline">{{ ' ' }}</span>
      <span
        v-reveal-words="{
          active,
          delay: HERO_STAGE_CHOREOGRAPHY.italicSentenceDelayMs,
          stagger: HERO_STAGE_CHOREOGRAPHY.sentenceWordStaggerMs,
          duration: HERO_STAGE_CHOREOGRAPHY.sentenceDurationMs,
          rise: '0.5em',
        }"
        class="font-normal not-italic text-white/84"
      >
        <span data-reveal-content>{{ HERO_EDITORIAL_CONTENT.italicSentence }}</span>
      </span>
    </p>
  </div>
</template>

<style scoped>
/* =========================================================================
   BESPOKE MULTI-VIEWPORT EDITORIAL TYPOGRAPHY
   Vertical Portrait Default (< 1024px): Centered text & hidden blue dot
   ========================================================================= */
.hero-editorial-stack {
  --ed-kicker-size: 0.58rem;
  --ed-kicker-track: 0.22em;
  --ed-h1-size: clamp(1.68rem, 7.6vw, 1.92rem);
  --ed-h1-mt: 0.65rem;
  --ed-accent-scale: 1.16em;
  --ed-sub-size: 0.88rem;
  --ed-sub-mt: 0.9rem;

  align-items: center;
  text-align: center;
}

/* Blue dot hidden whenever layout is centered (vertical Resonator mode) */
.kicker-signal-dot {
  display: none;
  background: radial-gradient(circle, #93d5ff 0%, #1e6bff 62%, #0048ff 100%);
  box-shadow: 0 0 12px rgba(30, 107, 255, 0.85);
}

.hero-kicker-row {
  justify-content: center;
}

/* Trims descender box so the 8px blue dot locks dead-center to uppercase cap height across all DPIs */
.hero-kicker-text {
  display: inline-flex;
  align-items: center;
  font-size: var(--ed-kicker-size);
  letter-spacing: var(--ed-kicker-track);
  line-height: 1;
  font-kerning: normal;
  text-box-trim: trim-both;
  text-box-edge: cap alphabetic;
}

@supports not (text-box-trim: trim-both) {
  .hero-kicker-text {
    transform: translateY(0.045em);
  }
}

.hero-display-h1 {
  margin-top: var(--ed-h1-mt);
  font-size: var(--ed-h1-size);
  line-height: 1.09;
}

.hero-h1-line + .hero-h1-line {
  margin-top: 0.04em;
}

/* Scaled-up luxury Playfair Display Italic for "waves" and "dreams." */
.hero-accent-em {
  font-size: var(--ed-accent-scale);
  line-height: 0.96;
}

.hero-subtitle-line {
  margin-top: var(--ed-sub-mt);
  font-size: var(--ed-sub-size);
  line-height: 1.58;
  letter-spacing: 0.005em;
}

/* 2xs (360px+): Modern Android & iPhone portrait */
@media (min-width: 360px) {
  .hero-editorial-stack {
    --ed-kicker-size: 0.62rem;
    --ed-kicker-track: 0.25em;
    --ed-h1-size: clamp(1.92rem, 8vw, 2.32rem);
    --ed-h1-mt: 0.75rem;
    --ed-sub-size: 0.92rem;
    --ed-sub-mt: 1rem;
  }
}

/* xs (480px+): Large phones & phablets */
@media (min-width: 480px) {
  .hero-editorial-stack {
    --ed-kicker-size: 0.66rem;
    --ed-kicker-track: 0.27em;
    --ed-h1-size: clamp(2.25rem, 7vw, 2.75rem);
    --ed-sub-size: 0.97rem;
    --ed-sub-mt: 1.1rem;
  }
}

/* sm (640px+): Small portrait tablets */
@media (min-width: 640px) {
  .hero-editorial-stack {
    --ed-kicker-size: 0.69rem;
    --ed-kicker-track: 0.28em;
    --ed-h1-size: clamp(2.65rem, 6.2vw, 3.15rem);
    --ed-h1-mt: 0.85rem;
    --ed-sub-size: 1.02rem;
    --ed-sub-mt: 1.25rem;
  }
}

/* md (768px+): iPad & portrait tablets */
@media (min-width: 768px) {
  .hero-editorial-stack {
    --ed-kicker-size: 0.72rem;
    --ed-h1-size: clamp(3.25rem, 6.4vw, 4.45rem);
    --ed-sub-size: 1.06rem;
    --ed-sub-mt: 1.35rem;
  }
}

/* UNFOLDED FOLDABLE SQUARE-TO-WIDE (660px–1023px, aspect >= 10/11) -> Left-Aligned + Blue Dot */
@media (min-width: 660px) and (max-width: 1023px) and (min-aspect-ratio: 10/11) {
  .hero-editorial-stack {
    --ed-kicker-size: 0.64rem;
    --ed-h1-size: clamp(2.05rem, 3.8vw, 2.65rem);
    --ed-sub-size: 0.92rem;
    --ed-sub-mt: 1rem;
    align-items: flex-start;
    text-align: left;
  }

  .hero-kicker-row {
    justify-content: flex-start;
  }

  .kicker-signal-dot {
    display: inline-flex;
  }
}

/* COMPACT ROTATED MOBILE LANDSCAPE (max-height: 540px) -> Left-Aligned + Blue Dot */
@media (max-width: 1023px) and (max-height: 540px) and (orientation: landscape) {
  .hero-editorial-stack {
    --ed-kicker-size: 0.56rem;
    --ed-h1-size: clamp(1.6rem, 3.6vw, 2.05rem);
    --ed-h1-mt: 0.45rem;
    --ed-sub-size: 0.82rem;
    --ed-sub-mt: 0.55rem;
    align-items: flex-start;
    text-align: left;
  }

  .hero-kicker-row {
    justify-content: flex-start;
  }

  .kicker-signal-dot {
    display: inline-flex;
  }
}

/* LARGE PORTRAIT TABLETS & VERTICAL DISPLAYS (1024px+ Portrait — iPad Pro 13, 1280px+ Portrait):
   Stays centered without blue dot and caps H2 scale so tall portrait glass never looks gigantic */
@media (min-width: 1024px) and (orientation: portrait) {
  .hero-editorial-stack {
    --ed-kicker-size: 0.74rem;
    --ed-kicker-track: 0.28em;
    --ed-h1-size: clamp(3.35rem, min(5.8vw, 4.6svh), 4.25rem);
    --ed-h1-mt: 0.9rem;
    --ed-accent-scale: 1.17em;
    --ed-sub-size: 1.08rem;
    --ed-sub-mt: 1.4rem;
  }
}

/* lg (1024px+ Landscape): Laptops & Landscape Split -> Left-Aligned + Blue Dot */
@media (min-width: 1024px) and (orientation: landscape) {
  .hero-editorial-stack {
    --ed-kicker-size: 0.74rem;
    --ed-kicker-track: 0.28em;
    --ed-h1-size: clamp(2.75rem, 3.8vw, 3.35rem);
    --ed-h1-mt: 0.95rem;
    --ed-accent-scale: 1.17em;
    --ed-sub-size: 1.04rem;
    --ed-sub-mt: 1.35rem;
    align-items: flex-start;
    text-align: left;
  }

  .hero-kicker-row {
    justify-content: flex-start;
  }

  .kicker-signal-dot {
    display: inline-flex;
  }
}

/* xl (1280px+ Landscape): Standard Desktops */
@media (min-width: 1280px) and (orientation: landscape) {
  .hero-editorial-stack {
    --ed-kicker-size: 0.78rem;
    --ed-h1-size: clamp(3.85rem, 4.5vw, 4.8rem);
    --ed-accent-scale: 1.18em;
    --ed-sub-size: 1.1rem;
    --ed-sub-mt: 1.5rem;
  }
}

/* SHORT-HEIGHT DESKTOP / WINDOWS LAPTOP GUARD (e.g., 1366x768 or 1536x864 @ 125%) */
@media (min-width: 1024px) and (max-height: 760px) and (orientation: landscape) {
  .hero-editorial-stack {
    --ed-kicker-size: 0.7rem;
    --ed-h1-size: clamp(3.25rem, 3.8vw, 4.15rem);
    --ed-h1-mt: 0.65rem;
    --ed-sub-size: 0.96rem;
    --ed-sub-mt: 0.95rem;
  }
}

/* 2xl (1536px Landscape): Eyebrow boost on 2XL displays */
@media (min-width: 1536px) and (orientation: landscape) {
  .hero-editorial-stack {
    --ed-kicker-size: 0.85rem;
    --ed-kicker-track: 0.3em;
  }
}

/* > 1536px Landscape (1600px, 1920px Full HD, 2560px Ultrawides) */
@media (min-width: 1537px) and (orientation: landscape) {
  .hero-editorial-stack {
    --ed-kicker-size: 0.88rem;
    --ed-kicker-track: 0.3em;
    --ed-h1-size: clamp(4.5rem, 4.8vw, 5.6rem);
    --ed-h1-mt: 1.05rem;
    --ed-accent-scale: 1.18em;
    --ed-sub-size: 1.15rem;
    --ed-sub-mt: 1.65rem;
  }
}
</style>