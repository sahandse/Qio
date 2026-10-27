import { useMemo, useState } from 'react'
import {
  addMonths,
  eventOn,
  formatCountdown,
  JALALI_MONTHS,
  monthGrid,
  nextNowruz,
  sameDay,
  toJalali,
  toPersianDigits,
  WEEKDAYS,
  WEEKDAYS_NARROW,
  weekdayOf
} from '../lib/jalali'
import { ChevronLeftIcon, ChevronRightIcon } from './Icons'

export function CalendarPanel() {
  const now = new Date()
  const today = toJalali(now)
  const [view, setView] = useState({ jy: today.jy, jm: today.jm })
  const [selected, setSelected] = useState({ jy: today.jy, jm: today.jm, jd: today.jd })

  const cells = useMemo(() => monthGrid(view.jy, view.jm), [view.jy, view.jm])
  const nowruz = nextNowruz(now)
  const selectedEvent = eventOn(selected.jm, selected.jd)
  const selectedIsToday = sameDay(now, selected.jy, selected.jm, selected.jd)

  const goTo = (delta: number) => {
    const next = addMonths(view.jy, view.jm, delta)
    setView(next)
    if (next.jy === today.jy && next.jm === today.jm) {
      setSelected({ jy: today.jy, jm: today.jm, jd: today.jd })
    } else {
      setSelected({ jy: next.jy, jm: next.jm, jd: 1 })
    }
  }

  return (
    <div className="cal-page">
      <div className="cal-bar">
        <button type="button" className="cal-nav" onClick={() => goTo(-1)} title="ماه قبل" aria-label="ماه قبل">
          <ChevronRightIcon size={13} />
        </button>
        <span className="cal-month">
          {JALALI_MONTHS[view.jm - 1]} {toPersianDigits(view.jy)}
        </span>
        <button type="button" className="cal-nav" onClick={() => goTo(1)} title="ماه بعد" aria-label="ماه بعد">
          <ChevronLeftIcon size={13} />
        </button>
        <button
          type="button"
          className="cal-today"
          onClick={() => {
            setView({ jy: today.jy, jm: today.jm })
            setSelected({ jy: today.jy, jm: today.jm, jd: today.jd })
          }}
        >
          امروز
        </button>
      </div>

      <div className="cal-week" aria-hidden="true">
        {WEEKDAYS_NARROW.map((label, index) => (
          <span key={label} className={index === 6 ? 'friday' : ''}>
            {label}
          </span>
        ))}
      </div>

      <div className="cal-grid" role="grid" aria-label={`تقویم ${JALALI_MONTHS[view.jm - 1]}`}>
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} className="cal-cell blank" />
          const isToday = sameDay(now, view.jy, view.jm, day)
          const isSelected = selected.jy === view.jy && selected.jm === view.jm && selected.jd === day
          const event = eventOn(view.jm, day)
          const friday = weekdayOf(view.jy, view.jm, day) === 6
          return (
            <button
              key={`${view.jy}-${view.jm}-${day}`}
              type="button"
              className={`cal-cell${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${friday ? ' friday' : ''}`}
              onClick={() => setSelected({ jy: view.jy, jm: view.jm, jd: day })}
              title={event ?? undefined}
              aria-label={`${toPersianDigits(day)} ${JALALI_MONTHS[view.jm - 1]}`}
              aria-selected={isSelected}
              role="gridcell"
            >
              <span>{toPersianDigits(day)}</span>
              {event && <span className="cal-dot" aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      <div className="cal-foot">
        <span className="cal-foot-day">
          {WEEKDAYS[weekdayOf(selected.jy, selected.jm, selected.jd)]} {toPersianDigits(selected.jd)}{' '}
          {JALALI_MONTHS[selected.jm - 1]}
          {selectedIsToday ? ' · امروز' : ''}
        </span>
        <span className={`cal-foot-event${selectedEvent ? ' has' : ''}`}>
          {selectedEvent ?? 'مناسبت خاصی ثبت نشده'}
        </span>
        <span className="cal-foot-nowruz" title={`نوروز ${toPersianDigits(nowruz.jy)}`}>
          نوروز · {formatCountdown(nowruz.days)}
        </span>
      </div>
    </div>
  )
}
