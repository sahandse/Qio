import test from 'node:test'
import assert from 'node:assert/strict'
import { pickFocusPatch, pickSettingsPatch, pickTodoPatch } from '../src/shared/validate.ts'

test('settings patch keeps known keys only', () => {
  const patch = pickSettingsPatch({
    lyrics: false,
    evil: 1,
    notchScale: 2,
    presence: { mode: 'peek', everyMin: 5, hacker: true }
  })
  assert.deepEqual(patch, { lyrics: false, notchScale: 1.5, presence: { mode: 'peek', everyMin: 5 } })
})

test('settings patch ignores wrong types and non-objects', () => {
  assert.deepEqual(pickSettingsPatch({ lyrics: 'yes', notchScale: 'big' }), {})
  assert.deepEqual(pickSettingsPatch({ mascotStyle: 'shiny' }), {})
  assert.deepEqual(pickSettingsPatch(null), {})
  assert.deepEqual(pickSettingsPatch('patch'), {})
})

test('focus patch survives only valid fields', () => {
  const patch = pickFocusPatch({
    mode: 'nap',
    endsAt: 123,
    running: true,
    pausedMs: -5,
    round: 2.7,
    day: '2026-10-29',
    extra: 'x'
  })
  assert.deepEqual(patch, { endsAt: 123, running: true, pausedMs: 0, round: 2.7, day: '2026-10-29' })
  assert.deepEqual(pickFocusPatch({ endsAt: null, mode: 'short' }), { endsAt: null, mode: 'short' })
  assert.deepEqual(pickFocusPatch({ day: 'yesterday' }), {})
})

test('todo patch trims text and validates dueAt', () => {
  assert.deepEqual(pickTodoPatch({ text: '  hi  ', done: true, dueAt: 'x' }), { text: 'hi', done: true })
  assert.deepEqual(pickTodoPatch({ dueAt: null }), { dueAt: null })
  assert.deepEqual(pickTodoPatch({ done: 'yes', notified: 1 }), {})
})
