import { powerSaveBlocker } from 'electron'
import type { CoffeeState } from '@shared/types'

/** Short enough that the cup runs out on the minute, cheap enough to leave ticking. */
const TICK_MS = 2_000

export const COFFEE_MIN_MINUTES = 5
export const COFFEE_MAX_MINUTES = 240

interface CoffeeDeps {
  state(): CoffeeState
  patch(patch: Partial<CoffeeState>): void
  /** Called once when a timed cup runs out, with the minutes it promised. */
  finished(minutes: number): void
}

/**
 * Keep-awake: holds the display on through `powerSaveBlocker`, so a screen share or a
 * recipe on the second monitor never dies mid-way. Nothing here can outlive Qio — the
 * blocker is released on quit — and the request is never written anywhere but qio.json.
 */
export class CoffeeService {
  private blocker: number | null = null
  private timer: NodeJS.Timeout | null = null

  constructor(private readonly deps: CoffeeDeps) {}

  start(): void {
    this.apply()
    if (!this.timer) this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  /** Lets the screen sleep again without touching the stored cup, so it can resume on launch. */
  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.hold(false)
  }

  /** `null` minutes means the cup stays until the user puts it down. */
  brew(rawMinutes: number | null): CoffeeState {
    const minutes = Number.isFinite(rawMinutes as number)
      ? Math.round(Math.min(COFFEE_MAX_MINUTES, Math.max(COFFEE_MIN_MINUTES, rawMinutes as number)))
      : null
    const now = Date.now()
    this.deps.patch({ active: true, startedAt: now, endsAt: minutes === null ? null : now + minutes * 60_000 })
    this.apply()
    return this.deps.state()
  }

  release(): CoffeeState {
    this.deps.patch({ active: false, startedAt: null, endsAt: null })
    this.apply()
    return this.deps.state()
  }

  /** The two buttons on the "time is up" nudge. */
  handleAction(action: string, minutes: number): void {
    if (action === 'again') this.brew(minutes)
    else if (action === 'always') this.brew(null)
  }


  private tick(): void {
    const state = this.deps.state()
    if (!state.active || state.endsAt === null) return
    if (Date.now() < state.endsAt) return
    const startedAt = state.startedAt ?? Date.now()
    const promised = Math.max(1, Math.round((state.endsAt - startedAt) / 60_000))
    this.release()
    this.deps.finished(promised)
  }

  private apply(): void {
    this.hold(this.deps.state().active)
  }

  /** One blocker handle at a time: starting twice would leak a hold the stop could not clear. */
  private hold(on: boolean): void {
    try {
      if (on && this.blocker === null) this.blocker = powerSaveBlocker.start('prevent-display-sleep')
      else if (!on && this.blocker !== null) {
        if (powerSaveBlocker.isStarted(this.blocker)) powerSaveBlocker.stop(this.blocker)
        this.blocker = null
      }
    } catch (error) {
      console.error('[qio] keep-awake failed', error)
      this.blocker = null
    }
  }
}
