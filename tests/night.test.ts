import test from 'node:test'
import assert from 'node:assert/strict'
import { NIGHT_END_HOUR, NIGHT_START_HOUR, isNightHour } from '../src/renderer/src/lib/night.ts'

test('night starts at 21 and ends at 07', () => {
  assert.equal(NIGHT_START_HOUR, 21)
  assert.equal(NIGHT_END_HOUR, 7)
})

test('the night window covers late evening and early morning', () => {
  assert.equal(isNightHour(20), false)
  assert.equal(isNightHour(21), true)
  assert.equal(isNightHour(23), true)
  assert.equal(isNightHour(0), true)
  assert.equal(isNightHour(6), true)
  assert.equal(isNightHour(7), false)
  assert.equal(isNightHour(12), false)
})
