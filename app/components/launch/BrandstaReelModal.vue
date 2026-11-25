<!-- app/components/launch/BrandstaReelModal.vue -->
<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onBeforeUnmount,
  ref,
  useId,
  watch,
} from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    videoSrc?: string
    posterSrc?: string
  }>(),
  {
    videoSrc: '/videos/hello-world.mp4',
    posterSrc: undefined,
  },
)

const emit = defineEmits<{
  close: []
}>()

const rawUid = useId()
const safeUid = computed(() => `rm-${rawUid.replace(/[^a-zA-Z0-9_-]/g, '')}`)

const isClientMounted = ref(false)
const modalRootRef = ref<HTMLElement | null>(null)
const playerStageRef = ref<HTMLElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const scrubTrackRef = ref<HTMLElement | null>(null)

const hasActivatedMedia = ref(false)
const isPlaying = ref(false)
const isMuted = ref(false)
const isBuffering = ref(false)
const hasEnded = ref(false)
const needsSoundUnlock = ref(false)
const isFullscreen = ref(false)
const controlsVisible = ref(true)
const isScrubbing = ref(false)

const currentTime = ref(0)
const duration = ref(0)
const bufferedRatio = ref(0)

let idleControlsTimer: ReturnType<typeof setTimeout> | null = null
let progressRafId: number | null = null

const progressPercent = computed(() => {
  if (!duration.value || duration.value <= 0) return 0
  return Math.min(100, Math.max(0, (currentTime.value / duration.value) * 100))
})

const bufferedPercent = computed(() =>
  Math.min(100, Math.max(0, bufferedRatio.value * 100)),
)

