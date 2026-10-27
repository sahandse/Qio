import { formatJalali, toPersianDigits, WEEKDAYS_NARROW, weekdayIndex } from './jalali'

export function formatClock(date: Date, withSeconds = false, hour24 = true): string {
  const rawHours = hour24 ? date.getHours() : ((date.getHours() + 11) % 12) + 1
  const hours = `${rawHours}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  const seconds = `${date.getSeconds()}`.padStart(2, '0')
  return toPersianDigits(withSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`)
}

export function formatDay(date: Date): string {
  return formatJalali(date, { weekday: true, year: false })
}

export function formatJalaliDate(date: Date): string {
  return formatJalali(date)
}

export function weekdayNarrow(date: Date): string {
  return WEEKDAYS_NARROW[weekdayIndex(date)]
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return toPersianDigits('0:00')
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return toPersianDigits(`${minutes}:${`${rest}`.padStart(2, '0')}`)
}

export function formatRemaining(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return toPersianDigits('-0:00')
  return `−${formatDuration(seconds)}`
}

export function formatBytes(bytes: number, isDir = false): string {
  if (isDir) return 'پوشه'
  if (!bytes) return `${toPersianDigits(0)} بایت`
  const units = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت', 'ترابایت']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** index
  const text = value >= 10 || index === 0 ? `${Math.round(value)}` : value.toFixed(1).replace('.', '٫')
  return `${toPersianDigits(text)} ${units[index]}`
}

export function formatLitres(ml: number): string {
  const text = (ml / 1000).toFixed(2).replace(/\.?0+$/, '').replace('.', '٫')
  return `${toPersianDigits(text)} لیتر`
}

export function relativeDay(date: Date, now = new Date()): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diff = Math.round((day - start) / 86_400_000)
  if (diff === 0) return 'امروز'
  if (diff === -1) return 'دیروز'
  if (diff === 1) return 'فردا'
  return formatJalali(date, { weekday: false, year: date.getFullYear() !== now.getFullYear() })
}

export function formatDueTime(timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp)
  const time = formatClock(date)
  if (timestamp < now) return `گذشته · ${time}`
  const day = relativeDay(date)
  return day === 'امروز' ? `امروز · ${time}` : `${day} · ${time}`
}

/** Language tag for a Windows keyboard layout id (low word of the HKL). */
export function layoutLabel(hkl: string): string {
  const map: Record<string, string> = {
    '0409': 'انگلیسی',
    '0809': 'انگلیسی',
    '0c09': 'انگلیسی',
    '0407': 'آلمانی',
    '040c': 'فرانسوی',
    '0410': 'ایتالیایی',
    '040a': 'اسپانیایی',
    '0416': 'پرتغالی',
    '0419': 'روسی',
    '041f': 'ترکی',
    '0429': 'فارسی',
    '0401': 'عربی',
    '040d': 'عبری',
    '0411': 'ژاپنی',
    '0412': 'کره‌ای',
    '0804': 'چینی',
    '0404': 'چینی',
    '0415': 'لهستانی',
    '0413': 'هلندی',
    '041d': 'سوئدی',
    '0422': 'اوکراینی',
    '0423': 'بلاروسی',
    '042a': 'ویتنامی',
    '0439': 'هندی'
  }
  return map[hkl.toLowerCase()] ?? hkl.toUpperCase().slice(2)
}

/** A friendly name for the app that owns the current media session. */
export function mediaAppName(appId: string): string {
  if (!appId) return 'رسانهٔ ویندوز'
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
