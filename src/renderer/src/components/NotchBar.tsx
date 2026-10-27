import { Fragment, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppState } from '@shared/types'
import { formatClock, formatDay, formatDuration, formatLitres, mediaAppName } from '../lib/format'
import { shortEvent, toPersianDigits, upcomingEvent } from '../lib/jalali'
import { useClock, useCover, useMediaClock } from '../lib/state'
import { BoltIcon, CalendarIcon, TimerIcon, WaterIcon } from './Icons'

interface Props {
  state: AppState | null
  expanded: boolean
  onOpen: () => void
  onToggleMinimal: () => void
}

function useSecondsTick(active: boolean): number {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setTick((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [active])
  return Date.now()
}

export function NotchBar({ state, expanded, onOpen, onToggleMinimal }: Props) {
  const now = useClock()
  const media = state?.media ?? null
  const isLive = Boolean(media && media.title && media.status !== 'stopped' && media.status !== 'unavailable')
  const cover = useCover(isLive && media ? media.coverKey : '')
  const position = useMediaClock(isLive ? media : null)
  const progress = media && media.duration > 0 ? Math.min(1, position / media.duration) : 0

  const focus = state?.focus
  const focusRunning = Boolean(focus?.running && focus.endsAt)
  useSecondsTick(focusRunning)
  const focusLeft = focusRunning && focus?.endsAt ? Math.max(0, (focus.endsAt - Date.now()) / 1000) : 0

  const water = state?.water
  const waterLeft = water ? Math.max(0, water.goalMl - water.total) : 0
  const battery = state?.system.battery
  const charging = state?.system.charging
  const minimal = state?.settings.minimalNotch ?? false
  const event = upcomingEvent(now)

  const chips: { key: string; label: string; node: ReactNode }[] = []
  if (focusRunning) {
    chips.push({
      key: 'focus',
      label: 'تایمر تمرین',
      node: (
        <span className="chip chip-accent" title="تایمر تمرین">
          <TimerIcon size={13} />
          {toPersianDigits(`${Math.floor(focusLeft / 60)}:${`${Math.floor(focusLeft % 60)}`.padStart(2, '0')}`)}
        </span>
      )
    })
  }
  if (battery != null && !charging && battery <= 30) {
    chips.push({
      key: 'battery',
      label: 'باتری کم',
      node: (
        <span className="chip chip-warn" title="باتری کم">
          {toPersianDigits(battery)}٪
        </span>
      )
    })
  }
  if (event) {
    const name = shortEvent(event.title)
    chips.push({
      key: 'event',
      label: event.title,
      node: (
        <span className="chip chip-event" title={event.title}>
          <CalendarIcon size={12} />
          <span className="chip-text">
            {event.days === 0
              ? name
              : event.days === 1
                ? `فردا · ${name}`
                : `${toPersianDigits(event.days)} روز تا ${name}`}
          </span>
        </span>
      )
    })
  }
  if (water && waterLeft > 0) {
    chips.push({
      key: 'water',
      label: 'آب خوردهٔ امروز',
      node: (
        <span className="chip" title="آب خوردهٔ امروز">
          <WaterIcon size={13} />
          {formatLitres(water.total)}
        </span>
      )
    })
  }
  if (charging && battery != null) {
    chips.push({
      key: 'charging',
      label: 'در حال شارژ',
      node: (
        <span className="chip chip-accent" title="در حال شارژ">
          <BoltIcon size={13} />
          {toPersianDigits(battery)}٪
        </span>
      )
    })
  }
  const hiddenChips = chips.slice(2)

  const [sleepy, setSleepy] = useState(false)
  useEffect(() => {
    let timer = setTimeout(() => setSleepy(true), 75_000)
    const wake = () => {
      setSleepy(false)
      clearTimeout(timer)
      timer = setTimeout(() => setSleepy(true), 75_000)
    }
    window.addEventListener('mousemove', wake)
    window.addEventListener('keydown', wake)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousemove', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [])

  if (minimal) {
    return (
      <button
        type="button"
        className="bar bar-minimal"
        onClick={onOpen}
        onDoubleClick={onToggleMinimal}
        title="Qio — برای باز کردن کلیک کن"
      >
        <span className="bar-minimal-line" style={{ transform: `scaleX(${0.3 + progress * 0.7})` }} />
      </button>
    )
  }

  return (
    <div className={`bar${expanded ? ' bar-open' : ''}`}>
      <button type="button" className="bar-mascot" onClick={onOpen} title="باز کردن Qio">
        {state?.settings.mascot ? (
          <span className={`eyes${sleepy ? ' eyes-sleepy' : ''}`} aria-hidden="true">
            <span className="eye" />
            <span className="eye" />
          </span>
        ) : (
          <span className="dot" aria-hidden="true" />
        )}
      </button>

      <div className="bar-center">
        {isLive && media ? (
          <span className="bar-track">
            {cover ? <img className="bar-cover" src={cover} alt="" /> : <span className="bar-cover bar-cover-empty" />}
            <span className="bar-marquee">
              <span className="bar-title">{media.title}</span>
              <span className="bar-sep">·</span>
              <span className="bar-artist">{media.artist || mediaAppName(media.app)}</span>
            </span>
            {media.duration > 0 && (
              <span className="bar-time">
                {formatDuration(position)} / {formatDuration(media.duration)}
              </span>
            )}
          </span>
        ) : (
          <button type="button" className="bar-clock" onClick={onOpen} title="باز کردن Qio">
            <span className="bar-time-main">{formatClock(now)}</span>
            <span className="bar-date">{formatDay(now)}</span>
          </button>
        )}
      </div>

      <div className="bar-chips">
        {chips.slice(0, 2).map((chip) => (
          <Fragment key={chip.key}>{chip.node}</Fragment>
        ))}
        {hiddenChips.length > 0 && (
          <span
            className="chip chip-more"
            title={hiddenChips.map((chip) => chip.label).join(' · ')}
            aria-label={hiddenChips.map((chip) => chip.label).join('، ')}
          />
        )}
      </div>

      {media && media.duration > 0 && isLive && (
        <span className="bar-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      )}
    </div>
  )
}
