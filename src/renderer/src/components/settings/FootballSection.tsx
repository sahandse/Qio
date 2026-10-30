import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FootballCatalog, FootballSettings, Settings } from '@shared/types'
import { crestText } from '../../lib/crest'
import { formatJalali, toPersianDigits } from '../../lib/jalali'
import { CheckIcon, CloseIcon, ICON, PlusIcon, ResetIcon } from '../Icons'
import { Skeleton } from '../Skeleton'
import { Status } from '../Status'
import { Toggle } from './controls'

const MAX_TEAMS = 10

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

  useEffect(() => {
    void load(false)
  }, [load])

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

  const picked = useMemo(() => new Set(football.teams.map((team) => team.id)), [football.teams])
  const filtered = useMemo(() => {
    const list = catalog?.teams ?? []
    const needle = query.trim()
    if (!needle) return list
    return list.filter((team) => team.name.includes(needle) || team.league.includes(needle))
  }, [catalog, query])

  const full = football.teams.length >= MAX_TEAMS

  return (
    <>
      <section className="settings-card">
        <h3>مسابقات فوتبال</h3>
        <Toggle
          label="پوشش بازی‌ها"
          hint="تب «بازی‌ها» فقط روز مسابقه در نچ ظاهر می‌شود"
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
    </>
  )
}
