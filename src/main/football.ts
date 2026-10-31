import { nativeImage } from 'electron'
import type {
  FootballCatalog,
  FootballMatch,
  FootballSettings,
  FootballTable,
  FootballTables,
  FootballTeam,
  FootballView,
  Settings
} from '@shared/types'
import {
  buildCatalog,
  followedMatches,
  footballAlerts,
  matchHasTeam,
  mergeMatchDetail,
  parseLivescore,
  parseMatchDetail,
  parseStanding,
  standingTabHref
} from '@shared/football'

const BASE = 'https://web-api.varzesh3.com/v2.0'
const UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
const LIVE_MS = 45_000
const WATCHING_MS = 75_000
const IDLE_MS = 5 * 60_000
const RETRY_MS = 90_000
const DETAIL_LIVE_MS = 40_000
const DETAIL_FINAL_MS = 10 * 60_000
const CATALOG_MS = 30 * 60_000
const TABLE_MS = 10 * 60_000
const LEAGUE_TAB_MS = 6 * 3_600_000
const MAX_TEAMS = 10
const MAX_LOGOS = 200

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8'
    },
    signal: AbortSignal.timeout(timeoutMs)
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

/** 56px PNG data URL: the renderer's CSP never allows a remote crest. */
async function fetchCrest(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*' },
    signal: AbortSignal.timeout(10_000)
  })
  if (!response.ok) return ''
  const type = response.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) return ''
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length === 0 || buffer.length > 600_000) return ''
  const image = nativeImage.createFromBuffer(buffer)
  if (image.isEmpty()) return ''
  const { width } = image.getSize()
  const sized = width > 56 ? image.resize({ width: 56, quality: 'best' }) : image
  return sized.toDataURL()
}

export interface FootballDeps {
  settings(): Settings
  patchFootball(patch: Partial<FootballSettings>): void
  /** Ask main to push a fresh AppState to every window. */
  onChange(): void
  alert(title: string, detail: string): void
}

interface CachedDetail {
  at: number
  match: FootballMatch
}

/**
 * Polls Varzesh3 for the followed teams only. Today's slate is refreshed often
 * while something is live, rarely otherwise; match events are fetched on demand
 * and diffed so each goal and red card is announced exactly once.
 */
export class FootballService {
  private readonly deps: FootballDeps
  private view: FootballView
  private slate: FootballMatch[] = []
  private details = new Map<string, CachedDetail>()
  private previous = new Map<string, FootballMatch>()
  private logos = new Map<string, string>()
  private logoPending = new Map<string, Promise<string>>()
  private logoFailed = new Set<string>()
  private logoFlush: NodeJS.Timeout | null = null
  private catalogState: FootballCatalog = { teams: [], updatedAt: null, loading: false, error: null }
  private catalogAt = 0
  private catalogInFlight: Promise<FootballCatalog> | null = null
  private tableCache = new Map<string, { at: number; table: FootballTable }>()
  private tableHrefs = new Map<string, { at: number; href: string }>()
  private tablesInFlight: Promise<FootballTables> | null = null
  private tablesAt: number | null = null
  private timer: NodeJS.Timeout | null = null
  private running = false
  private inFlight = false
  private updatedAt: number | null = null
  private error: string | null = null
  private loading = false
  private teamKey = ''

  constructor(deps: FootballDeps) {
    this.deps = deps
    const settings = deps.settings().football
    this.view = {
      enabled: settings.enabled,
      teams: settings.teams,
      matches: [],
      live: false,
      updatedAt: null,
      loading: false,
      error: null
    }
    this.teamKey = this.keyOf(settings)
  }

  get current(): FootballView {
    return this.view
  }

  start(): void {
    if (this.running) return
    this.running = true
    if (this.wantsData()) {
      this.loading = this.updatedAt === null
      this.publish()
    }
    void this.refreshNow()
  }