function formatTimecode(secondsInput: number): string {
  if (!Number.isFinite(secondsInput) || secondsInput < 0) return '00:00'
  const total = Math.floor(secondsInput)
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const formattedCurrent = computed(() => formatTimecode(currentTime.value))
const formattedDuration = computed(() => formatTimecode(duration.value))

function scheduleControlsAutoHide() {
  if (idleControlsTimer) clearTimeout(idleControlsTimer)
  controlsVisible.value = true

  if (!isPlaying.value || isScrubbing.value) return

  idleControlsTimer = setTimeout(() => {
    if (isPlaying.value && !isScrubbing.value) {
      controlsVisible.value = false
    }
  }, 2600)
}

function wakeControls() {
  scheduleControlsAutoHide()
}

function stopProgressLoop() {
  if (progressRafId !== null) {
    cancelAnimationFrame(progressRafId)
    progressRafId = null
  }
}

function startProgressLoop() {
  stopProgressLoop()
  const tick = () => {
    const vid = videoRef.value
    if (vid && !isScrubbing.value) {
      currentTime.value = vid.currentTime || 0
      if (vid.duration && Number.isFinite(vid.duration)) {
        duration.value = vid.duration
      }
    }
    if (isPlaying.value) {
      progressRafId = requestAnimationFrame(tick)
    }
  }
  progressRafId = requestAnimationFrame(tick)
}

async function startPlaybackFromOpen() {
  const vid = videoRef.value
  if (!vid) return

  hasEnded.value = false
  isBuffering.value = true
  vid.currentTime = 0
  currentTime.value = 0

  try {
    vid.muted = false
    isMuted.value = false
    needsSoundUnlock.value = false
    await vid.play()
  } catch {
    try {
      vid.muted = true
      isMuted.value = true
      needsSoundUnlock.value = true
      await vid.play()
    } catch {
      isPlaying.value = false
      isBuffering.value = false
      controlsVisible.value = true
    }
  }
}

function unlockAudio() {
  const vid = videoRef.value
  if (!vid) return
  vid.muted = false
  isMuted.value = false
  needsSoundUnlock.value = false
  if (vid.paused) {
    vid.play().catch(() => {})
  }
  wakeControls()
}

async function togglePlayPause() {
  const vid = videoRef.value
  if (!vid) return

  if (needsSoundUnlock.value) {
    unlockAudio()
    return
  }

  if (vid.paused || vid.ended) {
    if (vid.ended) {
      vid.currentTime = 0
      currentTime.value = 0
    }
    try {
      await vid.play()
    } catch {
      isPlaying.value = false
    }
  } else {
    vid.pause()
  }
  wakeControls()
}

function handleSurfaceTap(e: PointerEvent) {
  if (e.pointerType !== 'mouse' && !controlsVisible.value && isPlaying.value) {
    wakeControls()
    return
  }
  togglePlayPause()
}

function toggleMute() {
  const vid = videoRef.value
  if (!vid) return
  vid.muted = !vid.muted
  isMuted.value = vid.muted
  if (!vid.muted) {
    needsSoundUnlock.value = false
  }
  wakeControls()
}

function updateBufferedProgress() {
  const vid = videoRef.value
  if (!vid || !vid.duration || vid.buffered.length === 0) return
  const end = vid.buffered.end(vid.buffered.length - 1)
  bufferedRatio.value = Math.min(1, end / vid.duration)
}

function handleLoadedMetadata() {
  const vid = videoRef.value
  if (!vid) return
  if (vid.duration && Number.isFinite(vid.duration)) {
    duration.value = vid.duration
  }
  updateBufferedProgress()
}

function handlePlayEvent() {
  isPlaying.value = true
  hasEnded.value = false
  isBuffering.value = false
  startProgressLoop()
  scheduleControlsAutoHide()
}

function handlePauseEvent() {
  isPlaying.value = false
  stopProgressLoop()
  controlsVisible.value = true
}

function handleEndedEvent() {
  isPlaying.value = false
  hasEnded.value = true
  stopProgressLoop()
  controlsVisible.value = true
  if (duration.value > 0) {
    currentTime.value = duration.value
  }
}

function seekToClientX(clientX: number) {
  const track = scrubTrackRef.value
  const vid = videoRef.value
  if (!track || !vid || !duration.value) return

  const rect = track.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  const targetTime = ratio * duration.value
  currentTime.value = targetTime
  vid.currentTime = targetTime
}

function handleScrubPointerDown(e: PointerEvent) {
  const track = scrubTrackRef.value
  if (!track) return

  isScrubbing.value = true
  track.setPointerCapture(e.pointerId)
  seekToClientX(e.clientX)
  wakeControls()
}

function handleScrubPointerMove(e: PointerEvent) {
  if (!isScrubbing.value) return
  seekToClientX(e.clientX)
}

function handleScrubPointerUp(e: PointerEvent) {
  if (!isScrubbing.value) return
  const track = scrubTrackRef.value
  if (track && track.hasPointerCapture(e.pointerId)) {
    track.releasePointerCapture(e.pointerId)
  }
  isScrubbing.value = false
  scheduleControlsAutoHide()
}

async function toggleFullscreen() {
  const stage = playerStageRef.value
  const vid = videoRef.value as
    | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
    | null
  if (!stage) return

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else if (stage.requestFullscreen) {
      await stage.requestFullscreen()
    } else if (vid?.webkitEnterFullscreen) {
      vid.webkitEnterFullscreen()
    }
  } catch {
    // Ignore restricted fullscreen environments
  }
  wakeControls()
}

function handleFullscreenChange() {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

function setDocumentScrollLock(locked: boolean) {
  if (typeof document === 'undefined') return
  document.documentElement.style.overflow = locked ? 'hidden' : ''
  document.body.style.overflow = locked ? 'hidden' : ''
}

async function closeModal() {
  if (typeof document !== 'undefined' && document.fullscreenElement) {
    try {
      await document.exitFullscreen()
    } catch {
      // Ignore
    }
  }
  emit('close')
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.open) return

  if (e.key === 'Escape') {
    e.preventDefault()
    closeModal()
    return
  }

  if (e.key === ' ' || e.key.toLowerCase() === 'k') {
    const activeTag = (document.activeElement as HTMLElement | null)?.tagName
    if (activeTag !== 'BUTTON') {
      e.preventDefault()
      togglePlayPause()
    }
    return
  }

  if (e.key.toLowerCase() === 'm') {
    e.preventDefault()
    toggleMute()
    return
  }

  if (e.key.toLowerCase() === 'f') {
    e.preventDefault()
    toggleFullscreen()
    return
  }

  const vid = videoRef.value
  if (!vid || !duration.value) return

  if (e.key === 'ArrowRight') {
    e.preventDefault()
    vid.currentTime = Math.min(duration.value, vid.currentTime + 5)
    currentTime.value = vid.currentTime
    wakeControls()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    vid.currentTime = Math.max(0, vid.currentTime - 5)
    currentTime.value = vid.currentTime
    wakeControls()
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    setDocumentScrollLock(isOpen)

    if (isOpen) {
      hasActivatedMedia.value = true
      controlsVisible.value = true
      await nextTick()
      modalRootRef.value?.focus({ preventScroll: true })
      await startPlaybackFromOpen()
    } else {
      stopProgressLoop()
      if (idleControlsTimer) clearTimeout(idleControlsTimer)
      const vid = videoRef.value
      if (vid) {
        vid.pause()
      }
      isPlaying.value = false
      isBuffering.value = false
      needsSoundUnlock.value = false
    }
  },
)

