import type { AppState } from '@shared/types'
import { formatJalali, toPersianDigits, WEEKDAYS_NARROW, weekdayIndex } from '../lib/jalali'
import { WaterIcon } from './Icons'

function litres(ml: number): string {
  const text = (ml / 1000).toFixed(2).replace(/\.?0+$/, '').replace('.', '٫')
  return toPersianDigits(text)
}

export function WaterPanel({ state }: { state: AppState | null }) {
  const water = state?.water
  const settings = state?.settings.water

  if (!water || !settings || !state) return <p className="page-note">در حال بارگذاری…</p>

  const percent = water.goalMl > 0 ? water.total / water.goalMl : 0
  const reached = water.total >= water.goalMl
  const max = Math.max(water.goalMl, ...water.days.map((day) => day.total), 1)

  const add = (ml: number) => {
    if (!Number.isFinite(ml) || ml <= 0) return
    void window.qio.water.add(ml)
  }

  return (
    <div className="water-page">
      <div className="water-main">
        <div className="water-line">
          <span className="water-big">{litres(water.total)}</span>
          <span className="water-goal">/ {litres(water.goalMl)} لیتر</span>
          <button
            type="button"
            className={`water-switch${settings.reminders ? ' on' : ''}`}
            onClick={() =>
              void window.qio.patchSettings({
                water: { ...settings, reminders: !settings.reminders }
              })
            }
            title={settings.reminders ? 'یادآوری روشن است' : 'یادآوری خاموش است'}
            aria-pressed={settings.reminders}
          >
            <WaterIcon size={11} />
          </button>
        </div>

        <span className={`water-status${reached ? ' ok' : ''}`}>
          {reached
            ? `امروز · ${toPersianDigits(100)}٪ · به هدف رسیدی`
            : `امروز · ${toPersianDigits(Math.round(percent * 100))}٪ از ${litres(water.goalMl)} لیتر`}
        </span>

        <span className="water-bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, percent * 100)}%` }} />
        </span>

        <div className="water-actions">
          <button type="button" className="pill primary" onClick={() => add(settings.bottleMl)}>
            <WaterIcon size={12} /> نوشیدن
          </button>
          <button type="button" className="pill" onClick={() => add(250)}>
            +{toPersianDigits(250)}
          </button>
        </div>
      </div>

      <div className="water-chart" role="img" aria-label="مصرف آب در دو هفتهٔ گذشته">
        <div className="water-chart-body">
          <span className="chart-goal" style={{ bottom: `${Math.min(100, (water.goalMl / max) * 100)}%` }} />
          {water.days.map((day, index) => {
            const date = new Date(`${day.date}T12:00:00`)
            const height = Math.max(3, (day.total / max) * 100)
            return (
              <span
                key={day.date}
                className={`chart-col${index === water.days.length - 1 ? ' today' : ''}`}
                title={`${formatJalali(date, { weekday: false, year: false })}: ${toPersianDigits(day.total)} میلی‌لیتر`}
              >
                <span className="chart-bar" style={{ height: `${height}%` }} />
              </span>
            )
          })}
        </div>
        <div className="chart-labels" aria-hidden="true">
          {[0, 4, 8, 13].map((index) => {
            const day = water.days[index]
            if (!day) return null
            const date = new Date(`${day.date}T12:00:00`)
            return <span key={day.date}>{WEEKDAYS_NARROW[weekdayIndex(date)]}</span>
          })}
        </div>
      </div>
    </div>
  )
}
