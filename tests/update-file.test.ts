import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { mkdtemp, readFile, stat } from 'node:fs/promises'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { downloadVerified } from '../src/main/update-file.ts'

const BODY = randomBytes(2 * 1024 * 1024 + 333)
const HASH = createHash('sha256').update(BODY).digest('hex')

async function serve(status: number): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer((_request, response) => {
    if (status !== 200) {
      response.writeHead(status)
      response.end('nope')
      return
    }
    response.writeHead(200, { 'content-length': String(BODY.length), 'content-type': 'application/octet-stream' })
    response.end(BODY)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as AddressInfo).port
  return {
    url: `http://127.0.0.1:${port}/Qio-Setup-1.5.0.exe`,
    close: () => new Promise((resolve) => server.close(() => resolve()))
  }
}

async function workspace(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'qio-update-test-'))
}

test('a matching hash saves the installer and reports the verified digest', async () => {
  const server = await serve(200)
  const dir = await workspace()
  const file = join(dir, 'Qio-Setup-1.5.0.exe')
  try {
    const progress: number[] = []
    let downloaded = false
    const result = await downloadVerified({
      url: server.url,
      file,
      sha: HASH,
      size: BODY.length,
      headers: {},
      fetch,
      onProgress: (ratio) => progress.push(ratio),
      onDownloaded: () => {
        downloaded = true
      }
    })
    assert.deepEqual(result, { ok: true, sha: HASH })
    assert.equal(downloaded, true)
    assert.deepEqual(await readFile(file), BODY)
    assert.ok(progress.length > 0)
    assert.ok(progress.every((ratio) => ratio > 0 && ratio <= 0.99))
  } finally {
    rmSync(dir, { recursive: true, force: true })
    await server.close()
  }
})

test('a wrong hash deletes the file and refuses to install it', async () => {
  const server = await serve(200)
  const dir = await workspace()
  const file = join(dir, 'Qio-Setup-1.5.0.exe')
  try {
    const result = await downloadVerified({
      url: server.url,
      file,
      sha: 'b7f828eb98bf774a32862c01bb093df3254ea7699805027a3b09cefbc3891661',
      size: BODY.length,
      headers: {},
      fetch
    })
    assert.deepEqual(result, { ok: false, reason: 'hash' })
    await assert.rejects(stat(file))
  } finally {
    rmSync(dir, { recursive: true, force: true })
    await server.close()
  }
})

test('a size that does not match the release is refused before hashing', async () => {
  const server = await serve(200)
  const dir = await workspace()
  const file = join(dir, 'Qio-Setup-1.5.0.exe')
  try {
    const result = await downloadVerified({
      url: server.url,
      file,
      sha: HASH,
      size: BODY.length + 10,
      headers: {},
      fetch
    })
    assert.deepEqual(result, { ok: false, reason: 'size' })
    await assert.rejects(stat(file))
  } finally {
    rmSync(dir, { recursive: true, force: true })
    await server.close()
  }
})

test('a failed request leaves nothing behind', async () => {
  const server = await serve(404)
  const dir = await workspace()
  const file = join(dir, 'Qio-Setup-1.5.0.exe')
  try {
    const result = await downloadVerified({
      url: server.url,
      file,
      sha: HASH,
      size: BODY.length,
      headers: {},
      fetch
    })
    assert.deepEqual(result, { ok: false, reason: 'network' })
    await assert.rejects(stat(file))
  } finally {
    rmSync(dir, { recursive: true, force: true })
    await server.close()
  }
})
