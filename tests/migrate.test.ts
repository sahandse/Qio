import test from 'node:test'
import assert from 'node:assert/strict'
import { CURRENT_VERSION, migrate } from '../src/main/store/migrate.ts'

test('unversioned files are lifted to the current version', () => {
  const out = migrate({ settings: { lyrics: false } })
  assert.equal(out.version, CURRENT_VERSION)
  assert.equal((out.settings as Record<string, unknown>).autoNight, true)
  assert.equal((out.settings as Record<string, unknown>).lyrics, false)
})

test('version 1 keeps an explicit autoNight choice', () => {
  const out = migrate({ version: 1, settings: { autoNight: false } })
  assert.equal(out.version, CURRENT_VERSION)
  assert.equal((out.settings as Record<string, unknown>).autoNight, false)
})

test('a current file passes through untouched', () => {
  const input = { version: CURRENT_VERSION, settings: { autoNight: false }, todos: [{ id: 'a' }] }
  const out = migrate(input)
  assert.equal(out.version, CURRENT_VERSION)
  assert.deepEqual(out.todos, [{ id: 'a' }])
  assert.equal((out.settings as Record<string, unknown>).autoNight, false)
})

test('garbage becomes an empty current file', () => {
  for (const input of [null, undefined, 'nope', 42, [1, 2, 3]]) {
    assert.equal(migrate(input).version, CURRENT_VERSION)
  }
})
