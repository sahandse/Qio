/**
 * Varzesh3's public livescore JSON, turned into the small shapes Qio draws.
 * Everything here is pure so it can be tested without Electron or the network.
 */
import { toPersianDigits } from './persian'
import type {
  FootballCatalogTeam,
  FootballEvent,
  FootballEventKind,
  FootballMatch,
  FootballSettings,
  FootballSide,
  FootballStatus,
  FootballTeam
} from './types'

type Json = Record<string, unknown>

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function record(value: unknown): Json {
  return isObject(value) ? value : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function count(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.max(0, Math.round(value))
}

function idOf(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value))
  if (typeof value === 'string') return value.trim()
  return ''
}

/** "لیگ برتر ایران - هفته 11" becomes league "لیگ برتر ایران" and stage "هفته 11". */
export function cleanLeagueTitle(title: string): { league: string; stage: string } {
  const full = title.trim()
  const cut = full.indexOf(' - ')
  if (cut < 0) return { league: full, stage: '' }
  return { league: full.slice(0, cut).trim(), stage: full.slice(cut + 3).trim() }
}

export function defaultStatusLabel(status: FootballStatus): string {
  if (status === 'live') return 'زنده'
  if (status === 'finished') return 'پایان'
  if (status === 'postponed') return 'تعویق'
  if (status === 'canceled') return 'لغو'
  return 'شروع نشده'
}

export function footballStatus(rawStatus: unknown, isLive: unknown): FootballStatus {
  const status = count(rawStatus)
  if (isLive === true || status === 2) return 'live'
  if (status === 7 || status === 8) return 'finished'
  if (status === 4) return 'postponed'
  if (status === 5) return 'canceled'
  return 'scheduled'
}

/** Provider minutes look like "67" or "45+2"; anything else is not a clock. */
export function cleanMinute(value: unknown): string | null {
  const raw = text(value)
  const match = /(\d{1,3})(?:\s*\+\s*(\d{1,2}))?/.exec(raw)
  if (!match) return null
  const base = Number(match[1])
  if (base > 130) return null
  return match[2] ? `${base}+${Number(match[2])}` : String(base)
}

function minuteOrder(minute: string | null): number {
  if (!minute) return 0
  const base = Number(minute.split('+')[0])
  return Number.isFinite(base) ? base : 0
}

function parseSide(raw: unknown, score: number | null): FootballSide {
  const side = record(raw)
  const name = text(side.name)
  return {
    id: idOf(side.id) || name,
    name,
    logo: text(side.logo),
    score
  }
}

function parseScores(raw: unknown): [number | null, number | null] {
  const goals = record(raw)
  return [count(goals.host), count(goals.guest)]
}

function parseKickoff(value: unknown): number | null {
  const raw = text(value)
  if (!raw) return null
  const at = Date.parse(raw)
  return Number.isFinite(at) ? at : null
}

function parseMatchBase(raw: Json, leagueTitle: string): FootballMatch | null {
  const id = idOf(raw.id)
  const hostRaw = record(raw.host)
  const guestRaw = record(raw.guest)
  const hostName = text(hostRaw.name)
  const guestName = text(guestRaw.name)
  if (!id || !hostName || !guestName) return null
  const status = footballStatus(raw.status, raw.isLive)
  const [hostScore, guestScore] = parseScores(raw.goals)
  const { league, stage } = cleanLeagueTitle(leagueTitle)
  const label = text(raw.statusTitle)
  const minute = status === 'live' ? cleanMinute(raw.liveTime) : null
  return {
    id,
    status,
    statusLabel: label || defaultStatusLabel(status),
    minute,
    kickoffAt: parseKickoff(raw.startOnUtc),
    clock: text(raw.time),
    day: text(raw.date),
    league,
    stage,
    host: parseSide(hostRaw, hostScore),
    guest: parseSide(guestRaw, guestScore),
    events: [],
    hasDetails: raw.hasDetails === true,
    eventsLoaded: false
  }
}

