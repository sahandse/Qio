/** Types shared by the main process, the preload bridge and the renderer. */

export type PanelId =
  | 'calendar'
  | 'music'
  | 'lyrics'
  | 'focus'
  | 'water'
  | 'football'
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

/** A team the user follows. The crest is a small data URL so the notch works offline. */
export interface FootballTeam {
  id: string
  name: string
  logo: string
  league: string
}

export interface FootballSettings {
  enabled: boolean
  /** At most ten teams are kept. */
  teams: FootballTeam[]
  goalAlerts: boolean
  startAlerts: boolean
  redAlerts: boolean
  finalAlerts: boolean
}

/** Stand-up reminder: fires only while the user is actually sitting at the desk. */
export interface MoveSettings {
  enabled: boolean
  /** Minutes of continuous desk time before the nudge. */
  everyMin: number
  startHour: number
  endHour: number
  /** Also raise a Windows toast, for when the notch is out of sight. */
  notify: boolean
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
  football: FootballSettings
  move: MoveSettings
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

export type FootballStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'canceled'

export type FootballEventKind = 'goal' | 'penalty' | 'yellow' | 'red' | 'sub' | 'var' | 'other'

/** One team's half of a match, with the score filled in once there is one. */
export interface FootballSide {
  id: string
  name: string
  /** Data URL; the notch never touches the network itself. */
  logo: string
  score: number | null
}

export interface FootballEvent {
  id: string
  kind: FootballEventKind
  /** The provider's minute as shown, e.g. "45+2" or "67". */
  minute: string
  /** Numeric minute for ordering (45+2 sorts as 45). */
  order: number
  side: 'host' | 'guest'
  player: string
  /** Second player: the assist on a goal, or the one going off on a substitution. */
  other: string
  /** The provider's own Persian sentence. */
  text: string
}

export interface FootballMatch {
  id: string
  status: FootballStatus
  /** Persian label from the provider ("نیمه دوم", "نتیجه نهایی", ...). */
  statusLabel: string
  /** Live minute as shown, or null when the clock is not running. */
  minute: string | null
  /** Kickoff in UTC milliseconds, or null when the provider omits it. */
  kickoffAt: number | null
  /** The provider's Tehran clock, e.g. "16:45". */
  clock: string
  /** The provider's Jalali day, e.g. "8 آبان 1405". */
  day: string
  league: string
  stage: string
  host: FootballSide
  guest: FootballSide
  events: FootballEvent[]
  /** The provider has an events feed for this match. */
  hasDetails: boolean
  /** True once a detail response has filled `events`; empty then means "no events", not "not asked yet". */
  eventsLoaded: boolean
}

/** What the notch and settings receive: today's matches for the followed teams. */
export interface FootballView {
  enabled: boolean
  teams: FootballTeam[]
  /** Today's matches involving a followed team, live first, then by kickoff. */
  matches: FootballMatch[]
  /** True when any of those matches is live right now. */
  live: boolean
  updatedAt: number | null
  /** True while the very first fetch is in flight. */
  loading: boolean
  /** Provider failure, kept so the panel can say the data is stale. */
  error: string | null
}

/** A pickable team, gathered from the matches of the surrounding days. */
export interface FootballCatalogTeam {
  id: string
  name: string
  /** Remote crest address; used once, when the team is picked, to build a data URL. */
  logo: string
  league: string
  /** Matches in the covered window. */
  matches: number
  /** Next kickoff still ahead (or in progress), in UTC milliseconds; 0 when none. */
  nextAt: number
}

export interface FootballCatalog {
  teams: FootballCatalogTeam[]
  updatedAt: number | null
  loading: boolean
  error: string | null
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
  football: FootballView
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

export type NudgeKind =
  | 'water'
  | 'focus'
  | 'todo'
  | 'power'
  | 'lyrics'
  | 'shelf'
  | 'network'
  | 'headphones'
  | 'move'
  | 'football'

export interface NudgeAction {
  id: string
  label: string
  /** The filled button; the rest are quiet. */
  primary?: boolean
}

export interface Nudge {
  id: string
  kind: NudgeKind
  title: string
  detail?: string
  actions?: NudgeAction[]
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
