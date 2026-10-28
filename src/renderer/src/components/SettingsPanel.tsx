import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppMeta } from '@shared/api'
import type { AppState, Settings } from '@shared/types'
import { toPersianDigits } from '../lib/jalali'
import { BoltIcon, CloseIcon, LinkIcon, MuteIcon, SunIcon, VolumeIcon } from './Icons'
import { MascotSettingsCard } from './MascotSettings'
import { Stepper } from './Stepper'

function Toggle({
  label,
  hint,
  checked,
  onChange
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button type="button" className="setting-row" onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <span className="setting-text">
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <span className={`switch${checked ? ' on' : ''}`}>
        <span className="switch-knob" />
      </span>
    </button>
  )
}

function NumberRow({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (next: number) => void
}) {
  return (
    <div className="setting-row">
      <span className="setting-text">
        <strong>{label}</strong>
      </span>
      <span className="setting-control">
        <Stepper label={label} value={value} min={min} max={max} step={step} onChange={onChange} />
        {suffix && <span className="setting-suffix">{suffix}</span>}
      </span>
    </div>
  )
}

function HourRow({
  label,
  value,
  onChange
}: {
  label: string
  value: number
  onChange: (next: number) => void
}) {
  return (
    <label className="setting-row">
      <span className="setting-text">
        <strong>{label}</strong>
      </span>
      <select className="setting-select" value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {Array.from({ length: 25 }, (_, hour) => (
          <option key={hour} value={hour}>
            {toPersianDigits(`${hour}`.padStart(2, '0'))}:۰۰
          </option>
        ))}
      </select>
    </label>
  )
}

function SliderRow({
  label,
  hint,
  icon,
  value,
  min = 0,
  max = 100,
  step = 1,
  suffix,
  disabled,
  onChange
}: {
  label: string
  hint?: string
  icon?: ReactNode
  value: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  disabled?: boolean
  onChange: (next: number) => void
}) {
  const range = max - min
  const fill = range > 0 ? ((value - min) / range) * 100 : 0
  return (
    <label className="setting-row">
      <span className="setting-text">
        <strong>
          {icon} {label}
        </strong>
        {hint && <small>{hint}</small>}
      </span>
      <span className="setting-control">
        <input
          className="rail settings-rail"
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.round(value)}
          disabled={disabled}
          style={{ ['--p' as string]: `${fill}%` }}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="setting-suffix">{suffix ?? `${toPersianDigits(Math.round(value))}٪`}</span>
      </span>
    </label>
  )
}

