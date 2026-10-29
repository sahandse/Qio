import { useEffect, useRef, useState } from 'react'
import type { AppState, MediaState, Nudge, PresenceSettings } from '@shared/types'
import { isNightHour } from './night'

export function useAppState(): AppState | null {
  const [state, setState] = useState<AppState | null>(null)

  useEffect(() => {
    let alive = true
    void window.qio.getState().then((initial) => {
      if (alive) setState(initial)
    })
    const offState = window.qio.onState((next) => setState(next))
    return () => {
      alive = false
      offState()
    }
  }, [])

  return state
}

export function useCover(key: string): string {
  const [cover, setCover] = useState('')
  const cache = useRef(new Map<string, string>())

  useEffect(() => {
    if (!key) {
      setCover('')
      return
    }
    const cached = cache.current.get(key)
    if (cached) {
      setCover(cached)
      return
    }
    setCover('')
    const off = window.qio.onCover((payload) => {
      cache.current.set(payload.key, payload.dataUrl)
      if (payload.key === key) setCover(payload.dataUrl)
    })
    return off
  }, [key])

  return cover
}

export function useNudge(): Nudge | null {
  const [nudge, setNudge] = useState<Nudge | null>(null)

  useEffect(() => {
    const offShow = window.qio.onNudge((next) => setNudge(next))
    const offClear = window.qio.onNudgeClear((id) => setNudge((current) => (current?.id === id ? null : current)))
    return () => {
      offShow()
      offClear()
    }
  }, [])

  return nudge
}

/** Ticks while music plays so the progress bar moves between media updates. */
export function useMediaClock(media: MediaState | null): number {
  const [, force] = useState(0)

  useEffect(() => {
    if (media?.status !== 'playing') return
    const timer = setInterval(() => force((value) => value + 1), 500)
    return () => clearInterval(timer)
  }, [media?.status])

  if (!media) return 0
  if (media.status !== 'playing') return media.position
  const drift = (Date.now() - media.receivedAt) / 1000
  return Math.min(media.duration || Number.MAX_SAFE_INTEGER, media.position + drift)
}

export function useClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

/** Paints the night palette on the document, switching over on the hour. */
export function useNightTheme(auto: boolean): void {
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const on = auto && isNightHour(new Date().getHours())
      if (on) root.dataset.night = 'on'
      else root.removeAttribute('data-night')
    }
    apply()
    const timer = window.setInterval(apply, 60_000)
    return () => {
      window.clearInterval(timer)
      root.removeAttribute('data-night')
    }
  }, [auto])
}

/**
 * Calm mode strips the decorative layer: no aurora drift, no staggered entrances,
 * no rolling digits. The flag lives on the root so pure CSS can react to it.
 */
export function useCalm(on: boolean): void {
  useEffect(() => {
    const root = document.documentElement
    if (on) root.dataset.calm = 'on'
    else root.removeAttribute('data-calm')
    return () => root.removeAttribute('data-calm')
  }, [on])
}

/**
 * The clock visits instead of staying: a short appearance, then it rests out of sight
 * until its next turn. Hovering the notch or opening a panel keeps it around.
 */
export function useClockPresence(presence: PresenceSettings, hold: boolean): boolean {
  const mode = presence.mode
  const everyMs = Math.max(1, presence.everyMin) * 60_000
  const forMs = Math.max(3, presence.forSec) * 1000
  const [visible, setVisible] = useState(mode === 'always' || hold)

  useEffect(() => {
    if (mode === 'always' || hold) {
      setVisible(true)
      return
    }
    let showTimer = 0
    let hideTimer = 0
    setVisible(true)
    const cycle = () => {
      hideTimer = window.setTimeout(() => {
        setVisible(false)
        showTimer = window.setTimeout(() => {
          setVisible(true)
          cycle()
        }, everyMs)
      }, forMs)
    }
    cycle()
    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [mode, everyMs, forMs, hold])

  return visible
}
