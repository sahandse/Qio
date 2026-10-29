import { memo, useEffect, useRef } from 'react'
import { formatClock } from '../lib/format'
import {
  JALALI_MONTHS,
  WEEKDAYS_NARROW,
  formatJalali,
  formatJalaliDay,
  toJalali,
  toPersianDigits,
  weekAround
} from '../lib/jalali'
import { useClock } from '../lib/state'

const DIGIT = /[0-9۰-۹]/

/**
 * Odometer text: every character keeps its slot, and a digit that changes is
 * remounted behind a clipped cell so it rolls into place instead of blinking.
 */
export const RollingText = memo(function RollingText({
  text,
  className
}: {
  text: string
  className?: string
}) {
  const previous = useRef(text)
  const chars = Array.from(text)
  const stale = Array.from(previous.current)

  useEffect(() => {
    previous.current = text
  }, [text])

  return (
    <span className={`roll${className ? ` ${className}` : ''}`}>
      {chars.map((ch, index) => {
        const moved = stale[index] !== ch
        return (
          <span
            key={`${index}-${ch}`}
            className={`roll-cell${DIGIT.test(ch) ? ' digit' : ''}${moved ? ' roll-in' : ''}`}
          >
            <span className="roll-glyph">{ch}</span>
          </span>
        )
      })}
    </span>
  )
})

/**
 * The ticking time lives in its own components so the rest of the notch does not
 * re-render every five seconds just to keep the digits fresh.
 */
export const ClockText = memo(function ClockText({
  hour24,
  className,
  off
}: {
  hour24: boolean
  className?: string
  off?: boolean
}) {
  const now = useClock()
  return (
    <span
      className={`${className ?? ''}${off ? ' off' : ''}`}
      aria-hidden={off || undefined}
      title={formatJalali(now)}
    >
      <RollingText text={formatClock(now, false, hour24)} />
    </span>
  )
})

export const ClockDate = memo(function ClockDate({ className }: { className?: string }) {
  const now = useClock()
  return <span className={className}>{formatJalali(now)}</span>
})

/** The current week, Saturday first: today lit up, fixed events dotted. */
export const ClockWeek = memo(function ClockWeek() {
  const now = useClock()
  const month = JALALI_MONTHS[toJalali(now).jm - 1]
  return (
    <span className="week-strip" aria-label={`هفتهٔ جاری، ${month}`}>
      {weekAround(now).map((day) => {
        const label = formatJalaliDay(day.j.jy, day.j.jm, day.j.jd)
        return (
          <span
            key={day.weekday}
            className={`week-day${day.today ? ' today' : ''}`}
            title={day.event ? `${label} — ${day.event}` : label}
          >
            <span className="week-name">{WEEKDAYS_NARROW[day.weekday]}</span>
            <span className="week-num">{toPersianDigits(day.j.jd)}</span>
            {day.event && <span className="week-dot" />}
          </span>
        )
      })}
    </span>
  )
})
