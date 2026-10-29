import { useEffect, useRef, useState } from 'react'
import type { AppState, MascotState } from '@shared/types'
import { toPersianDigits } from '../lib/jalali'
import { useClockPresence } from '../lib/state'
import { ClockDate, ClockText } from './Clock'
import { MuteIcon, SettingsIcon, VolumeIcon } from './Icons'
import { Mascot } from './Mascot'

interface Props {
  state: AppState | null
  expanded: boolean
  title: string
  onOpen: () => void
  onSettings: () => void
  /** Overrides the resting face, e.g. thinking while a focus round runs. */
  mascotState?: MascotState | null
}

const FALLBACK_STYLE = {
  shape: 'oval' as const,
  color: '#eef3f8',
  size: 22,
  gap: 30,
  blink: 5,
  glow: true,
  pupil: false,
  brows: false,
  blush: false,
  hand: true,
  zzz: true,
  sleepAfter: 15,
  reducedMotion: false
}

const FALLBACK_PRESENCE = { mode: 'peek' as const, everyMin: 10, forSec: 12 }

function batteryColor(battery: number, charging: boolean): string {
  if (charging) return '#7ee8a8'
  if (battery <= 20) return '#f08a7a'
  if (battery <= 40) return '#f2c879'
  return 'rgba(255, 255, 255, 0.88)'
}

function BatteryRing({
  battery,
  charging,
  small
}: {
  battery: number
  charging: boolean
  small?: boolean
}) {
  return (
    <span
      className={`battery-ring${charging ? ' charging' : ''}${small ? ' small' : ''}`}
      style={{
        ['--pct' as string]: `${Math.min(100, Math.max(0, battery))}%`,
        ['--ring' as string]: batteryColor(battery, charging)
      }}
      title={`باتری ${toPersianDigits(battery)}٪${charging ? ' — در حال شارژ' : ''}`}
    >
      <span className="battery-core" />
    </span>
  )
}

/** A thin progress hairline: focus first, otherwise today's water. */
function BarEdge({ state }: { state: AppState | null }) {
  const focus = state?.focus
  const running = Boolean(focus?.running)
  const [, tick] = useState(0)

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => tick((value) => value + 1), 1_000)
    return () => window.clearInterval(timer)
  }, [running])

  if (!state) return null

  if (focus?.running && focus.endsAt) {
    const minutes =
      focus.mode === 'work'
        ? state.settings.focus.workMin
        : focus.mode === 'short'
          ? state.settings.focus.shortBreakMin
          : state.settings.focus.longBreakMin
    const total = minutes * 60_000
    const pct = total > 0 ? 1 - Math.max(0, focus.endsAt - Date.now()) / total : 0
    if (pct > 0.005) return <BarEdgeLine pct={pct} color="var(--warn)" />
  }

  const water = state.water
  const pct = water.goalMl > 0 ? water.total / water.goalMl : 0
  if (pct > 0.005) return <BarEdgeLine pct={pct} color="var(--blue)" />
  return null
}

function BarEdgeLine({ pct, color }: { pct: number; color: string }) {
  return (
    <span
      className="bar-edge"
      aria-hidden="true"
      style={{
        ['--edge' as string]: `${Math.min(100, Math.round(pct * 100))}%`,
        ['--edge-color' as string]: color
      }}
    />
  )
}

