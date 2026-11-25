// app/data/launchHeroChoreography.ts

export type HarmonicPillar = 'default' | 'strategy' | 'creativity' | 'technology'

export interface ApertureAnchors {
  /** Left intake X in viewport CSS px */
  leftX: number
  /** Right exit X in viewport CSS px */
  rightX: number
  /** Shared aperture channel Y in viewport CSS px */
  slotY: number
  /** Bottom of the 3D cradle in viewport CSS px (for obsidian floor reflection) */
  floorY: number
  /** Center X of the 3D resonator */
  centerX: number
  /** Rendered width of the 3D resonator */
  emblemWidth: number
}

export const LAUNCH_HERO_CHOREOGRAPHY = {
  /**
   * Master tempo multiplier:
   * 1.0 = ~1.30s cinematic first-visit entrance
   * 0.36 = ~0.47s crisp return glide within the same session
   */
  firstVisitTempo: 1.0,
  repeatVisitTempo: 0.36,

  /** Easing curves */
  easeSilk: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easeSnap: 'cubic-bezier(0.16, 1, 0.3, 1)',

  /**
   * 5-Beat Master Sequence (ms at tempo = 1.0)
   * Beat 1: Left-to-right 3D core wave ignition (0ms -> 300ms)
   * Beat 2: Top & bottom titanium ±6px magnetic lock (260ms -> 600ms)
   * Beat 3: Left sapphire intake (560ms) -> Core flash (620ms) -> Right gold eruption (650ms -> 960ms)
   * Beat 4: Centered H1 -> H2 -> Subtitle editorial cascade (740ms -> 1040ms)
   * Beat 5: Symmetrical Header + Horizon, Dual CTAs, Triad & Nadir spark (1060ms -> 1300ms)
   */
  beats: {
    waveStartMs: 0,
    waveDurationMs: 300,

    shellLockDelayMs: 260,
    shellLockDurationMs: 340,

    leftIntakeStartMs: 560,
    leftIntakeDurationMs: 240,
    coreFlashStartMs: 620,
    rightEruptionStartMs: 650,
    rightEruptionDurationMs: 330,

    eyebrowDelayMs: 740,
    headlineLine1DelayMs: 800,
    headlineLine2DelayMs: 865,
    subtitleDelayMs: 935,

    headerDelayMs: 1050,
    ctasDelayMs: 1110,
    triadDelayMs: 1185,
    nadirDelayMs: 1250,
  },
} as const
