import { app } from 'electron'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  FocusState,
  Settings,
  ShelfItem,
  Todo,
  WaterDay,
  WaterEntry,
  WaterState
} from '@shared/types'

export interface Persisted {
  version: 1
  settings: Settings
  todos: Todo[]
  shelf: ShelfItem[]
  water: { date: string; entries: WaterEntry[]; days: WaterDay[] }
  focus: FocusState
}

export const defaultSettings: Settings = {
  startWithWindows: false,
  minimalNotch: false,
  mascot: true,
  lyrics: true,
  water: {
    bottleMl: 500,
    goalMl: 2000,
    startHour: 9,
    endHour: 21,
    remindEveryMin: 60,
    reminders: true
  },
  focus: {
    workMin: 25,
    shortBreakMin: 5,
    longBreakMin: 15,
    longBreakEvery: 4,
    chime: true
  }
}

export function dateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function mergeSettings(raw: unknown): Settings {
  const input = (raw ?? {}) as Partial<Settings>
  const water = (input.water ?? {}) as Partial<Settings['water']>
  const focus = (input.focus ?? {}) as Partial<Settings['focus']>
  return {
    startWithWindows: Boolean(input.startWithWindows ?? defaultSettings.startWithWindows),
    minimalNotch: Boolean(input.minimalNotch ?? defaultSettings.minimalNotch),
    mascot: Boolean(input.mascot ?? defaultSettings.mascot),
    lyrics: Boolean(input.lyrics ?? defaultSettings.lyrics),
    water: {
      bottleMl: clampNumber(water.bottleMl, 100, 3000, defaultSettings.water.bottleMl),
      goalMl: clampNumber(water.goalMl, 250, 8000, defaultSettings.water.goalMl),
      startHour: clampNumber(water.startHour, 0, 23, defaultSettings.water.startHour),
      endHour: clampNumber(water.endHour, 1, 24, defaultSettings.water.endHour),
      remindEveryMin: clampNumber(water.remindEveryMin, 15, 240, defaultSettings.water.remindEveryMin),
      reminders: Boolean(water.reminders ?? defaultSettings.water.reminders)
    },
    focus: {
      workMin: clampNumber(focus.workMin, 5, 120, defaultSettings.focus.workMin),
      shortBreakMin: clampNumber(focus.shortBreakMin, 1, 60, defaultSettings.focus.shortBreakMin),
      longBreakMin: clampNumber(focus.longBreakMin, 5, 90, defaultSettings.focus.longBreakMin),
      longBreakEvery: clampNumber(focus.longBreakEvery, 2, 12, defaultSettings.focus.longBreakEvery),
      chime: Boolean(focus.chime ?? defaultSettings.focus.chime)
    }
  }
}

/** Everything Qio remembers lives in one JSON file in the user profile. No accounts, no network. */
export class Store {
  private file: string
  private data: Persisted
  private saveTimer: NodeJS.Timeout | null = null
  private listeners = new Set<() => void>()

  constructor(file = join(app.getPath('userData'), 'qio.json')) {
    this.file = file
    this.data = this.read()
  }

  private defaults(): Persisted {
    return {
      version: 1,
      settings: mergeSettings({}),
      todos: [],
      shelf: [],
      water: { date: dateKey(), entries: [], days: [] },
      focus: {
        mode: 'work',
        endsAt: null,
        running: false,
        pausedMs: 0,
        round: 0,
        completedToday: 0,
        day: dateKey()
      }
    }
  }