function eventMinute(raw: Json): { minute: string; order: number } {
  const fromClock = cleanMinute(raw.time)
  if (fromClock) return { minute: fromClock, order: minuteOrder(fromClock) }
  const carried = count(raw.rawTime)
  if (carried !== null) return { minute: String(carried), order: carried }
  return { minute: '', order: 0 }
}

function eventKind(raw: Json): FootballEventKind {
  const type = count(raw.eventType)
  if (type === 1) return 'goal'
  if (type === 2) {
    const card = count(raw.cardType)
    return card === 2 || card === 3 ? 'red' : 'yellow'
  }
  if (type === 3) return 'penalty'
  if (type === 4) return 'sub'
  if (type === 5) return 'var'
  return 'other'
}

function eventPlayer(kind: FootballEventKind, raw: Json): string {
  if (kind === 'goal') return text(raw.strickerName) || text(raw.kickerName) || text(raw.offendingPlayerName)
  if (kind === 'penalty') return text(raw.kickerName) || text(raw.strickerName) || text(raw.offendingPlayerName)
  if (kind === 'yellow' || kind === 'red') return text(raw.offendingPlayerName)
  if (kind === 'sub') return text(raw.incomingPlayerName)
  return text(raw.offendingPlayerName) || text(raw.strickerName)
}

function eventOther(kind: FootballEventKind, raw: Json): string {
  if (kind === 'sub') return text(raw.outgoingPlayerName)
  if (kind === 'goal' || kind === 'penalty') return text(raw.assisterName)
  return ''
}

export function parseFootballEvent(raw: unknown, matchId: string, index: number): FootballEvent | null {
  if (!isObject(raw)) return null
  const kind = eventKind(raw)
  const player = eventPlayer(kind, raw)
  const textOfEvent = text(raw.description)
  if (kind === 'other' && !player && !textOfEvent) return null
  const { minute, order } = eventMinute(raw)
  const side = count(raw.side) === 1 ? 'guest' : 'host'
  return {
    id: idOf(raw.id) || `${matchId}:${index}`,
    kind,
    minute,
    order,
    side,
    player,
    other: eventOther(kind, raw),
    text: textOfEvent
  }
}

export function sortFootballEvents(events: FootballEvent[]): FootballEvent[] {
  return [...events].sort((a, b) => a.order - b.order)
}

/** The whole livescore payload: leagues → days → matches. Only football is kept. */
export function parseLivescore(raw: unknown): FootballMatch[] {
  if (!Array.isArray(raw)) return []
  const matches: FootballMatch[] = []
  for (const leagueRaw of raw) {
    if (!isObject(leagueRaw)) continue
    if (count(leagueRaw.sport) !== 1) continue
    const leagueTitle = text(leagueRaw.title)
    const days = Array.isArray(leagueRaw.dates) ? leagueRaw.dates : []
    for (const dayRaw of days) {
      if (!isObject(dayRaw)) continue
      const dayMatches = Array.isArray(dayRaw.matches) ? dayRaw.matches : []
      for (const matchRaw of dayMatches) {
        if (!isObject(matchRaw)) continue
        const match = parseMatchBase(matchRaw, leagueTitle)
        if (match) matches.push(match)
      }
    }
  }
  return sortMatches(matches)
}

/** One match's detail page: the same match plus its events. */
export function parseMatchDetail(raw: unknown): FootballMatch | null {
  if (!isObject(raw)) return null
  const leagueTitle = text(record(raw.league).title)
  const match = parseMatchBase(raw, leagueTitle)
  if (!match) return null
  const list = Array.isArray(raw.events) ? raw.events : []
  match.events = sortFootballEvents(
    list
      .map((event, index) => parseFootballEvent(event, match.id, index))
      .filter((event): event is FootballEvent => event !== null)
  )
  match.hasDetails = true
  match.eventsLoaded = true
  return match
}

