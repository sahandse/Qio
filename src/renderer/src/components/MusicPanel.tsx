import { useEffect, useRef, useState } from 'react'
import type { AppState, LyricResult, MediaState } from '@shared/types'
import { formatDuration, mediaAppName } from '../lib/format'
import { useCover, useMediaClock } from '../lib/state'
import { LyricsIcon, MusicIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon } from './Icons'

function isLive(media: MediaState | null): boolean {
  return Boolean(media && media.title && media.status !== 'stopped' && media.status !== 'unavailable')
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
        aria-label="Seek"
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
          <span className="music-title">{media?.title || 'Nothing playing'}</span>
          <span className="music-artist">{media?.artist || 'Start a song anywhere on Windows'}</span>
          {media?.album && <span className="music-album">{media.album}</span>}
          <span className="music-badge">{live ? mediaAppName(media?.app ?? '') : 'Waiting for Windows media'}</span>
        </div>
      </div>

      <Scrubber media={live ? media : null} position={position} />

      <div className="music-controls">
        <button
          type="button"
          className="icon-button"
          onClick={() => void window.qio.media.command('previous')}
          disabled={!media?.canPrevious}
          title="Previous"
        >
          <PrevIcon size={19} />
        </button>
        <button
          type="button"
          className="icon-button primary"
          onClick={() => void window.qio.media.command('playpause')}
          disabled={!live}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => void window.qio.media.command('next')}
          disabled={!media?.canNext}
          title="Next"
        >
          <NextIcon size={19} />
        </button>
      </div>

      <p className="panel-hint">
        Works with any player Windows knows about: Spotify, Apple Music, Media Player and tabs in Chrome, Edge or
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
    return <p className="panel-hint">Lyrics are switched off. Turn them on in Settings.</p>
  }

  if (!live) {
    return (
      <div className="lyrics lyrics-empty">
        <LyricsIcon size={30} />
        <p>Play something and Qio will find the words.</p>
        <p className="panel-hint">Lyrics come from LRCLIB, a free community library.</p>
      </div>
    )
  }

  return (
    <div className="lyrics">
      <div className="lyrics-head">
        {cover ? <img className="lyrics-cover" src={cover} alt="" /> : <span className="lyrics-cover lyrics-cover-empty" />}
        <div className="lyrics-meta">
          <span className="lyrics-title">{media?.title}</span>
          <span className="lyrics-artist">{media?.artist}</span>
        </div>
        <span className="lyrics-source">{result?.synced ? 'synced' : result?.source === 'lrclib' ? 'plain' : ''}</span>
      </div>

      {loading && <p className="panel-hint">Looking for lyrics…</p>}

      {!loading && lines && (
        <>
          <div className="lyrics-list" ref={listRef}>
            {lines.map((line, index) => (
              <p
                key={`${line.time}-${index}`}
                ref={index === activeIndex ? activeRef : null}
                className={`lyric-line${index === activeIndex ? ' lyric-line-active' : ''}`}
                onClick={() => void window.qio.media.command('seek', line.time)}
                title="Jump to this line"
              >
                {line.text}
              </p>
            ))}
          </div>
          <p className="panel-hint">Click a line to jump there.</p>
        </>
      )}

      {!loading && !lines && result?.plain && (
        <div className="lyrics-list lyrics-plain">
          {result.plain.split(/\r?\n/).map((line, index) => (
            <p key={index} className="lyric-line">
              {line || '\u00a0'}
            </p>
          ))}
        </div>
      )}

      {!loading && !lines && !result?.plain && (
        <p className="panel-hint">{result?.message ?? 'No lyrics for this track yet.'}</p>
      )}
    </div>
  )
}
