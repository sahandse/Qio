import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AppState,
  FootballEvent,
  FootballEventKind,
  FootballMatch,
  FootballSide,
  FootballStatus,
  FootballTables
} from '@shared/types'
import { crestText } from '../lib/crest'
import { toPersianDigits } from '../lib/jalali'
import { BallIcon, CardIcon, ICON, InfoIcon, ResetIcon, SwapIcon, VarIcon } from './Icons'
import { Skeleton } from './Skeleton'
import { Status } from './Status'

const KIND_LABEL: Record<FootballEventKind, string> = {
  goal: 'گل',
  penalty: 'پنالتی',
  yellow: 'کارت زرد',
  red: 'کارت قرمز',
  sub: 'تعویض',
  var: 'بازبینی VAR',
  other: 'رویداد'
}

const STATE_LABEL: Record<FootballStatus, string> = {
  live: 'زنده',
  scheduled: 'شروع نشده',
  finished: 'پایان',
  postponed: 'تعویق',
  canceled: 'لغو'
}

type FootballTab = 'games' | 'table'

function Crest({ side, size }: { side: Pick<FootballSide, 'name' | 'logo'>; size: number }) {
  const [broken, setBroken] = useState('')
  if (side.logo && broken !== side.logo) {
    return (
      <img
        className="fb-crest"
        src={side.logo}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        onError={() => setBroken(side.logo)}
      />
    )
  }
  return (
    <span
      className="fb-crest fb-crest-fallback"
      style={{ width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.36)) }}
      aria-hidden="true"
    >
      {crestText(side.name)}
    </span>
  )
}

function scoreOf(side: FootballSide): string {
  return side.score === null ? '—' : toPersianDigits(side.score)
}

function numberText(value: number | null): string {
  return value === null ? '—' : toPersianDigits(value)
}

function differenceText(value: number | null): string {
  if (value === null) return '—'
  return toPersianDigits(value > 0 ? `+${value}` : String(value))
}

function liveText(match: FootballMatch): string {
  if (match.minute) return `دقیقه ${toPersianDigits(match.minute)}`
  return match.statusLabel || STATE_LABEL.live
}

function listState(match: FootballMatch): string {
  if (match.status === 'live') return match.minute ? `${toPersianDigits(match.minute)}′` : 'زنده'
  if (match.status === 'scheduled') return match.clock ? toPersianDigits(match.clock) : 'امروز'
  return STATE_LABEL[match.status]
}