onMounted(() => {
  isClientMounted.value = true
  if (props.open) {
    setDocumentScrollLock(true)
  }
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onBeforeUnmount(() => {
  setDocumentScrollLock(false)
  stopProgressLoop()
  if (idleControlsTimer) clearTimeout(idleControlsTimer)
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  if (videoRef.value) {
    videoRef.value.pause()
  }
})
</script>

<template>
  <Teleport v-if="isClientMounted" to="body">
    <Transition name="brandsta-reel">
      <div
        v-if="open"
        ref="modalRootRef"
        role="dialog"
        aria-modal="true"
        aria-label="Brandsta Official Film — Hello World"
        tabindex="-1"
        data-lenis-prevent=""
        class="brandsta-reel-backdrop fixed inset-0 z-[90] grid place-items-center p-4 select-none focus:outline-none sm:p-6"
        :class="!isFullscreen ? 'lg:cursor-none' : ''"
        @click.self="closeModal"
        @pointermove="wakeControls"
        @contextmenu.prevent
      >
        <!-- Dual-Tone Sapphire & Astral-Gold Backlight Behind 9:16 Stage -->
        <div
          class="brandsta-reel-halo pointer-events-none absolute"
          aria-hidden="true"
        />

        <!-- 9:16 Portrait Theater Card -->
        <div class="brandsta-reel-card relative flex items-center justify-center">
          <!-- Architectural Brandsta Frame + Top/Bottom 4-Point Harmonic Crest Finials -->
          <svg
            viewBox="0 0 360 640"
            fill="none"
            class="pointer-events-none absolute -inset-[10px] z-30 h-[calc(100%+20px)] w-[calc(100%+20px)] overflow-visible sm:-inset-[13px] sm:h-[calc(100%+26px)] sm:w-[calc(100%+26px)]"
            aria-hidden="true"
          >
            <defs>
              <linearGradient :id="`${safeUid}-rim-grad`" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--color-brand-ice)" stop-opacity="0.58" />
                <stop offset="50%" stop-color="var(--color-brand-electric)" stop-opacity="0.28" />
                <stop offset="100%" stop-color="var(--color-brand-gold-bright)" stop-opacity="0.62" />
              </linearGradient>

              <linearGradient :id="`${safeUid}-close-gold`" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--color-brand-champagne)" />
                <stop offset="50%" stop-color="var(--color-brand-gold-bright)" />
                <stop offset="100%" stop-color="var(--color-brand-gold)" />
              </linearGradient>
            </defs>

            <rect
              x="4"
              y="4"
              width="352"
              height="632"
              rx="14"
              :stroke="`url(#${safeUid}-rim-grad)`"
              stroke-width="1"
            />

            <!-- Top Glacier-Ice Precision Brackets -->
            <path d="M4 30 V14 C4 8.5 8.5 4 14 4 H30" stroke="var(--color-brand-ice)" stroke-width="1.5" stroke-linecap="round" />
            <path d="M356 30 V14 C356 8.5 351.5 4 346 4 H330" stroke="var(--color-brand-ice)" stroke-width="1.5" stroke-linecap="round" />

            <!-- Bottom Astral-Gold Precision Brackets -->
            <path d="M4 610 V626 C4 631.5 8.5 636 14 636 H30" stroke="var(--color-brand-gold-bright)" stroke-width="1.5" stroke-linecap="round" />
            <path d="M356 610 V626 C356 631.5 351.5 636 346 636 H330" stroke="var(--color-brand-gold-bright)" stroke-width="1.5" stroke-linecap="round" />

            <!-- Top & Bottom Brandsta 4-Point Crest Finials -->
            <path
              d="M180 -2 C180.9 2.1 182.1 3.1 186 4 C182.1 4.9 180.9 5.9 180 10 C179.1 5.9 177.9 4.9 174 4 C177.9 3.1 179.1 2.1 180 -2 Z"
              fill="var(--color-brand-ice)"
            />
            <path
              d="M180 630 C180.9 634.1 182.1 635.1 186 636 C182.1 636.9 180.9 637.9 180 642 C179.1 637.9 177.9 636.9 174 636 C177.9 635.1 179.1 634.1 180 630 Z"
              :fill="`url(#${safeUid}-close-gold)`"
            />
          </svg>

          <!-- 9:16 Portrait Video Stage -->
          <div
            ref="playerStageRef"
            class="brandsta-portrait-stage relative grid overflow-hidden rounded-[11px] bg-brand-void shadow-[0_28px_90px_rgba(0,0,0,0.96)] ring-1 ring-brand-ice/25"
          >
            <video
              v-if="hasActivatedMedia"
              ref="videoRef"
              :src="videoSrc"
              :poster="posterSrc"
              playsinline
              preload="metadata"
              controlslist="nodownload noplaybackrate"
              disablepictureinpicture
              class="cursor-clickable cursor-blue col-start-1 row-start-1 h-full w-full object-cover"
              :class="!isFullscreen ? 'lg:cursor-none' : ''"
              @pointerup="handleSurfaceTap"
              @loadedmetadata="handleLoadedMetadata"
              @progress="updateBufferedProgress"
              @timeupdate="
                () => {
                  if (videoRef && !isScrubbing) currentTime = videoRef.currentTime
                }
              "
              @play="handlePlayEvent"
              @pause="handlePauseEvent"
              @ended="handleEndedEvent"
              @waiting="isBuffering = true"
              @playing="isBuffering = false"
              @canplay="isBuffering = false"
              @contextmenu.prevent
              @dragstart.prevent
            />

            <!-- Top & Bottom Obsidian Vignettes -->
            <div
              class="pointer-events-none col-start-1 row-start-1 z-10 flex flex-col justify-between transition-opacity duration-500"
              :class="controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0'"
              aria-hidden="true"
            >
              <div class="h-28 bg-gradient-to-b from-brand-void/88 via-brand-void/42 to-transparent" />
              <div class="h-36 bg-gradient-to-t from-brand-void/94 via-brand-void/52 to-transparent" />
            </div>

            <!-- Top Header Bar: Brandsta Eyebrow + Signature Golden Close '×' -->
            <div
              class="pointer-events-none col-start-1 row-start-1 z-20 flex items-start justify-between p-3.5 transition-all duration-500 sm:p-4"
              :class="
                controlsVisible || !isPlaying
                  ? 'translate-y-0 opacity-100'
                  : '-translate-y-2 opacity-0'
              "
            >
              <div class="flex flex-col pt-1 pl-0.5">
                <span class="font-sans text-[0.58rem] font-semibold tracking-[0.28em] uppercase text-gradient-astral-gold sm:text-[0.62rem]">
                  Brandsta Interactive
                </span>
                <span class="mt-0.5 brand-accent-serif text-[1rem] tracking-[0.02em] text-white/92 sm:text-[1.08rem]">
                  Hello World.
                </span>
              </div>

              <button
                type="button"
                aria-label="Close video player"
                class="cursor-clickable cursor-gold pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-brand-gold-bright/45 bg-brand-obsidian/80 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-brand-champagne active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-bright lg:cursor-none"
                @click.stop="closeModal"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none">
                  <path
                    d="M6 6L18 18M18 6L6 18"
                    :stroke="`url(#${safeUid}-close-gold)`"
                    stroke-width="1.85"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </div>

            <!-- Center Play / Replay / Sound Unlock / Buffering Medallion -->
            <div class="pointer-events-none col-start-1 row-start-1 z-20 grid place-items-center">
              <button
                v-if="needsSoundUnlock && isPlaying"
                type="button"
                aria-label="Unmute video"
                class="cursor-clickable cursor-gold pointer-events-auto flex items-center gap-2 rounded-full border border-brand-gold-bright/65 bg-brand-obsidian/85 px-4 py-2 font-sans text-[0.68rem] font-medium tracking-[0.22em] text-brand-champagne uppercase backdrop-blur-md transition-transform duration-300 hover:scale-105 active:scale-95 lg:cursor-none"
                @click.stop="unlockAudio"
              >
                <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
                </svg>
                <span>Tap for Sound</span>
              </button>

              <div
                v-else-if="isBuffering && isPlaying"
                class="h-14 w-14 animate-spin rounded-full border-2 border-brand-ice/20 border-t-brand-electric"
                aria-hidden="true"
              />

              <button
                v-else-if="!isPlaying"
                type="button"
                :aria-label="hasEnded ? 'Replay film' : 'Play film'"
                class="brandsta-center-play cursor-clickable cursor-gold pointer-events-auto group relative flex h-16 w-16 items-center justify-center rounded-full border border-brand-ice/60 bg-brand-obsidian/75 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-brand-gold-bright active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-electric sm:h-[4.5rem] sm:w-[4.5rem] lg:cursor-none"
                @click.stop="togglePlayPause"
              >
                <span
                  class="pointer-events-none absolute -inset-2 rounded-full border border-brand-electric/32 transition-transform duration-500 group-hover:scale-110 group-hover:border-brand-gold-bright/45"
                  aria-hidden="true"
                />
                <svg
                  v-if="hasEnded"
                  viewBox="0 0 24 24"
                  class="h-6 w-6 text-brand-champagne"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"
                  />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v5h5" />
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  class="h-6 w-6 translate-x-[1.5px] text-brand-ice transition-colors duration-250 group-hover:text-brand-champagne"
                  fill="currentColor"
                >
                  <path d="M7 5.25v13.5L18.25 12 7 5.25z" />
                </svg>
              </button>
            </div>

            <!-- Bottom Timeline & Control Strip -->
            <div
              class="col-start-1 row-start-1 z-20 flex flex-col justify-end self-end p-3.5 transition-all duration-500 sm:p-4"
              :class="
                controlsVisible || !isPlaying
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-2 opacity-0'
              "
              @click.stop
            >
              <!-- Draggable Brandsta Wave Timeline -->
              <div
                ref="scrubTrackRef"
                role="slider"
                tabindex="0"
                aria-label="Seek video timeline"
                :aria-valuemin="0"
                :aria-valuemax="Math.round(duration)"
                :aria-valuenow="Math.round(currentTime)"
                class="cursor-clickable cursor-blue group relative flex h-5 w-full touch-none items-center focus:outline-none lg:cursor-none"
                @pointerdown="handleScrubPointerDown"
                @pointermove="handleScrubPointerMove"
                @pointerup="handleScrubPointerUp"
                @pointercancel="handleScrubPointerUp"
              >
                <div class="relative h-[3px] w-full overflow-hidden rounded-full bg-white/20 transition-all duration-200 group-hover:h-[4px]">
                  <div
                    class="absolute inset-y-0 left-0 rounded-full bg-brand-ice/28"
                    :style="{ width: `${bufferedPercent}%` }"
                  />
                  <div
                    class="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-blue via-brand-electric to-brand-ice"
                    :style="{ width: `${progressPercent}%` }"
                  />
                </div>

                <!-- Champagne-Gold Playhead Jewel -->
                <div
                  class="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-champagne shadow-[0_0_10px_rgba(251,191,36,0.92)] ring-2 ring-brand-void transition-transform duration-200 group-hover:scale-125"
                  :style="{ left: `${progressPercent}%` }"
                />
              </div>

              <!-- Controls Row: Play/Pause + Timecode + Mute + Fullscreen -->
              <div class="mt-1.5 flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5">
                  <button
                    type="button"
                    :aria-label="isPlaying ? 'Pause' : 'Play'"
                    class="cursor-clickable cursor-blue flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/10 hover:text-brand-ice focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-electric lg:cursor-none"
                    @click="togglePlayPause"
                  >
                    <svg v-if="isPlaying" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                      <rect x="6" y="5" width="3.8" height="14" rx="1" />
                      <rect x="14.2" y="5" width="3.8" height="14" rx="1" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" class="h-4 w-4 translate-x-[1px]" fill="currentColor">
                      <path d="M7 5.25v13.5L18.25 12 7 5.25z" />
                    </svg>
                  </button>

                  <div class="font-sans text-[0.68rem] font-medium tracking-[0.08em] text-white/90 tabular-nums sm:text-[0.72rem]">
                    <span class="text-brand-ice">{{ formattedCurrent }}</span>
                    <span class="mx-1 text-brand-ice/45">/</span>
                    <span class="text-white/70">{{ formattedDuration }}</span>
                  </div>
                </div>

                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    :aria-label="isMuted ? 'Unmute audio' : 'Mute audio'"
                    class="cursor-clickable cursor-blue flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/10 hover:text-brand-ice focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-electric lg:cursor-none"
                    @click="toggleMute"
                  >
                    <svg v-if="isMuted" viewBox="0 0 24 24" class="h-4 w-4 text-brand-gold-bright" fill="none" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5L6 9H2v6h4l5 4V5zM22 9l-6 6M16 9l6 6" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
                    class="cursor-clickable cursor-blue flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/10 hover:text-brand-ice focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-electric lg:cursor-none"
                    @click="toggleFullscreen"
                  >
                    <svg v-if="isFullscreen" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.brandsta-reel-backdrop {
  background: radial-gradient(
    ellipse at center,
    rgba(6, 15, 38, 0.9) 0%,
    rgba(2, 5, 14, 0.96) 74%,
    #01030a 100%
  );
  backdrop-filter: blur(18px) saturate(135%);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
}

