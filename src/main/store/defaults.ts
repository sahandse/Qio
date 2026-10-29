import { randomUUID } from 'node:crypto'
import type {
  AiMessage,
  AiSettings,
  FocusState,
  MascotSettings,
  MascotShape,
  Note,
  NoteTint,
  PresenceSettings,
  Settings,
  ShelfItem,
  Todo,
  WaterDay,
  WaterEntry
} from '@shared/types'
import { AI_PROVIDERS, DEFAULT_SYSTEM_PROMPT } from '@shared/ai'

/** The shape of qio.json. `version` records which migration produced the file. */
export interface Persisted {
  version: number
  settings: Settings
  todos: Todo[]
  shelf: ShelfItem[]
  notes: Note[]
  water: { date: string; entries: WaterEntry[]; days: WaterDay[] }
  focus: FocusState
  ai: { settings: AiSettings; messages: AiMessage[] }
}

export const NOTE_TINTS: NoteTint[] = ['mint', 'sky', 'amber', 'violet']
const MASCOT_SHAPES: MascotShape[] = ['oval', 'round', 'soft', 'tall']

export const defaultMascot: MascotSettings = {
  shape: 'oval',
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

export const defaultPresence: PresenceSettings = {
  mode: 'peek',
  everyMin: 10,
  forSec: 12
}

export const defaultAiSettings: AiSettings = {
  provider: 'gapgpt',
  baseUrl: '',
  model: '',
  apiKey: '',
  temperature: 0.7,
  systemPrompt: DEFAULT_SYSTEM_PROMPT
}

export const defaultSettings: Settings = {
  startWithWindows: false,
  minimalNotch: false,
  mascot: true,
  mascotStyle: defaultMascot,
  lyrics: true,
  notchScale: 1,
  hideFullscreen: true,
  autoNight: true,
  presence: defaultPresence,
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

export function defaultFocusState(day = dateKey()): FocusState {
  return {
    mode: 'work',
    endsAt: null,
    running: false,
    pausedMs: 0,
    round: 0,
    completedToday: 0,
    day
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function clampScale(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.round(Math.min(1.5, Math.max(0.85, n)) * 100) / 100
}

/** Same as clampNumber but keeps half steps, for values like the blink interval. */
function clampHalf(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.round(Math.min(max, Math.max(min, n)) * 2) / 2
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function cleanAiSettings(raw: unknown): AiSettings {
  const input = (raw ?? {}) as Partial<AiSettings>
  const provider = AI_PROVIDERS.find((entry) => entry.id === input.provider)?.id ?? defaultAiSettings.provider
  const typedBase = cleanText(input.baseUrl, 300).replace(/\/+$/, '')
  const baseUrl = /^https?:\/\//i.test(typedBase) ? typedBase : ''
  const temperature = clampNumber(Number(input.temperature ?? defaultAiSettings.temperature) * 10, 0, 20, 7) / 10
  return {
    provider,
    baseUrl,
    model: cleanText(input.model, 80),
    apiKey: cleanText(input.apiKey, 300),
    temperature,
    systemPrompt: cleanText(input.systemPrompt, 600) || DEFAULT_SYSTEM_PROMPT
  }
}

export function cleanAiMessages(raw: unknown): AiMessage[] {
  if (!Array.isArray(raw)) return []
  const messages: AiMessage[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const message = item as Partial<AiMessage>
    const text = typeof message.text === 'string' ? message.text.trim().slice(0, 4000) : ''
    if (!text || (message.role !== 'user' && message.role !== 'assistant')) continue
    messages.push({
      id: typeof message.id === 'string' ? message.id : randomUUID(),
      role: message.role,
      text,
      at: Number.isFinite(message.at) ? (message.at as number) : Date.now()
    })
  }
  return messages.slice(-40)
}

export function cleanNote(raw: unknown): Note | null {
  if (!raw || typeof raw !== 'object') return null
  const note = raw as Partial<Note>
  if (typeof note.id !== 'string' || typeof note.text !== 'string' || !note.text.trim()) return null
  const createdAt = Number.isFinite(note.createdAt) ? (note.createdAt as number) : Date.now()
  return {
    id: note.id,
    text: note.text.slice(0, 4000),
    tint: NOTE_TINTS.includes(note.tint as NoteTint) ? (note.tint as NoteTint) : 'mint',
    pinned: Boolean(note.pinned),
    createdAt,
    updatedAt: Number.isFinite(note.updatedAt) ? (note.updatedAt as number) : createdAt
  }
}

export function mergeSettings(raw: unknown): Settings {
  const input = (raw ?? {}) as Partial<Settings>
  const water = (input.water ?? {}) as Partial<Settings['water']>
  const focus = (input.focus ?? {}) as Partial<Settings['focus']>
  const style = (input.mascotStyle ?? {}) as Partial<MascotSettings>
  const presence = (input.presence ?? {}) as Partial<PresenceSettings>
  return {
    startWithWindows: Boolean(input.startWithWindows ?? defaultSettings.startWithWindows),
    minimalNotch: Boolean(input.minimalNotch ?? defaultSettings.minimalNotch),
    mascot: Boolean(input.mascot ?? defaultSettings.mascot),
    mascotStyle: {
      shape: MASCOT_SHAPES.includes(style.shape as MascotShape)
        ? (style.shape as MascotShape)
        : defaultMascot.shape,
      color: /^#[0-9a-f]{6}$/i.test(style.color ?? '') ? (style.color as string).toLowerCase() : defaultMascot.color,
      size: clampNumber(style.size, 14, 32, defaultMascot.size),
      gap: clampNumber(style.gap, 16, 46, defaultMascot.gap),
      blink: clampHalf(style.blink, 2, 9, defaultMascot.blink),
      glow: Boolean(style.glow ?? defaultMascot.glow),
      pupil: Boolean(style.pupil ?? defaultMascot.pupil),
      brows: Boolean(style.brows ?? defaultMascot.brows),
      blush: Boolean(style.blush ?? defaultMascot.blush),
      hand: Boolean(style.hand ?? defaultMascot.hand),
      zzz: Boolean(style.zzz ?? defaultMascot.zzz),
      sleepAfter: clampNumber(style.sleepAfter, 5, 300, defaultMascot.sleepAfter),
      reducedMotion: Boolean(style.reducedMotion ?? defaultMascot.reducedMotion)
    },
    lyrics: Boolean(input.lyrics ?? defaultSettings.lyrics),
    notchScale: clampScale(input.notchScale, defaultSettings.notchScale),
    hideFullscreen: Boolean(input.hideFullscreen ?? defaultSettings.hideFullscreen),
    autoNight: Boolean(input.autoNight ?? defaultSettings.autoNight),
    presence: {
      mode:
        presence.mode === 'always' || presence.mode === 'peek' ? presence.mode : defaultPresence.mode,
      everyMin: clampNumber(presence.everyMin, 1, 180, defaultPresence.everyMin),
      forSec: clampNumber(presence.forSec, 3, 120, defaultPresence.forSec)
    },
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
