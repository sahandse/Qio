/**
 * Clipboard history. Everything lives in this process's memory and nowhere else:
 * nothing is written to qio.json, nothing is written to disk, and quitting wipes
 * the lot. The recorder is off until the user turns it on.
 */
import { ClipboardItem, clipboard, nativeImage } from 'electron'
import { createHash, randomUUID } from 'node:crypto'
import type { ClipEntry, ClipSettings, ClipView } from '@shared/types'

/** Fast enough to feel live; a text probe is a few microseconds. */
const TEXT_EVERY_MS = 600
/** Pictures are big, so their bytes are only pulled out every few seconds. */
const IMAGE_EVERY_MS = 3000
const PREVIEW_CHARS = 220
const STORED_TEXT_CHARS = 20_000
const THUMB_PX = 96
/** Ceiling on the bitmaps held in RAM; the oldest picture is dropped past it. */
const MAX_IMAGE_BYTES = 40_000_000

interface ClipRecord {
  entry: ClipEntry
  /** Full body for text entries. */
  text?: string
  /** Encoded picture for image entries; handed back to the clipboard as is. */
  png?: Buffer
}

interface ClipDeps {
  settings(): ClipSettings
  changed(view: ClipView): void
}

function digest(value: string | Buffer): string {
  return createHash('sha1').update(value).digest('hex')
}

function summarize(body: string): string {
  return body.replace(/\r\n/g, '\n').slice(0, PREVIEW_CHARS)
}

/** PNG width and height live in the IHDR chunk, so no decode is needed to size a tile. */
function pngSize(png: Buffer): { width: number; height: number } {
  if (png.length < 24) return { width: 0, height: 0 }
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}

function pickType(types: string[], needle: string): string | null {
  return types.find((type) => type.toLowerCase() === needle) ?? null
}

async function blobToBuffer(blob: Blob): Promise<Buffer> {
  return Buffer.from(await blob.arrayBuffer())
}

export class ClipService {
  private records: ClipRecord[] = []
  private timer: NodeJS.Timeout | null = null
  private paused = false
  /** Signature of the last thing seen, so an unchanged clipboard costs nothing. */
  private seen = ''
  private since = 0
  private busy = false

  constructor(private readonly deps: ClipDeps) {}

  get view(): ClipView {
    const settings = this.deps.settings()
    return {
      enabled: settings.enabled,
      paused: this.paused,
      limit: settings.limit,
      bytes: this.records.reduce((sum, record) => sum + (record.png?.length ?? record.text?.length ?? 0), 0),
      entries: this.records.map((record) => record.entry)
    }
  }

  /** Called on start and whenever the clipboard settings change. */
  sync(): void {
    const settings = this.deps.settings()
    if (!settings.enabled) {
      this.stop()
      this.records = []
      this.seen = ''
      this.deps.changed(this.view)
      return
    }
    this.trim(settings.limit)
    this.start()
    this.deps.changed(this.view)
  }

  start(): void {
    if (this.timer || !this.deps.settings().enabled) return
    this.timer = setInterval(() => void this.tick(), TEXT_EVERY_MS)
    void this.tick()
  }

  stop(): void {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  }

  setPaused(paused: boolean): ClipView {
    this.paused = Boolean(paused)
    // Resuming must not resurrect whatever sat on the clipboard during the pause.
    this.seen = ''
    this.deps.changed(this.view)
    return this.view
  }

  use(id: string): boolean {
    const record = this.records.find((entry) => entry.entry.id === id)
    if (!record) return false
    if (record.entry.kind === 'image') {
      if (!record.png) return false
      void clipboard.write([new ClipboardItem({ 'image/png': new Blob([new Uint8Array(record.png)], { type: 'image/png' }) })])
    } else {
      void clipboard.writeText(record.text ?? '')
    }
    // The next tick sees our own write come back and counts it as one more copy.
    this.seen = ''
    return true
  }

