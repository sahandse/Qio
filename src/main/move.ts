import { powerMonitor } from 'electron'
import type { MoveSettings } from '@shared/types'

const TICK_MS = 20_000
/** Five minutes without touching the keyboard means a break happened, not sitting. */
const AWAY_SEC = 5 * 60
const SNOOZE_MS = 10 * 60_000

export interface MoveDeps {
  settings(): MoveSettings
  /** Show the in-notch nudge; the action buttons keep working until it clears. */
  remind(minutes: number): void
  toast(minutes: number): void
}

/**
 * Watches desk time with the system idle clock. Any five-minute stretch without
 * input counts as a break, so standing up, walking away or a meeting all reset
 * the timer; only continuous presence at the desk reaches the reminder.
 */
export class MoveService {
  private readonly deps: MoveDeps
  private timer: NodeJS.Timeout | null = null
  private sittingSince: number | null = null
  private nextAt: number | null = null

  constructor(deps: MoveDeps) {
    this.deps = deps
  }

  start(): void {
    if (this.timer) return
    this.tick()
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  stop(): void {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  }

  handleSettingsChange(): void {
    const settings = this.deps.settings()
    if (!settings.enabled) {
      this.reset()
      return
    }
    if (this.sittingSince !== null) {
      const due = this.sittingSince + settings.everyMin * 60_000
      this.nextAt = this.nextAt === null ? due : Math.min(this.nextAt, due)
    }
  }

  /** 'moved' starts a fresh interval, 'snooze' pushes the next reminder back ten minutes. */
  handleAction(action: string): void {
    if (action === 'moved') {
      this.reset()
      return
    }
    if (action === 'snooze') this.nextAt = Date.now() + SNOOZE_MS
  }

  private reset(): void {
    this.sittingSince = null
    this.nextAt = null
  }

  private tick(): void {
    const settings = this.deps.settings()
    const now = Date.now()
    const date = new Date(now)
    const hour = date.getHours() + date.getMinutes() / 60
    if (!settings.enabled || hour < settings.startHour || hour >= settings.endHour) {
      this.reset()
      return
    }
    if (idleSeconds() >= AWAY_SEC) {
      this.reset()
      return
    }
    if (this.sittingSince === null) {
      this.sittingSince = now
      this.nextAt = now + settings.everyMin * 60_000
      return
    }
    if (this.nextAt === null) this.nextAt = this.sittingSince + settings.everyMin * 60_000
    if (now < this.nextAt) return

    const minutes = Math.max(settings.everyMin, Math.round((now - this.sittingSince) / 60_000))
    this.nextAt = now + settings.everyMin * 60_000
    this.deps.remind(minutes)
    if (settings.notify) this.deps.toast(minutes)
  }
}

function idleSeconds(): number {
  try {
    return powerMonitor.getSystemIdleTime()
  } catch {
    // If Windows cannot answer, assume the desk is occupied.
    return 0
  }
}
