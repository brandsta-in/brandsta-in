// app/data/heroChoreography.ts

/**
 * Master Intro Tempo Multiplier:
 * 1.00 = ~5.0s baseline | 1.18 = ~5.85s unhurried (active) | 0.85 = snappy
 */
const TEMPO_SCALE = 1.24

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
  previewStartMs: ms(1480),
  previewCharStaggerMs: ms(38),
  previewCharDurationMs: ms(240),

  // Beat 4: Something -> is -> forming. with momentary glow & settle
  somethingStartMs: ms(1920),
  somethingCharStaggerMs: ms(38),
  somethingCharDurationMs: ms(250),

  isStartMs: ms(2450),
  isCharStaggerMs: ms(46),
  isCharDurationMs: ms(230),

  formingStartMs: ms(2700),
  formingCharStaggerMs: ms(44),
  formingCharDurationMs: ms(340),

  // Beat 5: Subtitle lines word-by-word
  leadLine1StartMs: ms(3320),
  leadLine1WordStaggerMs: ms(88),
  leadWordDurationMs: ms(280),

  leadLine2StartMs: ms(4140),
  leadLine2WordStaggerMs: ms(86),

  // Beat 6: Parabolic triple-crescent SCROLL cue
  scrollCueStartMs: ms(4520),
  scrollCueDurationMs: ms(840),

  // Beat 7: Scattered blinking star particles
  particlesStartMs: ms(5140),
  particlesSpreadMs: ms(200),
  particleFadeDurationMs: ms(240),
} as const