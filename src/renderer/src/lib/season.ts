/**
 * The notch picks up the colour of the running season, and the two big Persian
 * celebrations add their own small flourish on top of it.
 */
import { useEffect, useState } from 'react'
import { toJalali } from './jalali'

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter'
export type FestivalId = 'nowruz' | 'yalda'

export interface Season {
  id: SeasonId
  /** rgb triplet for rgb(var(--season)) */
  hue: string
  /** Multiplier for the tint layers; 0 switches the whole layer off. */
  alpha: string
  label: string
}

const SEASONS: Record<SeasonId, Omit<Season, 'id'>> = {
  spring: { hue: '138, 230, 168', alpha: '1', label: 'بهار' },
  summer: { hue: '246, 206, 120', alpha: '0.8', label: 'تابستان' },
  autumn: { hue: '235, 166, 104', alpha: '0.9', label: 'پاییز' },
  winter: { hue: '134, 184, 236', alpha: '0.9', label: 'زمستان' }
}

/** Jalali months 1–3 spring, 4–6 summer, 7–9 autumn, 10–12 winter. */
const MONTH_SEASON: SeasonId[] = [
  'spring',
  'spring',
  'spring',
  'summer',
  'summer',
  'summer',
  'autumn',
  'autumn',
  'autumn',
  'winter',
  'winter',
  'winter'
]

/** Nowruz for the first thirteen days of Farvardin; Yalda from Azar 29 through Dey 1. */
export function festivalOn(now = new Date()): FestivalId | null {
  const j = toJalali(now)
  if (j.jm === 1 && j.jd <= 13) return 'nowruz'
  if ((j.jm === 9 && j.jd >= 29) || (j.jm === 10 && j.jd <= 1)) return 'yalda'
  return null
}

export function seasonFor(now = new Date()): Season {
  const festival = festivalOn(now)
  if (festival === 'yalda') return { id: 'winter', hue: '240, 152, 118', alpha: '1', label: 'یلدا' }
  if (festival === 'nowruz') return { id: 'spring', hue: '150, 232, 172', alpha: '1', label: 'نوروز' }
  const id = MONTH_SEASON[toJalali(now).jm - 1]
  return { id, ...SEASONS[id] }
}

/**
 * Keeps `--season` / `--season-alpha` on the root, so the aurora picks up the
 * season without any component re-rendering.
 */
export function useSeasonTheme(on: boolean): void {
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      if (!on) {
        root.removeAttribute('data-season')
        root.style.removeProperty('--season')
        root.style.setProperty('--season-alpha', '0')
        return
      }
      const season = seasonFor()
      root.dataset.season = season.id
      root.style.setProperty('--season', season.hue)
      root.style.setProperty('--season-alpha', season.alpha)
    }
    apply()
    const timer = window.setInterval(apply, 30 * 60_000)
    return () => {
      window.clearInterval(timer)
      root.removeAttribute('data-season')
      root.style.removeProperty('--season')
      root.style.setProperty('--season-alpha', '0')
    }
  }, [on])
}

/** The celebration whose particles should float right now, if any. */
export function useFestival(on: boolean): FestivalId | null {
  const [festival, setFestival] = useState<FestivalId | null>(() => (on ? festivalOn() : null))

  useEffect(() => {
    if (!on) {
      setFestival(null)
      return
    }
    const apply = () => setFestival(festivalOn())
    apply()
    const timer = window.setInterval(apply, 30 * 60_000)
    return () => window.clearInterval(timer)
  }, [on])

  return festival
}
