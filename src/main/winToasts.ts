/** Reads Windows' toast history so the alerts page can show it. Read-only and in memory only. */
import { app } from 'electron'
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { filetimeToMs, isOwnToast, parseToastText, toastAppLabel } from '@shared/alerts'

const POLL_MS = 5_000
const APP_ID = 'com.sahandse.qio'
const DB_FILE = 'wpndatabase.db'

export interface MirroredToast {
  id: string
  title: string
  detail?: string
  app: string
  at: number
}

function sourceDir(): string {
  return join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'Windows', 'Notifications')
}

function copyDir(): string {
  const dir = join(app.getPath('temp'), 'qio-alerts')
  mkdirSync(dir, { recursive: true })
  return dir
}

/** Windows keeps the file open; a copy can be read without asking the shell for anything. */
function snapshot(): DatabaseSync {
  const from = sourceDir()
  const to = copyDir()
  for (const suffix of ['', '-wal', '-shm']) {
    const source = join(from, DB_FILE + suffix)
    if (existsSync(source)) copyFileSync(source, join(to, DB_FILE + suffix))
  }
  return new DatabaseSync(join(to, DB_FILE), { readOnly: true })
}

/** Nothing of the toast history should outlive a poll, not even a temp copy. */
function discardCopy(): void {
  const dir = copyDir()
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      rmSync(join(dir, DB_FILE + suffix), { force: true })
    } catch {
      // Windows may hold the file for a moment; the next poll tries again.
    }
  }
}

function readBig<T>(db: DatabaseSync, sql: string, ...params: (string | bigint)[]): T[] {
  const statement = db.prepare(sql)
  statement.setReadBigInts(true)
  return statement.all(...params) as T[]
}

export class WindowsToastReader {
  private timer: NodeJS.Timeout | null = null
  private lastOrder = 0n
  private signature = ''
  private busy = false
  private warned = false
  private readonly onToasts: (toasts: MirroredToast[]) => void

  constructor(onToasts: (toasts: MirroredToast[]) => void) {
    this.onToasts = onToasts
  }

  setEnabled(enabled: boolean): void {
    if (enabled) this.start()
    else this.stop()
  }

  start(): void {
    if (this.timer) return
    try {
      // Only what arrives from now on; everything older stays out of the list.
      this.lastOrder = this.newestOrder()
      this.signature = this.currentSignature()
      this.warned = false
    } catch {
      this.lastOrder = 0n
    }
    this.timer = setInterval(() => this.poll(), POLL_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    discardCopy()
  }

  private currentSignature(): string {
    const dir = sourceDir()
    return [DB_FILE, `${DB_FILE}-wal`]
      .map((name) => {
        const path = join(dir, name)
        if (!existsSync(path)) return '-'
        const stat = statSync(path)
        return `${stat.size}:${stat.mtimeMs}`
      })
      .join('|')
  }

  private newestOrder(): bigint {
    const db = snapshot()
    try {
      const rows = readBig<{ newest: bigint | null }>(
        db,
        'select max("Order") as newest from Notification where Type = ?',
        'toast'
      )
      return rows[0]?.newest ?? 0n
    } finally {
      db.close()
      discardCopy()
    }
  }

  private poll(): void {
    if (this.busy) return
    this.busy = true
    try {
      const toasts = this.readNew()
      if (toasts.length > 0) this.onToasts(toasts)
    } catch (error) {
      if (!this.warned) {
        this.warned = true
        console.warn('[qio] windows toasts unavailable:', error instanceof Error ? error.message : error)
      }
    } finally {
      this.busy = false
    }
  }

  private readNew(): MirroredToast[] {
    const signature = this.currentSignature()
    if (signature === this.signature) return []

    const db = snapshot()
    let handles: Map<bigint, string>
    let rows: {
      Order: bigint
      ArrivalTime: bigint
      Payload: Uint8Array | null
      HandlerId: bigint | null
    }[]
    let newest: bigint
    try {
      handles = new Map(
        readBig<{ RecordId: bigint; PrimaryId: string | null }>(
          db,
          'select RecordId, PrimaryId from NotificationHandler'
        ).map((row) => [row.RecordId, String(row.PrimaryId ?? '')])
      )
      newest = readBig<{ newest: bigint | null }>(
        db,
        'select max("Order") as newest from Notification where Type = ?',
        'toast'
      )[0]?.newest ?? 0n
      if (newest < this.lastOrder) {
        // The Windows database was rebuilt; start over without replaying old rows.
        this.lastOrder = newest
        this.signature = signature
        return []
      }
      rows = readBig(
        db,
        'select "Order", ArrivalTime, Payload, HandlerId from Notification where Type = ? and "Order" > ? order by "Order" asc',
        'toast',
        this.lastOrder
      )
    } finally {
      db.close()
      discardCopy()
    }
    this.signature = signature

    const toasts: MirroredToast[] = []
    let highest = this.lastOrder
    for (const row of rows) {
      if (row.Order <= this.lastOrder) continue
      if (row.Order > highest) highest = row.Order
      const primary = row.HandlerId === null ? '' : (handles.get(row.HandlerId) ?? '')
      if (primary && isOwnToast(primary, APP_ID)) continue
      const payload = row.Payload ? Buffer.from(row.Payload).toString('utf8') : ''
      const parsed = parseToastText(payload)
      if (!parsed) continue
      const at = filetimeToMs(row.ArrivalTime)
      if (!Number.isFinite(at) || at <= 0) continue
      toasts.push({ id: `win:${row.Order}`, title: parsed.title, detail: parsed.detail, app: toastAppLabel(primary), at })
    }
    this.lastOrder = highest
    return toasts
  }
}