  stop(): void {
    this.running = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.logoFlush) {
      clearTimeout(this.logoFlush)
      this.logoFlush = null
    }
  }

  /** Settings changed: publish immediately and refetch if the followed teams did. */
  handleSettingsChange(): void {
    const settings = this.deps.settings().football
    const nextKey = this.keyOf(settings)
    const changed = nextKey !== this.teamKey
    this.teamKey = nextKey
    if (!settings.enabled) {
      this.slate = []
      this.updatedAt = null
      this.error = null
      this.loading = false
      this.previous.clear()
      this.details.clear()
    }
    this.publish()
    if (changed && this.running && settings.enabled && settings.teams.length > 0) {
      this.refreshSoon(80)
    }
  }

  async refresh(): Promise<FootballView> {
    await this.refreshNow()
    return this.view
  }

  catalog(force = false): Promise<FootballCatalog> {
    if (!force && this.catalogState.teams.length > 0 && Date.now() - this.catalogAt < CATALOG_MS) {
      return Promise.resolve(this.catalogState)
    }
    if (this.catalogInFlight) return this.catalogInFlight
    this.catalogState = { ...this.catalogState, loading: true, error: null }
    this.catalogInFlight = this.fetchCatalog().finally(() => {
      this.catalogInFlight = null
    })
    return this.catalogInFlight
  }

  /** Adds the team (downloading its crest) or removes it when already followed. */
  async toggleTeam(id: unknown): Promise<FootballSettings> {
    const teamId = typeof id === 'string' ? id.trim().slice(0, 32) : ''
    const football = this.deps.settings().football
    if (!teamId) return football
    const existing = football.teams.find((team) => team.id === teamId)
    if (existing) {
      this.deps.patchFootball({ teams: football.teams.filter((team) => team.id !== teamId) })
      return this.deps.settings().football
    }
    if (football.teams.length >= MAX_TEAMS) return football
    const catalog = this.catalogState.teams.length > 0 ? this.catalogState : await this.catalog()
    const found = catalog.teams.find((team) => team.id === teamId)
    if (!found) return football
    const logo = await this.crest(found.logo)
    const team: FootballTeam = {
      id: found.id,
      name: found.name,
      logo,
      league: found.league,
      leagueId: found.leagueId
    }
    this.deps.patchFootball({
      teams: [...this.deps.settings().football.teams, team].slice(0, MAX_TEAMS)
    })
    return this.deps.settings().football
  }

  /** The table of every followed league; asked for only while the table tab is open. */
  tables(force = false): Promise<FootballTables> {
    if (!this.tablesInFlight) {
      this.tablesInFlight = this.fetchTables(force).finally(() => {
        this.tablesInFlight = null
      })
    }
    return this.tablesInFlight
  }

  private async fetchTables(force: boolean): Promise<FootballTables> {
    const settings = this.deps.settings().football
    const teams = settings.enabled ? settings.teams : []
    if (teams.length === 0) return { tables: [], updatedAt: null, logosPending: 0, unplaced: 0 }
    const { leagues, unplaced } = await this.resolveLeagues(teams)
    if (leagues.length === 0) return { tables: [], updatedAt: null, logosPending: 0, unplaced }
    const followedIds = new Set(teams.map((team) => team.id))
    const now = Date.now()
    const tables = await Promise.all(
      leagues.map(async (league) => {
        const cached = this.tableCache.get(league.id)
        if (!force && cached && now - cached.at < TABLE_MS) return cached.table
        return this.fetchTable(league)
      })
    )
    let logosPending = 0
    const decorated = tables.map((table) => ({
      ...table,
      rows: table.rows.map((row) => {
        const logo = this.logoFor(row.logo)
        if (row.logo && !logo && !this.logoFailed.has(row.logo)) logosPending += 1
        return { ...row, logo, followed: followedIds.has(row.teamId) }
      })
    }))
    if (decorated.some((table) => table.rows.length > 0)) this.tablesAt = Date.now()
    return { tables: decorated, updatedAt: this.tablesAt, logosPending, unplaced }
  }

  /**
   * Every followed team's league, preferring the league id saved with the team,
   * then today's slate and finally the wider catalog.
   */
  private async resolveLeagues(
    teams: FootballTeam[]
  ): Promise<{ leagues: { id: string; name: string }[]; unplaced: number }> {
    const byTeam = new Map<string, { id: string; name: string }>()
    const byName = new Map<string, { id: string; name: string }>()
    const remember = (teamId: string, league: { id: string; name: string }) => {
      if (teamId) byTeam.set(teamId, league)
      if (league.name && !byName.has(league.name)) byName.set(league.name, league)
    }
    for (const match of this.slate) {
      if (!match.leagueId) continue
      const league = { id: match.leagueId, name: match.league }
      remember(match.host.id, league)
      remember(match.guest.id, league)
    }
    const missing = teams.some((team) => !team.leagueId && !byTeam.has(team.id) && !byName.has(team.league))
    if (missing) {
      const catalog = this.catalogState.teams.length > 0 ? this.catalogState : await this.catalog()
      for (const team of catalog.teams) {
        if (!team.leagueId) continue
        remember(team.id, { id: team.leagueId, name: team.league })
      }
    }
    const seen = new Map<string, { id: string; name: string }>()
    let unplaced = 0
    for (const team of teams) {
      const known = team.leagueId
        ? { id: team.leagueId, name: team.league }
        : byTeam.get(team.id) ?? byName.get(team.league)
      if (!known || !known.id) {
        unplaced += 1
        continue
      }
      const existing = seen.get(known.id)
      if (existing) {
        if (!existing.name && known.name) existing.name = known.name
        continue
      }
      seen.set(known.id, { id: known.id, name: known.name || team.league })
    }
    return { leagues: [...seen.values()], unplaced }
  }

  private async fetchTable(league: { id: string; name: string }): Promise<FootballTable> {
    const empty: FootballTable = {
      leagueId: league.id,
      league: league.name,
      title: '',
      rows: [],
      updatedAt: null,
      error: null
    }
    const cached = this.tableCache.get(league.id)
    const fallback = (error: string): FootballTable =>
      cached ? { ...cached.table, error } : { ...empty, error }
    try {
      const href = await this.standingHref(league.id)
      if (!href) return fallback('ورزش۳ برای این لیگ جدولی ندارد.')
      const raw = await getJson(href, 15_000)
      const parsed = parseStanding(raw)
      if (parsed.rows.length === 0) return fallback('جدول این لیگ هنوز خالی است.')
      const table: FootballTable = {
        ...empty,
        title: parsed.title,
        rows: parsed.rows,
        updatedAt: Date.now()
      }
      this.tableCache.set(league.id, { at: Date.now(), table })
      return table
    } catch {
      return fallback(cached ? 'جدول تازه نشد؛ نسخهٔ قبلی است.' : 'دریافت جدول از ورزش۳ ممکن نشد.')
    }
  }

  private async standingHref(leagueId: string): Promise<string> {
    const cached = this.tableHrefs.get(leagueId)
    if (cached && Date.now() - cached.at < LEAGUE_TAB_MS) return cached.href
    const raw = await getJson(`${BASE}/football/leagues/${encodeURIComponent(leagueId)}`, 15_000)
    const href = standingTabHref(raw)
    this.tableHrefs.set(leagueId, { at: Date.now(), href })
    return href
  }

  private keyOf(settings: FootballSettings): string {
    return `${settings.enabled}|${settings.teams.map((team) => team.id).join(',')}`
  }

  private wantsData(): boolean {
    const settings = this.deps.settings().football
    return settings.enabled && settings.teams.length > 0
  }

  private async fetchCatalog(): Promise<FootballCatalog> {
    const offsets = [-1, 0, 1, 2]
    const pages = await Promise.allSettled(offsets.map((offset) => this.fetchSlate(offset)))
    const matches = pages.flatMap((page) => (page.status === 'fulfilled' ? page.value : []))
    const failures = pages.filter((page) => page.status === 'rejected').length
    if (matches.length === 0 && failures > 0) {
      this.catalogState = {
        teams: [],
        updatedAt: this.catalogState.updatedAt,
        loading: false,
        error: 'فهرست تیم‌ها از ورزش۳ دریافت نشد.'
      }
      return this.catalogState
    }
    const teams = buildCatalog(matches)
    this.catalogAt = Date.now()
    this.catalogState = {
      teams,
      updatedAt: this.catalogAt,
      loading: false,
      error: failures > 0 ? 'بخشی از روزها دریافت نشد؛ ممکن است بعضی تیم‌ها در فهرست نباشند.' : null
    }
    return this.catalogState
  }

  private async refreshNow(): Promise<void> {
    if (!this.running || this.inFlight) return
    const settings = this.deps.settings().football
    if (!settings.enabled || settings.teams.length === 0) {
      this.slate = []
      this.updatedAt = null
      this.error = null
      this.loading = false
      this.publish()
      this.scheduleNext()
      return
    }

    this.inFlight = true
    if (this.updatedAt === null) {
      this.loading = true
      this.publish()
    }
    try {
      const fresh = await this.fetchSlate(0)
      this.slate = fresh
      this.updatedAt = Date.now()
      this.error = null

      const followed = followedMatches(fresh, this.deps.settings().football.teams)
      const detailed = await this.loadDetails(followed)
      const merged = fresh.map((match) => detailed.get(match.id) ?? match)
      this.slate = merged
      this.observe(followedMatches(merged, this.deps.settings().football.teams))
    } catch {
      this.error = 'داده‌های ورزش۳ در دسترس نیست.'
    } finally {
      this.inFlight = false
      this.loading = false
      this.publish()
      this.scheduleNext()
    }
  }

  private async fetchSlate(offset: number): Promise<FootballMatch[]> {
    const path = offset === 0 ? 'today' : String(offset)
    const raw = await getJson(`${BASE}/livescore/${path}`, 15_000)
    return parseLivescore(raw)
  }

  private async loadDetails(matches: FootballMatch[]): Promise<Map<string, FootballMatch>> {
    const now = Date.now()
    const results = new Map<string, FootballMatch>()
    const jobs = matches.map(async (match) => {
      if (!match.hasDetails) return
      if (match.status === 'scheduled' || match.status === 'postponed' || match.status === 'canceled') return
      const cached = this.details.get(match.id)
      const ttl = match.status === 'finished' ? DETAIL_FINAL_MS : DETAIL_LIVE_MS
      if (cached && now - cached.at < ttl) {
        results.set(match.id, mergeMatchDetail(match, cached.match))
        return
      }
      try {
        const raw = await getJson(`${BASE}/football/matches/${encodeURIComponent(match.id)}`, 12_000)
        const detail = parseMatchDetail(raw)
        if (!detail) return
        this.details.set(match.id, { at: now, match: detail })
        results.set(match.id, mergeMatchDetail(match, detail))
      } catch {
        // A failed detail keeps the slate row; events retry on the next tick.
      }
    })
    await Promise.allSettled(jobs)
    for (const id of this.details.keys()) {
      if (!matches.some((match) => match.id === id)) this.details.delete(id)
    }
    return results
  }

  private observe(matches: FootballMatch[]): void {
    const prefs = this.deps.settings().football
    for (const match of matches) {
      const previous = this.previous.get(match.id) ?? null
      const alerts = footballAlerts(previous, match, prefs)
      this.previous.set(match.id, match)
      for (const alert of alerts) this.deps.alert(alert.title, alert.detail)
    }
  }

  private scheduleNext(): void {
    if (!this.running) return
    if (this.timer) clearTimeout(this.timer)
    const wait = this.error ? RETRY_MS : this.view.live ? LIVE_MS : this.view.matches.length > 0 ? WATCHING_MS : IDLE_MS
    this.timer = setTimeout(() => {
      this.timer = null
      void this.refreshNow()
    }, wait)
  }

  private refreshSoon(ms: number): void {
    if (!this.running) return
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      void this.refreshNow()
    }, ms)
  }

  private publish(): void {
    const settings = this.deps.settings().football
    const teamIds = new Set(settings.teams.map((team) => team.id))
    const matches = settings.enabled
      ? this.slate.filter((match) => matchHasTeam(match, teamIds)).map((match) => this.decorate(match))
      : []
    this.view = {
      enabled: settings.enabled,
      teams: settings.teams,
      matches,
      live: matches.some((match) => match.status === 'live'),
      updatedAt: this.updatedAt,
      loading: this.loading,
      error: this.error
    }
    this.deps.onChange()
  }

  private decorate(match: FootballMatch): FootballMatch {
    return {
      ...match,
      host: { ...match.host, logo: this.logoFor(match.host.logo) },
      guest: { ...match.guest, logo: this.logoFor(match.guest.logo) }
    }
  }

  private logoFor(remote: string): string {
    if (!remote) return ''
    if (remote.startsWith('data:')) return remote
    const hit = this.logos.get(remote)
    if (hit) return hit
    if (!this.logoFailed.has(remote)) this.requestLogo(remote)
    return ''
  }

  private requestLogo(url: string): void {
    if (this.logos.has(url) || this.logoPending.has(url) || this.logoFailed.has(url)) return
    const task = fetchCrest(url)
      .then((data) => {
        if (data) {
          this.logos.set(url, data)
          if (this.logos.size > MAX_LOGOS) {
            const oldest = this.logos.keys().next()
            if (!oldest.done) this.logos.delete(oldest.value)
          }
        } else {
          this.logoFailed.add(url)
        }
        return data
      })
      .catch(() => {
        this.logoFailed.add(url)
        return ''
      })
      .finally(() => {
        this.logoPending.delete(url)
      })
    this.logoPending.set(url, task)
    void task.then((data) => {
      if (!data) return
      if (this.logoFlush) clearTimeout(this.logoFlush)
      this.logoFlush = setTimeout(() => {
        this.logoFlush = null
        this.publish()
      }, 200)
    })
  }

  private async crest(url: string): Promise<string> {
    if (!url) return ''
    if (url.startsWith('data:')) return url
    const hit = this.logos.get(url)
    if (hit) return hit
    const pending = this.logoPending.get(url)
    if (pending) {
      return Promise.race([pending, new Promise<string>((resolve) => setTimeout(() => resolve(''), 6000))])
    }
    this.requestLogo(url)
    const task = this.logoPending.get(url)
    if (!task) return ''
    return Promise.race([task, new Promise<string>((resolve) => setTimeout(() => resolve(''), 6000))])
  }
}
