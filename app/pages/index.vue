<!-- app/pages/index.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import ResonantFlowButton, {
  type ResonantButtonVariant,
  type ResonantButtonFluid,
  type ResonantButtonSize,
  type ResonantButtonArrow,
} from '~/components/ResonantFlowButton.vue'
import BrandstaHeroResonator from '~/components/launch/BrandstaHeroResonator.vue'

interface ButtonSpec {
  id: string
  meta: string
  label: string
  size: ResonantButtonSize
  variant: ResonantButtonVariant
  fluid?: ResonantButtonFluid
  arrow?: ResonantButtonArrow
  href?: string
  cursorClass: string
}

interface CursorSpecimen {
  id: string
  label: string
  cursorClass: string
  badgeTone: string
}

const isHeroLoaderRunning = ref(false)
const lastTriggered = ref<string>('Click any button — only 5 live links active, 13 non-action')

const CURSOR_SPECIMENS: readonly CursorSpecimen[] = [
  {
    id: 'cur-default',
    label: '1 · DEFAULT IDLE',
    cursorClass: 'cursor-default',
    badgeTone: 'border-white/12 bg-white/[0.02] text-white/55',
  },
  {
    id: 'cur-hover-blue',
    label: '2 · HOVERABLE BLUE',
    cursorClass: 'cursor-hoverable cursor-blue',
    badgeTone: 'border-sky-400/30 bg-sky-500/[0.06] text-sky-200/85',
  },
  {
    id: 'cur-hover-gold',
    label: '3 · HOVERABLE GOLD',
    cursorClass: 'cursor-hoverable cursor-gold',
    badgeTone: 'border-amber-400/30 bg-amber-500/[0.06] text-amber-200/85',
  },
  {
    id: 'cur-click-blue',
    label: '4 · CLICKABLE BLUE',
    cursorClass: 'cursor-clickable cursor-blue',
    badgeTone: 'border-blue-500/40 bg-blue-600/[0.10] text-sky-100',
  },
  {
    id: 'cur-click-dual',
    label: '5 · CLICKABLE DUAL (WAVE)',
    cursorClass: 'cursor-clickable cursor-dual',
    badgeTone: 'border-indigo-400/35 bg-indigo-500/[0.09] text-indigo-100',
  },
  {
    id: 'cur-click-gold',
    label: '6 · CLICKABLE SPECIAL GOLD',
    cursorClass: 'cursor-clickable cursor-gold',
    badgeTone: 'border-amber-400/45 bg-amber-500/[0.11] text-amber-100',
  },
]

