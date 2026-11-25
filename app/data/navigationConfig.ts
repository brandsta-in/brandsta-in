// app/data/navigationConfig.ts
import { HERO_STAGE_CHOREOGRAPHY } from '~/data/heroEditorialConfig'

export type ContactChannelId = 'call' | 'mail' | 'whatsapp' | 'instagram'

export interface NavPageItem {
  id: string
  label: string
  href: string
}

export interface NavContactChannel {
  id: ContactChannelId
  href: string
  external?: boolean
  ariaLabel: string
  cardTitle: string
  cardAction: string
}

export const BRANDSTA_HEADER_CHOREOGRAPHY = {
  // Synchronized 1:1 with Beat 5 Dual ResonantFlowButton CTAs
  wordmarkDelayMs: HERO_STAGE_CHOREOGRAPHY.primaryCtaDelayMs, // 1120ms
  triggerDelayMs: HERO_STAGE_CHOREOGRAPHY.secondaryCtaDelayMs, // 1230ms
  entranceDurationMs: HERO_STAGE_CHOREOGRAPHY.ctaDurationMs, // 720ms
  directRouteDelayMs: 120,
  scrollGlassThresholdPx: 24,
} as const

export const SINE_TRIGGER_PHYSICS = {
  morphDurationMs: 520,
  hoverWaveSpeedRadPerSec: 4.2,
  viewBoxWidth: 48,
  viewBoxHeight: 32,
  waveCycles: 1.15,
  waveAmplitude: 2.55,
  topWaveY: 8.5,
  bottomWaveY: 23.5,
  waveStartX: 3,
  waveEndX: 45,
  crossInsetX: 11,
  crossTopY: 3,
  crossBottomY: 29,
  samplePoints: 29,
} as const

export const BRANDSTA_NAV_CONTENT = {
  // Flanked uppercase destinations (FORMATION page + CUSTOM CODE section)
  pages: [
    {
      id: 'formation',
      label: 'FORMATION',
      href: '/formation',
    },
    {
      id: 'custom-code',
      label: 'CUSTOM CODE',
      href: '/#custom-code',
    },
  ] satisfies readonly NavPageItem[],

  // Two-sentence statement with Playfair Display italic blue & gold gradients
  statement: {
    line1LeadWhite: 'This is just the',
    line1BlueSerif: 'beginning',
    line1EndDot: '.',
    line2LeadWhite: 'More',
    line2GoldSerif: 'waves',
    line2TailWhite: 'coming soon.',
  },

  // Single Source of Truth for Nav Overlay Icons & Finale Contact Cards
  contactChannels: [
    {
      id: 'call',
      href: 'tel:+918129012205',
      ariaLabel: 'Call Brandsta at +91 81290 12205',
      cardTitle: 'CALL US',
      cardAction: 'Click to Call',
    },
    {
      id: 'mail',
      href: 'mailto:hello@brandsta.in',
      ariaLabel: 'Email Brandsta at hello@brandsta.in',
      cardTitle: 'E-MAIL US',
      cardAction: 'Click to E-mail',
    },
    {
      id: 'whatsapp',
      href: 'https://wa.me/918129012205',
      external: true,
      ariaLabel: 'Message Brandsta on WhatsApp',
      cardTitle: 'WHATSAPP US',
      cardAction: 'Click to WhatsApp',
    },
    {
      id: 'instagram',
      href: 'https://www.instagram.com/brandsta.in',
      external: true,
      ariaLabel: 'Visit Brandsta on Instagram (@brandsta.in)',
      cardTitle: 'INSTAGRAM',
      cardAction: 'Click to Follow',
    },
  ] satisfies readonly NavContactChannel[],

  bottomSignature: {
    word1FlatWhite: 'We',
    word2FlatBlue: 'make',
    word3GoldSerif: 'waves',
    dotGold: '.',
  },
} as const