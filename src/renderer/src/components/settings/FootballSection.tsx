import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FootballCatalog, FootballLeagueCatalog, FootballSettings, Settings } from '@shared/types'
import { crestText } from '../../lib/crest'
import { formatJalali, toPersianDigits } from '../../lib/jalali'
import { CheckIcon, CloseIcon, ICON, PlusIcon, ResetIcon } from '../Icons'
import { Skeleton } from '../Skeleton'
import { Status } from '../Status'
import { Toggle } from './controls'

const MAX_TEAMS = 10
const MAX_TABLES = 2

function nextLabel(at: number): string {
  const date = new Date(at)
  const now = new Date()
  const time = toPersianDigits(
    `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
  )
  if (date.toDateString() === now.toDateString()) return `امروز ${time}`
  return `${formatJalali(date, { weekday: false, year: false })} · ${time}`
}

export function FootballSection({
  settings,
  onPatch
}: {
  settings: Settings
  onPatch: (next: Partial<Settings>) => void
}) {
  const football = settings.football
  const [catalog, setCatalog] = useState<FootballCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [leagueCatalog, setLeagueCatalog] = useState<FootballLeagueCatalog | null>(null)
  const [leagueLoading, setLeagueLoading] = useState(true)
  const [leagueQuery, setLeagueQuery] = useState('')

  const load = useCallback(async (force: boolean) => {
    setLoading(true)
    try {
      const next = await window.qio.football.catalog(force)
      setCatalog(next)
    } catch {
      setCatalog({ teams: [], updatedAt: null, loading: false, error: 'فهرست تیم‌ها دریافت نشد.' })
    } finally {
      setLoading(false)
    }
  }, [])

  const loadLeagues = useCallback(async (force: boolean) => {
    setLeagueLoading(true)
    try {
      const next = await window.qio.football.leagueCatalog(force)
      setLeagueCatalog(next)
    } catch {
      setLeagueCatalog({ leagues: [], updatedAt: null, loading: false, error: 'فهرست لیگ‌ها دریافت نشد.' })
    } finally {
      setLeagueLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(false)
    void loadLeagues(false)
  }, [load, loadLeagues])

  const setAlerts = (
    patch: Partial<Pick<FootballSettings, 'goalAlerts' | 'startAlerts' | 'redAlerts' | 'finalAlerts'>>
  ) => onPatch({ football: { ...football, ...patch } })

  const toggle = async (id: string) => {
    if (pending) return
    setPending(id)
    try {
      await window.qio.football.toggleTeam(id)
    } finally {
      setPending(null)
    }
  }

  const toggleLeague = async (id: string) => {
    if (pending) return
    setPending(id)
    try {
      await window.qio.football.toggleLeague(id)
    } finally {
      setPending(null)
    }
  }

  const picked = useMemo(() => new Set(football.teams.map((team) => team.id)), [football.teams])
  const filtered = useMemo(() => {
    const list = catalog?.teams ?? []
    const needle = query.trim()
    if (!needle) return list
    return list.filter((team) => team.name.includes(needle) || team.league.includes(needle))
  }, [catalog, query])

  const pickedLeagues = useMemo(() => new Set(football.leagues.map((league) => league.id)), [football.leagues])
  const filteredLeagues = useMemo(() => {
    const list = leagueCatalog?.leagues ?? []
    const needle = leagueQuery.trim()
    if (!needle) return list
    return list.filter((league) => league.name.includes(needle))
  }, [leagueCatalog, leagueQuery])

  const full = football.teams.length >= MAX_TEAMS
  const tablesFull = football.leagues.length >= MAX_TABLES

  return (
    <>
      <section className="settings-card">
        <h3>مسابقات فوتبال</h3>
        <Toggle
          label="پوشش بازی‌ها"
          hint="تب «بازی‌ها» همیشه در نچ است؛ روز بدون بازی را خالی نشان می‌دهد"
          checked={football.enabled}
          onChange={(next) => onPatch({ football: { ...football, enabled: next } })}
        />
        <p className="settings-note">
          داده‌ها مستقیم و بدون کلید از ورزش۳ می‌آید: زمان بازی، گل، کارت، تعویض و دقیقه. چیزی جز
          تیم‌های انتخابی از این دستگاه بیرون نمی‌رود.
        </p>
      </section>

      <section className="settings-card">
        <h3>خبرها</h3>
        <Toggle
          label="گل"
          hint="نام گلزن، دقیقه و نتیجهٔ تازه"
          checked={football.goalAlerts}
          onChange={(next) => setAlerts({ goalAlerts: next })}
        />
        <Toggle
          label="شروع بازی"
          hint="وقتی سوت شروع زده می‌شود"
          checked={football.startAlerts}
          onChange={(next) => setAlerts({ startAlerts: next })}
        />
        <Toggle
          label="کارت قرمز"
          hint="کارت قرمز و بازیکن، با دقیقه"
          checked={football.redAlerts}
          onChange={(next) => setAlerts({ redAlerts: next })}
        />
        <Toggle
          label="پایان بازی"
          hint="نتیجهٔ نهایی"
          checked={football.finalAlerts}
          onChange={(next) => setAlerts({ finalAlerts: next })}
        />
      </section>

      <section className="settings-card wide">
        <h3>تیم‌های دنبال‌شده</h3>

        {football.teams.length === 0 ? (
          <p className="settings-note">هنوز تیمی انتخاب نشده — از فهرست پایین اضافه کن.</p>
        ) : (
          <div className="fb-team-chips">
            {football.teams.map((team) => (
              <button
                key={team.id}
                type="button"
                className="fb-team-chip"
                onClick={() => void toggle(team.id)}
                title={`حذف ${team.name}`}
                aria-label={`حذف ${team.name} از پیگیری`}
                disabled={pending === team.id}
              >
                {team.logo ? (
                  <img src={team.logo} alt="" width={18} height={18} />
                ) : (
                  <span className="fb-mono">{crestText(team.name)}</span>
                )}
                <span className="fb-team-chip-name">{team.name}</span>
                <CloseIcon size={ICON.xs} />
              </button>
            ))}
          </div>
        )}

        <div className="fb-search-row">
          <input
            className="setting-input"
            value={query}
            placeholder="جست‌وجوی تیم یا لیگ…"
            onChange={(event) => setQuery(event.target.value)}
            aria-label="جست‌وجوی تیم"
          />
          <button type="button" className="pill" disabled={loading} onClick={() => void load(true)}>
            <ResetIcon size={ICON.xs} /> {loading ? 'در حال گرفتن…' : 'به‌روزرسانی'}
          </button>
        </div>

        {catalog?.error && (
          <Status tone="warn" className="fb-catalog-error">
            {catalog.error}
          </Status>
        )}

        {loading && !catalog ? (
          <Skeleton lines={5} />
        ) : filtered.length === 0 ? (
          <p className="settings-note">
            {catalog?.error ? 'فهرست تیم‌ها در دسترس نیست.' : 'تیمی با این نام در بازی‌های نزدیک پیدا نشد.'}
          </p>
        ) : (
          <div className="fb-pick-list" data-scroll>
            {filtered.map((team) => {
              const selected = picked.has(team.id)
              const stored = football.teams.find((entry) => entry.id === team.id)
              const disabled = pending === team.id || (!selected && full)
              return (
                <button
                  key={team.id}
                  type="button"
                  className={`fb-pick${selected ? ' on' : ''}`}
                  onClick={() => void toggle(team.id)}
                  disabled={disabled}
                  aria-pressed={selected}
                  title={
                    selected
                      ? `حذف ${team.name}`
                      : full
                        ? 'بیشتر از ۱۰ تیم نمی‌شود'
                        : `دنبال‌کردن ${team.name}`
                  }
                >
                  {stored?.logo ? (
                    <img src={stored.logo} alt="" width={24} height={24} />
                  ) : (
                    <span className="fb-mono">{crestText(team.name)}</span>
                  )}
                  <span className="fb-pick-text">
                    <strong>{team.name}</strong>
                    <small>
                      {[
                        team.league,
                        team.nextAt ? nextLabel(team.nextAt) : '',
                        team.matches > 0 ? `${toPersianDigits(team.matches)} بازی` : ''
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </small>
                  </span>
                  <span className="fb-pick-mark" aria-hidden="true">
                    {selected ? <CheckIcon size={ICON.xs} /> : <PlusIcon size={ICON.xs} />}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <p className="settings-note">
          {toPersianDigits(football.teams.length)} از {toPersianDigits(MAX_TEAMS)} تیم انتخاب شده.
          فهرست از بازی‌های دیروز تا دو روز آینده ساخته می‌شود و نیم‌ساعت کش می‌ماند.
        </p>
      </section>

      <section className="settings-card wide">
        <h3>جدول لیگ‌ها</h3>

        {football.leagues.length === 0 ? (
          <p className="settings-note">هنوز جدولی انتخاب نشده — از فهرست پایین لیگ اضافه کن.</p>
        ) : (
          <div className="fb-team-chips">
            {football.leagues.map((league) => (
              <button
                key={league.id}
                type="button"
                className="fb-team-chip"
                onClick={() => void toggleLeague(league.id)}
                title={`حذف ${league.name}`}
                aria-label={`حذف ${league.name} از جدول‌ها`}
                disabled={pending === league.id}
              >
                <span className="fb-mono">{crestText(league.name)}</span>
                <span className="fb-team-chip-name">{league.name}</span>
                <CloseIcon size={ICON.xs} />
              </button>
            ))}
          </div>
        )}

        <div className="fb-search-row">
          <input
            className="setting-input"
            value={leagueQuery}
            placeholder="جست‌وجوی لیگ…"
            onChange={(event) => setLeagueQuery(event.target.value)}
            aria-label="جست‌وجوی لیگ"
          />
          <button type="button" className="pill" disabled={leagueLoading} onClick={() => void loadLeagues(true)}>
            <ResetIcon size={ICON.xs} /> {leagueLoading ? 'در حال گرفتن…' : 'به‌روزرسانی'}
          </button>
        </div>

        {leagueCatalog?.error && (
          <Status tone="warn" className="fb-catalog-error">
            {leagueCatalog.error}
          </Status>
        )}

        {leagueLoading && !leagueCatalog ? (
          <Skeleton lines={4} />
        ) : filteredLeagues.length === 0 ? (
          <p className="settings-note">
            {leagueCatalog?.error ? 'فهرست لیگ‌ها در دسترس نیست.' : 'لیگی با این نام پیدا نشد.'}
          </p>
        ) : (
          <div className="fb-pick-list" data-scroll>
            {filteredLeagues.map((league) => {
              const selected = pickedLeagues.has(league.id)
              const disabled = pending === league.id || (!selected && tablesFull)
              return (
                <button
                  key={league.id}
                  type="button"
                  className={`fb-pick${selected ? ' on' : ''}`}
                  onClick={() => void toggleLeague(league.id)}
                  disabled={disabled}
                  aria-pressed={selected}
                  title={
                    selected
                      ? `حذف ${league.name}`
                      : tablesFull
                        ? 'بیشتر از دو جدول نمی‌شود'
                        : `افزودن جدول ${league.name}`
                  }
                >
                  <span className="fb-mono">{crestText(league.name)}</span>
                  <span className="fb-pick-text">
                    <strong>{league.name}</strong>
                    <small>جدول رده‌بندی</small>
                  </span>
                  <span className="fb-pick-mark" aria-hidden="true">
                    {selected ? <CheckIcon size={ICON.xs} /> : <PlusIcon size={ICON.xs} />}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <p className="settings-note">
          {toPersianDigits(football.leagues.length)} از {toPersianDigits(MAX_TABLES)} جدول انتخاب شده.
          بدون انتخاب، سربرگ «جدول» لیگ تیم‌های دنبال‌شده را نشان می‌دهد.
        </p>
      </section>
    </>
  )
}