  private read(): Persisted {
    const base = this.defaults()
    try {
      const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<Persisted>
      return {
        version: 1,
        settings: mergeSettings(parsed.settings),
        todos: Array.isArray(parsed.todos) ? parsed.todos.filter((t) => t && typeof t.text === 'string') : [],
        shelf: Array.isArray(parsed.shelf) ? parsed.shelf.filter((s) => s && typeof s.path === 'string') : [],
        water: {
          date: typeof parsed.water?.date === 'string' ? parsed.water.date : base.water.date,
          entries: Array.isArray(parsed.water?.entries) ? parsed.water.entries : [],
          days: Array.isArray(parsed.water?.days) ? parsed.water.days.slice(-60) : []
        },
        focus:
          parsed.focus && typeof parsed.focus === 'object'
            ? { ...base.focus, ...parsed.focus, day: parsed.focus.day ?? base.focus.day }
            : base.focus
      }
    } catch {
      return base
    }
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private touch(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.flush(), 250)
    for (const listener of this.listeners) listener()
  }

  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    try {
      mkdirSync(dirname(this.file), { recursive: true })
      const tmp = `${this.file}.tmp`
      writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8')
      renameSync(tmp, this.file)
    } catch (error) {
      console.error('[qio] could not save state', error)
    }
  }

  /** Rolls over midnight: yesterday's water total is archived, the focus counter resets. */
  rollDay(now = new Date()): void {
    const today = dateKey(now)
    if (this.data.water.date !== today) {
      const total = this.data.water.entries.reduce((sum, entry) => sum + entry.ml, 0)
      if (this.data.water.entries.length > 0) {
        this.data.water.days = [
          ...this.data.water.days.filter((day) => day.date !== this.data.water.date),
          { date: this.data.water.date, total }
        ].slice(-60)
      }
      this.data.water.date = today
      this.data.water.entries = []
    }
    if (this.data.focus.day !== today) {
      this.data.focus.day = today
      this.data.focus.completedToday = 0
    }
  }

  get settings(): Settings {
    return this.data.settings
  }

  get todos(): Todo[] {
    return this.data.todos
  }

  get shelf(): ShelfItem[] {
    return this.data.shelf
  }

  get focus(): FocusState {
    return this.data.focus
  }

  waterState(now = new Date()): WaterState {
    this.rollDay(now)
    const entries = this.data.water.entries
    const total = entries.reduce((sum, entry) => sum + entry.ml, 0)
    const byDay = new Map(this.data.water.days.map((day) => [day.date, day.total]))
    byDay.set(this.data.water.date, total)
    const days: WaterDay[] = []
    for (let i = 13; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 86_400_000)
      const key = dateKey(day)
      days.push({ date: key, total: byDay.get(key) ?? 0 })
    }
    return {
      date: this.data.water.date,
      entries,
      total,
      goalMl: this.data.settings.water.goalMl,
      days,
      lastDrinkAt: entries.length > 0 ? entries[entries.length - 1].at : null
    }
  }

  patchSettings(patch: Partial<Settings>): Settings {
    this.data.settings = mergeSettings({ ...this.data.settings, ...patch })
    this.touch()
    return this.data.settings
  }

  addTodo(text: string, dueAt: number | null): Todo {
    const todo: Todo = {
      id: randomUUID(),
      text: text.trim().slice(0, 300),
      done: false,
      createdAt: Date.now(),
      dueAt,
      notified: false
    }
    this.data.todos = [todo, ...this.data.todos].slice(0, 200)
    this.touch()
    return todo
  }

  updateTodo(id: string, patch: Partial<Todo>): void {
    this.data.todos = this.data.todos.map((todo) => (todo.id === id ? { ...todo, ...patch, id } : todo))
    this.touch()
  }

  removeTodo(id: string): void {
    this.data.todos = this.data.todos.filter((todo) => todo.id !== id)
    this.touch()
  }

  clearDoneTodos(): void {
    this.data.todos = this.data.todos.filter((todo) => !todo.done)
    this.touch()
  }

  addShelf(items: Omit<ShelfItem, 'id' | 'addedAt'>[]): void {
    const known = new Set(this.data.shelf.map((item) => item.path.toLowerCase()))
    const fresh = items
      .filter((item) => item.path && !known.has(item.path.toLowerCase()))
      .map((item) => ({ ...item, id: randomUUID(), addedAt: Date.now() }))
    if (fresh.length === 0) return
    this.data.shelf = [...fresh, ...this.data.shelf].slice(0, 60)
    this.touch()
  }

  removeShelf(id: string): void {
    this.data.shelf = this.data.shelf.filter((item) => item.id !== id)
    this.touch()
  }

  clearShelf(): void {
    this.data.shelf = []
    this.touch()
  }

  addWater(ml: number): void {
    this.rollDay()
    const amount = Math.round(Math.min(3000, Math.max(10, ml)))
    this.data.water.entries.push({ id: randomUUID(), ml: amount, at: Date.now() })
    this.touch()
  }

  removeWaterEntry(id: string): void {
    this.data.water.entries = this.data.water.entries.filter((entry) => entry.id !== id)
    this.touch()
  }

  patchFocus(patch: Partial<FocusState>): FocusState {
    this.data.focus = { ...this.data.focus, ...patch }
    this.touch()
    return this.data.focus
  }
}
