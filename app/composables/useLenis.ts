// app/composables/useLenis.ts
import type Lenis from 'lenis'
import { LENIS_SCROLL_CONFIG, easeLenisAnchor } from '~/data/lenisConfig'

export interface LenisScrollSnapshot {
  scroll: number
  limit: number
  velocity: number
  direction: number
  progress: number
}

export type LenisScrollSubscriber = (snapshot: LenisScrollSnapshot) => void

export interface ScrollToOptions {
  offset?: number
  duration?: number
  immediate?: boolean
}

let lenisInstance: Lenis | null = null
const activeLocks = new Set<string>()
const subscribers = new Set<LenisScrollSubscriber>()
let domOverflowLocked = false

function syncStopStartState() {
  if (!lenisInstance) return
  if (activeLocks.size > 0 || domOverflowLocked) {
    lenisInstance.stop()
  } else {
    lenisInstance.start()
  }
}

export function registerLenisInstance(instance: Lenis | null) {
  lenisInstance = instance
  syncStopStartState()
}

export function setDomOverflowLockState(locked: boolean) {
  if (domOverflowLocked === locked) return
  domOverflowLocked = locked
  syncStopStartState()
}

export function notifyLenisSubscribers(snapshot: LenisScrollSnapshot) {
  subscribers.forEach((cb) => cb(snapshot))
}

export function useLenis() {
  function getLenis(): Lenis | null {
    return lenisInstance
  }

  function lockScroll(reason = 'global') {
    activeLocks.add(reason)
    syncStopStartState()
  }

  function unlockScroll(reason = 'global') {
    activeLocks.delete(reason)
    syncStopStartState()
  }

  function scrollTo(
    target: number | string | HTMLElement,
    options: ScrollToOptions = {},
  ) {
    if (typeof window === 'undefined') return

    const resolvedTarget = target === '#top' ? 0 : target

    if (!lenisInstance) {
      if (typeof resolvedTarget === 'number') {
        window.scrollTo({
          top: resolvedTarget,
          behavior: options.immediate ? 'auto' : 'smooth',
        })
      } else if (typeof resolvedTarget === 'string') {
        const el = document.querySelector<HTMLElement>(resolvedTarget)
        el?.scrollIntoView({ behavior: options.immediate ? 'auto' : 'smooth' })
      } else {
        resolvedTarget.scrollIntoView({ behavior: options.immediate ? 'auto' : 'smooth' })
      }
      return
    }

    lenisInstance.scrollTo(resolvedTarget, {
      offset: options.offset ?? LENIS_SCROLL_CONFIG.anchorOffset,
      duration: options.duration ?? LENIS_SCROLL_CONFIG.anchorDuration,
      easing: easeLenisAnchor,
      immediate: options.immediate ?? false,
    })
  }

  function onScroll(callback: LenisScrollSubscriber): () => void {
    subscribers.add(callback)
    return () => {
      subscribers.delete(callback)
    }
  }

  return {
    getLenis,
    lockScroll,
    unlockScroll,
    scrollTo,
    onScroll,
  }
}