/** Types shared by the main process, the preload bridge and the renderer. */

export type PanelId =
  | 'calendar'
  | 'music'
  | 'lyrics'
  | 'focus'
  | 'water'
  | 'shelf'
  | 'todo'
  | 'notes'
  | 'ai'
  | 'settings'

export interface WaterSettings {
  bottleMl: number
  goalMl: number
  startHour: number
  endHour: number
  remindEveryMin: number
  reminders: boolean
}

export interface FocusSettings {
  workMin: number
  shortBreakMin: number
  longBreakMin: number
  longBreakEvery: number
  chime: boolean
}

export type MascotShape = 'oval' | 'round' | 'soft' | 'tall'

export type MascotState = 'idle' | 'sleep' | 'wave' | 'think' | 'work' | 'success' | 'error' | 'perm'

/** The pair of eyes that lives on the notch, plus how it is drawn. */
export interface MascotSettings {
  shape: MascotShape
  /** Hex color of the eyes and their small decorations. */
  color: string
  /** Eye height in the 44-unit tall artwork. */
  size: number
  /** Distance between the two eye centers. */
  gap: number
  /** Seconds between blinks. */
  blink: number
  glow: boolean
  pupil: boolean
  brows: boolean
  blush: boolean
  hand: boolean
  zzz: boolean
  /** Seconds of stillness before the eyes close. */
  sleepAfter: number
  reducedMotion: boolean
}

export type PresenceMode = 'always' | 'peek'

/** Whether the clock rests on the notch, or only visits now and then. */
export interface PresenceSettings {
  mode: PresenceMode
  /** Minutes the clock stays away between visits. */
  everyMin: number
  /** Seconds a visit lasts. */
  forSec: number
}

export interface Settings {
  startWithWindows: boolean
  minimalNotch: boolean
  mascot: boolean
  mascotStyle: MascotSettings
  lyrics: boolean
  /** Scale of the notch, 1 = 420x140 pages. Larger by default on wide displays. */
  notchScale: number
  /** Step aside while a game or video is full screen. */
  hideFullscreen: boolean
  /** Warm, dimmed colours between 21:00 and 07:00. */
  autoNight: boolean
  /** Calm mode: no looping motion, no staggered entrances, no rolling digits. */
  calm: boolean
  /** Seasonal tint and festival flourishes on the notch. */
  seasonal: boolean
  presence: PresenceSettings
  water: WaterSettings
  focus: FocusSettings
}

export type AiProviderId =
  | 'openai'
  | 'deepseek'
  | 'gemini'
  | 'qwen'
  | 'grok'
  | 'openrouter'
  | 'gapgpt'
  | 'avalai'
  | 'ollama'
  | 'lmstudio'
  | 'custom'

/** API access for the in-notch assistant. The key never leaves this machine. */
export interface AiSettings {
  provider: AiProviderId
  /** Empty means the provider preset's own address. */
  baseUrl: string
  /** Empty means the provider preset's own model. */
  model: string
  apiKey: string
  temperature: number
  systemPrompt: string
}

/** What renderers see: no key, just whether one is stored. */
export interface AiPublicSettings {
  provider: AiProviderId
  baseUrl: string
  model: string
  temperature: number
  systemPrompt: string
  hasKey: boolean
  /** True when provider, address, model and (if required) key are all in place. */
  ready: boolean
  providerLabel: string
  effectiveModel: string
}

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  at: number
}

export interface AiState {
  settings: AiPublicSettings
  messages: AiMessage[]
}

export type AiEventType = 'delta' | 'done' | 'error'

export interface AiEvent {
  type: AiEventType
  requestId: string
  delta?: string
  /** The assistant message as stored, sent once on done. */
  message?: AiMessage
  error?: string
  stopped?: boolean
}

export interface AiSendResult {
  ok: boolean
  requestId?: string
  error?: string
}

export interface AiTestResult {
  ok: boolean
  error?: string
  ms?: number
}

export interface Todo {
  id: string
  text: string
  done: boolean
  createdAt: number
  dueAt: number | null
  notified: boolean
}

export interface ShelfItem {
  id: string
  kind: 'file' | 'text'
  path: string
  name: string
  size: number
  isDir: boolean
  /** Only for text cards: the copied text. */
  text?: string
  addedAt: number
}

export type NoteTint = 'mint' | 'sky' | 'amber' | 'violet'

/** A short thought the user jotted in the notch. Plain text, pinned to the top when asked. */
export interface Note {
  id: string
  text: string
  tint: NoteTint
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export interface WaterEntry {
  id: string
  ml: number
  at: number
}

export interface WaterDay {
  date: string
  total: number
}

export interface WaterState {
  date: string
  entries: WaterEntry[]
  total: number
  goalMl: number
  days: WaterDay[]
  lastDrinkAt: number | null
}

export type FocusMode = 'work' | 'short' | 'long'

export interface FocusState {
  mode: FocusMode
  /** Wall-clock end of the running session, or null when idle. */
  endsAt: number | null
  running: boolean
  /** Milliseconds left in a paused session, so pause survives a restart. */
  pausedMs: number
  round: number
  completedToday: number
  day: string
}

export type PlaybackStatus = 'playing' | 'paused' | 'stopped' | 'unavailable'

export interface MediaState {
  status: PlaybackStatus
  title: string
  artist: string
  album: string
  duration: number
  position: number
  app: string
  coverKey: string
  canNext: boolean
  canPrevious: boolean
  canSeek: boolean
  receivedAt: number
}

export interface SystemState {
  volume: number | null
  muted: boolean
  brightness: number | null
  capsLock: boolean
  layout: string
  battery: number | null
  charging: boolean | null
  /** Windows' 12/24-hour choice, so the Persian clock matches the taskbar. */
  hour24: boolean
  fullscreen: boolean
  startWithWindows: boolean
}

export interface AppState {
  settings: Settings
  todos: Todo[]
  shelf: ShelfItem[]
  notes: Note[]
  water: WaterState
  focus: FocusState
  ai: AiState
  media: MediaState | null
  system: SystemState
  version: string
}

export type MediaCommand = 'playpause' | 'play' | 'pause' | 'next' | 'previous' | 'seek'

export interface LyricLine {
  time: number
  text: string
}

export interface LyricResult {
  synced: LyricLine[] | null
  plain: string | null
  instrumental: boolean
  source: 'lrclib' | 'none'
  message?: string
}

export type NudgeKind = 'water' | 'focus' | 'todo' | 'power' | 'lyrics' | 'shelf' | 'network' | 'headphones'

export interface Nudge {
  id: string
  kind: NudgeKind
  title: string
  detail?: string
}

export interface OverlayPayload {
  kind: 'volume' | 'brightness' | 'capslock' | 'layout' | 'power'
  value?: number
  muted?: boolean
  capsLock?: boolean
  label?: string
  battery?: number
  charging?: boolean
}
