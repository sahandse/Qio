import { useEffect } from 'react'
import type { AppState, FocusMode } from '@shared/types'
import { playCue } from './chime'

export function modeMinutes(state: AppState | null, mode: FocusMode): number {
  const focus = state?.settings.focus
  if (!focus) return mode === 'work' ? 25 : 5
  if (mode === 'work') return focus.workMin
  if (mode === 'short') return focus.shortBreakMin
  return focus.longBreakMin
}

export function remainingMs(state: AppState | null): number {
  const focus = state?.focus
  if (!focus) return 0
  if (focus.running && focus.endsAt) return Math.max(0, focus.endsAt - Date.now())
  return Math.max(0, focus.pausedMs)
}

/** Runs in the notch itself so a session keeps counting down while the panel is closed. */
export function useFocusEngine(state: AppState | null): void {
  const focus = state?.focus
  const settings = state?.settings.focus
  const muted = Boolean(state?.system.muted)
  const running = Boolean(focus?.running && focus.endsAt)

  useEffect(() => {
    if (!running || !focus?.endsAt) return
    const check = () => {
      if (Date.now() < (focus.endsAt ?? 0)) return
      const finished: FocusMode = focus.mode
      const nextRound = finished === 'work' ? focus.round + 1 : focus.round
      const nextMode: FocusMode =
        finished === 'work'
          ? settings && nextRound % settings.longBreakEvery === 0
            ? 'long'
            : 'short'
          : 'work'

      playCue('end', { muted, enabled: settings?.chime })
      void window.qio.focus.patch({
        mode: nextMode,
        running: false,
        endsAt: null,
        pausedMs: 0,
        round: nextRound,
        completedToday: finished === 'work' ? focus.completedToday + 1 : focus.completedToday
      })
      void window.qio.notify(
        'focus',
        finished === 'work' ? 'تمرکز تمام شد' : 'استراحت تمام شد',
        finished === 'work'
          ? nextMode === 'long'
            ? 'وقت استراحت بلند است.'
            : 'یک استراحت کوتاه کن.'
          : 'هر وقت آماده بودی ادامه بده.'
      )
    }

    check()
    const timer = setInterval(check, 1000)
    return () => clearInterval(timer)
  }, [
    running,
    focus?.endsAt,
    focus?.mode,
    focus?.round,
    focus?.completedToday,
    muted,
    settings?.chime,
    settings?.longBreakEvery
  ])
}

export function startSession(mode: FocusMode, minutes: number): Promise<unknown> {
  return window.qio.focus.patch({
    mode,
    running: true,
    endsAt: Date.now() + minutes * 60_000,
    pausedMs: 0
  })
}

export function pauseSession(left: number): Promise<unknown> {
  return window.qio.focus.patch({ running: false, endsAt: null, pausedMs: left })
}

export function resetSession(mode: FocusMode): Promise<unknown> {
  return window.qio.focus.patch({ running: false, endsAt: null, pausedMs: 0, mode })
}
