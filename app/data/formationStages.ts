// app/data/formationStages.ts
export interface FormationStageItem {
  number: string
  slug: string
  title: string
  lead: string
  caption: string
  dateLabel: string
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
    lead: '',
    caption: '',
    dateLabel: 'NOV 19 · 2026',
    unlocked: false,
  },
  {
    number: '04',
    slug: 'interaction',
    title: 'INTERACTION',
    lead: '',
    caption: '',
    dateLabel: 'NOV 20 · 2026',
    unlocked: false,
  },
  {
    number: '05',
    slug: 'stage-05',
    title: '',
    lead: '',
    caption: '',
    dateLabel: 'NOV 21 · 2026',
    unlocked: false,
  },
  {
    number: '06',
    slug: 'stage-06',
    title: '',
    lead: '',
    caption: '',
    dateLabel: 'NOV 22 · 2026',
    unlocked: false,
  },
  {
    number: '07',
    slug: 'stage-07',
    title: '',
    lead: '',
    caption: '',
    dateLabel: 'NOV 23 · 2026',
    unlocked: false,
  },
]