export function SettingsPage() {
  const [state, setState] = useState<AppState | null>(null)
  const [meta, setMeta] = useState<AppMeta | null>(null)

  useEffect(() => {
    let alive = true
    void window.qio.getState().then((initial) => {
      if (alive) setState(initial)
    })
    const off = window.qio.onState((next) => setState(next))
    void window.qio.meta().then((next) => {
      if (alive) setMeta(next)
    })
    return () => {
      alive = false
      off()
    }
  }, [])

  if (!state) {
    return (
      <div className="settings-page">
        <p className="settings-empty">در حال بارگذاری…</p>
      </div>
    )
  }

  const { settings, system } = state
  const patch = (next: Partial<Settings>) => void window.qio.patchSettings(next)

  return (
    <div className="settings-page">
      <header className="settings-bar">
        <span className="settings-mark" aria-hidden="true">
          <span className="mark-eye" />
          <span className="mark-eye" />
        </span>
        <div className="settings-heading">
          <strong>تنظیمات Qio</strong>
          <small>یک نچ زنده برای ویندوز</small>
        </div>
        <span className="settings-version">
          {toPersianDigits(meta?.version ?? '')} · Electron {toPersianDigits(meta?.electron ?? '')}
        </span>
        <button
          type="button"
          className="settings-close"
          onClick={() => void window.qio.window.close()}
          title="بستن"
          aria-label="بستن"
        >
          <CloseIcon size={14} />
        </button>
      </header>

      <div className="settings-scroll">
        <div className="settings-grid">
          <section className="settings-card">
            <h3>Qio</h3>
            <Toggle
              label="اجرا هنگام ورود به ویندوز"
              hint={meta?.packaged === false ? 'در نسخهٔ نصب‌شده فعال می‌شود' : 'بعد از هر ورود، Qio منتظرت است'}
              checked={settings.startWithWindows}
              onChange={(next) => patch({ startWithWindows: next })}
            />
            <Toggle
              label="ماسکوت"
              hint="یک جفت چشم کوچک روی نچ که پلک می‌زند، می‌خوابد و سلام می‌کند"
              checked={settings.mascot}
              onChange={(next) => patch({ mascot: next })}
            />
            <Toggle
              label="نچ باریک"
              hint="به‌جای ساعت، یک خط نازک — مناسب نمایشگرهای کوچک"
              checked={settings.minimalNotch}
              onChange={(next) => patch({ minimalNotch: next })}
            />
            <Toggle
              label="متن آهنگ"
              hint="متن هم‌زمان از LRCLIB برای آهنگ در حال پخش"
              checked={settings.lyrics}
              onChange={(next) => patch({ lyrics: next })}
            />
            <Toggle
              label="کنار رفتن در تمام‌صفحه"
              hint="وقتی بازی یا ویدیو تمام صفحه است، نچ پنهان می‌شود"
              checked={settings.hideFullscreen}
              onChange={(next) => patch({ hideFullscreen: next })}
            />
            <SliderRow
              label="اندازهٔ نچ"
              hint="روی نمایشگرهای پهن خودکار کمی بزرگ‌تر می‌شود"
              value={settings.notchScale * 100}
              min={85}
              max={150}
              step={5}
              onChange={(next) => patch({ notchScale: next / 100 })}
            />
          </section>

          <section className="settings-card">
            <h3>صدا و صفحه</h3>
            <SliderRow
              label="صدا"
              icon={system.muted ? <MuteIcon size={13} /> : <VolumeIcon size={13} />}
              value={system.volume ?? 0}
              disabled={system.volume === null}
              onChange={(next) => void window.qio.system.setVolume(next)}
            />
            <Toggle label="بی‌صدا" checked={system.muted} onChange={(next) => void window.qio.system.setMute(next)} />
            <SliderRow
              label="روشنایی"
              icon={<SunIcon size={13} />}
              value={system.brightness ?? 0}
              disabled={system.brightness === null}
              onChange={(next) => void window.qio.system.setBrightness(next)}
            />
            {system.brightness === null && (
              <p className="settings-note">روشنایی روی نمایشگر داخلی لپ‌تاپ کار می‌کند؛ مانیتور خارجی کنترل خودش را دارد.</p>
            )}
            <div className="settings-note">
              ساعت {system.hour24 ? '۲۴ساعته' : '۱۲ساعته'} از ویندوز پیروی می‌کند. تنظیمش در Settings › Time &amp;
              language است.
            </div>
          </section>

          <section className="settings-card">
            <h3>آب</h3>
            <NumberRow
              label="اندازهٔ بطری"
              value={settings.water.bottleMl}
              min={100}
              max={3000}
              step={50}
              suffix="میلی‌لیتر"
              onChange={(next) => patch({ water: { ...settings.water, bottleMl: next } })}
            />
            <NumberRow
              label="هدف روزانه"
              value={settings.water.goalMl}
              min={250}
              max={8000}
              step={250}
              suffix="میلی‌لیتر"
              onChange={(next) => patch({ water: { ...settings.water, goalMl: next } })}
            />
            <HourRow
              label="شروع یادآوری"
              value={settings.water.startHour}
              onChange={(next) => patch({ water: { ...settings.water, startHour: next } })}
            />
            <HourRow
              label="پایان یادآوری"
              value={settings.water.endHour}
              onChange={(next) => patch({ water: { ...settings.water, endHour: next } })}
            />
            <NumberRow
              label="یادآوری هر"
              value={settings.water.remindEveryMin}
              min={15}
              max={240}
              step={15}
              suffix="دقیقه"
              onChange={(next) => patch({ water: { ...settings.water, remindEveryMin: next } })}
            />
            <Toggle
              label="یادآوری آب"
              hint="یک یادآوری آرام در نچ، وقتی هنوز به هدف نرسیده‌ای"
              checked={settings.water.reminders}
              onChange={(next) => patch({ water: { ...settings.water, reminders: next } })}
            />
          </section>

          <section className="settings-card">
            <h3>تمرکز</h3>
            <NumberRow
              label="طول تمرین"
              value={settings.focus.workMin}
              min={5}
              max={120}
              step={5}
              suffix="دقیقه"
              onChange={(next) => patch({ focus: { ...settings.focus, workMin: next } })}
            />
            <NumberRow
              label="استراحت کوتاه"
              value={settings.focus.shortBreakMin}
              min={1}
              max={60}
              suffix="دقیقه"
              onChange={(next) => patch({ focus: { ...settings.focus, shortBreakMin: next } })}
            />
            <NumberRow
              label="استراحت بلند"
              value={settings.focus.longBreakMin}
              min={5}
              max={90}
              step={5}
              suffix="دقیقه"
              onChange={(next) => patch({ focus: { ...settings.focus, longBreakMin: next } })}
            />
            <NumberRow
              label="استراحت بلند هر"
              value={settings.focus.longBreakEvery}
              min={2}
              max={12}
              suffix="دوره"
              onChange={(next) => patch({ focus: { ...settings.focus, longBreakEvery: next } })}
            />
            <Toggle
              label="صدای زنگ"
              hint="دو نُت نرم وقتی یک دوره تمام می‌شود"
              checked={settings.focus.chime}
              onChange={(next) => patch({ focus: { ...settings.focus, chime: next } })}
            />
          </section>

          <MascotSettingsCard
            style={settings.mascotStyle}
            onPatch={(next) => patch({ mascotStyle: { ...settings.mascotStyle, ...next } })}
          />
        </div>

        <section className="settings-card settings-about">
          <h3>درباره</h3>
          <p>
            هر چیزی که Qio به یاد می‌آورد — کارها، آب، قفسه و تنظیمات — در <code>{meta?.dataPath}</code> می‌ماند. بدون
            حساب، بدون ردیابی. تنها چیزی که از کامپیوتر بیرون می‌رود متن آهنگ است، و فقط عنوان و خواننده به LRCLIB
            می‌رود.
          </p>
          <div className="settings-actions">
            <button type="button" className="pill" onClick={() => void window.qio.window.openExternal('https://lrclib.net')}>
              <LinkIcon size={12} /> lrclib.net
            </button>
            <button
              type="button"
              className="pill"
              onClick={() => void window.qio.window.openExternal('https://github.com/sahandse/qio')}
            >
              <LinkIcon size={12} /> گیت‌هاب
            </button>
            <button type="button" className="pill" onClick={() => void window.qio.window.setVisible(false)}>
              <BoltIcon size={12} /> پنهان کردن نچ
            </button>
            <button type="button" className="pill danger" onClick={() => void window.qio.window.quit()}>
              خروج از Qio
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
