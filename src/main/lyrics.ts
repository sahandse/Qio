import type { LyricLine, LyricResult } from '@shared/types'

const API = 'https://lrclib.net/api'
const USER_AGENT = 'Qio/1.0.0 (https://github.com/sahandse/qio)'
const CACHE_LIMIT = 40

interface LrcLibRecord {
  id: number
  trackName?: string
  artistName?: string
  albumName?: string
  duration?: number
  instrumental?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

const cache = new Map<string, LyricResult>()

/** LRC text -> timed lines. Handles [mm:ss.xx] tags, several tags per line and [offset:]. */
export function parseLrc(text: string): LyricLine[] {
  const lines: LyricLine[] = []
  let offset = 0
  const tag = /\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g

  for (const raw of text.split(/\r?\n/)) {
    const offsetMatch = /^\[offset:(-?\d+)\]/i.exec(raw.trim())
    if (offsetMatch) {
      offset = Number(offsetMatch[1]) / 1000
      continue
    }
    tag.lastIndex = 0
    const stamps: number[] = []
    let match: RegExpExecArray | null
    while ((match = tag.exec(raw)) !== null) {
      const minutes = Number(match[1])
      const seconds = Number(match[2].replace(':', '.'))
      stamps.push(minutes * 60 + seconds)
    }
    if (stamps.length === 0) continue
    const content = raw.replace(tag, '').trim()
    if (!content) continue
    for (const time of stamps) {
      lines.push({ time: Math.max(0, time + offset), text: content })
    }
  }

  return lines.sort((a, b) => a.time - b.time)
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/** Trims the noisy parts of a title so LRCLIB has a chance of matching. */
function cleanTitle(title: string): string {
  return title
    .replace(/\((?:feat|ft)\..*?\)/gi, '')
    .replace(/\[(?:feat|ft)\..*?\]/gi, '')
    .replace(/\s*[-–]\s*(?:official|lyric|audio|video|visuali[sz]er|remaster(?:ed)?).*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function primaryArtist(artist: string): string {
  return artist.split(/,|&|feat\.|ft\.| x /i)[0].trim() || artist.trim()
}

function toResult(record: LrcLibRecord | undefined): LyricResult {
  if (!record) {
    return { synced: null, plain: null, instrumental: false, source: 'none', message: 'No lyrics found' }
  }
  if (record.instrumental) {
    return { synced: null, plain: null, instrumental: true, source: 'lrclib', message: 'Instrumental' }
  }
  const synced = record.syncedLyrics ? parseLrc(record.syncedLyrics) : []
  const plain = record.plainLyrics ? decodeEntities(record.plainLyrics) : null
  if (synced.length === 0 && !plain) {
    return { synced: null, plain: null, instrumental: false, source: 'none', message: 'No lyrics found' }
  }
  return {
    synced: synced.length > 0 ? synced : null,
    plain: plain && !record.syncedLyrics ? decodeEntities(plain) : null,
    instrumental: false,
    source: 'lrclib'
  }
}

async function getJson(path: string, signal: AbortSignal): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${API}${path}`, {
    signal,
    headers: { 'user-agent': USER_AGENT, accept: 'application/json' }
  })
  if (response.status === 404) return { status: 404, body: null }
  if (!response.ok) return { status: response.status, body: null }
  return { status: response.status, body: await response.json() }
}

export async function fetchLyrics(input: {
  title: string
  artist: string
  album?: string
  duration?: number
}): Promise<LyricResult> {
  const title = cleanTitle(input.title)
  const artist = primaryArtist(input.artist)
  if (!title || !artist) {
    return { synced: null, plain: null, instrumental: false, source: 'none', message: 'Nothing playing' }
  }

  const duration = input.duration ? Math.round(input.duration) : 0
  const key = `${artist.toLowerCase()}|${title.toLowerCase()}|${duration}`
  const cached = cache.get(key)
  if (cached) return cached

  const signal = AbortSignal.timeout(9000)
  const finish = (result: LyricResult): LyricResult => {
    cache.set(key, result)
    if (cache.size > CACHE_LIMIT) {
      const oldest = cache.keys().next().value
      if (oldest) cache.delete(oldest)
    }
    return result
  }

  try {
    const params = new URLSearchParams({ artist_name: artist, track_name: title })
    if (input.album) params.set('album_name', input.album)
    if (duration) params.set('duration', String(duration))

    const exact = await getJson(`/get?${params.toString()}`, signal)
    if (exact.status === 200) return finish(toResult(exact.body as LrcLibRecord))

    const query = new URLSearchParams({ track_name: title, artist_name: artist })
    const search = await getJson(`/search?${query.toString()}`, signal)
    const records = Array.isArray(search.body) ? (search.body as LrcLibRecord[]) : []
    if (records.length === 0) return finish(toResult(undefined))

    const scored = [...records].sort((a, b) => score(a, title, duration) - score(b, title, duration))
    return finish(toResult(scored[0]))
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError' ? 'Lyrics timed out' : 'Lyrics unavailable'
    return { synced: null, plain: null, instrumental: false, source: 'none', message }
  }
}

/** Lower is better: synced lyrics first, then close duration, then close title. */
function score(record: LrcLibRecord, title: string, duration: number): number {
  let value = 0
  if (!record.syncedLyrics && !record.plainLyrics) value += 100
  if (!record.syncedLyrics) value += 25
  if (duration && record.duration) value += Math.abs(record.duration - duration)
  const recordTitle = (record.trackName ?? '').toLowerCase().trim()
  if (recordTitle !== title.toLowerCase().trim()) value += 8
  return value
}
