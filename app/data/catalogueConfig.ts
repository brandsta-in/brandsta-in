// app/data/catalogueConfig.ts

export interface CatalogueSlide {
  id: string
  indexLabel: string
  title: string
  src: string
  alt: string
  width: number
  height: number
}

// Flip 'jpg' -> 'webp' once your 800x800 .webp exports are placed in /public/images/catalogue/
export const CATALOGUE_IMAGE_EXT: 'jpg' | 'webp' = 'webp'

const slidePath = (slug: string) =>
  `/images/catalogue/${slug}.${CATALOGUE_IMAGE_EXT}`

export const CATALOGUE_PHYSICS = {
  // Frame-rate-independent critically-damped spring (liquid 120fps, zero overshoot)
  springStiffness: 195,
  springDamping: 27,
  tuckLerpRate: 14,
  restPositionEpsilon: 0.0006,
  restVelocityEpsilon: 0.002,

  // Slider drag & momentum flick tuning
  dragThresholdPx: 7,
  dragUnitRatio: 0.68,
  velocityProjectionSec: 0.2,
  maxFlickStepSlides: 3,

  // Horizontal trackpad / wheel lock
  wheelThresholdPx: 16,
  wheelCooldownMs: 320,

  // Unbounded Full-Bleed Lightbox (FestivalLightbox physics)
  minZoomScale: 1,
  doubleTapZoomScale: 2.4,
  maxZoomScale: 3.6,
  zoomTransitionMs: 280,
  doubleTapDelayMs: 300,
  doubleTapMaxDistPx: 36,
  swipeDistanceThresholdPx: 54,
  swipeVelocityThresholdPxPerMs: 0.38,
  verticalDismissThresholdPx: 105,
  rubberBandEdgeFactor: 0.28,
} as const

export const CATALOGUE_CHOREOGRAPHY = {
  observerThreshold: 0.15,
  observerRootMargin: '0px 0px -8% 0px',

  eyebrowDelayMs: 60,
  eyebrowDurationMs: 640,

  headingLine1DelayMs: 140,
  headingLine2DelayMs: 250,
  headingCharStaggerMs: 26,
  headingDurationMs: 680,

  linesBaseDelayMs: 390,
  linesStepMs: 90,
  linesWordStaggerMs: 32,
  linesDurationMs: 620,

  deckStageDelayMs: 180,
  deckStageDurationMs: 760,

  controlsDelayMs: 380,
  controlsDurationMs: 680,
} as const

export const CATALOGUE_CONTENT = {
  sectionId: 'brandsta-catalogue',
  eyebrow: 'THE BRANDSTA CATALOGUE',

  heading: {
    ariaLabel: 'Our wavelength.',
    line1White: 'Our',
    line2BlueSerif: 'wavelength.',
  },

  sublines: [
    'Who we amplify.',
    'What we create.',
    'How we make waves.',
  ] as const,

  fullscreenLabel: 'Full screen',

  slides: [
    {
      id: 'cover',
      indexLabel: '01',
      title: 'Brandsta Interactive',
      src: slidePath('cover'),
      alt: 'Brandsta Interactive — The Brandsta Catalogue Cover',
      width: 800,
      height: 800,
    },
    {
      id: 'who',
      indexLabel: '02',
      title: 'Who We Amplify',
      src: slidePath('who'),
      alt: 'Who We Amplify — Businesses, Creators, Places, Artists, Professionals, Events & Ideas',
      width: 800,
      height: 800,
    },
    {
      id: 'signature',
      indexLabel: '03',
      title: 'Signature Branding',
      src: slidePath('signature'),
      alt: 'Signature Branding — Brandsta Catalogue',
      width: 800,
      height: 800,
    },
    {
      id: 'evolution',
      indexLabel: '04',
      title: 'Identity Evolution',
      src: slidePath('evolution'),
      alt: 'Identity Evolution — Brandsta Catalogue',
      width: 800,
      height: 800,
    },
    {
      id: 'identity',
      indexLabel: '05',
      title: 'Digital Identity',
      src: slidePath('identity'),
      alt: 'Digital Identity — Brandsta Catalogue',
      width: 800,
      height: 800,
    },
    {
      id: 'experience',
      indexLabel: '06',
      title: 'Digital Experiences',
      src: slidePath('experience'),
      alt: 'Digital Experiences — Brandsta Catalogue',
      width: 800,
      height: 800,
    },
    {
      id: 'presence',
      indexLabel: '07',
      title: 'Digital Presence',
      src: slidePath('presence'),
      alt: 'Digital Presence — Brandsta Catalogue',
      width: 800,
      height: 800,
    },
    {
      id: 'growth',
      indexLabel: '08',
      title: 'Digital Growth',
      src: slidePath('growth'),
      alt: 'Digital Growth — Brandsta Catalogue',
      width: 800,
      height: 800,
    },
    {
      id: 'custom',
      indexLabel: '09',
      title: 'Custom Code',
      src: slidePath('custom'),
      alt: 'Custom Code — Brandsta Catalogue',
      width: 800,
      height: 800,
    },
    {
      id: 'dreams',
      indexLabel: '10',
      title: 'Dreams Amplified',
      src: slidePath('dreams'),
      alt: 'Dreams Amplified — Brandsta Catalogue',
      width: 800,
      height: 800,
    },
  ] satisfies readonly CatalogueSlide[],
} as const