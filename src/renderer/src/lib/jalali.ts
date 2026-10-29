/**
 * Jalaali (Persian) calendar math plus the Persian formatting Qio renders.
 * The conversion follows the jalaali-js algorithm (MIT, Behrang Noruzi Niya).
 */

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178
]

export { toPersianDigits } from '@shared/persian'
import { toPersianDigits } from '@shared/persian'

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
]

/** Saturday-first, the way Persian calendars are printed. */
export const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']
export const WEEKDAYS_NARROW = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

/** Fixed solar celebrations and national days. Lunar holidays move every year, so they are not listed. */
export const EVENTS: Record<string, string> = {
  '1/1': 'نوروز — آغاز سال نو',
  '1/2': 'عید نوروز',
  '1/3': 'عید نوروز',
  '1/4': 'عید نوروز',
  '1/12': 'روز جمهوری اسلامی',
  '1/13': 'سیزده‌به‌در — روز طبیعت',
  '3/14': 'رحلت امام خمینی',
  '3/15': 'قیام ۱۵ خرداد',
  '8/13': 'روز دانش‌آموز',
  '9/30': 'شب یلدا',
  '11/12': 'بازگشت امام خمینی',
  '11/22': 'پیروزی انقلاب اسلامی',
  '11/29': 'قیام مردم تبریز',
  '12/15': 'روز درخت‌کاری',
  '12/29': 'روز ملی شدن صنعت نفت'
}

export interface JDate {
  jy: number
  jm: number
  jd: number
}

function div(a: number, b: number): number {
  return Math.trunc(a / b)
}

function mod(a: number, b: number): number {
  return a - Math.trunc(a / b) * b
}

interface JalCal {
  leap: number
  gy: number
  march: number
}

function jalCal(jy: number): JalCal {
  const bl = BREAKS.length
  const gy = jy + 621
  let leapJ = -14
  let jp = BREAKS[0]
  let jump = 0

  if (jy < jp || jy >= BREAKS[bl - 1]) throw new Error(`Invalid Jalaali year ${jy}`)

  for (let i = 1; i < bl; i += 1) {
    const jm = BREAKS[i]
    jump = jm - jp
    if (jy < jm) break
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = jm
  }

  let n = jy - jp
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  let leap = mod(mod(n + 1, 33) - 1, 4)
  if (leap === -1) leap = 4

  return { leap, gy, march }
}

/** Gregorian date -> Julian day number. */
function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
  return d
}

/** Julian day number -> Gregorian date. */
function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(mod(j, 1461), 4) * 5 + 308
  const gd = div(mod(i, 153), 5) + 1
  const gm = mod(div(i, 153), 12) + 1
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6)
  return { gy, gm, gd }
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy)
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
}

function d2j(jdn: number): JDate {
  const gy = d2g(jdn).gy
  let jy = gy - 621
  const r = jalCal(jy)
  const jdn1f = g2d(gy, 3, r.march)
  let k = jdn - jdn1f

  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 }
    k -= 186
  } else {
    jy -= 1
    k += 179
    if (r.leap === 1) k += 1
  }

  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 }
}

export function toJalali(date: Date): JDate {
  return d2j(g2d(date.getFullYear(), date.getMonth() + 1, date.getDate()))
}

export function toGregorian(jy: number, jm: number, jd: number): Date {
  const { gy, gm, gd } = d2g(j2d(jy, jm, jd))
  return new Date(gy, gm - 1, gd)
}

export function isLeapYear(jy: number): boolean {
  return jalCal(jy).leap === 0
}

export function monthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  return isLeapYear(jy) ? 30 : 29
}

/** 0 is Saturday, 6 is Friday. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 1) % 7
}

export function weekdayOf(jy: number, jm: number, jd: number): number {
  return weekdayIndex(toGregorian(jy, jm, jd))
}

export function isFriday(jy: number, jm: number, jd: number): boolean {
  return weekdayOf(jy, jm, jd) === 6
}

export function sameDay(a: Date, jy: number, jm: number, jd: number): boolean {
  const j = toJalali(a)
  return j.jy === jy && j.jm === jm && j.jd === jd
}

export function eventOn(jm: number, jd: number): string | null {
  return EVENTS[`${jm}/${jd}`] ?? null
}

/** Calendar cells for one month: leading blanks, the days, trailing blanks to fill the last week. */
export function monthGrid(jy: number, jm: number): (number | null)[] {
  const lead = weekdayOf(jy, jm, 1)
  const cells: (number | null)[] = Array.from({ length: lead }, () => null)
  for (let day = 1; day <= monthLength(jy, jm); day += 1) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export interface WeekDay {
  date: Date
  j: JDate
  /** 0 is Saturday, 6 is Friday. */
  weekday: number
  today: boolean
  event: string | null
}

/** The seven days of the week that contains `now`, Saturday first. */
export function weekAround(now = new Date()): WeekDay[] {
  const today = weekdayIndex(now)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - today, 12)
  return Array.from({ length: 7 }, (_, weekday) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + weekday, 12)
    const j = toJalali(date)
    return { date, j, weekday, today: weekday === today, event: eventOn(j.jm, j.jd) }
  })
}

export function addMonths(jy: number, jm: number, delta: number): { jy: number; jm: number } {
  const total = jy * 12 + (jm - 1) + delta
  return { jy: Math.floor(total / 12), jm: (total % 12) + 1 }
}

export function formatJalali(
  date: Date,
  options: { weekday?: boolean; year?: boolean } = {}
): string {
  const { weekday = true, year = true } = options
  const j = toJalali(date)
  const parts: string[] = []
  if (weekday) parts.push(WEEKDAYS[weekdayIndex(date)])
  parts.push(`${toPersianDigits(j.jd)} ${JALALI_MONTHS[j.jm - 1]}`)
  if (year) parts.push(toPersianDigits(j.jy))
  return parts.join(' ')
}

export function formatJalaliDay(jy: number, jm: number, jd: number): string {
  return `${WEEKDAYS[weekdayOf(jy, jm, jd)]} ${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

const DAY_MS = 86_400_000

/** Days until the next Farvardin 1st; zero when today is Nowruz. */
export function nextNowruz(now = new Date()): { date: Date; days: number; jy: number } {
  const today = startOfDay(now)
  const current = toJalali(now)
  const candidates = [current.jy, current.jy + 1]
  for (const jy of candidates) {
    const date = toGregorian(jy, 1, 1)
    const days = Math.round((startOfDay(date) - today) / DAY_MS)
    if (days >= 0) return { date, days, jy }
  }
  const date = toGregorian(current.jy + 2, 1, 1)
  return { date, days: Math.round((startOfDay(date) - today) / DAY_MS), jy: current.jy + 2 }
}

export function formatCountdown(days: number): string {
  if (days === 0) return 'امروز'
  if (days === 1) return 'فردا'
  return `${toPersianDigits(days)} روز دیگر`
}

/** First fixed event from today onward, so the notch can mention it. */
export function upcomingEvent(
  now = new Date(),
  lookahead = 10
): { days: number; title: string } | null {
  for (let offset = 0; offset <= lookahead; offset += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12)
    const j = toJalali(day)
    const title = eventOn(j.jm, j.jd)
    if (title) return { days: offset, title }
  }
  return null
}

/** «روز دانش‌آموز» → «دانش‌آموز» and «سیزده‌به‌در — روز طبیعت» → «سیزده‌به‌در» so chips stay short. */
export function shortEvent(title: string): string {
  return title.split('—')[0].replace(/^روز\s+/, '').trim()
}
