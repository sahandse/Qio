import test from 'node:test'
import assert from 'node:assert/strict'
import { isNewer } from '../src/shared/version.ts'

test('a higher patch, minor or major version is newer', () => {
  assert.equal(isNewer('1.3.1', '1.3.0'), true)
  assert.equal(isNewer('1.4.0', '1.3.9'), true)
  assert.equal(isNewer('2.0.0', '1.99.99'), true)
})

test('number parts compare as numbers, not text', () => {
  assert.equal(isNewer('1.10.0', '1.9.9'), true)
  assert.equal(isNewer('1.9.0', '1.10.0'), false)
})

test('equal and older tags are not newer', () => {
  assert.equal(isNewer('1.3.0', '1.3.0'), false)
  assert.equal(isNewer('1.2.9', '1.3.0'), false)
  assert.equal(isNewer('v1.3.0', '1.3.0'), false)
})

test('a leading v and a pre-release suffix do not confuse the comparison', () => {
  assert.equal(isNewer('v1.4.0', '1.3.0'), true)
  assert.equal(isNewer('1.3.0-beta.2', '1.3.0'), false)
  assert.equal(isNewer('1.4.0-rc.1', '1.3.0'), true)
})

test('garbage never counts as an update', () => {
  assert.equal(isNewer('', '1.3.0'), false)
  assert.equal(isNewer('latest', '1.3.0'), false)
  assert.equal(isNewer('1.3.0', ''), false)
})
