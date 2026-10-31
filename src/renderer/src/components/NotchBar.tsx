import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState, FocusMode, MascotState } from '@shared/types'
import { toPersianDigits } from '../lib/jalali'
import { useClockPresence } from '../lib/state'
import { ClockDate, ClockText, ClockWeek } from './Clock'
import { ICON, CoffeeIcon, MuteIcon, SettingsIcon, VolumeIcon } from './Icons'
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

/** How far around the bar the pointer still pulls the gaze, in px. */
const GAZE_REACH = 260

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

/** Focus progress from 0 to 1, ticking once a second while a round runs. */
function useFocusProgress(state: AppState | null): number {
  const focus = state?.focus
  const running = Boolean(focus?.running)
  const [, tick] = useState(0)

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => tick((value) => value + 1), 1_000)
    return () => window.clearInterval(timer)
  }, [running])

  if (!focus?.running || !focus.endsAt || !state) return 0
  const minutes =
    focus.mode === 'work'
      ? state.settings.focus.workMin
      : focus.mode === 'short'
        ? state.settings.focus.shortBreakMin
        : state.settings.focus.longBreakMin
  const total = minutes * 60_000
  return total > 0 ? Math.min(1, 1 - Math.max(0, focus.endsAt - Date.now()) / total) : 0
}