const BUTTON_GROUPS: { tier: string; size: ResonantButtonSize; items: ButtonSpec[] }[] = [
  {
    tier: 'LARGE · 56PX SHELL / 38PX SOCKETS',
    size: 'lg',
    items: [
      {
        id: 'lg-prim-blue',
        meta: 'LIVE ↓ SCROLL (#BOTTOM-LAB-ANCHOR) · BLUE CURSOR',
        label: 'START YOUR WAVE',
        size: 'lg',
        variant: 'primary',
        href: '#bottom-lab-anchor',
        cursorClass: 'cursor-clickable cursor-blue',
      },
      {
        id: 'lg-astral-gold',
        meta: 'NON-ACTION · SPECIAL GOLD CURSOR · ↗',
        label: 'AMPLIFY YOUR IDENTITY',
        size: 'lg',
        variant: 'astral',
        arrow: 'up-right',
        cursorClass: 'cursor-clickable cursor-gold',
      },
      {
        id: 'lg-sec-blue',
        meta: 'LIVE ↗ EXTERNAL (KODUVAYUR.IN) · BLUE CURSOR',
        label: 'SEE OUR WAVE',
        size: 'lg',
        variant: 'secondary',
        href: 'https://koduvayur.in',
        cursorClass: 'cursor-clickable cursor-blue',
      },
      {
        id: 'lg-sec-gold',
        meta: 'LIVE → NUXTLINK (/FORMATION) · SPECIAL GOLD CURSOR',
        label: 'WITNESS THE FORMATION',
        size: 'lg',
        variant: 'secondary',
        fluid: 'gold',
        href: '/formation',
        cursorClass: 'cursor-clickable cursor-gold',
      },
      {
        id: 'lg-prim-gold',
        meta: 'NON-ACTION · SPECIAL GOLD CURSOR · →',
        label: 'IGNITE',
        size: 'lg',
        variant: 'primary',
        fluid: 'gold',
        arrow: 'right',
        cursorClass: 'cursor-clickable cursor-gold',
      },
      {
        id: 'lg-astral-blue',
        meta: 'NON-ACTION · BLUE OVERRIDE CURSOR · ↑',
        label: 'LAUNCH CUSTOM ARCHITECTURE',
        size: 'lg',
        variant: 'astral',
        fluid: 'blue',
        arrow: 'up',
        cursorClass: 'cursor-clickable cursor-blue',
      },
    ],
  },
  {
    tier: 'MEDIUM · 48PX SHELL / 32PX SOCKETS',
    size: 'md',
    items: [
      {
        id: 'md-prim-blue',
        meta: 'NON-ACTION · BLUE CURSOR · →',
        label: 'EXPLORE ORIGIN',
        size: 'md',
        variant: 'primary',
        arrow: 'right',
        cursorClass: 'cursor-clickable cursor-blue',
      },
      {
        id: 'md-astral-gold',
        meta: 'NON-ACTION · SPECIAL GOLD CURSOR · ↓',
        label: 'BOOK CONCIERGE',
        size: 'md',
        variant: 'astral',
        arrow: 'down',
        cursorClass: 'cursor-clickable cursor-gold',
      },
      {
        id: 'md-sec-blue',
        meta: 'LIVE ↗ EXTERNAL (BRANDSTA.CC) · BLUE CURSOR',
        label: 'BRANDSTA CUSTOM CODE',
        size: 'md',
        variant: 'secondary',
        fluid: 'blue',
        arrow: 'up-right',
        href: 'https://brandsta.cc',
        cursorClass: 'cursor-clickable cursor-blue',
      },
      {
        id: 'md-sec-gold',
        meta: 'NON-ACTION · SPECIAL GOLD CURSOR · ↓',
        label: 'WAVE',
        size: 'md',
        variant: 'secondary',
        fluid: 'gold',
        arrow: 'down',
        cursorClass: 'cursor-clickable cursor-gold',
      },
      {
        id: 'md-prim-gold',
        meta: 'NON-ACTION · SPECIAL GOLD CURSOR · ↗',
        label: 'SIGNATURE SYSTEMS',
        size: 'md',
        variant: 'primary',
        fluid: 'gold',
        arrow: 'up-right',
        cursorClass: 'cursor-clickable cursor-gold',
      },
      {
        id: 'md-astral-blue',
        meta: 'NON-ACTION · BLUE OVERRIDE CURSOR · →',
        label: 'BUILD WHAT’S NEXT',
        size: 'md',
        variant: 'astral',
        fluid: 'blue',
        arrow: 'right',
        cursorClass: 'cursor-clickable cursor-blue',
      },
    ],
  },
  {
    tier: 'SMALL · 40PX SHELL / 26PX SOCKETS',
    size: 'sm',
    items: [
      {
        id: 'sm-prim-blue',
        meta: 'NON-ACTION · BLUE CURSOR · →',
        label: 'PULSE',
        size: 'sm',
        variant: 'primary',
        arrow: 'right',
        cursorClass: 'cursor-clickable cursor-blue',
      },
      {
        id: 'sm-astral-gold',
        meta: 'LIVE ↑ SCROLL (#TOP) · SPECIAL GOLD CURSOR',
        label: 'RETURN TO APEX',
        size: 'sm',
        variant: 'astral',
        href: '#top',
        cursorClass: 'cursor-clickable cursor-gold',
      },
      {
        id: 'sm-sec-blue',
        meta: 'NON-ACTION · BLUE CURSOR · ↓',
        label: 'DIRECT SIGNAL',
        size: 'sm',
        variant: 'secondary',
        arrow: 'down',
        cursorClass: 'cursor-clickable cursor-blue',
      },
      {
        id: 'sm-sec-gold',
        meta: 'NON-ACTION · SPECIAL GOLD CURSOR · ↗',
        label: 'LIVE CASE STUDY',
        size: 'sm',
        variant: 'secondary',
        fluid: 'gold',
        arrow: 'up-right',
        cursorClass: 'cursor-clickable cursor-gold',
      },
      {
        id: 'sm-prim-gold',
        meta: 'NON-ACTION · SPECIAL GOLD CURSOR · ↑',
        label: 'TOP',
        size: 'sm',
        variant: 'primary',
        fluid: 'gold',
        arrow: 'up',
        cursorClass: 'cursor-clickable cursor-gold',
      },
      {
        id: 'sm-astral-blue',
        meta: 'NON-ACTION · BLUE OVERRIDE CURSOR · →',
        label: 'SEVEN STAGES OF FORMATION',
        size: 'sm',
        variant: 'astral',
        fluid: 'blue',
        arrow: 'right',
        cursorClass: 'cursor-clickable cursor-blue',
      },
    ],
  },
]

