/** The alerts page's memory: newest first, capped, and gone when Qio quits. */
import type { AlertItem, NudgeAction, NudgeKind } from '@shared/types'
import { randomUUID } from 'node:crypto'
import { ALERT_LIMIT } from '@shared/alerts'

export interface AlertRecord {
  kind: NudgeKind
  title: string
  detail?: string
  actions?: NudgeAction[]
  onAction?: (action: string) => void
  source?: AlertItem['source']
  /** A stable id lets the same toast be skipped twice. */
  id?: string
  at?: number
  app?: string
}

export class AlertCenter {
  private items: AlertItem[] = []
  private handlers = new Map<string, (action: string) => void>()
  private readonly onChange: () => void

  constructor(onChange: () => void) {
    this.onChange = onChange
  }

  get list(): AlertItem[] {
    return this.items
  }

  /** Add one alert at the top. Returns its id. */
  record(entry: AlertRecord): string {
    const id = entry.id ?? randomUUID()
    if (this.items.some((item) => item.id === id)) return id
    this.items.unshift({
      id,
      source: entry.source ?? 'qio',
      kind: entry.kind,
      title: entry.title.slice(0, 300),
      detail: entry.detail?.slice(0, 600),
      at: entry.at ?? Date.now(),
      read: false,
      actions: entry.actions ?? [],
      app: entry.app
    })
    if (entry.onAction) this.handlers.set(id, entry.onAction)
    this.trim()
    this.onChange()
    return id
  }

  /** Mirror a batch of Windows toasts, oldest first, so the newest still ends up on top. */
  recordMany(entries: AlertRecord[]): number {
    let added = 0
    for (const entry of entries) {
      const id = entry.id ?? randomUUID()
      if (this.items.some((item) => item.id === id)) continue
      this.items.unshift({
        id,
        source: 'windows',
        kind: 'system',
        title: entry.title.slice(0, 300),
        detail: entry.detail?.slice(0, 600),
        at: entry.at ?? Date.now(),
        read: false,
        actions: [],
        app: entry.app
      })
      added += 1
    }
    if (added > 0) {
      this.trim()
      this.onChange()
    }
    return added
  }

  act(id: string, action: string): boolean {
    const item = this.items.find((entry) => entry.id === id)
    if (!item) return false
    item.read = true
    const handler = this.handlers.get(id)
    this.onChange()
    if (handler) handler(action)
    return true
  }

  read(id: string): boolean {
    const item = this.items.find((entry) => entry.id === id)
    if (!item || item.read) return false
    item.read = true
    this.onChange()
    return true
  }

  readAll(): boolean {
    let changed = false
    for (const item of this.items) {
      if (!item.read) {
        item.read = true
        changed = true
      }
    }
    if (changed) this.onChange()
    return changed
  }

  clear(): boolean {
    if (this.items.length === 0) return false
    this.items = []
    this.handlers.clear()
    this.onChange()
    return true
  }

  private trim(): void {
    if (this.items.length <= ALERT_LIMIT) return
    for (const dropped of this.items.splice(ALERT_LIMIT)) this.handlers.delete(dropped.id)
  }
}