  remove(id: string): ClipView {
    this.records = this.records.filter((record) => record.entry.id !== id)
    this.deps.changed(this.view)
    return this.view
  }

  clear(): ClipView {
    this.records = []
    this.seen = ''
    this.deps.changed(this.view)
    return this.view
  }

  private async tick(): Promise<void> {
    const settings = this.deps.settings()
    if (!settings.enabled || this.paused || this.busy) return
    this.busy = true
    try {
      const items = await clipboard.read()
      const picture = items.find((item) => pickType(item.types, 'image/png'))
      // A file copied from Explorer is the shelf's business, not the clipboard's.
      const files = items.find((item) => pickType(item.types, 'text/uri-list'))
      const now = Date.now()
      if (picture && (!files || !picture.types.includes('text/uri-list'))) {
        const due = this.seen.startsWith('i:') ? now - this.since >= IMAGE_EVERY_MS : true
        if (!due) return
        this.since = now
        const png = await blobToBuffer(await picture.getType('image/png'))
        if (png.length === 0) return
        const signature = `i:${digest(png)}`
        if (signature === this.seen) return
        this.seen = signature
        const size = pngSize(png)
        const thumb = nativeImage.createFromBuffer(png).resize({ width: THUMB_PX }).toDataURL()
        this.add({ kind: 'image', png, thumb, width: size.width, height: size.height })
        return
      }
      const textItem = items.find((item) => pickType(item.types, 'text/plain'))
      if (!textItem || files) {
        this.seen = ''
        return
      }
      const raw = await blobToBuffer(await textItem.getType('text/plain'))
      const body = raw.toString('utf8')
      if (!body.trim()) {
        this.seen = ''
        return
      }
      const text = body.slice(0, STORED_TEXT_CHARS)
      const signature = `t:${digest(text)}`
      if (signature === this.seen) return
      this.seen = signature
      this.add({ kind: 'text', text })
    } catch {
      // Another app holding the clipboard open is a normal Tuesday; the next tick tries again.
    } finally {
      this.busy = false
    }
  }

  private touch(record: ClipRecord): void {
    this.records = [record, ...this.records.filter((entry) => entry !== record)]
  }

  private add(input: {
    kind: 'text' | 'image'
    text?: string
    png?: Buffer
    thumb?: string
    width?: number
    height?: number
  }): void {
    const settings = this.deps.settings()
    const duplicate = this.records.find(
      (record) =>
        record.entry.kind === input.kind &&
        (input.kind === 'text' ? record.text === input.text : record.png?.length === input.png?.length)
    )
    if (duplicate) {
      duplicate.entry = { ...duplicate.entry, at: Date.now(), hits: duplicate.entry.hits + 1 }
      this.touch(duplicate)
      this.deps.changed(this.view)
      return
    }
    const entry: ClipEntry = {
      id: randomUUID(),
      kind: input.kind,
      preview: input.kind === 'text' ? summarize(input.text ?? '') : '',
      thumb: input.thumb ?? '',
      amount: input.kind === 'text' ? (input.text ?? '').length : (input.width ?? 0) * (input.height ?? 0),
      width: input.width ?? 0,
      height: input.height ?? 0,
      at: Date.now(),
      hits: 1
    }
    this.records.unshift({ entry, text: input.text, png: input.png })
    this.trim(settings.limit)
    this.deps.changed(this.view)
  }

  /** Keep the list inside the user's limit and the pictures inside the memory budget. */
  private trim(limit: number): void {
    if (this.records.length > limit) this.records = this.records.slice(0, limit)
    let images = 0
    const dropped = new Set<string>()
    for (const record of [...this.records].reverse()) {
      if (!record.png) continue
      images += record.png.length
      if (images > MAX_IMAGE_BYTES) dropped.add(record.entry.id)
    }
    if (dropped.size > 0) this.records = this.records.filter((record) => !dropped.has(record.entry.id))
  }
}
