import { useEffect, useState } from 'react'
import type { AppState, MediaState } from '@shared/types'
import { formatClock } from '../lib/format'
import { formatJalali, toPersianDigits } from '../lib/jalali'
import { useClock } from '../lib/state'
import { MuteIcon, SettingsIcon } from './Icons'

interface Props {
  state: AppState | null
  expanded: boolean
  title: string
  onOpen: () => void
  onSettings: () => void
}

function isLive(media: MediaState | null): boolean {
  return Boolean(media && media.title && media.status !== 'stopped' && media.status !== 'unavailable')
}

function batteryColor(battery: number, charging: boolean): string {
  if (charging) return '#7ee8a8'
  if (battery <= 20) return '#f08a7a'
  if (battery <= 40) return '#f2c879'
  return 'rgba(255, 255, 255, 0.88)'
}

/** Two dots that blink now and then; they sit inside the battery ring when there is one. */
function Eyes({ sleepy }: { sleepy: boolean }) {
  return (
    <span className={`eyes${sleepy ? ' eyes-sleepy' : ''}`} aria-hidden="true">
      <span className="eye" />
      <span className="eye" />
    </span>
  )
}

function BatteryRing({
  battery,
  charging,
  mascot,
  sleepy,
  small
}: {
  battery: number
  charging: boolean
  mascot: boolean
  sleepy: boolean
  small?: boolean
}) {
  return (
    <span
      className={`battery-ring${charging ? ' charging' : ''}${small ? ' small' : ''}`}
      style={{
        ['--pct' as string]: `${Math.min(100, Math.max(0, battery))}%`,
        ['--ring' as string]: batteryColor(battery, charging)
      }}
      title={`باتری ${toPersianDigits(battery)}٪${charging ? ' — در حال شارژ' : ''}`}
    >
      <span className="battery-core">{mascot && !small ? <Eyes sleepy={sleepy} /> : null}</span>
    </span>
  )
}

function Equalizer({ playing, muted }: { playing: boolean; muted: boolean }) {
  if (muted) return <MuteIcon size={15} />
  return (
    <span className={`equalizer${playing ? ' playing' : ''}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}

export function NotchBar({ state, expanded, title, onOpen, onSettings }: Props) {
  const now = useClock()
  const media = state?.media ?? null
  const live = isLive(media)
  const playing = live && media?.status === 'playing'
  const battery = state?.system.battery ?? null
  const charging = Boolean(state?.system.charging)
  const muted = Boolean(state?.system.muted)
  const hour24 = state?.system.hour24 ?? true
  const mascot = state?.settings.mascot ?? true
  const minimal = state?.settings.minimalNotch ?? false

  const [sleepy, setSleepy] = useState(false)
  useEffect(() => {
    let timer = window.setTimeout(() => setSleepy(true), 75_000)
    const wake = () => {
      setSleepy(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setSleepy(true), 75_000)
    }
    window.addEventListener('mousemove', wake)
    window.addEventListener('keydown', wake)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousemove', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [])

  const clock = formatClock(now, false, hour24)

  if (!expanded) {
    return (
      <div className={`bar${minimal ? ' minimal' : ''}`} onClick={onOpen} title="باز کردن Qio">
        <span className="bar-side">
          {battery != null ? (
            <BatteryRing battery={battery} charging={charging} mascot={mascot} sleepy={sleepy} />
          ) : (
            <span className="mascot-standalone">
              {mascot ? <Eyes sleepy={sleepy} /> : <span className="status-pin" />}
            </span>
          )}
        </span>
        <span className="bar-clock">{clock}</span>
        <span className={`bar-side bar-media${muted ? ' muted' : ''}`}>
          <Equalizer playing={playing} muted={muted} />
        </span>
      </div>
    )
  }

  return (
    <header className="page-head">
      <span className="page-title">{title}</span>
      <span className="page-status">
        {battery != null && (
          <BatteryRing battery={battery} charging={charging} mascot={false} sleepy={sleepy} small />
        )}
        <span className="page-date">{formatJalali(now)}</span>
        <span className="page-clock">{clock}</span>
      </span>
      <span className="page-tools">
        <button
          type="button"
          className={`tool-button${muted ? ' is-muted' : ''}`}
          title={muted ? 'باصدا کردن' : 'بی‌صدا کردن'}
          aria-label={muted ? 'باصدا کردن' : 'بی‌صدا کردن'}
          onClick={() => void window.qio.system.setMute(!muted)}
        >
          <Equalizer playing={playing} muted={muted} />
        </button>
        <button type="button" className="tool-button" title="تنظیمات" aria-label="تنظیمات" onClick={onSettings}>
          <SettingsIcon size={13} />
        </button>
      </span>
    </header>
  )
}
