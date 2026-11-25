// app/data/makingWavesConfig.ts
import type {
  ResonantButtonFluid,
  ResonantButtonSize,
  ResonantButtonVariant,
} from '~/components/ResonantFlowButton.vue'

export interface ClienteleItem {
  id: string
  name: string
  src: string
  alt: string
  width: number
  height: number
}

export const MAKING_WAVES_CHOREOGRAPHY = {
  observerThreshold: 0.16,
  observerRootMargin: '0px 0px -8% 0px',

  // Zone 1: "Now making waves."
  headerDelayMs: 60,
  headerCharStaggerMs: 26,
  headerDurationMs: 680,

  // Zone 2: Koduvayur Ratholsavam Spotlight Card
  cardStageDelayMs: 110,
  cardStageDurationMs: 780,
  cardTitleLine1DelayMs: 230,
  cardTitleLine2DelayMs: 350,
  cardTitleCharStaggerMs: 22,
  cardTitleDurationMs: 640,
  cardCtaDelayMs: 490,
  cardCtaDurationMs: 700,

  // Zone 3: "Our clientele." + 4 Marks
  clienteleHeaderDelayMs: 110,
  clienteleCharStaggerMs: 28,
  clienteleHeaderDurationMs: 680,
  clienteleItemBaseDelayMs: 250,
  clienteleItemStepMs: 95,
  clienteleItemDurationMs: 700,

  // Zone 4: "Different dreams. Distinct identities." + Subline
  quoteClause1DelayMs: 80,
  quoteClause2DelayMs: 320,
  quoteCharStaggerMs: 24,
  quoteDisplayDurationMs: 660,
  quoteBodyDelayMs: 560,
  quoteWordStaggerMs: 34,
  quoteBodyDurationMs: 640,
} as const

export const MAKING_WAVES_CONTENT = {
  sectionId: 'making-waves',

  heading: {
    ariaLabel: 'Now making waves.',
    leadWhite: 'Now making',
    accentGoldSerif: 'waves.',
  },

  spotlight: {
    titleLine1: 'Koduvayur',
    titleLine2: 'Ratholsavam',
    fullTitle: 'Koduvayur Ratholsavam',
    imageSrc: '/images/waves/rad26.webp',
    imageAlt: 'Koduvayur Ratholsavam digital festival experience by Brandsta',
    imageWidth: 1200,
    imageHeight: 630,
    href: 'https://koduvayur.in',
    cta: {
      label: 'EXPLORE',
      size: 'md' as ResonantButtonSize,
      variant: 'secondary' as ResonantButtonVariant,
      fluid: 'gold' as ResonantButtonFluid,
      cursorClass: 'cursor-clickable cursor-gold',
    },
  },

  clienteleHeading: {
    ariaLabel: 'Our clientele.',
    leadWhite: 'Our',
    accentBlueSerif: 'clientele.',
  },

  // Exact intrinsic pixel dimensions from /public/images/waves/*.webp
  clientele: [
    {
      id: 'ksp',
      name: 'KSP Iyyer Special',
      src: '/images/waves/ksp.webp',
      alt: 'KSP Iyyer Special',
      width: 180,
      height: 180,
    },
    {
      id: 'moksha',
      name: 'Moksha Stories',
      src: '/images/waves/moksha.webp',
      alt: 'Moksha Stories',
      width: 180,
      height: 250,
    },
    {
      id: 'sreejith',
      name: 'Sreejith — Weaving Stories',
      src: '/images/waves/sreejith.webp',
      alt: 'Sreejith Weaving Stories',
      width: 180,
      height: 181,
    },
    {
      id: 'caps',
      name: 'Hotel CAPS',
      src: '/images/waves/caps.webp',
      alt: 'Hotel CAPS',
      width: 180,
      height: 278,
    },
  ] satisfies readonly ClienteleItem[],

  closingQuote: {
    ariaLabel: 'Different dreams. Distinct identities.',
    clause1White: 'Different',
    clause1BlueSerif: 'dreams.',
    clause2White: 'Distinct',
    clause2GoldSerif: 'identities.',
    subline:
      'Every identity has its own story. Our work begins by understanding what makes it different.',
  },
} as const