const STATUS_RANK: Record<FootballStatus, number> = {
  live: 0,
  scheduled: 1,
  postponed: 2,
  canceled: 3,
  finished: 4
}

/** Live first, then the next kickoff, then what already happened (newest first). */
export function sortMatches(matches: FootballMatch[]): FootballMatch[] {
  return [...matches].sort((a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status]
    if (rank !== 0) return rank
    const aAt = a.kickoffAt ?? 0
    const bAt = b.kickoffAt ?? 0
    if (aAt !== bAt) return a.status === 'finished' ? bAt - aAt : aAt - bAt
    return a.league.localeCompare(b.league, 'fa') || a.host.name.localeCompare(b.host.name, 'fa')
  })
}

export function matchHasTeam(match: FootballMatch, teamIds: Set<string>): boolean {
  return teamIds.has(match.host.id) || teamIds.has(match.guest.id)
}

export function followedMatches(matches: FootballMatch[], teams: Pick<FootballTeam, 'id'>[]): FootballMatch[] {
  const ids = new Set(teams.map((team) => team.id))
  if (ids.size === 0) return []
  return sortMatches(matches.filter((match) => matchHasTeam(match, ids)))
}

/**
 * Applies a detail response to the slate row it belongs to: status, score and
 * events come from the detail; crests already downloaded by main are kept.
 */
export function mergeMatchDetail(base: FootballMatch, detail: FootballMatch): FootballMatch {
  const keepLabel = detail.statusLabel === defaultStatusLabel(detail.status) ? base.statusLabel : detail.statusLabel
  return {
    ...base,
    status: detail.status,
    statusLabel: keepLabel || defaultStatusLabel(detail.status),
    minute: detail.status === 'live' ? (detail.minute ?? base.minute) : null,
    clock: detail.clock || base.clock,
    day: detail.day || base.day,
    kickoffAt: detail.kickoffAt ?? base.kickoffAt,
    league: base.league || detail.league,
    stage: base.stage || detail.stage,
    host: { ...base.host, score: detail.host.score ?? base.host.score },
    guest: { ...base.guest, score: detail.guest.score ?? base.guest.score },
    events: detail.events,
    hasDetails: true,
    eventsLoaded: true
  }
}

/** Unique teams from any number of days, next kickoff and match count included. */
export function buildCatalog(matches: FootballMatch[], now = Date.now()): FootballCatalogTeam[] {
  const liveCutoff = now - 3 * 3_600_000
  const byId = new Map<string, FootballCatalogTeam>()
  for (const match of matches) {
    const at = match.kickoffAt
    const upcoming = at !== null && at >= liveCutoff
    for (const side of [match.host, match.guest]) {
      if (!side.id) continue
      const known = byId.get(side.id)
      if (!known) {
        byId.set(side.id, {
          id: side.id,
          name: side.name,
          logo: side.logo,
          league: match.league,
          matches: 1,
          nextAt: upcoming ? at : 0
        })
        continue
      }
      known.matches += 1
      if (upcoming && (known.nextAt === 0 || at < known.nextAt)) {
        known.nextAt = at
        known.league = match.league || known.league
      }
    }
  }
  return [...byId.values()].sort((a, b) => {
    if (a.nextAt === 0 && b.nextAt !== 0) return 1
    if (b.nextAt === 0 && a.nextAt !== 0) return -1
    if (a.nextAt !== b.nextAt) return a.nextAt - b.nextAt
    return a.name.localeCompare(b.name, 'fa')
  })
}

/** "تراکتور ۲ – ۱ ذوب آهن", or just the fixture before there is a score. */
export function scoreLine(match: FootballMatch, digits: (value: string | number) => string = toPersianDigits): string {
  const host = match.host.score
  const guest = match.guest.score
  if (host === null || guest === null) return `${match.host.name} – ${match.guest.name}`
  return `${match.host.name} ${digits(host)} – ${digits(guest)} ${match.guest.name}`
}

