import { useMemo, useState } from 'react'
import type { AppState, FootballEvent, FootballEventKind, FootballMatch, FootballSide, FootballStatus } from '@shared/types'
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

function Crest({ side, size }: { side: FootballSide; size: number }) {
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

/** Today's followed matches: the list on one side, the selected match with its timeline on the other. */
export function FootballPanel({ state }: { state: AppState | null }) {
  const football = state?.football
  const [picked, setPicked] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const matches = football?.matches ?? []
  const selected =
    matches.find((match) => match.id === picked) ??
    matches.find((match) => match.status === 'live') ??
    matches.find((match) => match.status === 'scheduled') ??
    matches[0] ??
    null

  const events = useMemo(() => (selected ? [...selected.events].reverse() : []), [selected])

  const refresh = async () => {
    if (busy) return
    setBusy(true)
    try {
      await window.qio.football.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (!state || !football) return <Skeleton lines={4} />

  if (football.loading && matches.length === 0) {
    return (
      <div className="football-page football-loading">
        <Skeleton lines={3} />
        <Skeleton lines={3} />
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="panel-empty">
        <BallIcon size={ICON.xl} />
        <strong>{football.error ? 'داده‌ها نیامد' : 'امروز بازی‌ای نیست'}</strong>
        <span>
          {football.error ??
            'برای تیم‌های انتخاب‌شده امروز بازی‌ای در ورزش۳ ثبت نشده است. روز مسابقه این تب خودش برمی‌گردد.'}
        </span>
        <button type="button" className="pill" onClick={() => void refresh()} disabled={busy}>
          <ResetIcon size={ICON.xs} /> تلاش دوباره
        </button>
      </div>
    )
  }

  return (
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
              {selected.stage && <span className="fb-view-stage">{selected.stage}</span>}
            </span>
            <span className="fb-view-tools">
              {football.updatedAt && <span className="fb-updated">به‌روز {clockTime(football.updatedAt)}</span>}
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

          {selected.status === 'scheduled' || selected.status === 'postponed' || selected.status === 'canceled' ? (
            <div className="panel-empty dashed fb-events-empty">
              <BallIcon size={ICON.md} />
              <strong>{selected.status === 'scheduled' ? 'هنوز شروع نشده' : STATE_LABEL[selected.status]}</strong>
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
                <li key={event.id} className={`fb-event kind-${event.kind}`} title={event.text || undefined}>
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
  )
}
