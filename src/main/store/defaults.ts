import { randomUUID } from 'node:crypto'
import {
  PAGE_IDS,
  PAGE_SIZES,
  type AiMessage,
  type AiSettings,
  type AlertSettings,
  type ClipSettings,
  type CoffeeSettings,
  type CoffeeState,
  type FocusState,
  type FootballLeague,
  type FootballSettings,
  type FootballTeam,
  type LaunchSettings,
  type LayoutSettings,
  type MascotSettings,
  type MascotShape,
  type MoveSettings,
  type Note,
  type NoteTint,
  type NotchPosition,
  type PageId,
  type PageSize,
  type PresenceSettings,
  type Settings,
  type ShelfItem,
  type Todo,
  type WaterDay,
  type WaterEntry
} from '@shared/types'
import { AI_PROVIDERS, DEFAULT_SYSTEM_PROMPT } from '@shared/ai'
import { cleanLaunchItems } from '@shared/launch'

/** The shape of qio.json. `version` records which migration produced the file. */
export interface Persisted {
  version: number
  settings: Settings
  todos: Todo[]
  shelf: ShelfItem[]
  notes: Note[]
  water: { date: string; entries: WaterEntry[]; days: WaterDay[] }
  focus: FocusState
  coffee: CoffeeState
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

export const defaultFootball: FootballSettings = {
  enabled: true,
  teams: [],
  leagues: [],
  goalAlerts: true,
  startAlerts: true,
  redAlerts: true,
  finalAlerts: true
}

export const defaultMove: MoveSettings = {
  enabled: true,
  everyMin: 50,
  startHour: 9,
  endHour: 21,
  notify: false
}

export const defaultCoffee: CoffeeSettings = {
  minutes: 30,
  alert: true
}

/** History is opt-in: Qio does not read the clipboard until the user opens the door. */
export const defaultClip: ClipSettings = {
  enabled: false,
  limit: 25
}

/** Mirroring only reads what Windows already shows; nothing leaves the machine. */
export const defaultAlerts: AlertSettings = {
  windows: true
}

/** Quick launch starts empty; the list is only ever grown by the picker in settings. */
export const defaultLaunch: LaunchSettings = {
  items: []
}

/** Every page on the rail, in the shipped order, all one cell large. */
export const defaultLayout: LayoutSettings = {
  order: [...PAGE_IDS],
  hidden: [],
  size: Object.fromEntries(PAGE_IDS.map((id) => [id, '1x1'])) as Record<PageId, PageSize>
}

const PAGE_IDS_SET = new Set<string>(PAGE_IDS)
const PAGE_SIZES_SET = new Set<string>(PAGE_SIZES)

function pageList(raw: unknown): PageId[] {
  if (!Array.isArray(raw)) return []
  const list: PageId[] = []
  for (const entry of raw) {
    if (typeof entry !== 'string' || !PAGE_IDS_SET.has(entry) || list.includes(entry as PageId)) continue
    list.push(entry as PageId)
    if (list.length >= PAGE_IDS.length) break
  }
  return list
}

/** Unknown pages and sizes fall back; new pages land at the end instead of vanishing. */
export function cleanLayout(raw: unknown): LayoutSettings {
  const input = (raw ?? {}) as Partial<LayoutSettings>
  const order = pageList(input.order)
  for (const id of PAGE_IDS) if (!order.includes(id)) order.push(id)
  const hidden = pageList(input.hidden)
  // The rail always keeps one page; when everything is hidden, the first in order comes back.
  if (order.every((id) => hidden.includes(id))) {
    hidden.splice(0, hidden.length, ...order.filter((id) => id !== order[0]))
  }
  const sizes = (input.size ?? {}) as Record<string, unknown>
  const size = {} as Record<PageId, PageSize>
  for (const id of PAGE_IDS) {
    const value = sizes[id]
    size[id] = typeof value === 'string' && PAGE_SIZES_SET.has(value) ? (value as PageSize) : '1x1'
  }
  return { order, hidden, size }
}

/** The cup is a switch, not a stopwatch: nothing is kept when Qio was not holding the screen. */
export function defaultCoffeeState(): CoffeeState {
  return { active: false, startedAt: null, endsAt: null }
}

/** A keep-awake only survives a restart while it still has time left on it. */
export function cleanCoffeeState(raw: unknown): CoffeeState {
  const input = (raw ?? {}) as Partial<CoffeeState>
  if (!input.active) return defaultCoffeeState()
  const endsAt = typeof input.endsAt === 'number' && Number.isFinite(input.endsAt) ? input.endsAt : null
  if (endsAt !== null && endsAt <= Date.now()) return defaultCoffeeState()
  const time = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null
  return { active: true, startedAt: time(input.startedAt), endsAt }
}

const MAX_TEAMS = 10
const MAX_TABLES = 2
const MAX_CREST_CHARS = 400_000

/** Crests are tiny PNG data URLs; anything else is discarded rather than rendered. */
function cleanCrest(raw: unknown): string {
  const value = typeof raw === 'string' ? raw : ''
  if (value.length > MAX_CREST_CHARS) return ''
  return /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value) ? value : ''
}

