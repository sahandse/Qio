/** Night runs from 21:00 until 07:00; the UI warms and dims itself in that window. */
export const NIGHT_START_HOUR = 21
export const NIGHT_END_HOUR = 7

export function isNightHour(hour: number): boolean {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR
}