/** A thin progress hairline: focus first, otherwise today's water. */
function BarEdge({ state, focusPct }: { state: AppState | null; focusPct: number }) {
  const focus = state?.focus

  if (!state) return null

  if (focus?.running && focus.endsAt && focusPct > 0.005) {
    return <BarEdgeLine pct={focusPct} color={focus.mode === 'work' ? 'var(--warn)' : 'var(--accent)'} />
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

const FOCUS_LABEL: Record<FocusMode, string> = {
  work: 'تمرکز',
  short: 'استراحت کوتاه',
  long: 'استراحت بلند'
}

type BarBadge =
  | { kind: 'match'; title: string; score: string; minute: string }
  | { kind: 'focus'; title: string; left: string; work: boolean }
  | { kind: 'coffee'; title: string; left: string }

function scoreText(score: number | null): string {
  return score === null ? '—' : toPersianDigits(score)
}

function countdownText(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return toPersianDigits(`${`${minutes}`.padStart(2, '0')}:${`${seconds}`.padStart(2, '0')}`)
}

/** Wall clock for badge countdowns; null-parked while nothing needs one. */
function useBadgeNow(active: boolean): number {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (!active) {
      setNow(null)
      return
    }
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [active])
  return now ?? Date.now()
}

/** The collapsed notch says what is happening: a live match, a focus round, then coffee. */
function useBarBadge(state: AppState | null): BarBadge | null {
  const live = state?.football.matches.find((match) => match.status === 'live') ?? null
  const focus = state?.focus.running ? state.focus : null
  const coffee = state?.coffee.active ? state.coffee : null
  const ticking = Boolean(focus?.endsAt) || (coffee?.endsAt ?? null) !== null
  const now = useBadgeNow(ticking)

  if (live) {
    const host = scoreText(live.host.score)
    const guest = scoreText(live.guest.score)
    return {
      kind: 'match',
      title: `${live.host.name} ${host} – ${guest} ${live.guest.name}`,
      score: `${host} – ${guest}`,
      minute: live.minute ? `${toPersianDigits(live.minute)}′` : live.statusLabel || 'زنده'
    }
  }

  if (focus?.endsAt) {
    const left = focus.endsAt - now
    if (left > 0) {
      const time = countdownText(left)
      return {
        kind: 'focus',
        work: focus.mode === 'work',
        left: time,
        title: `${FOCUS_LABEL[focus.mode]} — ${time} مانده`
      }
    }
  }

  if (coffee) {
    if (coffee.endsAt === null) {
      return { kind: 'coffee', left: 'بیدار', title: 'صفحه تا اطلاع بعدی بیدار می‌ماند' }
    }
    const time = countdownText(coffee.endsAt - now)
    return { kind: 'coffee', left: time, title: `صفحه — ${time} دیگر روشن می‌ماند` }
  }

  return null
}

export function NotchBar({ state, expanded, title, onOpen, onSettings, mascotState }: Props) {
  const battery = state?.system.battery ?? null
  const charging = Boolean(state?.system.charging)
  const muted = Boolean(state?.system.muted)
  const hour24 = state?.system.hour24 ?? true
  const mascot = state?.settings.mascot ?? true
  const mascotStyle = state?.settings.mascotStyle ?? FALLBACK_STYLE
  const minimal = state?.settings.minimalNotch ?? false
  const calm = state?.settings.calm ?? false
  const still = calm || mascotStyle.reducedMotion
  const busy = Boolean(state?.focus.running) || mascotState === 'success' || mascotState === 'error'

  const [face, setFace] = useState<MascotState>('idle')
  const faceRef = useRef<MascotState>('idle')
  const [drowsy, setDrowsy] = useState(false)
  const [wake, setWake] = useState(false)
  const drowsyRef = useRef(false)
  const lastMove = useRef(Date.now())
  const slot = useRef<HTMLSpanElement>(null)
  const faceTimer = useRef<number | null>(null)
  const calmRef = useRef(calm)
  const stillRef = useRef(still)
  const busyRef = useRef(busy)
  const expandedRef = useRef(expanded)
  const gaze = useRef({
    x: 0,
    y: 0,
    pointerX: 0,
    pointerY: 0,
    pointerAt: 0,
    lastStep: 0,
    raf: 0,
    centerTimer: 0,
    glanceTimer: 0
  })

  useEffect(() => {
    calmRef.current = calm
    stillRef.current = still
    busyRef.current = busy
    expandedRef.current = expanded
  }, [calm, still, busy, expanded])

  useEffect(() => {
    drowsyRef.current = drowsy
  }, [drowsy])

  /** Saccades are quick; recentering is slow. Duration rides on the slot. */
  const writeGaze = useCallback((x: number, y: number, ms = 90) => {
    const engine = gaze.current
    engine.x = x
    engine.y = y
    const element = slot.current
    if (!element) return
    element.style.setProperty('--look-dur', `${ms}ms`)
    element.style.setProperty('--look-x', `${x.toFixed(2)}px`)
    element.style.setProperty('--look-y', `${y.toFixed(2)}px`)
    element.style.setProperty('--lid-open', y < -1 ? '1.05' : '1')
  }, [])

  /** A blink hides a tiny gaze shift, the way real eyes jump behind closed lids. */
  const nudgeGaze = useCallback(() => {
    if (calmRef.current || stillRef.current) return
    const engine = gaze.current
    const x = Math.max(-3, Math.min(3, engine.x + (Math.random() * 1.6 - 0.8)))
    const y = Math.max(-2.4, Math.min(2.4, engine.y + (Math.random() * 1.2 - 0.6)))
    writeGaze(x, y, 0)
  }, [writeGaze])

  const show = (next: MascotState, hold?: number) => {
    if (faceTimer.current) window.clearTimeout(faceTimer.current)
    setWake(next === 'wave' && faceRef.current === 'sleep')
    if (next !== 'idle') setDrowsy(false)
    faceRef.current = next
    setFace(next)
    if (hold) faceTimer.current = window.setTimeout(() => show('idle'), hold)
  }

  const sleepAfter = mascotStyle.sleepAfter

  // Idle becomes drowsy at 60% of the sleep timer, then asleep; moving wakes with a wave.
  // The panel and busy faces pause the count, so the face never dozes off mid-round.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (expandedRef.current || busyRef.current) {
        lastMove.current = Date.now()
        setDrowsy(false)
        return
      }
      const current = faceRef.current
      if (current !== 'idle' && current !== 'sleep') return
      const stillFor = Date.now() - lastMove.current
      const limit = sleepAfter * 1000
      if (stillFor > limit) {
        if (current !== 'sleep') {
          setDrowsy(false)
          show('sleep')
        }
        return
      }
      if (current === 'sleep') {
        show('idle')
        return
      }
      setDrowsy(stillFor > limit * 0.6)
    }, 1000)
    return () => window.clearInterval(id)
  }, [sleepAfter])

  // One rAF-throttled pointer listener: wake, falloff-weighted gaze, blink-saccade.
  useEffect(() => {
    const engine = gaze.current

    const step = () => {
      engine.raf = 0
      const element = slot.current
      if (!element || calmRef.current || stillRef.current || document.hidden) return
      if (faceRef.current === 'sleep') return
      const now = performance.now()
      if (now - engine.lastStep < 90) return
      const rect = element.getBoundingClientRect()
      const dx = engine.pointerX - (rect.left + rect.width / 2)
      const dy = engine.pointerY - (rect.top + rect.height / 2)
      const pull = Math.max(0, Math.min(1, 1 - Math.hypot(dx, dy) / GAZE_REACH))
      const damp = drowsyRef.current ? 0.6 : 1
      const x = Math.max(-1, Math.min(1, dx / 90)) * 3 * pull * damp
      const y = Math.max(-1, Math.min(1, dy / 90)) * 2.4 * pull * damp
      if (Math.abs(x - engine.x) >= 0.12 || Math.abs(y - engine.y) >= 0.12) {
        engine.lastStep = now
        writeGaze(x, y, 90)
      }
    }

    const track = (event: PointerEvent) => {
      engine.pointerX = event.clientX
      engine.pointerY = event.clientY
      engine.pointerAt = performance.now()
      lastMove.current = Date.now()
      if (faceRef.current === 'sleep') show('wave', 2400)
      if (!engine.raf) engine.raf = window.requestAnimationFrame(step)
      window.clearTimeout(engine.centerTimer)
      engine.centerTimer = window.setTimeout(() => {
        if (performance.now() - engine.pointerAt < 1450) return
        if (calmRef.current || stillRef.current || faceRef.current === 'sleep') return
        writeGaze(0, 0, 420)
      }, 1500)
    }

    const awake = () => {
      lastMove.current = Date.now()
      if (faceRef.current === 'sleep') show('wave', 2400)
    }

    // A longer absence gets a hello on return.
    const onVisible = () => {
      if (document.hidden) return
      const away = Date.now() - lastMove.current
      lastMove.current = Date.now()
      if (faceRef.current === 'sleep' || (away > 120_000 && faceRef.current === 'idle')) {
        show('wave', 2400)
      }
    }

    window.addEventListener('pointermove', track, { passive: true })
    window.addEventListener('pointerdown', awake, { passive: true })
    window.addEventListener('keydown', awake)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('pointermove', track)
      window.removeEventListener('pointerdown', awake)
      window.removeEventListener('keydown', awake)
      document.removeEventListener('visibilitychange', onVisible)
      if (engine.raf) window.cancelAnimationFrame(engine.raf)
      window.clearTimeout(engine.centerTimer)
      engine.raf = 0
    }
  }, [writeGaze])

  // Micro-saccades and the occasional idle glance, only while the bar shows the face.
  useEffect(() => {
    if (still) return
    const engine = gaze.current
    let timer = 0
    const tick = () => {
      const visible = slot.current && !document.hidden
      const quiet = performance.now() - engine.pointerAt > 1400
      if (visible && !calmRef.current && quiet && faceRef.current !== 'sleep') {
        if (Math.random() < 0.3) {
          const side = Math.random() < 0.5 ? -1 : 1
          writeGaze(side * (1.7 + Math.random() * 1.1), (Math.random() - 0.5) * 1.2, 110)
          window.clearTimeout(engine.glanceTimer)
          engine.glanceTimer = window.setTimeout(() => {
            if (performance.now() - engine.pointerAt > 1200) writeGaze(0, 0, 420)
          }, 400)
        } else {
          writeGaze((Math.random() - 0.5) * 1.7, (Math.random() - 0.5) * 1.1, 90)
        }
      }
      timer = window.setTimeout(tick, 2200 + Math.random() * 3000)
    }
    timer = window.setTimeout(tick, 2200 + Math.random() * 3000)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(engine.glanceTimer)
    }
  }, [still, writeGaze])

  // Calm mode parks the gaze at centre and leaves it there.
  useEffect(() => {
    if (!calm) return
    writeGaze(0, 0, 600)
  }, [calm, writeGaze])

  // A focus round starting earns a glance down at the ring around the face.
  const wasRunning = useRef(false)
  useEffect(() => {
    const running = Boolean(state?.focus.running)
    const started = running && !wasRunning.current
    wasRunning.current = running
    if (!started || calmRef.current || stillRef.current) return
    writeGaze(0, 2.2, 110)
    const timer = window.setTimeout(() => {
      if (performance.now() - gaze.current.pointerAt > 1200) writeGaze(0, 0, 420)
    }, 420)
    return () => window.clearTimeout(timer)
  }, [state?.focus.running, writeGaze])

  // Coming back from the panel refreshes the idle timer so the face is awake.
  useEffect(() => {
    if (!expanded) lastMove.current = Date.now()
  }, [expanded])

  const clockOn = useClockPresence(state?.settings.presence ?? FALLBACK_PRESENCE, expanded)
  const focusPct = useFocusProgress(state)
  const badge = useBarBadge(expanded ? null : state)
  const ending = Boolean(state?.focus.running && state.focus.endsAt && state.focus.endsAt - Date.now() <= 10_000)

  /** Each return of a resting clock opens like an eyelid instead of just fading in. */
  const [lidOpening, setLidOpening] = useState(false)
  const wasClockOn = useRef(clockOn)

  useEffect(() => {
    const returned = clockOn && !wasClockOn.current
    wasClockOn.current = clockOn
    if (!returned) {
      setLidOpening(false)
      return
    }
    setLidOpening(true)
    const timer = window.setTimeout(() => setLidOpening(false), 720)
    return () => window.clearTimeout(timer)
  }, [clockOn])

  if (!expanded) {
    const faceState: MascotState =
      mascotState === 'work' || mascotState === 'success' || mascotState === 'error' ? mascotState : face
    const shownBadge = minimal ? null : badge
    return (
      <button
        type="button"
        className={`bar${minimal ? ' minimal' : ''}${clockOn || shownBadge ? '' : ' quiet'}`}
        onClick={onOpen}
        title="باز کردن Qio"
        aria-label="باز کردن Qio"
      >
        <BarEdge state={state} focusPct={focusPct} />
        <span className="bar-side">
          {mascot ? (
            <span className="mascot-slot" ref={slot}>
              <Mascot
                settings={mascotStyle}
                state={faceState}
                className="mascot-notch"
                drowsy={faceState === 'idle' && drowsy}
                wake={wake}
                calm={calm}
                focus={Boolean(state?.focus.running)}
                ending={ending}
                onBlink={nudgeGaze}
              />
              {state?.focus.running && (
                <>
                  <span className={`mascot-halo${state.focus.mode === 'work' ? ' work' : ''}`} aria-hidden="true" />
                  <span
                    className={`mascot-ring${state.focus.mode === 'work' ? ' work' : ''}`}
                    style={{ ['--ring-progress' as string]: `${Math.round(focusPct * 360)}deg` }}
                    aria-hidden="true"
                  />
                </>
              )}
            </span>
          ) : battery != null ? (
            <BatteryRing battery={battery} charging={charging} />
          ) : (
            <span className="status-pin" />
          )}
        </span>
        {shownBadge ? (
          <span
            key={shownBadge.kind}
            className={`bar-badge ${shownBadge.kind}${shownBadge.kind === 'focus' && shownBadge.work ? ' work' : ''}`}
            title={shownBadge.title}
          >
            {shownBadge.kind === 'match' && (
              <>
                <span className="bar-badge-dot" aria-hidden="true" />
                <span className="bar-badge-score">{shownBadge.score}</span>
                <span className="bar-badge-minute">{shownBadge.minute}</span>
              </>
            )}
            {shownBadge.kind === 'focus' && (
              <>
                <span
                  className="bar-badge-ring"
                  style={{ ['--p' as string]: `${Math.round(focusPct * 360)}deg` }}
                  aria-hidden="true"
                />
                <span className="bar-badge-time">{shownBadge.left}</span>
              </>
            )}
            {shownBadge.kind === 'coffee' && (
              <>
                <CoffeeIcon size={ICON.xs} />
                <span className="bar-badge-time">{shownBadge.left}</span>
              </>
            )}
          </span>
        ) : (
          <ClockText hour24={hour24} className={`bar-clock${lidOpening ? ' opening' : ''}`} off={!clockOn} />
        )}
      </button>
    )
  }

  return (
    <header className="page-head">
      <span className="page-title">{title}</span>
      <span className="page-status">
        {battery != null && <BatteryRing battery={battery} charging={charging} small />}
        <span className="page-clock-block">
          <span className="clock-face">
            <ClockText hour24={hour24} className="page-clock" />
            <ClockDate className="page-date" />
          </span>
          <ClockWeek />
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
          {muted ? <MuteIcon size={ICON.sm} /> : <VolumeIcon size={ICON.sm} />}
        </button>
        <button
          type="button"
          className="tool-button"
          title="تنظیمات"
          aria-label="تنظیمات"
          onClick={onSettings}
        >
          <SettingsIcon size={ICON.sm} />
        </button>
      </span>
    </header>
  )
}
