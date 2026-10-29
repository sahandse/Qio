import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatJalali,
  isLeapYear,
  monthLength,
  nextNowruz,
  toJalali,
  upcomingEvent
} from '../src/renderer/src/lib/jalali.ts'

test('gregorian dates land on the right Persian day', () => {
  assert.deepEqual(toJalali(new Date(2026, 2, 21)), { jy: 1405, jm: 1, jd: 1 })
  assert.deepEqual(toJalali(new Date(2026, 9, 29)), { jy: 1405, jm: 8, jd: 7 })
  assert.deepEqual(toJalali(new Date(2024, 1, 29)), { jy: 1402, jm: 12, jd: 10 })
})

test('leap years get a 30th day in Esfand', () => {
  assert.equal(isLeapYear(1403), true)
  assert.equal(isLeapYear(1404), false)
  assert.equal(monthLength(1403, 12), 30)
  assert.equal(monthLength(1404, 12), 29)
  assert.equal(monthLength(1405, 1), 31)
})

test('a date reads as a full Persian sentence', () => {
  const text = formatJalali(new Date(2026, 9, 29))
  assert.match(text, /۷ آبان ۱۴۰۵/)
  assert.match(text, /پنجشنبه/)
})

test('Nowruz countdown always points at Farvardin 1st', () => {
  const before = nextNowruz(new Date(2026, 9, 29))
  assert.equal(before.jy, 1406)
  assert.deepEqual([before.date.getFullYear(), before.date.getMonth(), before.date.getDate()], [2027, 2, 21])
  const onDay = nextNowruz(new Date(2026, 2, 21))
  assert.equal(onDay.days, 0)
})

test('upcoming events are found inside the lookahead window', () => {
  // ۱ آبان ۱۴۰۵ is 2026-10-23, so 2026-11-04 is ۱۳ آبان — روز دانش‌آموز.
  assert.deepEqual(upcomingEvent(new Date(2026, 10, 1), 5), { days: 3, title: 'روز دانش‌آموز' })
  assert.equal(upcomingEvent(new Date(2026, 10, 1), 2), null)
})
