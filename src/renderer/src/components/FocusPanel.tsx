import { useEffect, useState } from 'react'
import type { AppState, FocusMode } from '@shared/types'
import { modeMinutes, pauseSession, remainingMs, resetSession, startSession } from '../lib/focus'
import { playChime } from '../lib/chime'
import { toPersianDigits } from '../lib/jalali'
import { PauseIcon, PlayIcon, ResetIcon, TimerIcon } from './Icons'

const MODE_LABEL: Record<FocusMode, string> = { work: 'تمرکز', short: 'استراحت کوتاه', long: 'استراحت بلند' }

export function FocusPanel({ state }: { state: AppState | null }) {
  const focus = state?.focus
  const mode: FocusMode = focus?.mode ?? 'work'
  const running = Boolean(focus?.running && focus.endsAt)
  const paused = !running && (focus?.pausedMs ?? 0) > 0
  const readLeft = () => (running || paused ? remainingMs(state) : modeMinutes(state, mode) * 60_000)
  const [left, setLeft] = useState(readLeft)

  useEffect(() => {
    setLeft(readLeft())
    const timer = setInterval(() => setLeft(readLeft()), 250)
    return () => clearInterval(timer)
  }, [state])

  const total = modeMinutes(state, mode) * 60_000
  const progress = total > 0 ? Math.min(1, Math.max(0, 1 - left / total)) : 0
  const minutes = Math.floor(left / 60_000)
  const seconds = Math.floor((left % 60_000) / 1000)
  const done = focus?.completedToday ?? 0

  const toggle = async () => {
    if (running) {
      await pauseSession(left)
      return
    }
    playChime('start')
    if (left > 0 && paused) {
      await window.qio.focus.patch({ mode, running: true, endsAt: Date.now() + left, pausedMs: 0 })
      return
    }
    await startSession(mode, modeMinutes(state, mode))
  }

  return (
    <div className="focus-page">
      <button
        type="button"
        className={`orbit mode-${mode}${running ? ' running' : ''}`}
        style={{ ['--p' as string]: `${progress * 360}deg` }}
        onClick={() => void toggle()}
        title={running ? 'توقف' : 'شروع'}
        aria-label={running ? 'توقف' : 'شروع'}
      >
        <span className="orbit-core">
          {running ? <PauseIcon size={18} /> : left > 0 && paused ? <PlayIcon size={18} /> : <TimerIcon size={18} />}
        </span>
      </button>

      <div className="focus-main">
        <span className="focus-time">
          {toPersianDigits(`${`${minutes}`.padStart(2, '0')}:${`${seconds}`.padStart(2, '0')}`)}
        </span>

        <span className="focus-sub">
          {MODE_LABEL[mode]} · {toPersianDigits(done)} دوره امروز
        </span>

        <div className="focus-modes">
          <button
            type="button"
            className={`focus-chip${mode === 'work' ? ' on' : ''}`}
            onClick={() => void resetSession('work')}
            title="تمرکز"
          >
            تمرکز
          </button>
          <button
            type="button"
            className={`focus-chip${mode !== 'work' ? ' on' : ''}`}
            onClick={() => void resetSession('short')}
            title="استراحت کوتاه"
          >
            استراحت
          </button>
          <button type="button" className="focus-play" onClick={() => void toggle()}>
            {running ? 'توقف' : paused ? 'ادامه' : 'شروع'}
          </button>
          <button
            type="button"
            className="round round-quiet"
            onClick={() => void resetSession(mode)}
            title="از نو"
            aria-label="از نو"
          >
            <ResetIcon size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
