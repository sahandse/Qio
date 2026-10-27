import { useEffect, useRef, useState } from 'react'
import type { AppState, LyricResult, MediaState } from '@shared/types'
import { formatDuration, mediaAppName } from '../lib/format'
import { useCover, useMediaClock } from '../lib/state'
import { LyricsIcon, MusicIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon } from './Icons'

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

function Scrubber({
  media,
  position
}: {
  media: MediaState | null
  position: number
}) {
  const [scrub, setScrub] = useState<number | null>(null)
  const duration = media?.duration ?? 0
  const value = scrub ?? position

  const commit = (next: number) => {
    setScrub(null)
    void window.qio.media.command('seek', next)
  }

  return (
    <div className="scrub">
      <span className="scrub-time">{formatDuration(value)}</span>
      <input
        className="slider"
        type="range"
        min={0}
        max={Math.max(1, Math.round(duration))}
        step={1}
        value={Math.min(value, Math.max(1, Math.round(duration)))}
        disabled={!media || duration <= 0 || !media.canSeek}
        onChange={(event) => setScrub(Number(event.target.value))}
        onPointerUp={(event) => commit(Number((event.target as HTMLInputElement).value))}
        onKeyUp={(event) => commit(Number((event.target as HTMLInputElement).value))}
        aria-label="جابه‌جایی"
      />
      <span className="scrub-time">{formatDuration(duration)}</span>
    </div>
  )
}

export function MusicPanel({ state }: { state: AppState | null }) {
  const media = state?.media ?? null
  const live = isLive(media)
  const cover = useCover(live && media ? media.coverKey : '')
  const position = useMediaClock(live ? media : null)
  const playing = media?.status === 'playing'

  return (
    <div className="music">
      <div className="music-head">
        {cover ? (
          <img className="music-cover" src={cover} alt="" />
        ) : (
          <span className="music-cover music-cover-empty">
            <MusicIcon size={30} />
          </span>
        )}
        <div className="music-meta">
          <span className="music-title" dir="auto">
            {media?.title || 'چیزی در حال پخش نیست'}
          </span>
          <span className="music-artist" dir="auto">
            {media?.artist || 'هر جای ویندوز آهنگی پخش کن'}
          </span>
          {media?.album && (
            <span className="music-album" dir="auto">
              {media.album}
            </span>
          )}
          <span className="music-badge">{live ? mediaAppName(media?.app ?? '') : 'در انتظار رسانهٔ ویندوز'}</span>
        </div>
      </div>

      <Scrubber media={live ? media : null} position={position} />

      <div className="music-controls">
        <button
          type="button"
          className="icon-button"
          onClick={() => void window.qio.media.command('previous')}
          disabled={!media?.canPrevious}
          title="قبلی"
        >
          <PrevIcon size={19} />
        </button>
        <button
          type="button"
          className="icon-button primary"
          onClick={() => void window.qio.media.command('playpause')}
          disabled={!live}
          title={playing ? 'توقف' : 'پخش'}
        >
          {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => void window.qio.media.command('next')}
          disabled={!media?.canNext}
          title="بعدی"
        >
          <NextIcon size={19} />
        </button>
      </div>

      <p className="panel-hint">
        با هر پخش‌کننده‌ای کار می‌کند که ویندوز می‌شناسد: Spotify، Apple Music، Media Player و تب‌های Chrome، Edge یا
        Firefox.
      </p>
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

  const lines = result?.synced ?? null
  const activeIndex = lines ? lines.reduce((index, line, i) => (line.time <= position ? i : index), -1) : -1

  useEffect(() => {
    if (activeIndex < 0) return
    const node = activeRef.current
    const list = listRef.current
    if (!node || !list) return
    const top = node.offsetTop - list.clientHeight / 2 + node.clientHeight / 2
    list.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [activeIndex])

  if (!state?.settings.lyrics) {
    return <p className="panel-hint">متن آهنگ خاموش است. از تنظیمات روشنش کن.</p>
  }

  if (!live) {
    return (
      <div className="lyrics lyrics-empty">
        <LyricsIcon size={30} />
        <p>آهنگی پخش کن تا Qio کلماتش را پیدا کند.</p>
        <p className="panel-hint">متن‌ها از LRCLIB می‌آیند؛ یک کتابخانهٔ رایگان مردمی.</p>
      </div>
    )
  }

  return (
    <div className="lyrics">
      <div className="lyrics-head">
        {cover ? <img className="lyrics-cover" src={cover} alt="" /> : <span className="lyrics-cover lyrics-cover-empty" />}
        <div className="lyrics-meta">
          <span className="lyrics-title" dir="auto">
            {media?.title}
          </span>
          <span className="lyrics-artist" dir="auto">
            {media?.artist}
          </span>
        </div>
        <span className="lyrics-source">{result?.synced ? 'هم‌زمان' : result?.source === 'lrclib' ? 'متنی' : ''}</span>
      </div>

      {loading && <p className="panel-hint">در جست‌وجوی متن…</p>}

      {!loading && lines && (
        <>
          <div className="lyrics-list" ref={listRef}>
            {lines.map((line, index) => (
              <p
                key={`${line.time}-${index}`}
                ref={index === activeIndex ? activeRef : null}
                className={`lyric-line${index === activeIndex ? ' lyric-line-active' : ''}`}
                onClick={() => void window.qio.media.command('seek', line.time)}
                title="رفتن به این خط"
                dir="auto"
              >
                {line.text}
              </p>
            ))}
          </div>
          <p className="panel-hint">روی هر خط بزن تا آهنگ همان‌جا برود.</p>
        </>
      )}

      {!loading && !lines && result?.plain && (
        <div className="lyrics-list lyrics-plain">
          {result.plain.split(/\r?\n/).map((line, index) => (
            <p key={index} className="lyric-line" dir="auto">
              {line || '\u00a0'}
            </p>
          ))}
        </div>
      )}

      {!loading && !lines && !result?.plain && <p className="panel-hint">{lyricMessage(result?.message)}</p>}
    </div>
  )
}
