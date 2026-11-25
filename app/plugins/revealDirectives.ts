// app/plugins/revealDirectives.ts
import { defineNuxtPlugin } from '#imports'
import type { DirectiveBinding } from 'vue'

export interface CharRevealOptions {
  active?: boolean
  delay?: number
  stagger?: number
  duration?: number
  rise?: string
  threshold?: number
}

export interface WordRevealOptions {
  active?: boolean
  delay?: number
  stagger?: number
  duration?: number
  rise?: string
  threshold?: number
}

export interface StageRevealOptions {
  active?: boolean
  delay?: number
  duration?: number
  rise?: string
  scale?: number
  threshold?: number
}

type GradientTone = 'gold' | 'blue' | 'titanium' | null

interface CharSegmentToken {
  text: string
  tone: GradientTone
  color: string | null
  extraClass: string
}

const observerRegistry = new WeakMap<HTMLElement, IntersectionObserver>()

function cleanupObserver(el: HTMLElement) {
  const obs = observerRegistry.get(el)
  if (obs) {
    obs.disconnect()
    observerRegistry.delete(el)
  }
}

function attachScrollObserverIfUncontrolled(
  el: HTMLElement,
  activeProp: boolean | undefined,
  threshold = 0.18,
) {
  cleanupObserver(el)
  if (typeof activeProp === 'boolean') {
    el.setAttribute('data-reveal-active', activeProp ? '1' : '0')
    return
  }

  if (typeof IntersectionObserver === 'undefined') {
    el.setAttribute('data-reveal-active', '1')
    return
  }

  const obs = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        el.setAttribute('data-reveal-active', '1')
        cleanupObserver(el)
      }
    },
    { threshold },
  )
  observerRegistry.set(el, obs)
  obs.observe(el)
}

function extractInlineTokens(root: Node): CharSegmentToken[] {
  const tokens: CharSegmentToken[] = []

  const walk = (
    node: Node,
    inheritedTone: GradientTone,
    inheritedColor: string | null,
    inheritedClass: string,
  ) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const val = node.nodeValue ?? ''
      if (val.length > 0) {
        tokens.push({
          text: val,
          tone: inheritedTone,
          color: inheritedColor,
          extraClass: inheritedClass,
        })
      }
      return
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const rawTone = el.getAttribute('data-char-gradient') as GradientTone
      const rawColor = el.getAttribute('data-char-color')
      const tone = rawTone || inheritedTone
      const color = rawColor || inheritedColor
      const combinedClass = [inheritedClass, el.className || ''].filter(Boolean).join(' ').trim()
      el.childNodes.forEach((child) => walk(child, tone, color, combinedClass))
    }
  }

  root.childNodes.forEach((child) => walk(child, null, null, ''))
  return tokens
}

function buildSegmentedCharacters(container: HTMLElement, baseDelay: number, stagger: number) {
  const tokens = extractInlineTokens(container)
  const cleanFullText = tokens
    .map((t) => t.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleanFullText) return

  const fragment = document.createDocumentFragment()

  const srSpan = document.createElement('span')
  srSpan.className = 'sr-only'
  srSpan.textContent = cleanFullText
  fragment.appendChild(srSpan)

  const visualRoot = document.createElement('span')
  visualRoot.setAttribute('aria-hidden', 'true')

  let globalCharIndex = 0

  for (const token of tokens) {
    const normalized = token.text.replace(/\s+/g, ' ')
    const parts = normalized.split(/(\s+)/)

    for (const part of parts) {
      if (!part) continue

      if (/^\s+$/.test(part)) {
        visualRoot.appendChild(document.createTextNode(' '))
        continue
      }

      const wordWrap = document.createElement('span')
      wordWrap.className = token.extraClass
        ? `reveal-word ${token.extraClass}`
        : 'reveal-word'
      if (token.color && !token.tone) {
        wordWrap.style.color = token.color
      }

      const chars = Array.from(part)
      const wordLen = chars.length

      chars.forEach((ch, idxInWord) => {
        const charSpan = document.createElement('span')
        let cls = 'reveal-char'

        if (token.tone) {
          cls += ` reveal-char--gradient reveal-char--${token.tone}`
          const pct = wordLen <= 1 ? 50 : (idxInWord / (wordLen - 1)) * 100
          charSpan.style.setProperty('--char-bg-size', `${Math.max(1, wordLen) * 100}% 100%`)
          charSpan.style.setProperty('--char-bg-pos', `${pct.toFixed(2)}% 50%`)
        } else if (token.color) {
          charSpan.style.color = token.color
        }

        charSpan.className = cls
        charSpan.style.setProperty(
          '--char-delay',
          `${Math.round(baseDelay + globalCharIndex * stagger)}ms`,
        )
        charSpan.textContent = ch
        wordWrap.appendChild(charSpan)
        globalCharIndex++
      })

      visualRoot.appendChild(wordWrap)
    }
  }

  container.textContent = ''
  container.appendChild(fragment)
  container.appendChild(visualRoot)
}

