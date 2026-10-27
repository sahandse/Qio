import { useMemo, useState } from 'react'
import {
  addMonths,
  eventOn,
  formatCountdown,
  formatJalali,
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
    <div className="calendar">
      <div className="cal-head">
        <div className="cal-title">
          <strong>
            {JALALI_MONTHS[view.jm - 1]} {toPersianDigits(view.jy)}
          </strong>
          <span className="cal-sub">{formatJalali(now)}</span>
        </div>
        <div className="cal-nav">
          <button type="button" className="icon-button tiny" onClick={() => goTo(-1)} title="ماه قبل">
            <ChevronRightIcon size={15} />
          </button>
          <button
            type="button"
            className="button ghost"
            onClick={() => {
              setView({ jy: today.jy, jm: today.jm })
              setSelected({ jy: today.jy, jm: today.jm, jd: today.jd })
            }}
          >
            امروز
          </button>
          <button type="button" className="icon-button tiny" onClick={() => goTo(1)} title="ماه بعد">
            <ChevronLeftIcon size={15} />
          </button>
        </div>
      </div>

      <div className="cal-main">
        <div className="cal-grid" role="grid" aria-label={`تقویم ${JALALI_MONTHS[view.jm - 1]}`}>
          {WEEKDAYS_NARROW.map((label, index) => (
            <span key={label} className={`cal-weekday${index === 6 ? ' cal-friday' : ''}`}>
              {label}
            </span>
          ))}

          {cells.map((day, index) => {
            if (day === null) return <span key={`blank-${index}`} className="cal-cell cal-blank" />
            const isToday = sameDay(now, view.jy, view.jm, day)
            const isSelected = selected.jy === view.jy && selected.jm === view.jm && selected.jd === day
            const event = eventOn(view.jm, day)
            const friday = weekdayOf(view.jy, view.jm, day) === 6
            return (
              <button
                key={`${view.jy}-${view.jm}-${day}`}
                type="button"
                className={`cal-cell cal-day${isToday ? ' cal-today' : ''}${isSelected ? ' cal-selected' : ''}${
                  friday ? ' cal-friday' : ''
                }${event ? ' cal-has-event' : ''}`}
                onClick={() => setSelected({ jy: view.jy, jm: view.jm, jd: day })}
                title={event ?? undefined}
              >
                <span>{toPersianDigits(day)}</span>
                {event && <span className="cal-dot" aria-hidden="true" />}
              </button>
            )
          })}
        </div>

        <aside className="cal-side">
          <div className="cal-day-card">
            <span className="cal-selected-day">{toPersianDigits(selected.jd)}</span>
            <div className="cal-selected-text">
              <span className="cal-selected-month">
                {JALALI_MONTHS[selected.jm - 1]} {toPersianDigits(selected.jy)}
              </span>
              <span className="cal-selected-week">
                {WEEKDAYS[weekdayOf(selected.jy, selected.jm, selected.jd)]}
                {selectedIsToday ? ' · امروز' : ''}
              </span>
            </div>
          </div>

          {selectedEvent ? (
            <span className="cal-event">{selectedEvent}</span>
          ) : (
            <span className="panel-hint">مناسبت خاصی برای این روز ثبت نشده است.</span>
          )}

          <div className="cal-nowruz">
            <span className="cal-nowruz-label">شمارش معکوس نوروز</span>
            <strong className="cal-nowruz-days">{formatCountdown(nowruz.days)}</strong>
            <small>
              نوروز {toPersianDigits(nowruz.jy)} · {toPersianDigits(1)} فروردین
            </small>
          </div>

          <span className="cal-note">مناسبت‌های قمری هر سال جابه‌جا می‌شوند و در این نسخه نیامده‌اند.</span>
        </aside>
      </div>
    </div>
  )
}
