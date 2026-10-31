/** Whitelists for renderer→main payloads: unknown keys never reach the stored state. */
import type { CoffeeState, FocusState, Settings, Todo } from './types'

type Json = Record<string, unknown>

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function has(object: Json, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function number(raw: unknown, min: number, max: number): number | undefined {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return undefined
  return Math.min(max, Math.max(min, n))
}

function text(raw: unknown, max: number): string | undefined {
  return typeof raw === 'string' ? raw.slice(0, max) : undefined
}

function pickNested(raw: Json, key: string, keys: readonly string[]): Json | undefined {
  const value = raw[key]
  if (!isObject(value)) return undefined
  const picked: Json = {}
  for (const inner of keys) if (has(value, inner)) picked[inner] = value[inner]
  return Object.keys(picked).length > 0 ? picked : undefined
}

const MASCOT_KEYS = [
  'shape',
  'color',
  'size',
  'gap',
  'blink',
  'glow',
  'pupil',
  'brows',
  'blush',
  'hand',
  'zzz',
  'sleepAfter',
  'reducedMotion'
] as const

const WATER_KEYS = ['bottleMl', 'goalMl', 'startHour', 'endHour', 'remindEveryMin', 'reminders'] as const
const FOCUS_SETTING_KEYS = ['workMin', 'shortBreakMin', 'longBreakMin', 'longBreakEvery', 'chime'] as const
const PRESENCE_KEYS = ['mode', 'everyMin', 'forSec'] as const
/** Teams are deliberately absent: only the catalog-driven toggle may change the list. */
const FOOTBALL_KEYS = ['enabled', 'goalAlerts', 'startAlerts', 'redAlerts', 'finalAlerts'] as const
const MOVE_KEYS = ['enabled', 'everyMin', 'startHour', 'endHour', 'notify'] as const
const COFFEE_KEYS = ['minutes', 'alert'] as const
const CLIP_KEYS = ['enabled', 'limit'] as const
/** Page ids and sizes inside these are checked again by cleanLayout in main. */
const LAYOUT_KEYS = ['order', 'hidden', 'size'] as const

const FLAG_KEYS = [
  'startWithWindows',
  'minimalNotch',
  'mascot',
  'lyrics',
  'hideFullscreen',
  'autoNight',
  'calm',
  'seasonal'
] as const

export function pickSettingsPatch(raw: unknown): Partial<Settings> {
  if (!isObject(raw)) return {}
  const patch: Json = {}
  for (const key of FLAG_KEYS) {
    if (has(raw, key) && typeof raw[key] === 'boolean') patch[key] = raw[key]
  }
  if (has(raw, 'notchScale')) {
    const scale = number(raw.notchScale, 0.85, 1.5)
    if (scale !== undefined) patch.notchScale = scale
  }
  for (const [key, keys] of [
    ['mascotStyle', MASCOT_KEYS],
    ['presence', PRESENCE_KEYS],
    ['water', WATER_KEYS],
    ['focus', FOCUS_SETTING_KEYS],
    ['football', FOOTBALL_KEYS],
    ['move', MOVE_KEYS],
    ['coffee', COFFEE_KEYS],
    ['clipboard', CLIP_KEYS],
    ['layout', LAYOUT_KEYS]
  ] as const) {
    const nested = pickNested(raw, key, keys)
    if (nested) patch[key] = nested
  }
  return patch as Partial<Settings>
}

export function pickFocusPatch(raw: unknown): Partial<FocusState> {
  if (!isObject(raw)) return {}
  const patch: Partial<FocusState> = {}
  if (has(raw, 'mode')) {
    const mode = raw.mode
    if (mode === 'work' || mode === 'short' || mode === 'long') patch.mode = mode
  }
  if (has(raw, 'endsAt')) {
    const endsAt = raw.endsAt
    if (endsAt === null) patch.endsAt = null
    else if (typeof endsAt === 'number' && Number.isFinite(endsAt)) patch.endsAt = endsAt
  }
  if (has(raw, 'running') && typeof raw.running === 'boolean') patch.running = raw.running
  if (has(raw, 'pausedMs')) {
    const pausedMs = number(raw.pausedMs, 0, 86_400_000)
    if (pausedMs !== undefined) patch.pausedMs = pausedMs
  }
  if (has(raw, 'round')) {
    const round = number(raw.round, 0, 10_000)
    if (round !== undefined) patch.round = round
  }
  if (has(raw, 'completedToday')) {
    const done = number(raw.completedToday, 0, 10_000)
    if (done !== undefined) patch.completedToday = done
  }
  if (has(raw, 'day')) {
    const day = text(raw.day, 10)
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) patch.day = day
  }
  return patch
}

export function pickTodoPatch(raw: unknown): Partial<Todo> {
  if (!isObject(raw)) return {}
  const patch: Partial<Todo> = {}
  if (has(raw, 'text')) {
    const body = text(raw.text, 300)
    if (body !== undefined) patch.text = body.trim()
  }
  if (has(raw, 'done') && typeof raw.done === 'boolean') patch.done = raw.done
  if (has(raw, 'dueAt')) {
    const dueAt = raw.dueAt
    if (dueAt === null) patch.dueAt = null
    else if (typeof dueAt === 'number' && Number.isFinite(dueAt)) patch.dueAt = dueAt
  }
  if (has(raw, 'notified') && typeof raw.notified === 'boolean') patch.notified = raw.notified
  return patch
}

/** The keep-awake switch: a stamp is either a real wall-clock moment or nothing. */
export function pickCoffeePatch(raw: unknown): Partial<CoffeeState> {
  if (!isObject(raw)) return {}
  const patch: Partial<CoffeeState> = {}
  if (has(raw, 'active') && typeof raw.active === 'boolean') patch.active = raw.active
  for (const key of ['startedAt', 'endsAt'] as const) {
    if (!has(raw, key)) continue
    const value = raw[key]
    if (value === null) patch[key] = null
    else if (typeof value === 'number' && Number.isFinite(value)) patch[key] = value
  }
  return patch
}

/**
 * An exported picture: the kind decides how the body is decoded, so a renderer can
 * never ask the main process to write an arbitrary buffer to an arbitrary path.
 */
export function pickSavePayload(raw: unknown): { kind: 'png' | 'svg'; body: string; name: string } | null {
  if (!isObject(raw)) return null
  const kind = raw.kind === 'png' || raw.kind === 'svg' ? raw.kind : null
  if (!kind) return null
  const body = text(raw.body, 4_000_000)
  if (!body) return null
  const stem = (text(raw.name, 80) ?? 'qio')
    .split(/[/\\]/)
    .pop()
    ?.replace(/[^\p{L}\p{N} ._-]/gu, '')
    .trim()
  return { kind, body, name: `${stem || 'qio'}.${kind}` }
}
