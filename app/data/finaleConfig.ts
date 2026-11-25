// app/data/finaleConfig.ts
import type {
  ResonantButtonFluid,
  ResonantButtonSize,
  ResonantButtonVariant,
} from '~/components/ResonantFlowButton.vue'

export interface FooterPillar {
  id: string
  verb: string
  phrase: string
  tone: 'gold' | 'blue'
}

export const FINALE_CHOREOGRAPHY = {
  observerThreshold: 0.15,
  observerRootMargin: '0px 0px -8% 0px',

  // Zone 1: Custom Code
  eyebrowDelayMs: 60,
  eyebrowDurationMs: 620,
  ccHeadingLine1DelayMs: 140,
  ccHeadingLine2DelayMs: 250,
  ccHeadingCharStaggerMs: 26,
  ccHeadingDurationMs: 680,
  ccBodyDelayMs: 390,
  ccBodyWordStaggerMs: 28,
  ccBodyDurationMs: 620,
  ccTriadDelayMs: 530,
  ccTriadDurationMs: 640,
  ccCtaDelayMs: 650,
  ccCtaDurationMs: 700,

  // Zone 2: "This is just the beginning. / More waves coming soon." + "Start a conversation." + 4 Cards
  horizonLine1DelayMs: 90,
  horizonLine2DelayMs: 250,
  horizonCharStaggerMs: 22,
  horizonLineDurationMs: 640,
  connectHeaderDelayMs: 430,
  connectCharStaggerMs: 26,
  connectHeaderDurationMs: 680,
  contactCardBaseDelayMs: 570,
  contactCardStepMs: 85,
  contactCardDurationMs: 680,

  // Zone 3: Footer Pillars + Copyright
  footerPillarBaseDelayMs: 80,
  footerPillarStepMs: 75,
  footerPillarDurationMs: 600,
  footerCopyrightDelayMs: 410,
  footerCopyrightDurationMs: 620,
} as const

export const FINALE_CONTENT = {
  customCode: {
    sectionId: 'custom-code',
    eyebrow: 'BUILT AROUND YOU',
    headingAriaLabel: 'Built with custom code.',
    leadWhite: 'Built with',
    accentBlueSerif: 'custom code.',
    description:
      'Purpose-built digital tools and systems, shaped around the way your business actually works — from one focused utility to your entire workflow.',
    triad: ['YOUR PURPOSE', 'YOUR WORKFLOW', 'YOUR SYSTEM'] as const,
    cta: {
      label: 'EXPLORE CUSTOM CODE',
      href: 'https://brandsta.cc',
      size: 'lg' as ResonantButtonSize,
      variant: 'primary' as ResonantButtonVariant,
      fluid: 'blue' as ResonantButtonFluid,
      cursorClass: 'cursor-clickable cursor-blue',
    },
  },

  connect: {
    horizonAriaLabel: 'This is just the beginning. More waves coming soon.',
    headingAriaLabel: 'Start a conversation.',
    leadWhite: 'Start a',
    accentGoldSerif: 'conversation.',
  },

  footer: {
    pillars: [
      {
        id: 'emerge',
        verb: 'EMERGE:',
        phrase: 'FROM PURPOSE.',
        tone: 'gold',
      },
      {
        id: 'exist',
        verb: 'EXIST:',
        phrase: 'WITH INTENTION.',
        tone: 'blue',
      },
      {
        id: 'evolve',
        verb: 'EVOLVE:',
        phrase: 'THROUGH EXPERIENCE.',
        tone: 'blue',
      },
      {
        id: 'elevate',
        verb: 'ELEVATE:',
        phrase: 'BEYOND LIMITS.',
        tone: 'gold',
      },
    ] satisfies readonly FooterPillar[],
    copyright: '© 2026 BRANDSTA INTERACTIVE.',
  },
} as const