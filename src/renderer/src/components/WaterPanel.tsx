import type { AppState } from '@shared/types'
import { formatJalali, toPersianDigits, WEEKDAYS_NARROW, weekdayIndex } from '../lib/jalali'
import { ICON, WaterIcon } from './Icons'
import { Status } from './Status'
import { Skeleton } from './Skeleton'

function litres(ml: number): string {
  const text = (ml / 1000).toFixed(2).replace(/\.?0+$/, '').replace('.', '٫')
  return toPersianDigits(text)
}

export function WaterPanel({ state }: { state: AppState | null }) {
  const water = state?.water
  const settings = state?.settings.water

  if (!water || !settings || !state) return <Skeleton lines={4} />

  const percent = water.goalMl > 0 ? water.total / water.goalMl : 0
  const reached = water.total >= water.goalMl
  const days = water.days.slice(-7)
  const max = Math.max(water.goalMl, ...days.map((day) => day.total), 1)
  const hasHistory = days.some((day) => day.total > 0)

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
            <WaterIcon size={ICON.xs} />
          </button>
        </div>

        <Status tone={reached ? 'ok' : 'info'}>
          {reached
            ? `امروز · ${toPersianDigits(100)}٪ · به هدف رسیدی`
            : `امروز · ${toPersianDigits(Math.round(percent * 100))}٪ از ${litres(water.goalMl)} لیتر`}
        </Status>

        <span className="water-bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, percent * 100)}%` }} />
        </span>

        <div className="water-actions">
          <button type="button" className="pill primary" onClick={() => add(settings.bottleMl)}>
            <WaterIcon size={ICON.xs} /> نوشیدن
          </button>
          <button type="button" className="pill" onClick={() => add(250)}>
            +{toPersianDigits(250)}
          </button>
        </div>
      </div>

      <div className="water-chart" role="img" aria-label="مصرف آب در هفت روز گذشته">
        <span className="chart-title">{hasHistory ? 'هفت روز اخیر' : 'در حال جمع‌آوری'}</span>
        <div className="water-chart-body">
          {days.map((day, index) => {
            const date = new Date(`${day.date}T12:00:00`)
            const fill = Math.max(2, (day.total / max) * 100)
            const goalMark = Math.min(100, (water.goalMl / max) * 100)
            const today = index === days.length - 1
            return (
              <span
                key={day.date}
                className={`chart-row${today ? ' today' : ''}`}
                title={`${formatJalali(date, { weekday: false, year: false })}: ${toPersianDigits(day.total)} میلی‌لیتر`}
              >
                <span className="chart-day">{WEEKDAYS_NARROW[weekdayIndex(date)]}</span>
                <span className="chart-track">
                  <span className="chart-fill" style={{ width: `${fill}%` }} />
                  {goalMark < 99 && (
                    <span className="chart-goal" style={{ insetInlineStart: `${goalMark}%` }} />
                  )}
                </span>
              </span>
            )
          })}
        </div>
        <span className="chart-foot">
          مجموع {litres(days.reduce((sum, day) => sum + day.total, 0))} لیتر
        </span>
      </div>
    </div>
  )
}
