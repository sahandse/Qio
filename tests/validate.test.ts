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

test('football toggles pass the whitelist but the team and league lists do not', async () => {
  const { mergeSettings } = await import('../src/main/store/defaults.ts')
  const stored = mergeSettings({
    football: {
      teams: [{ id: '18', name: 'تراکتور', logo: '', league: 'لیگ برتر ایران' }],
      leagues: [{ id: '6', name: 'لیگ برتر انگلیس' }]
    }
  })
  const patch = pickSettingsPatch({
    football: {
      enabled: false,
      goalAlerts: false,
      startAlerts: true,
      redAlerts: true,
      finalAlerts: false,
      teams: [{ id: '1', name: 'حذف‌شده', logo: '', league: '' }],
      leagues: [{ id: '99', name: 'جدول دلخواه' }]
    }
  })
  assert.deepEqual(patch, {
    football: { enabled: false, goalAlerts: false, startAlerts: true, redAlerts: true, finalAlerts: false }
  })

  // The switch patch carries no lists: main must re-merge them or the picks vanish.
  const kept = mergeSettings({ ...stored, football: { ...stored.football, ...patch.football } })
  assert.equal(kept.football.enabled, false)
  assert.deepEqual(kept.football.teams.map((team) => team.id), ['18'])
  assert.deepEqual(kept.football.leagues.map((league) => league.id), ['6'])
})

test('move settings keep only the five known fields', () => {
  const patch = pickSettingsPatch({
    move: { enabled: true, everyMin: 45, startHour: 8, endHour: 20, notify: true, extra: 1 }
  })
  assert.deepEqual(patch, { move: { enabled: true, everyMin: 45, startHour: 8, endHour: 20, notify: true } })
})

test('a renderer cannot rewrite the quick-launch list', () => {
  const patch = pickSettingsPatch({
    launch: { items: [{ id: 'x', kind: 'url', target: 'https://evil.example', name: 'evil' }] }
  })
  assert.deepEqual(patch, {})
})

test('layout passes its three known keys and nothing else', () => {
  const patch = pickSettingsPatch({
    layout: {
      order: ['todo', 'calendar'],
      hidden: ['music'],
      size: { todo: '2x1' },
      evil: true
    }
  })
  assert.deepEqual(patch, {
    layout: { order: ['todo', 'calendar'], hidden: ['music'], size: { todo: '2x1' } }
  })
  assert.deepEqual(pickSettingsPatch({ layout: 'bento' }), {})
})
