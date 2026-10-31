import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { rm } from 'node:fs/promises'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { sha256Matches } from '@shared/update'

type FetchLike = (url: string, init: { headers: Record<string, string>; redirect: 'follow' }) => Promise<Response>

export interface DownloadRequest {
  url: string
  file: string
  sha: string
  size: number | null
  headers: Record<string, string>
  fetch: FetchLike
  onProgress?: (ratio: number) => void
  /** Runs after the bytes are on disk and before hashing starts. */
  onDownloaded?: () => void
}

export type DownloadResult =
  | { ok: true; sha: string }
  | { ok: false; reason: 'network' | 'size' | 'hash' }

function hashFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(path)
      .on('error', reject)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
  })
}

/** Streams an installer to disk, then proves it against the published SHA-256 before anyone runs it. */
export async function downloadVerified(request: DownloadRequest): Promise<DownloadResult> {
  try {
    const response = await request.fetch(request.url, {
      headers: request.headers,
      redirect: 'follow'
    })
    if (!response.ok || !response.body) throw new Error(`installer ${response.status}`)
    const total = Number(response.headers.get('content-length')) || request.size || 0
    let received = 0
    const counter = new Transform({
      transform(chunk: Buffer, _encoding, done) {
        received += chunk.length
        if (total > 0) request.onProgress?.(Math.min(0.99, received / total))
        done(null, chunk)
      }
    })
    await pipeline(Readable.fromWeb(response.body), counter, createWriteStream(request.file))
    if (request.size && received !== request.size) {
      await rm(request.file, { force: true })
      return { ok: false, reason: 'size' }
    }
    request.onDownloaded?.()
    const actual = await hashFile(request.file)
    if (!sha256Matches(request.sha, actual)) {
      await rm(request.file, { force: true })
      return { ok: false, reason: 'hash' }
    }
    return { ok: true, sha: actual }
  } catch {
    await rm(request.file, { force: true }).catch(() => undefined)
    return { ok: false, reason: 'network' }
  }
}
