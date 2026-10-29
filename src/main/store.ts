import { app } from 'electron'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  AiMessage,
  AiPublicSettings,
  AiSettings,
  FocusState,
  Note,
  NoteTint,
  Settings,
  ShelfItem,
  Todo,
  WaterDay,
  WaterState
} from '@shared/types'
import { aiModel, aiReady, providerById } from '@shared/ai'
import type { Persisted } from './store/defaults'
import {
  NOTE_TINTS,
  cleanAiMessages,
  cleanAiSettings,
  cleanNote,
  dateKey,
  defaultFocusState,
  mergeSettings
} from './store/defaults'
import { CURRENT_VERSION, migrate } from './store/migrate'

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
      version: CURRENT_VERSION,
      settings: mergeSettings({}),
      todos: [],
      shelf: [],
      notes: [],
      water: { date: dateKey(), entries: [], days: [] },
      focus: defaultFocusState(),
      ai: { settings: cleanAiSettings({}), messages: [] }
    }
  }

  private read(): Persisted {
    const base = this.defaults()
    try {
      const parsed = migrate(JSON.parse(readFileSync(this.file, 'utf8'))) as Partial<Persisted>
      return {
        version: CURRENT_VERSION,
        settings: mergeSettings(parsed.settings),
        todos: Array.isArray(parsed.todos) ? parsed.todos.filter((t) => t && typeof t.text === 'string') : [],
        shelf: Array.isArray(parsed.shelf)
          ? parsed.shelf
              .filter((item) => item && (item.kind === 'text' ? typeof item.text === 'string' : typeof item.path === 'string'))
              .map((item) => ({
                ...item,
                kind: item.kind === 'text' ? ('text' as const) : ('file' as const)
              }))
          : [],
        notes: Array.isArray(parsed.notes)
          ? parsed.notes.map(cleanNote).filter((note): note is Note => note !== null).slice(0, 300)
          : [],
        water: {
          date: typeof parsed.water?.date === 'string' ? parsed.water.date : base.water.date,
          entries: Array.isArray(parsed.water?.entries) ? parsed.water.entries : [],
          days: Array.isArray(parsed.water?.days) ? parsed.water.days.slice(-60) : []
        },
        focus:
          parsed.focus && typeof parsed.focus === 'object'
            ? { ...base.focus, ...parsed.focus, day: parsed.focus.day ?? base.focus.day }
            : base.focus,
        ai: {
          settings: cleanAiSettings(parsed.ai?.settings),
          messages: cleanAiMessages(parsed.ai?.messages)
        }
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

  get notes(): Note[] {
    return this.data.notes
  }

  get aiSettings(): AiSettings {
    return this.data.ai.settings
  }

  get aiMessages(): AiMessage[] {
    return this.data.ai.messages
  }

  aiPublic(): AiPublicSettings {
    const ai = this.data.ai.settings
    return {
      provider: ai.provider,
      baseUrl: ai.baseUrl,
      model: ai.model,
      temperature: ai.temperature,
      systemPrompt: ai.systemPrompt,
      hasKey: Boolean(ai.apiKey),
      ready: aiReady(ai),
      providerLabel: providerById(ai.provider).label,
      effectiveModel: aiModel(ai)
    }
  }

  patchAiSettings(patch: Partial<Omit<AiSettings, 'apiKey'>>): AiPublicSettings {
    this.data.ai.settings = cleanAiSettings({ ...this.data.ai.settings, ...patch })
    this.touch()
    return this.aiPublic()
  }

  setAiKey(key: unknown): AiPublicSettings {
    this.data.ai.settings = cleanAiSettings({ ...this.data.ai.settings, apiKey: typeof key === 'string' ? key : '' })
    this.touch()
    return this.aiPublic()
  }

  addAiMessage(role: AiMessage['role'], text: string): AiMessage {
    const message: AiMessage = {
      id: randomUUID(),
      role,
      text: text.trim().slice(0, 4000),
      at: Date.now()
    }
    this.data.ai.messages = [...this.data.ai.messages, message].slice(-40)
    this.touch()
    return message
  }

  clearAiMessages(): void {
    if (this.data.ai.messages.length === 0) return
    this.data.ai.messages = []
    this.touch()
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
    const keyOf = (item: Pick<ShelfItem, 'kind' | 'path' | 'text'>): string =>
      item.kind === 'text' ? `text:${item.text ?? ''}` : item.path.toLowerCase()
    const known = new Set(this.data.shelf.map(keyOf))
    const fresh = items
      .filter((item) => (item.kind === 'text' ? Boolean(item.text) : Boolean(item.path)))
      .filter((item) => {
        const key = keyOf(item)
        if (known.has(key)) return false
        known.add(key)
        return true
      })
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

  addNote(text: string, tint?: NoteTint): Note | null {
    const body = text.trim().slice(0, 4000)
    if (!body) return null
    const now = Date.now()
    const note: Note = {
      id: randomUUID(),
      text: body,
      tint: tint && NOTE_TINTS.includes(tint) ? tint : NOTE_TINTS[this.data.notes.length % NOTE_TINTS.length],
      pinned: false,
      createdAt: now,
      updatedAt: now
    }
    this.data.notes = [note, ...this.data.notes].slice(0, 300)
    this.touch()
    return note
  }

  updateNote(id: string, patch: Partial<Pick<Note, 'text' | 'pinned' | 'tint'>>): void {
    let changed = false
    this.data.notes = this.data.notes.map((note) => {
      if (note.id !== id) return note
      const text = typeof patch.text === 'string' ? patch.text.trim().slice(0, 4000) : note.text
      if (!text) return note
      const tint = patch.tint && NOTE_TINTS.includes(patch.tint) ? patch.tint : note.tint
      const pinned = typeof patch.pinned === 'boolean' ? patch.pinned : note.pinned
      if (text === note.text && tint === note.tint && pinned === note.pinned) return note
      changed = true
      return { ...note, text, tint, pinned, updatedAt: Date.now() }
    })
    if (changed) this.touch()
  }

  removeNote(id: string): void {
    this.data.notes = this.data.notes.filter((note) => note.id !== id)
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