function onButtonAction(item: ButtonSpec) {
  lastTriggered.value = `Triggered: ${item.id.toUpperCase()} (${item.label})`
}
</script>

<template>
  <main id="top" class="w-full overflow-x-clip bg-brand-void text-white">
    <!-- =========================================================================
         SECTION 1: FLAGSHIP HERO STAGE (ISOLATED 2D -> 3D LOADER & EXACT BERTH)
         Deterministic 3-Row × 12-Col Grid reserving exact future Header, Editorial,
         & Pedestal geometry across phones, foldables, tablets, laptops & ultrawides.
         ========================================================================= -->
    <section
      aria-label="Brandsta Hero Stage"
      class="hero-flagship-section relative w-full"
    >
      <!-- Subtle Obsidian-Sapphire Stage Atmosphere -->
      <div
        aria-hidden="true"
        class="hero-ambient-backdrop pointer-events-none absolute inset-0 z-0"
      />

      <div class="hero-grid-shell relative mx-auto w-full max-w-360">
        <!-- ROW 1: Reserved Header Track (Empty for now) -->
        <div aria-hidden="true" class="hero-header-reserve" />

        <!-- ROW 2: Main 12-Column Hero Stage -->
        <div class="hero-main-stage">
          <!-- Reserved Editorial Slot (Top slot on stacked portrait; Left 7 cols on split landscape/desktop) -->
          <div aria-hidden="true" class="hero-editorial-reserve" />

          <!-- Permanent 3D Resonator Berth (Centered on stacked portrait; Right 5 cols on split landscape/desktop) -->
          <div class="hero-resonator-cell">
            <div class="hero-resonator-sizing">
              <BrandstaHeroResonator
                @loader-state-change="isHeroLoaderRunning = $event"
              />
            </div>
          </div>
        </div>

        <!-- ROW 3: Reserved Centered Pedestal Track (Buttons + Triad + Scroll Cue slot, empty for now) -->
        <div aria-hidden="true" class="hero-pedestal-reserve" />
      </div>
    </section>

    <!-- =========================================================================
         SECTION 2: 18-BUTTON EXTRAVAGANZA LAB + 6-VARIANT CURSOR SPECIMEN BAR
         ========================================================================= -->
    <section
      id="button-extravaganza"
      class="relative z-10 w-full border-t border-white/6 px-5 py-16 sm:px-10 sm:py-24 lg:px-16"
      :class="isHeroLoaderRunning ? 'pointer-events-none' : ''"
    >
      <div class="mx-auto flex w-full max-w-336 flex-col gap-16">
        <div class="flex flex-col items-center gap-6 text-center select-none">
          <div class="pointer-events-none flex flex-col items-center gap-2">
            <span class="text-[0.68rem] font-semibold tracking-[0.3em] text-white/45 uppercase">
              RESONANT FLOW BUTTON · 18-VARIANT EXTRAVAGANZA
            </span>
            <span class="text-xs font-normal tracking-[0.06em] text-white/65">
              {{ lastTriggered }}
            </span>
          </div>

          <!-- Live 6-Variant Kinetic Cursor Test Strip (Hover & Click Each Pill) -->
          <div class="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <div
              v-for="spec in CURSOR_SPECIMENS"
              :key="spec.id"
              :class="[spec.cursorClass, spec.badgeTone]"
              class="rounded-full border px-4 py-2 text-[0.6rem] font-medium tracking-[0.2em] uppercase transition-colors duration-200 lg:cursor-none"
              @click="lastTriggered = `Cursor Specimen Tested: ${spec.label}`"
            >
              {{ spec.label }}
            </div>
          </div>
        </div>

        <div
          v-for="group in BUTTON_GROUPS"
          :key="group.size"
          class="flex flex-col items-center gap-8"
        >
          <h2 class="cursor-hoverable cursor-blue rounded-full px-4 py-1 text-[0.65rem] font-medium tracking-[0.28em] text-white/38 uppercase select-none lg:cursor-none">
            {{ group.tier }}
          </h2>

          <div class="grid w-full grid-cols-1 place-items-center gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="item in group.items"
              :key="item.id"
              class="flex flex-col items-center gap-2.5"
            >
              <ResonantFlowButton
                :label="item.label"
                :size="item.size"
                :variant="item.variant"
                :fluid="item.fluid"
                :arrow="item.arrow"
                :href="item.href"
                :class="item.cursorClass"
                @action="onButtonAction(item)"
              />
              <span class="pointer-events-none text-[0.58rem] tracking-[0.18em] text-white/36 uppercase select-none">
                {{ item.meta }}
              </span>
            </div>
          </div>
        </div>

        <div
          id="bottom-lab-anchor"
          class="mt-20 flex flex-col items-center gap-4 border-t border-white/10 pt-12 pb-8"
        >
          <span class="cursor-hoverable cursor-gold rounded-full px-4 py-1 text-[0.62rem] tracking-[0.26em] text-white/40 uppercase select-none lg:cursor-none">
            HASH SCROLL ARRIVAL ANCHOR
          </span>
          <ResonantFlowButton
            label="GLIDE BACK TO TOP"
            variant="secondary"
            fluid="gold"
            size="md"
            href="#top"
            class="cursor-clickable cursor-gold"
          />
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* =========================================================================
   HERO STAGE MULTI-DEVICE ARCHITECTURE
   Base (< 360px): Ultra-compact phones & folded outer cover displays
   ========================================================================= */
