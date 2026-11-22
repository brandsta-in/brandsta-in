// app/data/formationStages.ts
export interface FormationStageItem {
  number: string
  slug: string
  title: string
  lead: string
  caption: string
  dateLabel: string
  launchText?: string
  launchDate?: string
  launchTime?: string
  unlocked: boolean
}

export const FORMATION_STAGES: FormationStageItem[] = [
  {
    number: '01',
    slug: 'pulse',
    title: 'PULSE',
    lead: 'It begins with a pulse.',
    caption: 'Scattered signals converge into a single spark of energy.',
    dateLabel: 'NOV 17 · 2026',
    unlocked: true,
  },
  {
    number: '02',
    slug: 'motion',
    title: 'MOTION',
    lead: 'Energy doesn’t remain still.',
    caption: 'A pulse sets it in motion.',
    dateLabel: 'NOV 18 · 2026',
    unlocked: true,
  },
  {
    number: '03',
    slug: 'frequency',
    title: 'FREQUENCY',
    lead: 'As motion repeats, it finds a frequency.',
    caption: 'A rhythm distinctly its own.',
    dateLabel: 'NOV 19 · 2026',
    unlocked: true,
  },
  {
    number: '04',
    slug: 'interaction',
    title: 'INTERACTION',
    lead: 'Frequencies don’t exist in isolation.',
    caption: 'When signals meet, they influence one another.',
    dateLabel: 'NOV 20 · 2026',
    unlocked: true,
  },
  {
    number: '05',
    slug: 'resonance',
    title: 'RESONANCE',
    lead: 'Interaction creates resonance.',
    caption: 'What moves together becomes stronger together.',
    dateLabel: 'NOV 21 · 2026',
    unlocked: true,
  },
  {
    number: '06',
    slug: 'amplification',
    title: 'AMPLIFICATION',
    lead: 'Within a designed enclosure, resonance creates amplification.',
    caption: 'What was once faint finds its intensity.',
    dateLabel: 'NOV 22 · 2026',
    unlocked: true,
  },
  {
    number: '07',
    slug: 'wave',
    title: 'WAVE',
    lead: 'It began with a pulse.',
    caption: 'It propagates as a wave.',
    dateLabel: 'NOV 23 · 2026',
    launchText: 'ARRIVAL',
    launchDate: '24 · 11 · 26',
    launchTime: '21:00',
    unlocked: false,
  },
]