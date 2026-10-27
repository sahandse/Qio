import { useEffect, useState } from 'react'
import type { AppState, FocusMode } from '@shared/types'
import { modeMinutes, pauseSession, remainingMs, resetSession, startSession } from '../lib/focus'
import { playChime } from '../lib/chime'
import { PauseIcon, PlayIcon, TimerIcon } from './Icons'

const MODE_LABEL: Record<FocusMode, string> = { work: 'Focus', short: 'Short break', long: 'Long break' }

export function FocusPanel({ state }: { state: AppState | null }) {
  const focus = state?.focus
  const settings = state?.settings.focus
  const mode: FocusMode = focus?.mode ?? 'work'
  const [left, setLeft] = useState(() => remainingMs(state))

  const running = Boolean(focus?.running && focus.endsAt)

  useEffect(() => {
    setLeft(remainingMs(state))
    const timer = setInterval(() => setLeft(remainingMs(state)), 250)
    return () => clearInterval(timer)
  }, [state])

  const total = modeMinutes(state, mode) * 60_000
  const progress = total > 0 ? Math.min(1, Math.max(0, 1 - left / total)) : 0
  const minutes = Math.floor(left / 60_000)
  const seconds = Math.floor((left % 60_000) / 1000)

  const begin = async () => {
    playChime('start')
    if (left > 0 && !running && focus?.pausedMs) {
      await window.qio.focus.patch({
        mode,
        running: true,
        endsAt: Date.now() + left,
        pausedMs: 0
      })
      return
    }
    await startSession(mode, modeMinutes(state, mode))
  }

  return (
    <div className="focus">
      <div className="focus-top">
        <span
          className="focus-ring"
          style={{ background: `conic-gradient(var(--accent) ${progress * 360}deg, rgba(255,255,255,.08) 0)` }}
        >
          <span className="focus-ring-inner">
            <span className="focus-time">
              {`${minutes}`.padStart(2, '0')}:{`${seconds}`.padStart(2, '0')}
            </span>
            <span className="focus-mode">{MODE_LABEL[mode]}</span>
          </span>
        </span>

        <div className="focus-actions">
          <div className="mode-chips">
            {(['work', 'short', 'long'] as FocusMode[]).map((option) => (
              <button
                key={option}
                type="button"
                className={`mode-chip${mode === option ? ' active' : ''}`}
                onClick={() => void resetSession(option)}
              >
                {MODE_LABEL[option]}
                <small>{modeMinutes(state, option)}m</small>
              </button>
            ))}
          </div>

          <div className="focus-buttons">
            <button
              type="button"
              className="button primary"
              onClick={() => (running ? void pauseSession(left) : void begin())}
            >
              {running ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
              {running ? 'Pause' : left > 0 && focus?.pausedMs ? 'Resume' : 'Start'}
            </button>
            <button type="button" className="button" onClick={() => void resetSession(mode)}>
              Reset
            </button>
          </div>

          <p className="focus-stats">
            <TimerIcon size={14} /> {focus?.completedToday ?? 0} sessions done today · round {focus?.round ?? 0}
            {settings ? ` · long break every ${settings.longBreakEvery}` : ''}
          </p>
        </div>
      </div>
      <p className="panel-hint">
        The countdown lives in the notch, so it keeps running while Qio is closed down to a line.
      </p>
    </div>
  )
}