.hero-flagship-section {
  --hero-min-h: max(100svh, 600px);
  --hero-pad-x: 1.25rem;
  --hero-header-h: 3.5rem;
  --hero-pedestal-h: 8.75rem;
  --hero-editorial-h: minmax(6.75rem, 20svh);
  --hero-resonator-w: clamp(9.25rem, 46vw, 10.875rem);
  --hero-desktop-logo-scale: 1;

  min-height: var(--hero-min-h);
  background-color: #040a1a;
}

.hero-ambient-backdrop {
  background:
    radial-gradient(ellipse 68% 54% at 50% 52%, rgba(0, 56, 184, 0.12) 0%, transparent 72%),
    linear-gradient(180deg, #040a1a 0%, #050d21 64%, #040a1a 100%);
}

.hero-grid-shell {
  display: grid;
  grid-template-rows: var(--hero-header-h) minmax(0, 1fr) var(--hero-pedestal-h);
  min-height: var(--hero-min-h);
  padding-inline: var(--hero-pad-x);
}

/* Stacked Centered Portrait Default (< 1024px) */
.hero-main-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: var(--hero-editorial-h) minmax(0, 1fr);
  align-items: center;
  justify-items: center;
  gap: 0.75rem;
  width: 100%;
}

.hero-editorial-reserve {
  width: 100%;
  height: 100%;
}

.hero-resonator-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.hero-resonator-sizing {
  width: calc(var(--hero-resonator-w) * var(--hero-desktop-logo-scale, 1));
  overflow: visible;
}

/* 2xs (360px+): Standard modern Android & iPhone portrait */
@media (min-width: 360px) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 640px);
    --hero-pad-x: 1.5rem;
    --hero-header-h: 4rem;
    --hero-pedestal-h: 9.75rem;
    --hero-editorial-h: minmax(8rem, 22svh);
    --hero-resonator-w: clamp(10.75rem, 45vw, 13rem);
  }
}

/* xs (480px+): Large phones & narrow split-screen windows */
@media (min-width: 480px) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 680px);
    --hero-pad-x: 2rem;
    --hero-header-h: 4.25rem;
    --hero-pedestal-h: 10.25rem;
    --hero-editorial-h: minmax(9rem, 23svh);
    --hero-resonator-w: clamp(12.5rem, 40vw, 14.75rem);
  }
}

/* sm (640px+): Small portrait tablets */
@media (min-width: 640px) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 740px);
    --hero-pad-x: 2.5rem;
    --hero-header-h: 4.5rem;
    --hero-pedestal-h: 10.75rem;
    --hero-editorial-h: minmax(10.25rem, 24svh);
    --hero-resonator-w: clamp(14.25rem, 35vw, 16.75rem);
  }
}

/* md (768px+): iPad & portrait tablets */
@media (min-width: 768px) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 800px);
    --hero-pad-x: 3.25rem;
    --hero-header-h: 4.75rem;
    --hero-pedestal-h: 11.25rem;
    --hero-editorial-h: minmax(11.5rem, 24svh);
    --hero-resonator-w: clamp(15.75rem, 33vw, 18.5rem);
  }
}

/* UNFOLDED FOLDABLE PORTRAIT-SQUARE (600px–1023px, aspect 4/5 to 10/11):
   Prevents oversized vertical bloat on nearly-square inner foldable glass */
