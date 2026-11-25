// app/plugins/lenis.client.ts
import Lenis from 'lenis'
import { defineNuxtPlugin } from '#imports'
import { LENIS_SCROLL_CONFIG } from '~/data/lenisConfig'
import {
  registerLenisInstance,
  setDomOverflowLockState,
  notifyLenisSubscribers,
  useLenis,
} from '~/composables/useLenis'

export default defineNuxtPlugin((nuxtApp) => {
  if (typeof window === 'undefined') return

  const lenis = new Lenis({
    lerp: LENIS_SCROLL_CONFIG.lerp,
    wheelMultiplier: LENIS_SCROLL_CONFIG.wheelMultiplier,
    touchMultiplier: LENIS_SCROLL_CONFIG.touchMultiplier,
    syncTouch: LENIS_SCROLL_CONFIG.syncTouch,
  })

  registerLenisInstance(lenis)

  const { scrollTo } = useLenis()

  // Broadcast scroll metrics without mutating reactive Vue refs per frame
  lenis.on('scroll', (e: Lenis) => {
    notifyLenisSubscribers({
      scroll: e.scroll,
      limit: e.limit,
      velocity: e.velocity,
      direction: e.direction,
      progress: e.progress,
    })
  })

  // Sync automatically with Hero Loader's `html.style.overflow = 'hidden'`
  const htmlEl = document.documentElement
  const syncHtmlOverflow = () => {
    setDomOverflowLockState(htmlEl.style.overflow === 'hidden')
  }
  syncHtmlOverflow()

  const styleObserver = new MutationObserver(syncHtmlOverflow)
  styleObserver.observe(htmlEl, {
    attributes: true,
    attributeFilter: ['style'],
  })

  // Pause rAF loop automatically when tab is backgrounded
  let rafId: number | null = null

  const rafLoop = (time: number) => {
    lenis.raf(time)
    rafId = window.requestAnimationFrame(rafLoop)
  }

  const startLoop = () => {
    if (rafId === null && !document.hidden) {
      rafId = window.requestAnimationFrame(rafLoop)
    }
  }

  const stopLoop = () => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  const onVisibilityChange = () => {
    if (document.hidden) {
      stopLoop()
    } else {
      startLoop()
    }
  }

  document.addEventListener('visibilitychange', onVisibilityChange, { passive: true })
  startLoop()

  // Smoothly intercept in-page `#top` and `#section` anchor links
  const onDocumentClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return
    }

    const targetEl = e.target as Element | null
    const anchor = targetEl?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!anchor) return

    const rawHref = anchor.getAttribute('href')
    if (!rawHref || !rawHref.startsWith('#')) return

    if (rawHref === '#' || rawHref === '#top') {
      e.preventDefault()
      scrollTo(0)
      return
    }

    const section = document.querySelector<HTMLElement>(rawHref)
    if (section) {
      e.preventDefault()
      scrollTo(section)
    }
  }

  document.addEventListener('click', onDocumentClick)

  // Keep bounds & scroll position crisp across `/` <-> `/formation` page transitions
  nuxtApp.hook('page:finish', () => {
    requestAnimationFrame(() => {
      lenis.resize()
      const hash = window.location.hash
      if (hash && hash !== '#top') {
        const hashTarget = document.querySelector<HTMLElement>(hash)
        if (hashTarget) {
          scrollTo(hashTarget, { immediate: true })
          return
        }
      }
      scrollTo(0, { immediate: true })
    })
  })
})