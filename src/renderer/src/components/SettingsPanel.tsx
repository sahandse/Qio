import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppMeta } from '@shared/api'
import type { AppState, Settings } from '@shared/types'
import { toPersianDigits } from '../lib/jalali'
import { BoltIcon, LinkIcon, MuteIcon, SunIcon, VolumeIcon } from './Icons'

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
    <button type="button" className="row" onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <span className="row-text">
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
    <label className="row">
      <span className="row-text">
        <strong>{label}</strong>
      </span>
      <span className="row-control">
        <input
          className="input number"
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix && <span className="row-suffix">{suffix}</span>}
      </span>
    </label>
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
    <label className="row">
      <span className="row-text">
        <strong>{label}</strong>
      </span>
      <select className="select" value={value} onChange={(event) => onChange(Number(event.target.value))}>
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
  icon,
  value,
  disabled,
  onChange
}: {
  label: string
  icon: ReactNode
  value: number
  disabled?: boolean
  onChange: (next: number) => void
}) {
  return (
    <label className="row">
      <span className="row-text">
        <strong>
          {icon} {label}
        </strong>
      </span>
      <span className="row-control">
        <input
          className="slider"
          type="range"
          min={0}
          max={100}
          value={Math.round(value)}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="row-suffix">{toPersianDigits(Math.round(value))}٪</span>
      </span>
    </label>
  )
}

export function SettingsPanel({ state }: { state: AppState | null }) {
  const [meta, setMeta] = useState<AppMeta | null>(null)

  useEffect(() => {
    void window.qio.meta().then(setMeta)
  }, [])

  if (!state) return <p className="panel-hint">در حال بارگذاری…</p>
  const { settings, system } = state
  const patch = (next: Partial<Settings>) => void window.qio.patchSettings(next)

  return (
    <div className="settings">
      <section className="settings-group">
        <h3>Qio</h3>
        <Toggle
          label="اجرا هنگام ورود به ویندوز"
          hint={
            meta?.packaged === false
              ? 'در نسخهٔ نصب‌شده در دسترس است'
              : 'بعد از هر ورود به ویندوز، Qio منتظرت است'
          }
          checked={settings.startWithWindows}
          onChange={(next) => patch({ startWithWindows: next })}
        />
        <Toggle
          label="ماسکوت"
          hint="دو چشم که وقتی کامپیوتر ساکت است چرت می‌زند"
          checked={settings.mascot}
          onChange={(next) => patch({ mascot: next })}
        />
        <Toggle
          label="نچ حداقلی"
          hint="یک خط نازک سیاه به‌جای نوار کامل — برای لپ‌تاپ‌هایی با حاشیهٔ بالای ضخیم"
          checked={settings.minimalNotch}
          onChange={(next) => patch({ minimalNotch: next })}
        />
        <Toggle
          label="متن آهنگ"
          hint="وقتی آهنگی شروع می‌شود، متن هم‌زمان را از LRCLIB بگیر"
          checked={settings.lyrics}
          onChange={(next) => patch({ lyrics: next })}
        />
      </section>

      <section className="settings-group">
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
          hint="وقتی هنوز به هدف نرسیده‌ای، یک یادآوری آرام در نچ"
          checked={settings.water.reminders}
          onChange={(next) => patch({ water: { ...settings.water, reminders: next } })}
        />
      </section>

      <section className="settings-group">
        <h3>تایمر تمرین</h3>
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

      <section className="settings-group">
        <h3>صدا و صفحه</h3>
        <SliderRow
          label="صدا"
          icon={system.muted ? <MuteIcon size={14} /> : <VolumeIcon size={14} />}
          value={system.volume ?? 0}
          disabled={system.volume === null}
          onChange={(next) => void window.qio.system.setVolume(next)}
        />
        <Toggle
          label="بی‌صدا"
          checked={system.muted}
          onChange={(next) => void window.qio.system.setMute(next)}
        />
        <SliderRow
          label="روشنایی"
          icon={<SunIcon size={14} />}
          value={system.brightness ?? 0}
          disabled={system.brightness === null}
          onChange={(next) => void window.qio.system.setBrightness(next)}
        />
        {system.brightness === null && (
          <p className="panel-hint">روشنایی روی نمایشگر داخلی لپ‌تاپ کار می‌کند؛ مانیتورهای خارجی کنترل خودشان را دارند.</p>
        )}
      </section>

      <section className="settings-group">
        <h3>درباره</h3>
        <div className="about-line">
          <span>Qio {toPersianDigits(meta?.version ?? '')}</span>
          <span className="panel-hint">
            Electron {toPersianDigits(meta?.electron ?? '')} · Chromium {toPersianDigits(meta?.chrome ?? '')}
          </span>
        </div>
        <p className="panel-hint">
          هر چیزی که Qio به یاد می‌آورد — کارها، ثبت آب، قفسه و تنظیمات — در <code>{meta?.dataPath}</code> می‌ماند.
          بدون حساب، بدون ردیابی. تنها چیزی که از کامپیوترت بیرون می‌رود متن آهنگ است، و فقط عنوان و خواننده به
          LRCLIB می‌رود.
        </p>
        <div className="about-links">
          <button
            type="button"
            className="button"
            onClick={() => void window.qio.window.openExternal('https://lrclib.net')}
          >
            <LinkIcon size={14} /> lrclib.net
          </button>
          <button
            type="button"
            className="button"
            onClick={() => void window.qio.window.openExternal('https://github.com/sahandse/qio')}
          >
            <LinkIcon size={14} /> گیت‌هاب
          </button>
          <button type="button" className="button" onClick={() => void window.qio.window.setVisible(false)}>
            <BoltIcon size={14} /> پنهان کردن از صفحه
          </button>
          <button type="button" className="button danger" onClick={() => void window.qio.window.quit()}>
            خروج از Qio
          </button>
        </div>
      </section>
    </div>
  )
}