function buildSegmentedWords(container: HTMLElement, baseDelay: number, stagger: number) {
  const rawText = (container.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (!rawText) return

  const fragment = document.createDocumentFragment()

  const srSpan = document.createElement('span')
  srSpan.className = 'sr-only'
  srSpan.textContent = rawText
  fragment.appendChild(srSpan)

  const visualRoot = document.createElement('span')
  visualRoot.setAttribute('aria-hidden', 'true')

  const words = rawText.split(' ')
  words.forEach((word, idx) => {
    const wordSpan = document.createElement('span')
    wordSpan.className = 'reveal-word-unit'
    wordSpan.style.setProperty('--word-delay', `${Math.round(baseDelay + idx * stagger)}ms`)
    wordSpan.textContent = word
    visualRoot.appendChild(wordSpan)

    if (idx < words.length - 1) {
      visualRoot.appendChild(document.createTextNode(' '))
    }
  })

  container.textContent = ''
  container.appendChild(fragment)
  container.appendChild(visualRoot)
}

export default defineNuxtPlugin((nuxtApp) => {
  // 1. v-reveal-chars: Luxury Letter-by-Letter Harmonic Crest
  nuxtApp.vueApp.directive<HTMLElement, CharRevealOptions>('reveal-chars', {
    getSSRProps(binding) {
      const active = binding.value?.active
      return {
        'data-reveal-ready': '0',
        'data-reveal-active': active ? '1' : '0',
      }
    },
    mounted(el, binding: DirectiveBinding<CharRevealOptions>) {
      const opts = binding.value ?? {}
      const delay = opts.delay ?? 0
      const stagger = opts.stagger ?? 20
      const duration = opts.duration ?? 640

      el.style.setProperty('--reveal-dur', `${duration}ms`)
      if (opts.rise) el.style.setProperty('--reveal-rise', opts.rise)

      const contentTarget = el.querySelector<HTMLElement>('[data-reveal-content]') ?? el
      if (!contentTarget.querySelector('.reveal-char')) {
        buildSegmentedCharacters(contentTarget, delay, stagger)
      }

      el.setAttribute('data-reveal-ready', '1')
      attachScrollObserverIfUncontrolled(el, opts.active, opts.threshold)
    },
    updated(el, binding: DirectiveBinding<CharRevealOptions>) {
      const opts = binding.value ?? {}
      const contentTarget = el.querySelector<HTMLElement>('[data-reveal-content]') ?? el
      if (!contentTarget.querySelector('.reveal-char')) {
        buildSegmentedCharacters(contentTarget, opts.delay ?? 0, opts.stagger ?? 20)
      }
      if (typeof opts.active === 'boolean') {
        el.setAttribute('data-reveal-active', opts.active ? '1' : '0')
      }
    },
    beforeUnmount(el) {
      cleanupObserver(el)
    },
  })

  // 2. v-reveal-words: Poetic Word-by-Word Silk Glide
  nuxtApp.vueApp.directive<HTMLElement, WordRevealOptions>('reveal-words', {
    getSSRProps(binding) {
      const active = binding.value?.active
      return {
        'data-reveal-ready': '0',
        'data-reveal-active': active ? '1' : '0',
      }
    },
    mounted(el, binding: DirectiveBinding<WordRevealOptions>) {
      const opts = binding.value ?? {}
      const delay = opts.delay ?? 0
      const stagger = opts.stagger ?? 36
      const duration = opts.duration ?? 640

      el.style.setProperty('--reveal-dur', `${duration}ms`)
      if (opts.rise) el.style.setProperty('--reveal-rise', opts.rise)

      const contentTarget = el.querySelector<HTMLElement>('[data-reveal-content]') ?? el
      if (!contentTarget.querySelector('.reveal-word-unit')) {
        buildSegmentedWords(contentTarget, delay, stagger)
      }

      el.setAttribute('data-reveal-ready', '1')
      attachScrollObserverIfUncontrolled(el, opts.active, opts.threshold)
    },
    updated(el, binding: DirectiveBinding<WordRevealOptions>) {
      const opts = binding.value ?? {}
      const contentTarget = el.querySelector<HTMLElement>('[data-reveal-content]') ?? el
      if (!contentTarget.querySelector('.reveal-word-unit')) {
        buildSegmentedWords(contentTarget, opts.delay ?? 0, opts.stagger ?? 36)
      }
      if (typeof opts.active === 'boolean') {
        el.setAttribute('data-reveal-active', opts.active ? '1' : '0')
      }
    },
    beforeUnmount(el) {
      cleanupObserver(el)
    },
  })

  // 3. v-reveal-stage: GPU Stage / CTA / Pedestal Emergence
  nuxtApp.vueApp.directive<HTMLElement, StageRevealOptions>('reveal-stage', {
    getSSRProps(binding) {
      const active = binding.value?.active
      return {
        'data-reveal-stage': '',
        'data-reveal-ready': '0',
        'data-reveal-active': active ? '1' : '0',
      }
    },
    mounted(el, binding: DirectiveBinding<StageRevealOptions>) {
      const opts = binding.value ?? {}
      el.setAttribute('data-reveal-stage', '')
      el.style.setProperty('--stage-delay', `${opts.delay ?? 0}ms`)
      el.style.setProperty('--stage-dur', `${opts.duration ?? 720}ms`)
      if (opts.rise) el.style.setProperty('--stage-rise', opts.rise)
      if (opts.scale !== undefined) el.style.setProperty('--stage-scale', String(opts.scale))

      el.setAttribute('data-reveal-ready', '1')
      attachScrollObserverIfUncontrolled(el, opts.active, opts.threshold)
    },
    updated(el, binding: DirectiveBinding<StageRevealOptions>) {
      const active = binding.value?.active
      if (typeof active === 'boolean') {
        el.setAttribute('data-reveal-active', active ? '1' : '0')
      }
    },
    beforeUnmount(el) {
      cleanupObserver(el)
    },
  })
})