export function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDay(date: Date): string {
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${`${rest}`.padStart(2, '0')}`
}

export function formatRemaining(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '-0:00'
  return `-${formatDuration(seconds)}`
}

export function formatBytes(bytes: number, isDir = false): string {
  if (isDir) return 'Folder'
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** index
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}

export function formatLitres(ml: number): string {
  return `${(ml / 1000).toFixed(2).replace(/\.00$/, '.0')} L`
}

export function relativeDay(date: Date, now = new Date()): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diff = Math.round((day - start) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === -1) return 'Yesterday'
  if (diff === 1) return 'Tomorrow'
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export function formatDueTime(timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp)
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (timestamp < now) return `Overdue · ${time}`
  const day = relativeDay(date)
  return day === 'Today' ? `Today · ${time}` : `${day} · ${time}`
}

/** Language tag for a Windows keyboard layout id (low word of the HKL). */
export function layoutLabel(hkl: string): string {
  const map: Record<string, string> = {
    '0409': 'EN',
    '0809': 'EN',
    '0c09': 'EN',
    '0407': 'DE',
    '040c': 'FR',
    '0410': 'IT',
    '040a': 'ES',
    '0416': 'PT',
    '0419': 'RU',
    '041f': 'TR',
    '0429': 'FA',
    '0401': 'AR',
    '040d': 'HE',
    '0411': 'JA',
    '0412': 'KO',
    '0804': 'ZH',
    '0404': 'ZH',
    '0415': 'PL',
    '0413': 'NL',
    '041d': 'SV',
    '0422': 'UK',
    '0423': 'BE',
    '042a': 'VI',
    '0439': 'HI'
  }
  return map[hkl.toLowerCase()] ?? hkl.toUpperCase().slice(2)
}

/** A friendly name for the app that owns the current media session. */
export function mediaAppName(appId: string): string {
  if (!appId) return 'Windows media'
  const known: Record<string, string> = {
    spotify: 'Spotify',
    applemusic: 'Apple Music',
    itunes: 'iTunes',
    chrome: 'Chrome',
    msedge: 'Edge',
    firefox: 'Firefox',
    zen: 'Zen',
    brave: 'Brave',
    opera: 'Opera',
    vlc: 'VLC',
    'windows media player': 'Media Player',
    zune: 'Groove',
    tidal: 'TIDAL',
    deezer: 'Deezer',
    youtube: 'YouTube',
    aimp: 'AIMP',
    foobar2000: 'foobar2000',
    mpv: 'mpv'
  }
  const clean = appId.replace(/\.exe$/i, '')
  const last = clean.split(/[\\/]/).pop() ?? clean
  return known[last.toLowerCase()] ?? last
}