@media (min-width: 600px) and (max-width: 1023px) and (min-aspect-ratio: 4/5) and (max-aspect-ratio: 10/11) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 680px);
    --hero-header-h: 4rem;
    --hero-pedestal-h: 9.25rem;
    --hero-editorial-h: minmax(8.25rem, 19svh);
    --hero-resonator-w: clamp(12.5rem, min(32vw, 30svh), 15.5rem);
  }
}

/* UNFOLDED FOLDABLE SQUARE-TO-WIDE (660px–1023px, aspect >= 10/11 — Z Fold, Pixel Fold, Open):
   Pivots into the 12-Col Left-Right Split so wide square glass breathes effortlessly */
@media (min-width: 660px) and (max-width: 1023px) and (min-aspect-ratio: 10/11) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 640px);
    --hero-pad-x: 2.25rem;
    --hero-header-h: 4rem;
    --hero-pedestal-h: 8.75rem;
    --hero-resonator-w: clamp(12.75rem, min(30vw, 37svh), 16.75rem);
  }

  .hero-main-stage {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    grid-template-rows: minmax(0, 1fr);
    gap: 1.5rem;
  }

  .hero-editorial-reserve {
    grid-column: span 7 / span 7;
  }

  .hero-resonator-cell {
    grid-column: span 5 / span 5;
  }
}

/* COMPACT ROTATED MOBILE LANDSCAPE (max-height: 540px):
   Clean horizontal split so rotated phones fit without clipping */
@media (max-width: 1023px) and (max-height: 540px) and (orientation: landscape) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 480px);
    --hero-pad-x: 2rem;
    --hero-header-h: 3rem;
    --hero-pedestal-h: 6.25rem;
    --hero-resonator-w: clamp(9.25rem, 34svh, 12.25rem);
  }

  .hero-main-stage {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    grid-template-rows: minmax(0, 1fr);
    gap: 1.25rem;
  }

  .hero-editorial-reserve {
    grid-column: span 7 / span 7;
  }

  .hero-resonator-cell {
    grid-column: span 5 / span 5;
  }
}

/* lg (1024px+): Laptops & Landscape Tablets -> Monument-Scaled 12-Column Asymmetric Split */
@media (min-width: 1024px) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 720px);
    --hero-pad-x: 3.75rem;
    --hero-header-h: 4.75rem;
    --hero-pedestal-h: 10.5rem;
    --hero-desktop-logo-scale: 1;
    --hero-resonator-w: clamp(19.5rem, min(33.5vw, 52svh), 25.5rem);
  }

  .hero-ambient-backdrop {
    background:
      radial-gradient(ellipse 48% 60% at 74% 48%, rgba(0, 64, 212, 0.16) 0%, transparent 74%),
      linear-gradient(180deg, #040a1a 0%, #050d21 64%, #040a1a 100%);
  }

  .hero-main-stage {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    grid-template-rows: minmax(0, 1fr);
    gap: 2.25rem;
  }

  .hero-editorial-reserve {
    grid-column: span 7 / span 7;
  }

  .hero-resonator-cell {
    grid-column: span 5 / span 5;
  }
}

/* xl (1280px+): Standard Desktops */
@media (min-width: 1280px) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 760px);
    --hero-pad-x: 4.5rem;
    --hero-header-h: 5rem;
    --hero-pedestal-h: 11rem;
    --hero-resonator-w: clamp(22.5rem, min(33vw, 55svh), 29.5rem);
  }

  .hero-main-stage {
    gap: 3rem;
  }
}

/* SHORT-HEIGHT DESKTOP / WINDOWS LAPTOP GUARD (e.g., 1366x768 or 1536x864 @ 125% scale) */
@media (min-width: 1024px) and (max-height: 760px) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 660px);
    --hero-header-h: 4rem;
    --hero-pedestal-h: 8.75rem;
    --hero-resonator-w: clamp(17.5rem, min(31vw, 49svh), 24rem);
  }
}

/* 2xl & Ultrawides (1536px+) */
@media (min-width: 1536px) {
  .hero-flagship-section {
    --hero-min-h: max(100svh, 820px);
    --hero-pad-x: 5rem;
    --hero-header-h: 5.25rem;
    --hero-pedestal-h: 11.5rem;
    --hero-resonator-w: clamp(25.5rem, min(31vw, 56svh), 32rem);
  }

  .hero-main-stage {
    gap: 3.5rem;
  }
}
</style>