import { useEffect, useState } from 'react'
import type { AppState } from '@shared/types'
import { toPersianDigits } from '../lib/jalali'
import { ICON, CoffeeIcon } from './Icons'

/** The lengths the cup offers; the settings default is highlighted among them. */
const CHIPS = [15, 30, 45, 60, 90, 120]

function remainingText(endsAt: number | null): string {
  if (endsAt === null) return 'روشن می‌ماند'
  const ms = Math.max(0, endsAt - Date.now())
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  return `${toPersianDigits(`${`${minutes}`.padStart(2, '0')}:${`${seconds}`.padStart(2, '0')}`)} مانده`
}

export function CoffeeTool({ state }: { state: AppState | null }) {
  const coffee = state?.coffee
  const active = Boolean(coffee?.active)
  const always = active && (coffee?.endsAt ?? null) === null
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!active || coffee?.endsAt == null) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active, coffee?.endsAt])

  const endsAt = coffee?.endsAt ?? null
  const startedAt = coffee?.startedAt ?? now
  const total = endsAt !== null ? Math.max(1, endsAt - startedAt) : 0
  const left = endsAt !== null ? Math.max(0, endsAt - now) : 0
  const progress = endsAt !== null ? Math.min(1, 1 - left / total) : 0
  const preferred = state?.settings.coffee.minutes ?? 30

  const brew = (minutes: number | null) => void window.qio.coffee.brew(minutes)

  return (
    <div className="coffee-page">
      <button
        type="button"
        className={`cup${active ? ' on' : ''}`}
        style={{ ['--p' as string]: `${progress * 360}deg` }}
        onClick={() => (active ? void window.qio.coffee.release() : void brew(preferred))}
        title={active ? 'صفحه را آزاد کن' : `صفحه ${toPersianDigits(preferred)} دقیقه روشن بماند`}
        aria-label={active ? 'رهاسازی صفحه' : 'روشن نگه‌داشتن صفحه'}
      >
        <span className="cup-core">
          <CoffeeIcon size={ICON.xl} />
        </span>
      </button>

      <div className="coffee-main">
        <strong className="coffee-state">
          {active ? (always ? 'صفحه بیدار می‌ماند' : remainingText(endsAt)) : 'صفحه آزاد است'}
        </strong>
        <span className="coffee-hint">
          {active
            ? 'اسکرین‌سیور و خواب نمایشگر نگه داشته می‌شود؛ قفل ویندوز دست‌نخورده می‌ماند.'
            : 'قبل از پرزنت، فیلم یا دستور پخت روی مانیتور دوم، فنجان را روشن کن.'}
        </span>

        <div className="coffee-chips">
          {CHIPS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={`coffee-chip${active && !always && total === minutes * 60_000 ? ' on' : ''}`}
              onClick={() => void brew(minutes)}
              title={`${toPersianDigits(minutes)} دقیقه`}
            >
              {toPersianDigits(minutes)}
            </button>
          ))}
          <button
            type="button"
            className={`coffee-chip wide${always ? ' on' : ''}`}
            onClick={() => void brew(null)}
            title="تا خودت فنجان را بگذاری زمین"
          >
            تا اطلاع بعدی
          </button>
          {active && (
            <button type="button" className="coffee-chip quiet" onClick={() => void window.qio.coffee.release()}>
              خاموش
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
