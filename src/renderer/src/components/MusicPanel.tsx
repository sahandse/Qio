import { useEffect, useRef, useState } from 'react'
import type { AppState, LyricResult, MediaState } from '@shared/types'
import { formatDuration, formatLitres, formatRemaining, mediaAppName } from '../lib/format'
import { toPersianDigits } from '../lib/jalali'
import { useCover, useMediaClock } from '../lib/state'
import {
  LyricsIcon,
  MusicIcon,
  MuteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  VolumeIcon
} from './Icons'

function isLive(media: MediaState | null): boolean {
  return Boolean(media && media.title && media.status !== 'stopped' && media.status !== 'unavailable')
}

const LYRIC_MESSAGES: Record<string, string> = {
  'No lyrics found': 'متنی برای این آهنگ پیدا نشد.',
  'Nothing playing': 'چیزی در حال پخش نیست.',
  Instrumental: 'این قطعه بی‌کلام است.',
  'Lyrics timed out': 'جست‌وجوی متن طول کشید.',
  'Lyrics unavailable': 'متن در دسترس نیست.'
}

function lyricMessage(message?: string): string {
  return (message && LYRIC_MESSAGES[message]) || message || 'متنی برای این آهنگ پیدا نشد.'
}

function useLyrics(media: MediaState | null): { result: LyricResult | null; loading: boolean } {
  const [result, setResult] = useState<LyricResult | null>(null)
  const [loading, setLoading] = useState(false)
  const key = media && media.title ? `${media.title}|${media.artist}|${Math.round(media.duration)}` : ''

  useEffect(() => {
    if (!key || !media) {
      setResult(null)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    void window.qio.lyrics
      .get({ title: media.title, artist: media.artist, album: media.album, duration: media.duration })
      .then((next) => {
        if (!alive) return
        setResult(next)
        setLoading(false)
      })
    return () => {
      alive = false
    }
    // Only the identity of the track matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { result, loading }
}

function Cover({ cover, size }: { cover: string; size: 'big' | 'small' }) {
  if (cover) return <img className={`cover cover-${size}`} src={cover} alt="" />
  return (
    <span className={`cover cover-${size} cover-empty`}>
      <MusicIcon size={size === 'big' ? 22 : 18} />
    </span>
  )
}

function Transport({ media, playing, compact }: { media: MediaState | null; playing: boolean; compact?: boolean }) {
  const size = compact ? 15 : 17
  return (
    <div className={`transport-center${compact ? ' compact' : ''}`}>
      <button
        type="button"
        className="round"
        onClick={() => void window.qio.media.command('previous')}
        disabled={!media?.canPrevious}
        title="قبلی"
        aria-label="قبلی"
      >
        <PrevIcon size={size} />
      </button>
      <button
        type="button"
        className="round round-play"
        onClick={() => void window.qio.media.command('playpause')}
        disabled={!media}
        title={playing ? 'توقف' : 'پخش'}
        aria-label={playing ? 'توقف' : 'پخش'}
      >
        {playing ? <PauseIcon size={compact ? 17 : 19} /> : <PlayIcon size={compact ? 17 : 19} />}
      </button>
      <button
        type="button"
        className="round"
        onClick={() => void window.qio.media.command('next')}
        disabled={!media?.canNext}
        title="بعدی"
        aria-label="بعدی"
      >
        <NextIcon size={size} />
      </button>
    </div>
  )
}

function Volume({ system }: { system: AppState['system'] }) {
  const [draft, setDraft] = useState<number | null>(null)
  const sentAt = useRef(0)
  const volume = draft ?? system.volume
  const known = volume !== null
  const value = Math.round(volume ?? 0)

  const commit = (next: number) => {
    setDraft(next)
    const now = Date.now()
    if (now - sentAt.current < 90) return
    sentAt.current = now
    void window.qio.system.setVolume(next)
  }

  return (
    <div className="track-volume">
      <button
        type="button"
        className="round round-quiet"
        onClick={() => void window.qio.system.setMute(!system.muted)}
        title={system.muted ? 'باصدا کردن' : 'بی‌صدا کردن'}
        aria-label={system.muted ? 'باصدا کردن' : 'بی‌صدا کردن'}
      >
        {system.muted ? <MuteIcon size={13} /> : <VolumeIcon size={13} />}
      </button>
      <input
        className="rail vol-rail"
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={!known}
        style={{ ['--p' as string]: `${value}%` }}
        onChange={(event) => commit(Number(event.target.value))}
        onPointerUp={() => window.setTimeout(() => setDraft(null), 700)}
        aria-label="صدا"
      />
    </div>
  )
}

export function MusicPanel({ state, onOpen }: { state: AppState | null; onOpen?: () => void }) {
  const media = state?.media ?? null
  const live = isLive(media)
  const cover = useCover(live && media ? media.coverKey : '')
  const position = useMediaClock(live ? media : null)
  const playing = live && media?.status === 'playing'
  const duration = media?.duration ?? 0
  const [scrub, setScrub] = useState<number | null>(null)
  const shown = scrub ?? position

  const focusDone = state?.focus.completedToday ?? 0
  const water = state?.water

  const commit = (next: number) => {
    setScrub(null)
    void window.qio.media.command('seek', next)
  }

  return (
    <div className="music-page" style={{ ['--cover' as string]: cover ? `url("${cover}")` : 'none' }}>
      <div className="track">
        <Cover cover={cover} size="big" />
        <div className="track-meta">
          <span className="track-title" dir="auto">
            {live ? media?.title : 'چیزی در حال پخش نیست'}
          </span>
          <span className="track-sub" dir="auto">
            {live
              ? [media?.artist || 'بدون خواننده', mediaAppName(media?.app ?? '')].join(' · ')
              : 'هرجای ویندوز آهنگی پخش کن'}
          </span>
        </div>
        {state && <Volume system={state.system} />}
      </div>

      <div className="progress-row">
        <span className="time">{formatDuration(shown)}</span>
        <input
          className="rail"
          type="range"
          min={0}
          max={Math.max(1, Math.round(duration))}
          step={1}
          value={Math.min(shown, Math.max(1, Math.round(duration)))}
          disabled={!live || duration <= 0 || !media?.canSeek}
          style={{ ['--p' as string]: `${duration > 0 ? Math.min(100, (shown / duration) * 100) : 0}%` }}
          onChange={(event) => setScrub(Number(event.target.value))}
          onPointerUp={(event) => commit(Number((event.target as HTMLInputElement).value))}
          onKeyUp={(event) => commit(Number((event.target as HTMLInputElement).value))}
          aria-label="جابه‌جایی در آهنگ"
        />
        <span className="time">{formatRemaining(Math.max(0, duration - shown))}</span>
      </div>

      <div className="transport">
        <button type="button" className="transport-side" onClick={onOpen} title="متن آهنگ" aria-label="متن آهنگ">
          <LyricsIcon size={13} />
          <span className="transport-side-label">متن</span>
        </button>
        <Transport media={live ? media : null} playing={playing} />
        <span className="transport-stats">
          {toPersianDigits(focusDone)} تمرکز · {water ? formatLitres(water.total) : '۰ لیتر'}
        </span>
      </div>
    </div>
  )
}

export function LyricsPanel({ state }: { state: AppState | null }) {
  const media = state?.media ?? null
  const live = isLive(media)
  const cover = useCover(live && media ? media.coverKey : '')
  const position = useMediaClock(live ? media : null)
  const { result, loading } = useLyrics(live ? media : null)
  const listRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLParagraphElement>(null)
  const playing = live && media?.status === 'playing'
  const duration = media?.duration ?? 0
  const [scrub, setScrub] = useState<number | null>(null)
  const shown = scrub ?? position

  const lines = result?.synced ?? null
  const activeIndex = lines ? lines.reduce((index, line, i) => (line.time <= shown ? i : index), -1) : -1

  useEffect(() => {
    if (activeIndex < 0) return
    const node = activeRef.current
    const list = listRef.current
    if (!node || !list) return
    const top = node.offsetTop - list.clientHeight / 2 + node.clientHeight / 2
    list.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [activeIndex])

  const commit = (next: number) => {
    setScrub(null)
    void window.qio.media.command('seek', next)
  }

  return (
    <div className="lyrics-page" style={{ ['--cover' as string]: cover ? `url("${cover}")` : 'none' }}>
      <div className="lyrics-side">
        <div className="track lyrics-track">
          <Cover cover={cover} size="small" />
          <div className="track-meta">
            <span className="track-title" dir="auto">
              {live ? media?.title : 'چیزی در حال پخش نیست'}
            </span>
            <span className="track-sub" dir="auto">
              {live ? media?.artist || 'بدون خواننده' : 'یک آهنگ پخش کن'}
            </span>
          </div>
        </div>

        <div className="progress-row compact">
          <span className="time">{formatDuration(shown)}</span>
          <input
            className="rail"
            type="range"
            min={0}
            max={Math.max(1, Math.round(duration))}
            step={1}
            value={Math.min(shown, Math.max(1, Math.round(duration)))}
            disabled={!live || duration <= 0 || !media?.canSeek}
            style={{ ['--p' as string]: `${duration > 0 ? Math.min(100, (shown / duration) * 100) : 0}%` }}
            onChange={(event) => setScrub(Number(event.target.value))}
            onPointerUp={(event) => commit(Number((event.target as HTMLInputElement).value))}
            aria-label="جابه‌جایی در آهنگ"
          />
          <span className="time">{formatRemaining(Math.max(0, duration - shown))}</span>
        </div>

        <Transport media={live ? media : null} playing={playing} compact />
      </div>

      <div className="lyrics-scroll" ref={listRef} data-scroll>
        {state && !state.settings.lyrics && <p className="lyrics-note">متن آهنگ از تنظیمات خاموش است.</p>}
        {state?.settings.lyrics && !live && (
          <p className="lyrics-note">آهنگی پخش کن تا Qio کلماتش را پیدا کند. متن‌ها از LRCLIB می‌آیند.</p>
        )}
        {state?.settings.lyrics && live && loading && <p className="lyrics-note">در جست‌وجوی متن…</p>}

        {lines && (
          <>
            {lines.map((line, index) => (
              <p
                key={`${line.time}-${index}`}
                ref={index === activeIndex ? activeRef : null}
                className={`lyric-line${index === activeIndex ? ' active' : ''}`}
                onClick={() => void window.qio.media.command('seek', line.time)}
                title="رفتن به این خط"
                dir="auto"
              >
                {line.text || '\u00a0'}
              </p>
            ))}
          </>
        )}

        {!loading && !lines && result?.plain && (
          <>
            {result.plain.split(/\r?\n/).map((line, index) => (
              <p key={index} className="lyric-line plain" dir="auto">
                {line || '\u00a0'}
              </p>
            ))}
          </>
        )}

        {!loading && !lines && !result?.plain && live && state?.settings.lyrics && (
          <p className="lyrics-note">{lyricMessage(result?.message)}</p>
        )}
      </div>
    </div>
  )
}
