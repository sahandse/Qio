import { useEffect, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import type { AppMeta } from '@shared/api'
import type { AiPublicSettings, AppState, Settings } from '@shared/types'
import { AI_GROUPS, AI_PROVIDERS, providerById } from '@shared/ai'
import { toPersianDigits } from '../lib/jalali'
import {
  BoltIcon,
  CloseIcon,
  InfoIcon,
  MuteIcon,
  SettingsIcon,
  SparklesIcon,
  SunIcon,
  TelegramIcon,
  VolumeIcon,
  WaterIcon
} from './Icons'
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

function AiSettings({ ai }: { ai: AiPublicSettings }) {
  const provider = providerById(ai.provider)
  const [base, setBase] = useState(ai.baseUrl)
  const [model, setModel] = useState(ai.model)
  const [key, setKey] = useState('')
  const [prompt, setPrompt] = useState(ai.systemPrompt)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    setBase(ai.baseUrl)
    setModel(ai.model)
    setPrompt(ai.systemPrompt)
  }, [ai.baseUrl, ai.model, ai.systemPrompt])

  const commit = (patch: Partial<Omit<AiPublicSettings, 'hasKey' | 'ready' | 'providerLabel' | 'effectiveModel'>>) => {
    setResult(null)
    void window.qio.ai.patch(patch)
  }

  const saveKey = async () => {
    if (!key.trim()) return
    await window.qio.ai.setKey(key.trim())
    setKey('')
    setResult({ ok: true, text: 'کلید ذخیره شد — فقط روی همین دستگاه.' })
  }

  const test = async () => {
    setTesting(true)
    setResult(null)
    const outcome = await window.qio.ai.test()
    setTesting(false)
    setResult(
      outcome.ok
        ? { ok: true, text: `اتصال برقرار است${outcome.ms ? ` · ${toPersianDigits((outcome.ms / 1000).toFixed(1))} ثانیه` : ''}` }
        : { ok: false, text: outcome.error ?? 'اتصال برقرار نشد.' }
    )
  }

  return (
    <>
      <section className="settings-card wide">
        <h3>سرویس هوش مصنوعی</h3>
        <div className="ai-prov">
          {AI_GROUPS.map((group) => (
            <div key={group.id} className="ai-prov-group">
              <span className="ai-prov-label">{group.label}</span>
              <div className="ai-prov-chips">
                {AI_PROVIDERS.filter((entry) => entry.group === group.id).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`ai-chip${ai.provider === entry.id ? ' on' : ''}`}
                    title={entry.hint}
                    aria-pressed={ai.provider === entry.id}
                    onClick={() => commit({ provider: entry.id, baseUrl: '', model: '' })}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="settings-note">
          {provider.hint}
          {provider.needsKey ? ' · کلید لازم است' : ' · بدون کلید کار می‌کند'}
        </p>
      </section>

      <section className="settings-card">
        <h3>اتصال</h3>
        <label className="setting-row">
          <span className="setting-text">
            <strong>آدرس سرویس</strong>
            <small>خالی بماند، آدرس پیش‌فرض {provider.label} استفاده می‌شود.</small>
          </span>
          <input
            className="setting-input"
            dir="ltr"
            value={base}
            placeholder={provider.baseUrl || 'https://…/v1'}
            onChange={(event) => setBase(event.target.value)}
            onBlur={() => base !== ai.baseUrl && commit({ baseUrl: base })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
        </label>
        <label className="setting-row">
          <span className="setting-text">
            <strong>مدل</strong>
            <small>خالی بماند، مدل پیش‌فرض سرویس انتخاب می‌شود.</small>
          </span>
          <input
            className="setting-input"
            dir="ltr"
            value={model}
            placeholder={provider.model || 'model-name'}
            onChange={(event) => setModel(event.target.value)}
            onBlur={() => model !== ai.model && commit({ model })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
        </label>
        <label className="setting-row">
          <span className="setting-text">
            <strong>کلید API</strong>
            <small>{ai.hasKey ? 'ذخیره شده — برای جایگزینی، کلید تازه را بگذار.' : 'در qio.json روی همین دستگاه می‌ماند.'}</small>
          </span>
          <input
            className="setting-input"
            dir="ltr"
            type="password"
            autoComplete="off"
            value={key}
            placeholder={ai.hasKey ? '••••••••' : 'sk-…'}
            onChange={(event) => setKey(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void saveKey()
            }}
          />
        </label>
        <div className="settings-actions">
          <button type="button" className="pill" disabled={!key.trim()} onClick={() => void saveKey()}>
            ذخیرهٔ کلید
          </button>
          {ai.hasKey && (
            <button
              type="button"
              className="pill danger"
              onClick={() => {
                void window.qio.ai.setKey('')
                setResult({ ok: true, text: 'کلید حذف شد.' })
              }}
            >
              حذف کلید
            </button>
          )}
        </div>
      </section>

      <section className="settings-card">
        <h3>آزمایش و گفت‌وگو</h3>
        <div className="settings-actions">
          <button type="button" className="pill" disabled={testing || !ai.ready} onClick={() => void test()}>
            {testing ? 'در حال آزمایش…' : 'تست اتصال'}
          </button>
          <button type="button" className="pill danger" onClick={() => void window.qio.ai.clear()}>
            پاک کردن گفت‌وگو
          </button>
        </div>
        {result && <p className={`settings-result${result.ok ? ' ok' : ' bad'}`}>{result.text}</p>}
        <p className="settings-note">
          کلید فقط برای درخواست به همان سرویس فرستاده می‌شود، در لاگ نمی‌آید و به هیچ جای دیگری نمی‌رود.
          گفت‌وگو هم محلی می‌ماند.
        </p>
      </section>

      <section className="settings-card wide">
        <h3>رفتار</h3>
        <label className="setting-row">
          <span className="setting-text">
            <strong>دستور سیستم</strong>
            <small>لحن و زبان پاسخ‌ها؛ مثلاً «کوتاه و فارسی جواب بده».</small>
          </span>
        </label>
        <textarea
          className="settings-textarea"
          rows={2}
          dir="auto"
          value={prompt}
          maxLength={600}
          onChange={(event) => setPrompt(event.target.value)}
          onBlur={() => prompt !== ai.systemPrompt && commit({ systemPrompt: prompt })}
        />
      </section>
    </>
  )
}

type SettingsTab = 'general' | 'mascot' | 'ai' | 'media' | 'health' | 'about'

const TABS: { id: SettingsTab; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: 'general', label: 'عمومی', Icon: SettingsIcon },
  { id: 'mascot', label: 'ماسکوت', Icon: SparklesIcon },
  { id: 'ai', label: 'هوش مصنوعی', Icon: SparklesIcon },
  { id: 'media', label: 'صدا و صفحه', Icon: VolumeIcon },
  { id: 'health', label: 'آب و تمرکز', Icon: WaterIcon },
  { id: 'about', label: 'درباره', Icon: InfoIcon }
]

function tabFrom(value: string): SettingsTab | null {
  return TABS.find((entry) => entry.id === value)?.id ?? null
}

export function SettingsPage() {
  const [state, setState] = useState<AppState | null>(null)
  const [meta, setMeta] = useState<AppMeta | null>(null)
  const [tab, setTab] = useState<SettingsTab>(() => tabFrom(window.location.hash.replace('#', '')) ?? 'general')

  useEffect(() => {
    let alive = true
    void window.qio.getState().then((initial) => {
      if (alive) setState(initial)
    })
    const off = window.qio.onState((next) => setState(next))
    const offTab = window.qio.onSettingsTab((next) => {
      const match = tabFrom(next)
      if (match) setTab(match)
    })
    void window.qio.meta().then((next) => {
      if (alive) setMeta(next)
    })
    return () => {
      alive = false
      off()
      offTab()
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

      <div className="settings-shell">
        <nav className="settings-nav" aria-label="دسته‌های تنظیمات">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`settings-tab${tab === entry.id ? ' on' : ''}`}
              aria-current={tab === entry.id ? 'page' : undefined}
              onClick={() => setTab(entry.id)}
            >
              <entry.Icon size={13} />
              <span>{entry.label}</span>
            </button>
          ))}
        </nav>

        <div className="settings-scroll">
          <div className="settings-grid">
            {tab === 'general' && (
              <>
                <section className="settings-card">
                  <h3>Qio</h3>
                  <Toggle
                    label="اجرا هنگام ورود به ویندوز"
                    hint={meta?.packaged === false ? 'در نسخهٔ نصب‌شده فعال می‌شود' : 'بعد از هر ورود، Qio منتظرت است'}
                    checked={settings.startWithWindows}
                    onChange={(next) => patch({ startWithWindows: next })}
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
                  <h3>ساعت</h3>
                  <div className="setting-row">
                    <span className="setting-text">
                      <strong>حالت ساعت</strong>
                      <small>
                        {settings.presence.mode === 'always'
                          ? 'ساعت همیشه روی نچ می‌ماند.'
                          : 'ساعت بیشتر وقت‌ها کنار می‌رود و هر چند دقیقه یک‌بار برمی‌گردد.'}
                      </small>
                    </span>
                    <span className="setting-chips" role="group" aria-label="حالت ساعت">
                      <button
                        type="button"
                        className={`setting-chip${settings.presence.mode === 'always' ? ' on' : ''}`}
                        aria-pressed={settings.presence.mode === 'always'}
                        onClick={() => patch({ presence: { ...settings.presence, mode: 'always' } })}
                      >
                        همیشه
                      </button>
                      <button
                        type="button"
                        className={`setting-chip${settings.presence.mode === 'peek' ? ' on' : ''}`}
                        aria-pressed={settings.presence.mode === 'peek'}
                        onClick={() => patch({ presence: { ...settings.presence, mode: 'peek' } })}
                      >
                        دوره‌ای
                      </button>
                    </span>
                  </div>
                  {settings.presence.mode === 'peek' && (
                    <>
                      <NumberRow
                        label="هر"
                        value={settings.presence.everyMin}
                        min={1}
                        max={180}
                        suffix="دقیقه"
                        onChange={(next) => patch({ presence: { ...settings.presence, everyMin: next } })}
                      />
                      <NumberRow
                        label="مدت نمایش"
                        value={settings.presence.forSec}
                        min={3}
                        max={60}
                        step={1}
                        suffix="ثانیه"
                        onChange={(next) => patch({ presence: { ...settings.presence, forSec: next } })}
                      />
                      <p className="settings-note">
                        نچ همیشه بالای صفحه می‌ماند؛ فقط ساعت است که در فاصله‌ها پنهان می‌شود. با بردن
                        نشانگر روی نچ یا باز کردن پنل، ساعت همان‌جا می‌ماند.
                      </p>
                    </>
                  )}
                </section>

                <section className="settings-card">
                  <h3>کنترل</h3>
                  <div className="settings-note">
                    کلیدهای ۱ تا ۹ بین صفحه‌ها جابه‌جا می‌شوند، Esc پنل را می‌بندد و چرخ ماوس هم صفحه بعد را می‌آورد.
                  </div>
                  <div className="settings-actions">
                    <button type="button" className="pill" onClick={() => void window.qio.window.setVisible(false)}>
                      <BoltIcon size={12} /> پنهان کردن نچ
                    </button>
                    <button type="button" className="pill danger" onClick={() => void window.qio.window.quit()}>
                      خروج از Qio
                    </button>
                  </div>
                </section>
              </>
            )}

            {tab === 'mascot' && (
              <>
                <section className="settings-card">
                  <h3>نوار نچ</h3>
                  <Toggle
                    label="ماسکوت"
                    hint="یک جفت چشم کوچک روی نچ که پلک می‌زند، می‌خوابد و سلام می‌کند"
                    checked={settings.mascot}
                    onChange={(next) => patch({ mascot: next })}
                  />
                </section>
                <MascotSettingsCard
                  style={settings.mascotStyle}
                  onPatch={(next) => patch({ mascotStyle: { ...settings.mascotStyle, ...next } })}
                />
              </>
            )}

            {tab === 'ai' && <AiSettings ai={state.ai.settings} />}

            {tab === 'media' && (
              <section className="settings-card wide">
                <h3>صدا و صفحه</h3>
                <SliderRow
                  label="صدا"
                  icon={system.muted ? <MuteIcon size={13} /> : <VolumeIcon size={13} />}
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
                  icon={<SunIcon size={13} />}
                  value={system.brightness ?? 0}
                  disabled={system.brightness === null}
                  onChange={(next) => void window.qio.system.setBrightness(next)}
                />
                {system.brightness === null && (
                  <p className="settings-note">
                    روشنایی روی نمایشگر داخلی لپ‌تاپ کار می‌کند؛ مانیتور خارجی کنترل خودش را دارد.
                  </p>
                )}
                <div className="settings-note">
                  ساعت {system.hour24 ? '۲۴ساعته' : '۱۲ساعته'} از ویندوز پیروی می‌کند. تنظیمش در Settings › Time &amp;
                  language است.
                </div>
              </section>
            )}

            {tab === 'health' && (
              <>
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
                  <NumberRow
                    label="یادآوری هر"
                    value={settings.water.remindEveryMin}
                    min={15}
                    max={240}
                    step={15}
                    suffix="دقیقه"
                    onChange={(next) => patch({ water: { ...settings.water, remindEveryMin: next } })}
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
              </>
            )}

            {tab === 'about' && (
              <section className="settings-card settings-about">
                <h3>درباره</h3>
                <button
                  type="button"
                  className="about-telegram"
                  onClick={() => void window.qio.window.openExternal('https://t.me/sahandse')}
                  title="گفت‌وگو در تلگرام"
                >
                  <span className="about-telegram-mark" aria-hidden="true">
                    <TelegramIcon size={17} />
                  </span>
                  <span className="about-telegram-id" dir="ltr">
                    @sahandse
                  </span>
                </button>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
