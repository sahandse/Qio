import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppMeta } from '@shared/api'
import type { AppState, Settings } from '@shared/types'
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
            {`${hour}`.padStart(2, '0')}:00
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
        <span className="row-suffix">{Math.round(value)}%</span>
      </span>
    </label>
  )
}

export function SettingsPanel({ state }: { state: AppState | null }) {
  const [meta, setMeta] = useState<AppMeta | null>(null)

  useEffect(() => {
    void window.qio.meta().then(setMeta)
  }, [])

  if (!state) return <p className="panel-hint">Loading…</p>
  const { settings, system } = state
  const patch = (next: Partial<Settings>) => void window.qio.patchSettings(next)

  return (
    <div className="settings">
      <section className="settings-group">
        <h3>Qio</h3>
        <Toggle
          label="Start with Windows"
          hint={meta?.packaged === false ? 'Available in the installed build' : 'Qio is waiting for you after every sign-in'}
          checked={settings.startWithWindows}
          onChange={(next) => patch({ startWithWindows: next })}
        />
        <Toggle
          label="Mascot"
          hint="Two eyes that doze off when your PC is quiet"
          checked={settings.mascot}
          onChange={(next) => patch({ mascot: next })}
        />
        <Toggle
          label="Minimal notch"
          hint="A thin black line instead of the full bar — for thick laptop bezels"
          checked={settings.minimalNotch}
          onChange={(next) => patch({ minimalNotch: next })}
        />
        <Toggle
          label="Lyrics"
          hint="Look up synced lyrics on LRCLIB when a song starts"
          checked={settings.lyrics}
          onChange={(next) => patch({ lyrics: next })}
        />
      </section>

      <section className="settings-group">
        <h3>Water</h3>
        <NumberRow
          label="Bottle size"
          value={settings.water.bottleMl}
          min={100}
          max={3000}
          step={50}
          suffix="ml"
          onChange={(next) => patch({ water: { ...settings.water, bottleMl: next } })}
        />
        <NumberRow
          label="Daily goal"
          value={settings.water.goalMl}
          min={250}
          max={8000}
          step={250}
          suffix="ml"
          onChange={(next) => patch({ water: { ...settings.water, goalMl: next } })}
        />
        <HourRow
          label="Reminders start"
          value={settings.water.startHour}
          onChange={(next) => patch({ water: { ...settings.water, startHour: next } })}
        />
        <HourRow
          label="Reminders stop"
          value={settings.water.endHour}
          onChange={(next) => patch({ water: { ...settings.water, endHour: next } })}
        />
        <NumberRow
          label="Remind me every"
          value={settings.water.remindEveryMin}
          min={15}
          max={240}
          step={15}
          suffix="min"
          onChange={(next) => patch({ water: { ...settings.water, remindEveryMin: next } })}
        />
        <Toggle
          label="Water reminders"
          hint="A quiet nudge in the notch while you are under your goal"
          checked={settings.water.reminders}
          onChange={(next) => patch({ water: { ...settings.water, reminders: next } })}
        />
      </section>

      <section className="settings-group">
        <h3>Focus timer</h3>
        <NumberRow
          label="Focus length"
          value={settings.focus.workMin}
          min={5}
          max={120}
          step={5}
          suffix="min"
          onChange={(next) => patch({ focus: { ...settings.focus, workMin: next } })}
        />
        <NumberRow
          label="Short break"
          value={settings.focus.shortBreakMin}
          min={1}
          max={60}
          suffix="min"
          onChange={(next) => patch({ focus: { ...settings.focus, shortBreakMin: next } })}
        />
        <NumberRow
          label="Long break"
          value={settings.focus.longBreakMin}
          min={5}
          max={90}
          step={5}
          suffix="min"
          onChange={(next) => patch({ focus: { ...settings.focus, longBreakMin: next } })}
        />
        <NumberRow
          label="Long break every"
          value={settings.focus.longBreakEvery}
          min={2}
          max={12}
          suffix="rounds"
          onChange={(next) => patch({ focus: { ...settings.focus, longBreakEvery: next } })}
        />
        <Toggle
          label="Chime"
          hint="A soft two-note bell when a session ends"
          checked={settings.focus.chime}
          onChange={(next) => patch({ focus: { ...settings.focus, chime: next } })}
        />
      </section>

      <section className="settings-group">
        <h3>Sound and screen</h3>
        <SliderRow
          label="Volume"
          icon={system.muted ? <MuteIcon size={14} /> : <VolumeIcon size={14} />}
          value={system.volume ?? 0}
          disabled={system.volume === null}
          onChange={(next) => void window.qio.system.setVolume(next)}
        />
        <Toggle
          label="Mute"
          checked={system.muted}
          onChange={(next) => void window.qio.system.setMute(next)}
        />
        <SliderRow
          label="Brightness"
          icon={<SunIcon size={14} />}
          value={system.brightness ?? 0}
          disabled={system.brightness === null}
          onChange={(next) => void window.qio.system.setBrightness(next)}
        />
        {system.brightness === null && (
          <p className="panel-hint">Brightness works on built-in laptop displays; external monitors keep their own controls.</p>
        )}
      </section>

      <section className="settings-group">
        <h3>About</h3>
        <div className="about-line">
          <span>Qio {meta?.version ?? ''}</span>
          <span className="panel-hint">
            Electron {meta?.electron} · Chromium {meta?.chrome}
          </span>
        </div>
        <p className="panel-hint">
          Everything Qio remembers — tasks, water log, shelf and settings — stays in <code>{meta?.dataPath}</code>. No
          account, no analytics. Lyrics are the only thing that leaves your PC, and only the song title and artist go to
          LRCLIB.
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
            <LinkIcon size={14} /> GitHub
          </button>
          <button type="button" className="button" onClick={() => void window.qio.window.setVisible(false)}>
            <BoltIcon size={14} /> Hide from screen
          </button>
          <button type="button" className="button danger" onClick={() => void window.qio.window.quit()}>
            Quit Qio
          </button>
        </div>
      </section>
    </div>
  )
}