.brandsta-portrait-stage:fullscreen,
.brandsta-portrait-stage:fullscreen button,
.brandsta-portrait-stage:fullscreen [role="slider"],
.brandsta-portrait-stage:fullscreen video {
  cursor: auto !important;
}

.brandsta-portrait-stage:fullscreen button,
.brandsta-portrait-stage:fullscreen [role="slider"] {
  cursor: pointer !important;
}

.brandsta-reel-halo {
  width: min(94vw, calc(88dvh * 9 / 16));
  aspect-ratio: 9 / 16;
  background: radial-gradient(
    ellipse at center,
    rgba(30, 107, 255, 0.24) 0%,
    rgba(251, 191, 36, 0.09) 52%,
    transparent 76%
  );
  filter: blur(28px);
}

.brandsta-portrait-stage {
  width: min(86vw, calc(82dvh * 9 / 16));
  aspect-ratio: 9 / 16;
}

.brandsta-portrait-stage:fullscreen {
  width: 100%;
  height: 100%;
  max-width: none;
  border-radius: 0;
}

.brandsta-portrait-stage:fullscreen video {
  object-fit: contain;
  background-color: #02050e;
}

.brandsta-center-play {
  box-shadow:
    0 12px 36px rgba(0, 0, 0, 0.78),
    0 0 28px rgba(30, 107, 255, 0.3);
}

.brandsta-reel-enter-active {
  transition: opacity 0.44s cubic-bezier(0.22, 1, 0.36, 1);
}

.brandsta-reel-leave-active {
  transition: opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.brandsta-reel-enter-active .brandsta-reel-card {
  transition:
    transform 0.58s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.brandsta-reel-leave-active .brandsta-reel-card {
  transition:
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.28s ease;
}

.brandsta-reel-enter-from,
.brandsta-reel-leave-to {
  opacity: 0;
}

.brandsta-reel-enter-from .brandsta-reel-card {
  opacity: 0;
  transform: translate3d(0, 26px, 0) scale(0.91);
}

.brandsta-reel-leave-to .brandsta-reel-card {
  opacity: 0;
  transform: translate3d(0, 14px, 0) scale(0.95);
}
</style>