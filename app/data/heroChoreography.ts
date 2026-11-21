// app/data/heroChoreography.ts

/**
 * Master Intro Tempo Multiplier:
 * 1.00 = ~5.0s baseline | 0.90 = ~4.95s brisk & synchronized (active) | 0.82 = ultra-snappy
 */
const TEMPO_SCALE = 0.9

const ms = (baseMs: number): number => Math.round(baseMs * TEMPO_SCALE)

export const HERO_CHOREOGRAPHY = {
  tempoScale: TEMPO_SCALE,

  // Beat 1: Dark-blue gradient fading into pure black
  gradientDelayMs: ms(0),
  gradientDurationMs: ms(680),

  // Beat 2: 18 neural strands streaming in from left & right
  strandsStartMs: ms(520),
  strandPairStaggerMs: ms(44),
  strandWingOffsetMs: ms(20),
  strandGrowDurationMs: ms(620),

  // Beat 3: PREVIEW letter-by-letter
  previewStartMs: ms(1460),
  previewCharStaggerMs: ms(36),
  previewCharDurationMs: ms(240),

  // Beat 4: Something -> is -> forming. with momentary glow & settle
  somethingStartMs: ms(1890),
  somethingCharStaggerMs: ms(36),
  somethingCharDurationMs: ms(240),

  isStartMs: ms(2390),
  isCharStaggerMs: ms(44),
  isCharDurationMs: ms(220),

  formingStartMs: ms(2630),
  formingCharStaggerMs: ms(42),
  formingCharDurationMs: ms(330),

  // Beat 5: Subtitle lines word-by-word
  leadLine1StartMs: ms(3220),
  leadLine1WordStaggerMs: ms(82),
  leadWordDurationMs: ms(270),

  leadLine2StartMs: ms(3840),
  leadLine2WordStaggerMs: ms(80),

  // Beat 5B: Signal Horizon Ignition (Center-Outward Interactive Cue)
  interactionCueStartMs: ms(4240),
  interactionCueWingDurationMs: ms(560),
  interactionCueTokenStaggerMs: ms(42),
  interactionCueTokenDurationMs: ms(430),

  // Beat 6: Parabolic triple-crescent SCROLL cue
  scrollCueStartMs: ms(4680),
  scrollCueDurationMs: ms(760),

  // Beat 7: Scattered blinking star particles
  particlesStartMs: ms(5080),
  particlesSpreadMs: ms(200),
  particleFadeDurationMs: ms(240),
} as const