export function cleanFootballTeams(raw: unknown): FootballTeam[] {
  if (!Array.isArray(raw)) return []
  const teams: FootballTeam[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const team = item as Partial<FootballTeam>
    const id = typeof team.id === 'string' ? team.id.trim().slice(0, 32) : ''
    const name = cleanText(team.name, 80)
    if (!id || !name || seen.has(id)) continue
    seen.add(id)
    teams.push({
      id,
      name,
      logo: cleanCrest(team.logo),
      league: cleanText(team.league, 80),
      leagueId: typeof team.leagueId === 'string' ? team.leagueId.trim().slice(0, 32) : ''
    })
    if (teams.length >= MAX_TEAMS) break
  }
  return teams
}

export function cleanFootballLeagues(raw: unknown): FootballLeague[] {
  if (!Array.isArray(raw)) return []
  const leagues: FootballLeague[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const league = item as Partial<FootballLeague>
    const id = typeof league.id === 'string' ? league.id.trim().slice(0, 32) : ''
    const name = cleanText(league.name, 80)
    if (!id || !name || seen.has(id)) continue
    seen.add(id)
    leagues.push({ id, name })
    if (leagues.length >= MAX_TABLES) break
  }
  return leagues
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
  notchPosition: 'center',
  hideFullscreen: true,
  autoNight: true,
  calm: false,
  seasonal: true,
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
  },
  football: defaultFootball,
  move: defaultMove,
  coffee: defaultCoffee,
  clipboard: defaultClip,
  launch: defaultLaunch,
  alerts: defaultAlerts,
  layout: defaultLayout
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
  const football = (input.football ?? {}) as Partial<Settings['football']>
  const move = (input.move ?? {}) as Partial<Settings['move']>
  const coffee = (input.coffee ?? {}) as Partial<CoffeeSettings>
  const clipboard = (input.clipboard ?? {}) as Partial<ClipSettings>
  const launch = (input.launch ?? {}) as Partial<LaunchSettings>
  const alerts = (input.alerts ?? {}) as Partial<AlertSettings>
  const style = (input.mascotStyle ?? {}) as Partial<MascotSettings>
  const presence = (input.presence ?? {}) as Partial<PresenceSettings>
  const moveStart = clampNumber(move.startHour, 5, 23, defaultMove.startHour)
  const moveEnd = clampNumber(move.endHour, 6, 24, defaultMove.endHour)
  const moveWindow = moveEnd > moveStart ? { start: moveStart, end: moveEnd } : { start: defaultMove.startHour, end: defaultMove.endHour }
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
    notchPosition: (input.notchPosition === 'left' || input.notchPosition === 'right'
      ? input.notchPosition
      : 'center') satisfies NotchPosition,
    hideFullscreen: Boolean(input.hideFullscreen ?? defaultSettings.hideFullscreen),
    autoNight: Boolean(input.autoNight ?? defaultSettings.autoNight),
    calm: Boolean(input.calm ?? defaultSettings.calm),
    seasonal: Boolean(input.seasonal ?? defaultSettings.seasonal),
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
    },
    football: {
      enabled: Boolean(football.enabled ?? defaultFootball.enabled),
      teams: cleanFootballTeams(football.teams),
      leagues: cleanFootballLeagues(football.leagues),
      goalAlerts: Boolean(football.goalAlerts ?? defaultFootball.goalAlerts),
      startAlerts: Boolean(football.startAlerts ?? defaultFootball.startAlerts),
      redAlerts: Boolean(football.redAlerts ?? defaultFootball.redAlerts),
      finalAlerts: Boolean(football.finalAlerts ?? defaultFootball.finalAlerts)
    },
    move: {
      enabled: Boolean(move.enabled ?? defaultMove.enabled),
      everyMin: clampNumber(move.everyMin, 15, 180, defaultMove.everyMin),
      startHour: moveWindow.start,
      endHour: moveWindow.end,
      notify: Boolean(move.notify ?? defaultMove.notify)
    },
    coffee: {
      minutes: clampNumber(coffee.minutes, 5, 240, defaultCoffee.minutes),
      alert: Boolean(coffee.alert ?? defaultCoffee.alert)
    },
    clipboard: {
      enabled: Boolean(clipboard.enabled ?? defaultClip.enabled),
      limit: clampNumber(clipboard.limit, 5, 100, defaultClip.limit)
    },
    launch: {
      items: cleanLaunchItems(launch.items)
    },
    alerts: {
      windows: Boolean(alerts.windows ?? defaultAlerts.windows)
    },
    layout: cleanLayout(input.layout)
  }
}