function clockTime(at: number | null): string {
  if (!at) return ''
  const date = new Date(at)
  return toPersianDigits(
    `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
  )
}

function eventIcon(kind: FootballEventKind) {
  if (kind === 'goal' || kind === 'penalty') return <BallIcon size={ICON.xs} />
  if (kind === 'yellow' || kind === 'red') return <CardIcon size={ICON.xs} />
  if (kind === 'sub') return <SwapIcon size={ICON.xs} />
  if (kind === 'var') return <VarIcon size={ICON.xs} />
  return <InfoIcon size={ICON.xs} />
}

function eventNote(event: FootballEvent, match: FootballMatch): string {
  const team = event.side === 'host' ? match.host.name : match.guest.name
  return [KIND_LABEL[event.kind], team].filter(Boolean).join(' · ')
}

function TableRefresh({
  busy,
  onRefresh
}: {
  busy: boolean
  onRefresh: () => void
}) {
  return (
    <button
      type="button"
      className={`fb-refresh${busy ? ' busy' : ''}`}
      onClick={onRefresh}
      disabled={busy}
      title="تازه‌سازی جدول"
      aria-label="تازه‌سازی جدول"
    >
      <ResetIcon size={ICON.xs} />
    </button>
  )
}

/** The picked league tables, one league at a time. */
function TablesTab({
  teamCount,
  leagueCount,
  tables,
  busy,
  error,
  onRefresh,
  onOpenSettings
}: {
  teamCount: number
  leagueCount: number
  tables: FootballTables | null
  busy: boolean
  error: string | null
  onRefresh: () => void
  onOpenSettings: () => void
}) {
  const [picked, setPicked] = useState<string | null>(null)
  const available = tables?.tables ?? []
  const selected =
    available.find((table) => table.leagueId === picked) ??
    available.find((table) => table.rows.some((row) => row.followed)) ??
    available[0] ??
    null

  if (teamCount === 0 && leagueCount === 0) {
    return (
      <div className="fb-body">
        <div className="panel-empty">
          <BallIcon size={ICON.xl} />
          <strong>جدولی انتخاب نشده</strong>
          <span>در تنظیمات فوتبال تا دو لیگ را برای جدول انتخاب کن؛ یا چند تیم را دنبال کن تا لیگ خودشان بیاید.</span>
          <button type="button" className="pill" onClick={onOpenSettings}>
            انتخاب جدول
          </button>
        </div>
      </div>
    )
  }

  if (!tables && busy) {
    return (
      <div className="fb-body">
        <div className="football-page football-loading">
          <Skeleton lines={4} />
          <Skeleton lines={4} />
        </div>
      </div>
    )
  }

  if (!tables || available.length === 0) {
    const stale = !tables && error
    return (
      <div className="fb-body">
        <div className="panel-empty">
          <InfoIcon size={ICON.xl} />
          <strong>{stale ? 'جدول‌ها نیامد' : tables && tables.unplaced > 0 ? 'لیگ تیم‌ها پیدا نشد' : 'جدولی نیست'}</strong>
          <span>
            {error ??
              (tables && tables.unplaced > 0
                ? 'ورزش۳ برای تیم‌های انتخاب‌شده جدولی نداد. یک‌بار تیم‌ها را در تنظیمات دوباره انتخاب کن.'
                : 'ورزش۳ برای این لیگ‌ها جدولی برنگرداند. کمی بعد دوباره تلاش کن.')}
          </span>
          <button type="button" className="pill" onClick={onRefresh} disabled={busy}>
            <ResetIcon size={ICON.xs} /> تلاش دوباره
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fb-body fb-tables">
      {available.length > 1 && (
        <div className="fb-league-chips" role="tablist" aria-label="لیگ‌ها">
          {available.map((table) => (
            <button
              key={table.leagueId}
              type="button"
              role="tab"
              className={`fb-league-chip${table.leagueId === selected?.leagueId ? ' on' : ''}`}
              onClick={() => setPicked(table.leagueId)}
              aria-selected={table.leagueId === selected?.leagueId}
            >
              {table.league || table.title || 'لیگ'}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <section className="fb-table-card" aria-label={selected.title || `جدول ${selected.league}`}>
          <header className="fb-view-head">
            <span className="fb-view-title">
              <span className="fb-view-league">{selected.title || selected.league || 'جدول لیگ'}</span>
              {selected.rows.length > 0 && (
                <span className="fb-view-stage">{toPersianDigits(selected.rows.length)} تیم</span>
              )}
            </span>
            <span className="fb-view-tools">
              {tables.updatedAt && <span className="fb-updated">به‌روز {clockTime(tables.updatedAt)}</span>}
              <TableRefresh busy={busy} onRefresh={onRefresh} />
            </span>
          </header>

          {selected.rows.length === 0 ? (
            <div className="panel-empty dashed fb-events-empty">
              <InfoIcon size={ICON.md} />
              <strong>جدول خالی است</strong>
              <span>{selected.error ?? 'ورزش۳ هنوز ردیفی برای این لیگ ندارد.'}</span>
            </div>
          ) : (
            <>
              {selected.error && <span className="fb-stale">{selected.error}</span>}
              <div className="fb-table-wrap" data-scroll>
                <div
                  className="fb-table"
                  role="table"
                  aria-label={selected.title || `جدول ${selected.league}`}
                >
                  <div className="fb-tr fb-tr-head" role="row">
                    <span className="fb-td fb-rank" role="columnheader">
                      رده
                    </span>
                    <span className="fb-td fb-team" role="columnheader">
                      تیم
                    </span>
                    <span className="fb-td" role="columnheader">
                      بازی
                    </span>
                    <span className="fb-td" role="columnheader">
                      برد
                    </span>
                    <span className="fb-td" role="columnheader">
                      مساوی
                    </span>
                    <span className="fb-td" role="columnheader">
                      باخت
                    </span>
                    <span className="fb-td" role="columnheader">
                      زده
                    </span>
                    <span className="fb-td" role="columnheader">
                      خورده
                    </span>
                    <span className="fb-td" role="columnheader">
                      تفاضل
                    </span>
                    <span className="fb-td fb-points" role="columnheader">
                      امتیاز
                    </span>
                  </div>
                  {selected.rows.map((row) => (
                    <div
                      key={row.teamId}
                      className={`fb-tr${row.followed ? ' mine' : ''}`}
                      role="row"
                      title={row.name}
                    >
                      <span className="fb-td fb-rank" role="cell">
                        {row.accent && (
                          <span className="fb-rank-mark" style={{ background: row.accent }} aria-hidden="true" />
                        )}
                        {toPersianDigits(row.rank)}
                      </span>
                      <span className="fb-td fb-team" role="cell">
                        <Crest side={row} size={16} />
                        <span className="fb-team-name">{row.name}</span>
                      </span>
                      <span className="fb-td" role="cell">
                        {numberText(row.played)}
                      </span>
                      <span className="fb-td" role="cell">
                        {numberText(row.wins)}
                      </span>
                      <span className="fb-td" role="cell">
                        {numberText(row.draws)}
                      </span>
                      <span className="fb-td" role="cell">
                        {numberText(row.losses)}
                      </span>
                      <span className="fb-td" role="cell">
                        {numberText(row.goalFor)}
                      </span>
                      <span className="fb-td" role="cell">
                        {numberText(row.goalAgainst)}
                      </span>
                      <span className="fb-td" role="cell">
                        {differenceText(row.goalDifference)}
                      </span>
                      <span className="fb-td fb-points" role="cell">
                        {numberText(row.points)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}

/** Followed football: today's matches with their timeline, or the league table. */
export function FootballPanel({ state }: { state: AppState | null }) {
  const football = state?.football
  const [tab, setTab] = useState<FootballTab>('games')
  const [picked, setPicked] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tables, setTables] = useState<FootballTables | null>(null)
  const [tablesBusy, setTablesBusy] = useState(false)
  const [tablesError, setTablesError] = useState<string | null>(null)
  const tablesSeq = useRef(0)

  const matches = football?.matches ?? []
  const selected =
    matches.find((match) => match.id === picked) ??
    matches.find((match) => match.status === 'live') ??
    matches.find((match) => match.status === 'scheduled') ??
    matches[0] ??
    null

  const events = useMemo(() => (selected ? [...selected.events].reverse() : []), [selected])
  const teamsKey = football?.teams.map((team) => team.id).join(',') ?? ''
  const leaguesKey = football?.leagues.map((league) => league.id).join(',') ?? ''
  /** Either list moving means a different set of tables, so both feed the same key. */
  const tableKey = `${teamsKey}|${leaguesKey}`
  const hasTables = (football?.teams.length ?? 0) > 0 || (football?.leagues.length ?? 0) > 0

  const loadTables = useCallback(async (force: boolean, silent = false) => {
    const seq = ++tablesSeq.current
    if (!silent) setTablesBusy(true)
    try {
      const result = await window.qio.football.tables(force)
      if (seq !== tablesSeq.current) return
      setTables(result)
      setTablesError(null)
    } catch {
      if (seq !== tablesSeq.current) return
      setTablesError('ارتباط با سرویس جدول برقرار نشد.')
    } finally {
      if (seq === tablesSeq.current && !silent) setTablesBusy(false)
    }
  }, [])

  useEffect(() => {
    if (tab !== 'table' || !football?.enabled || !hasTables) return
    void loadTables(false)
    // A new team or a new league, while the table is open, must bring its league along.
  }, [tab, loadTables, tableKey, hasTables, football?.enabled])

  // Crests download in the background; ask once more when the first answer lacked them.
  useEffect(() => {
    if (tab !== 'table' || !tables || tables.logosPending <= 0) return
    const timer = window.setTimeout(() => void loadTables(false, true), 1500)
    return () => window.clearTimeout(timer)
  }, [tab, tables, loadTables])

  const refresh = async () => {
    if (busy) return
    setBusy(true)
    try {
      await window.qio.football.refresh()
    } finally {
      setBusy(false)
    }
  }

  const refreshTables = () => {
    if (!tablesBusy) void loadTables(true)
  }

  if (!state || !football) return <Skeleton lines={4} />

  return (
    <div className="football-shell">
      <div className="fb-tabs" role="tablist" aria-label="بخش فوتبال">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'games'}
          className={`fb-tab${tab === 'games' ? ' on' : ''}`}
          onClick={() => setTab('games')}
        >
          بازی‌ها
          {football.live && <span className="fb-live-dot" aria-hidden="true" />}
          {matches.length > 0 && <span className="fb-tab-count">{toPersianDigits(matches.length)}</span>}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'table'}
          className={`fb-tab${tab === 'table' ? ' on' : ''}`}
          onClick={() => {
            setTab('table')
            if (football.enabled && hasTables) void loadTables(false)
          }}
        >
          جدول
          {tables && tables.tables.length > 1 && (
            <span className="fb-tab-count">{toPersianDigits(tables.tables.length)}</span>
          )}
        </button>
      </div>

      {tab === 'games' && (
        <div className="fb-body">
          {football.loading && matches.length === 0 ? (
            <div className="football-page football-loading">
              <Skeleton lines={3} />
              <Skeleton lines={3} />
            </div>
          ) : matches.length === 0 ? (
            <div className="panel-empty">
              <BallIcon size={ICON.xl} />
              <strong>
                {football.error
                  ? 'داده‌ها نیامد'
                  : football.teams.length === 0
                    ? 'تیمی انتخاب نشده'
                    : 'امروز بازی‌ای نیست'}
              </strong>
              <span>
                {football.error ??
                  (football.teams.length === 0
                    ? 'برای دیدن بازی‌ها، در تنظیمات فوتبال چند تیم را دنبال کن.'
                    : 'برای تیم‌های انتخاب‌شده امروز بازی‌ای در ورزش۳ ثبت نشده است. تب همین‌جا می‌ماند و از سربرگ جدول می‌توانی لیگ‌ها را ببینی.')}
              </span>
              {football.teams.length === 0 ? (
                <button
                  type="button"
                  className="pill"
                  onClick={() => void window.qio.window.openSettings('football')}
                >
                  انتخاب تیم
                </button>
              ) : (
                <button type="button" className="pill" onClick={() => void refresh()} disabled={busy}>
                  <ResetIcon size={ICON.xs} /> تلاش دوباره
                </button>
              )}
            </div>
          ) : (
            <div className="football-page">
              <aside className="fb-list" data-scroll aria-label="بازی‌های امروز">
                <div className="fb-list-head">
                  <span>امروز</span>
                  <span>{toPersianDigits(matches.length)} بازی</span>
                </div>
                {matches.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    className={`fb-row${match.id === selected?.id ? ' on' : ''}${match.status === 'live' ? ' live' : ''}`}
                    onClick={() => setPicked(match.id)}
                    aria-pressed={match.id === selected?.id}
                    title={`${match.host.name} – ${match.guest.name}`}
                  >
                    <span className="fb-row-meta">
                      <span className="fb-row-league">{match.league}</span>
                      <span className={`fb-row-state state-${match.status}`}>
                        {match.status === 'live' && <span className="fb-live-dot" aria-hidden="true" />}
                        {listState(match)}
                      </span>
                    </span>
                    <span className="fb-row-team">
                      <Crest side={match.host} size={18} />
                      <span className="fb-row-name">{match.host.name}</span>
                      <span className="fb-row-score">{scoreOf(match.host)}</span>
                    </span>
                    <span className="fb-row-team">
                      <Crest side={match.guest} size={18} />
                      <span className="fb-row-name">{match.guest.name}</span>
                      <span className="fb-row-score">{scoreOf(match.guest)}</span>
                    </span>
                  </button>
                ))}
              </aside>

              {selected && (
                <section className="fb-view" aria-label={`${selected.host.name} – ${selected.guest.name}`}>
                  <header className="fb-view-head">
                    <span className="fb-view-title">
                      <span className="fb-view-league">{selected.league || 'بازی دوستانه'}</span>
                      {selected.stage && <span className="fb-view-stage">{toPersianDigits(selected.stage)}</span>}
                    </span>
                    <span className="fb-view-tools">
                      {football.updatedAt && (
                        <span className="fb-updated">به‌روز {clockTime(football.updatedAt)}</span>
                      )}
                      <button
                        type="button"
                        className={`fb-refresh${busy ? ' busy' : ''}`}
                        onClick={() => void refresh()}
                        disabled={busy}
                        title="تازه‌سازی"
                        aria-label="تازه‌سازی"
                      >
                        <ResetIcon size={ICON.xs} />
                      </button>
                    </span>
                  </header>

                  <div className="fb-score">
                    <span className="fb-side">
                      <Crest side={selected.host} size={36} />
                      <span className="fb-side-name">{selected.host.name}</span>
                    </span>
                    <span className="fb-score-nums">
                      <span className="fb-score-num">{scoreOf(selected.host)}</span>
                      <span className="fb-score-dash">–</span>
                      <span className="fb-score-num">{scoreOf(selected.guest)}</span>
                    </span>
                    <span className="fb-side">
                      <Crest side={selected.guest} size={36} />
                      <span className="fb-side-name">{selected.guest.name}</span>
                    </span>
                  </div>

                  <div className="fb-state-line">
                    {selected.status === 'live' ? (
                      <span className="fb-live">
                        <span className="fb-live-dot" aria-hidden="true" />
                        {liveText(selected)}
                      </span>
                    ) : selected.status === 'scheduled' ? (
                      <Status tone="info">
                        شروع {selected.clock ? toPersianDigits(selected.clock) : 'امروز'}
                      </Status>
                    ) : selected.status === 'finished' ? (
                      <Status tone="ok">{selected.statusLabel || STATE_LABEL.finished}</Status>
                    ) : (
                      <Status tone="warn">{selected.statusLabel || STATE_LABEL[selected.status]}</Status>
                    )}
                    {football.error && <span className="fb-stale">{football.error}</span>}
                  </div>

                  <div className="fb-events-head">
                    <span>رویدادها</span>
                    {selected.eventsLoaded && <span>{toPersianDigits(selected.events.length)}</span>}
                  </div>

                  {selected.status === 'scheduled' ||
                  selected.status === 'postponed' ||
                  selected.status === 'canceled' ? (
                    <div className="panel-empty dashed fb-events-empty">
                      <BallIcon size={ICON.md} />
                      <strong>
                        {selected.status === 'scheduled' ? 'هنوز شروع نشده' : STATE_LABEL[selected.status]}
                      </strong>
                      <span>
                        {selected.status === 'scheduled'
                          ? 'رویدادها با سوت شروع بازی همین‌جا می‌آیند.'
                          : 'برای این بازی رویدادی ثبت نمی‌شود.'}
                      </span>
                    </div>
                  ) : !selected.hasDetails ? (
                    <div className="panel-empty dashed fb-events-empty">
                      <InfoIcon size={ICON.md} />
                      <strong>رویداد ثبت نشده</strong>
                      <span>ورزش۳ برای این بازی فهرست رویداد ندارد؛ نتیجه و دقایق از خود مسابقه می‌آید.</span>
                    </div>
                  ) : !selected.eventsLoaded ? (
                    <div className="fb-events-wait" role="status">
                      <Skeleton lines={3} />
                      <span>در حال گرفتن رویدادها…</span>
                    </div>
                  ) : events.length === 0 ? (
                    <div className="panel-empty dashed fb-events-empty">
                      <BallIcon size={ICON.md} />
                      <strong>هنوز رویدادی نیامده</strong>
                      <span>گل، کارت و تعویض‌ها به‌محض ثبت در ورزش۳ اینجا نشان داده می‌شوند.</span>
                    </div>
                  ) : (
                    <ol className="fb-events" data-scroll aria-label="رویدادهای بازی">
                      {events.map((event) => (
                        <li
                          key={event.id}
                          className={`fb-event kind-${event.kind}`}
                          title={event.text || undefined}
                        >
                          <span className="fb-minute">
                            {event.minute ? `${toPersianDigits(event.minute)}′` : '—'}
                          </span>
                          <span className="fb-event-icon" aria-hidden="true">
                            {eventIcon(event.kind)}
                          </span>
                          <span className="fb-event-body">
                            <span className="fb-event-player">{event.player || KIND_LABEL[event.kind]}</span>
                            <span className="fb-event-note">{eventNote(event, selected)}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'table' && (
        <TablesTab
          teamCount={football.teams.length}
          leagueCount={football.leagues.length}
          tables={tables}
          busy={tablesBusy}
          error={tablesError}
          onRefresh={refreshTables}
          onOpenSettings={() => void window.qio.window.openSettings('football')}
        />
      )}
    </div>
  )
}
