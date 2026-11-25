// app/data/heroEditorialConfig.ts

export const HERO_STAGE_CHOREOGRAPHY = {
  // Starts editorial reveal at 1.62s while the obsidian veil lifts and the Resonator settles into berth
  stageEarlyTriggerMs: 1620,

  // Beat 2: Eyebrow Kicker (SIGNATURE BRANDING. AMPLIFIED.)
  kickerDelayMs: 20,
  kickerStaggerMs: 15,
  kickerDurationMs: 500,

  // Beat 3A: H1 Line 1 ("Let’s make waves" — left-to-right)
  headlineLine1DelayMs: 160,
  headlineStaggerMs: 22,
  headlineDurationMs: 640,

  // Beat 3B: H1 Line 2 ("with your dreams." — left-to-right right after Line 1)
  headlineLine2DelayMs: 480,

  // Beat 4: Regular Sentence + Italic Sentence
  leadSentenceDelayMs: 790,
  italicSentenceDelayMs: 930,
  sentenceWordStaggerMs: 34,
  sentenceDurationMs: 640,

  // Beat 5: Dual ResonantFlowButton CTAs
  primaryCtaDelayMs: 1120,
  secondaryCtaDelayMs: 1230,
  ctaDurationMs: 720,

  // Beat 6: Pedestal Discipline Triad (STRATEGY · CREATIVITY · TECHNOLOGY)
  triadBaseDelayMs: 1340,
  triadPillarStepMs: 100,
  triadCharStaggerMs: 15,
  triadDurationMs: 540,

  // Beat 7: Parabolic Triple-Crescent SCROLL Indicator
  scrollCueDelayMs: 1560,
  scrollCueDurationMs: 780,
} as const

export const HERO_EDITORIAL_CONTENT = {
  kickerWhite: 'SIGNATURE',
  kickerBlue: 'BRANDING.',
  kickerGold: 'AMPLIFIED.',

  headlineAriaLabel: 'Let’s make waves with your dreams.',
  line1Lead: 'Let’s make',
  line1GoldAccent: 'waves',
  line2Bridge: 'with your',
  line2BlueAccent: 'dreams.',

  leadSentence: 'Bring us the dream.',
  italicSentence: 'Let’s build what’s next, together.',

  primaryCta: {
    label: 'START YOUR WAVE',
    href: '#button-extravaganza',
    variant: 'primary' as const,
    fluid: 'blue' as const,
    cursorClass: 'cursor-clickable cursor-blue',
  },
  secondaryCta: {
    label: 'WITNESS THE FORMATION',
    href: '/formation',
    variant: 'secondary' as const,
    fluid: 'gold' as const,
    cursorClass: 'cursor-clickable cursor-gold',
  },

  triadPillars: ['STRATEGY', 'CREATIVITY', 'TECHNOLOGY'] as const,
  scrollTargetSelector: '#button-extravaganza',
} as const