export type FootballAlertKind = 'goal' | 'start' | 'red' | 'final'

export interface FootballAlert {
  /** Stable identity, so the service can tell a new goal from one it already showed. */
  key: string
  kind: FootballAlertKind
  matchId: string
  title: string
  detail: string
}

type AlertPrefs = Pick<FootballSettings, 'goalAlerts' | 'startAlerts' | 'redAlerts' | 'finalAlerts'>

function sideName(match: FootballMatch, event: FootballEvent): string {
  return event.side === 'host' ? match.host.name : match.guest.name
}

function goalAlerts(previous: FootballMatch | null, next: FootballMatch, prefs: AlertPrefs): FootballAlert[] {
  if (!prefs.goalAlerts) return []
  const known = new Set(previous?.events.map((event) => event.id))
  // Events that arrive with the very first detail response are history, not news.
  const scored = previous?.eventsLoaded
    ? next.events.filter((event) => event.kind === 'goal' && !known.has(event.id))
    : []
  if (scored.length > 0) {
    return scored.map((event) => ({
      key: `goal:${next.id}:${event.id}`,
      kind: 'goal' as const,
      matchId: next.id,
      title: event.player ? `گل — ${event.player}` : 'گل',
      detail: [scoreLine(next), event.minute && `دقیقه ${toPersianDigits(event.minute)}`]
        .filter(Boolean)
        .join(' · ')
    }))
  }
  const before = previous?.host.score ?? null
  const beforeGuest = previous?.guest.score ?? null
  const host = next.host.score
  const guest = next.guest.score
  if (before !== null && beforeGuest !== null && host !== null && guest !== null && (host > before || guest > beforeGuest)) {
    return [
      {
        key: `score:${next.id}:${host}-${guest}`,
        kind: 'goal',
        matchId: next.id,
        title: 'گل',
        detail: scoreLine(next)
      }
    ]
  }
  return []
}

function redAlerts(previous: FootballMatch | null, next: FootballMatch, prefs: AlertPrefs): FootballAlert[] {
  if (!prefs.redAlerts || !previous?.eventsLoaded) return []
  const known = new Set(previous.events.map((event) => event.id))
  return next.events
    .filter((event) => event.kind === 'red' && !known.has(event.id))
    .map((event) => ({
      key: `red:${next.id}:${event.id}`,
      kind: 'red' as const,
      matchId: next.id,
      title: 'کارت قرمز',
      detail: [sideName(next, event), event.player, event.minute && `دقیقه ${toPersianDigits(event.minute)}`]
        .filter(Boolean)
        .join(' · ')
    }))
}

/**
 * What changed between two observations of the same match. Passing `null` as the
 * previous state seeds the match silently, so opening Qio mid-game does not
 * replay every goal.
 */
export function footballAlerts(previous: FootballMatch | null, next: FootballMatch, prefs: AlertPrefs): FootballAlert[] {
  if (!previous) return []
  const alerts: FootballAlert[] = []
  if (prefs.startAlerts && previous.status !== 'live' && next.status === 'live') {
    alerts.push({
      key: `start:${next.id}`,
      kind: 'start',
      matchId: next.id,
      title: 'شروع بازی',
      detail: `${next.host.name} – ${next.guest.name}${next.league ? ` · ${next.league}` : ''}`
    })
  }
  alerts.push(...goalAlerts(previous, next, prefs))
  alerts.push(...redAlerts(previous, next, prefs))
  if (prefs.finalAlerts && previous.status !== 'finished' && next.status === 'finished' && previous.status !== 'canceled') {
    alerts.push({
      key: `final:${next.id}`,
      kind: 'final',
      matchId: next.id,
      title: 'پایان بازی',
      detail: scoreLine(next)
    })
  }
  return alerts
}