export function NotchBar({ state, expanded, title, onOpen, onSettings, mascotState }: Props) {
  const battery = state?.system.battery ?? null
  const charging = Boolean(state?.system.charging)
  const muted = Boolean(state?.system.muted)
  const hour24 = state?.system.hour24 ?? true
  const mascot = state?.settings.mascot ?? true
  const mascotStyle = state?.settings.mascotStyle ?? FALLBACK_STYLE
  const minimal = state?.settings.minimalNotch ?? false

  const [face, setFace] = useState<MascotState>('idle')
  const faceRef = useRef<MascotState>('idle')
  const lastMove = useRef(Date.now())
  const slot = useRef<HTMLSpanElement>(null)
  const faceTimer = useRef<number | null>(null)

  const show = (next: MascotState, hold?: number) => {
    if (faceTimer.current) window.clearTimeout(faceTimer.current)
    faceRef.current = next
    setFace(next)
    if (hold) faceTimer.current = window.setTimeout(() => show('idle'), hold)
  }

  const sleepAfter = mascotStyle.sleepAfter

  useEffect(() => {
    const id = window.setInterval(() => {
      const current = faceRef.current
      if (current !== 'idle' && current !== 'sleep') return
      const still = Date.now() - lastMove.current
      const shouldSleep = still > sleepAfter * 1000
      if (shouldSleep && current !== 'sleep') show('sleep')
      if (!shouldSleep && current === 'sleep') show('idle')
    }, 1000)
    return () => window.clearInterval(id)
  }, [sleepAfter])

  useEffect(() => {
    const awake = () => {
      lastMove.current = Date.now()
      if (faceRef.current === 'sleep') {
        show('wave', 2400)
      } else if (faceRef.current !== 'idle' && faceRef.current !== 'wave') {
        return
      }
    }
    const follow = (event: PointerEvent) => {
      const element = slot.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      const clamp = (value: number) => Math.max(-1, Math.min(1, value))
      const x = clamp((event.clientX - rect.left - rect.width / 2) / 90)
      const y = clamp((event.clientY - rect.top - rect.height / 2) / 90)
      element.style.setProperty('--look-x', `${x * 3}px`)
      element.style.setProperty('--look-y', `${y * 2.4}px`)
    }
    const onMove = (event: PointerEvent) => {
      awake()
      follow(event)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', awake)
    window.addEventListener('keydown', awake)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', awake)
      window.removeEventListener('keydown', awake)
      if (faceTimer.current) window.clearTimeout(faceTimer.current)
    }
  }, [])

  const clockOn = useClockPresence(state?.settings.presence ?? FALLBACK_PRESENCE, expanded)

  if (!expanded) {
    const faceState: MascotState =
      mascotState === 'work' || mascotState === 'success' || mascotState === 'error' ? mascotState : face
    return (
      <button
        type="button"
        className={`bar${minimal ? ' minimal' : ''}${clockOn ? '' : ' quiet'}`}
        onClick={onOpen}
        title="باز کردن Qio"
        aria-label="باز کردن Qio"
      >
        <BarEdge state={state} />
        <span className="bar-side">
          {mascot ? (
            <span className="mascot-slot" ref={slot}>
              <Mascot settings={mascotStyle} state={faceState} className="mascot-notch" />
            </span>
          ) : battery != null ? (
            <BatteryRing battery={battery} charging={charging} />
          ) : (
            <span className="status-pin" />
          )}
        </span>
        <ClockText hour24={hour24} className="bar-clock" off={!clockOn} />
      </button>
    )
  }

  return (
    <header className="page-head">
      <span className="page-title">{title}</span>
      <span className="page-status">
        {battery != null && <BatteryRing battery={battery} charging={charging} small />}
        <span className="page-clock-block">
          <ClockText hour24={hour24} className="page-clock" />
          <ClockDate className="page-date" />
        </span>
      </span>
      <span className="page-tools">
        <button
          type="button"
          className={`tool-button${muted ? ' is-muted' : ''}`}
          title={muted ? 'باصدا کردن' : 'بی‌صدا کردن'}
          aria-label={muted ? 'باصدا کردن' : 'بی‌صدا کردن'}
          onClick={() => void window.qio.system.setMute(!muted)}
        >
          {muted ? <MuteIcon size={14} /> : <VolumeIcon size={14} />}
        </button>
        <button type="button" className="tool-button" title="تنظیمات" aria-label="تنظیمات" onClick={onSettings}>
          <SettingsIcon size={13} />
        </button>
      </span>
    </header>
  )
}
