import { useState } from 'react'
import type { AppState } from '@shared/types'
import { formatClock, formatLitres, weekdayNarrow } from '../lib/format'
import { formatJalali, toPersianDigits } from '../lib/jalali'
import { TrashIcon, WaterIcon } from './Icons'
import { Stepper } from './Stepper'

export function WaterPanel({ state }: { state: AppState | null }) {
  const water = state?.water
  const settings = state?.settings.water
  const [custom, setCustom] = useState(250)

  if (!water || !settings) return <p className="panel-hint">در حال بارگذاری…</p>

  const percent = water.goalMl > 0 ? water.total / water.goalMl : 0
  const reached = water.total >= water.goalMl
  const max = Math.max(water.goalMl, ...water.days.map((day) => day.total), 1)

  const add = (ml: number) => {
    if (!Number.isFinite(ml) || ml <= 0) return
    void window.qio.water.add(ml)
  }

  return (
    <div className="water">
      <div className="water-top">
        <div className="bottle" aria-hidden="true">
          <span className="bottle-cap" />
          <span className="bottle-fill" style={{ height: `${Math.min(100, percent * 100)}%` }} />
        </div>

        <div className="water-summary">
          <span className="water-total">
            {formatLitres(water.total)} <small>/ {formatLitres(water.goalMl)}</small>
          </span>
          <span className={`water-state${reached ? ' ok' : ''}`}>
            {reached ? 'به هدف رسیدی — آفرین' : `${toPersianDigits(Math.round(percent * 100))}٪ از هدف امروز`}
          </span>

          <div className="water-actions">
            <button type="button" className="button primary" onClick={() => add(settings.bottleMl)}>
              <WaterIcon size={15} /> بطری ({toPersianDigits(settings.bottleMl)} میلی‌لیتر)
            </button>
            <button type="button" className="button" onClick={() => add(250)}>
              +{toPersianDigits(250)} میلی‌لیتر
            </button>
            <button type="button" className="button" onClick={() => add(500)}>
              +{toPersianDigits(500)} میلی‌لیتر
            </button>
            <form
              className="water-custom"
              onSubmit={(event) => {
                event.preventDefault()
                add(custom)
              }}
            >
              <Stepper label="مقدار دلخواه" value={custom} min={50} max={3000} step={50} onChange={setCustom} />
              <button type="submit" className="button">
                افزودن
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="water-chart" role="img" aria-label="مصرف آب در دو هفتهٔ گذشته">
        {water.days.map((day) => {
          const date = new Date(`${day.date}T12:00:00`)
          return (
            <span
              className="chart-col"
              key={day.date}
              title={`${formatJalali(date, { weekday: false, year: false })}: ${toPersianDigits(day.total)} میلی‌لیتر`}
            >
              <span className="chart-bar-wrap">
                <span className="chart-bar" style={{ height: `${Math.max(2, (day.total / max) * 100)}%` }} />
              </span>
              <span className="chart-label">{weekdayNarrow(date)}</span>
            </span>
          )
        })}
      </div>

      <div className="water-log">
        {water.entries.length === 0 && <span className="panel-hint">هنوز چیزی امروز ثبت نشده است.</span>}
        {[...water.entries].reverse().map((entry) => (
          <span className="water-entry" key={entry.id}>
            <span className="water-entry-ml">{toPersianDigits(entry.ml)} میلی‌لیتر</span>
            <span className="water-entry-time">{formatClock(new Date(entry.at))}</span>
            <button
              type="button"
              className="icon-button tiny"
              title="حذف"
              onClick={() => void window.qio.water.remove(entry.id)}
            >
              <TrashIcon size={13} />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
