import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatBytes,
  formatClock,
  formatDuration,
  formatLitres,
  formatRemaining,
  relativeDay
} from '../src/renderer/src/lib/format.ts'

test('the clock follows the Windows 12/24-hour choice', () => {
  const morning = new Date(2026, 9, 29, 9, 5)
  assert.equal(formatClock(morning), '۰۹:۰۵')
  const afternoon = new Date(2026, 9, 29, 13, 5)
  assert.equal(formatClock(afternoon), '۱۳:۰۵')
  assert.equal(formatClock(afternoon, false, false), '۰۱:۰۵')
  assert.equal(formatClock(new Date(2026, 9, 29, 0, 30), false, false), '۱۲:۳۰')
  assert.equal(formatClock(new Date(2026, 9, 29, 9, 5, 7), true), '۰۹:۰۵:۰۷')
})

test('durations never show negative or broken digits', () => {
  assert.equal(formatDuration(65), '۱:۰۵')
  assert.equal(formatDuration(0), '۰:۰۰')
  assert.equal(formatDuration(Number.NaN), '۰:۰۰')
  assert.equal(formatRemaining(-5), '−۰:۰۰')
  assert.equal(formatRemaining(90), '−۱:۳۰')
})

test('file sizes pick a readable unit', () => {
  assert.equal(formatBytes(0), '۰ بایت')
  assert.equal(formatBytes(512), '۵۱۲ بایت')
  assert.equal(formatBytes(1536), '۱٫۵ کیلوبایت')
  assert.equal(formatBytes(1024 * 1024), '۱٫۰ مگابایت')
  assert.equal(formatBytes(0, true), 'پوشه')
})

test('litres lose trailing zeros', () => {
  assert.equal(formatLitres(1500), '۱٫۵ لیتر')
  assert.equal(formatLitres(2000), '۲ لیتر')
})

test('relative days read naturally', () => {
  const now = new Date(2026, 9, 29, 12)
  assert.equal(relativeDay(now, now), 'امروز')
  assert.equal(relativeDay(new Date(2026, 9, 30, 9), now), 'فردا')
  assert.equal(relativeDay(new Date(2026, 9, 28, 9), now), 'دیروز')
})
