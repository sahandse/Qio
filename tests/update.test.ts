import test from 'node:test'
import assert from 'node:assert/strict'
import { isInstallerAsset, megabytes, pickInstaller, sha256Digest, sha256Matches } from '../src/shared/update.ts'

const HASH = 'b7f828eb98bf774a32862c01bb093df3254ea7699805027a3b09cefbc3891661'

test('a sha256 digest is accepted with either prefix case and comes back lowercased', () => {
  assert.equal(sha256Digest(`sha256:${HASH}`), HASH)
  assert.equal(sha256Digest(`SHA256:${HASH.toUpperCase()}`), HASH)
  assert.equal(sha256Digest(`  sha256:${HASH}  `), HASH)
})

test('digests of other shapes or algorithms are refused', () => {
  assert.equal(sha256Digest(`sha512:${HASH}`), null)
  assert.equal(sha256Digest(`sha256:${HASH.slice(0, 40)}`), null)
  assert.equal(sha256Digest(`sha256:${'z'.repeat(64)}`), null)
  assert.equal(sha256Digest(null), null)
  assert.equal(sha256Digest(undefined), null)
  assert.equal(sha256Digest(42), null)
})

test('only the Windows setup exe counts as an installer', () => {
  assert.equal(isInstallerAsset('Qio-Setup-1.5.0.exe'), true)
  assert.equal(isInstallerAsset('latest.yml'), false)
  assert.equal(isInstallerAsset('Qio-Setup-1.5.0.exe.blockmap'), false)
  assert.equal(isInstallerAsset('Other-Setup-1.5.0.exe'), false)
  assert.equal(isInstallerAsset(undefined), false)
})

test('the installer is picked only when it carries a sha256 digest', () => {
  const assets = [
    { name: 'latest.yml', digest: `sha256:${HASH}` },
    { name: 'Qio-Setup-1.5.0.exe', digest: null },
    { name: 'Qio-Setup-1.6.0.exe', digest: `sha256:${HASH}`, extra: 'x' }
  ]
  const picked = pickInstaller(assets)
  assert.equal(picked?.asset.name, 'Qio-Setup-1.6.0.exe')
  assert.equal(picked?.sha, HASH)
  assert.equal(pickInstaller([{ name: 'Qio-Setup-1.5.0.exe' }]), null)
  assert.equal(pickInstaller(undefined), null)
})

test('hash comparison ignores case but not content', () => {
  assert.equal(sha256Matches(HASH, HASH), true)
  assert.equal(sha256Matches(HASH.toUpperCase(), HASH), true)
  assert.equal(sha256Matches(HASH, `${'0'.repeat(63)}1`), false)
  assert.equal(sha256Matches('not-a-hash', 'not-a-hash'), false)
})

test('installer size is rounded to one decimal place of a megabyte', () => {
  assert.equal(megabytes(122_203_794), 116.5)
  assert.equal(megabytes(1_048_576), 1)
  assert.equal(megabytes(0), null)
  assert.equal(megabytes(undefined), null)
  assert.equal(megabytes(-5), null)
})
