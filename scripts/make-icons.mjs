// Qio generates its own artwork so the repo has no binary blobs checked in.
// Writes resources/icon.png (256x256, app + installer icon),
// resources/icon-512.png and resources/tray.png (32x32, Windows tray icon).

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const hex = (value) => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16)
]

/** Signed distance to a rounded rectangle, used for smooth (antialiased) coverage. */
function roundRectCoverage(px, py, x, y, w, h, r) {
  const cx = Math.max(x + r, Math.min(px, x + w - r))
  const cy = Math.max(y + r, Math.min(py, y + h - r))
  const d = Math.hypot(px - cx, py - cy) - r
  const inside = px >= x - 1 && px <= x + w + 1 && py >= y - 1 && py <= y + h + 1
  if (!inside) return 0
  return Math.max(0, Math.min(1, 0.5 - d))
}

function circleCoverage(px, py, cx, cy, r) {
  return Math.max(0, Math.min(1, 0.5 - (Math.hypot(px - cx, py - cy) - r)))
}

function draw(size) {
  const s = size / 256
  const px = Buffer.alloc(size * size * 4)
  const body = hex('#0B0E13')
  const rim = hex('#242A35')
  const eye = hex('#8AE6C0')
  const bar = hex('#3A4352')

  const blend = (i, color, alpha) => {
    if (alpha <= 0) return
    const a = Math.min(1, alpha)
    const dst = [px[i], px[i + 1], px[i + 2], px[i + 3] / 255]
    const outA = a + dst[3] * (1 - a)
    if (outA <= 0) return
    for (let c = 0; c < 3; c++) {
      px[i + c] = Math.round((color[c] * a + dst[c] * dst[3] * (1 - a)) / outA)
    }
    px[i + 3] = Math.round(outA * 255)
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      // Outer rim, then the dark notch body on top of it.
      const rimA = roundRectCoverage(x + 0.5, y + 0.5, 12 * s, 24 * s, 232 * s, 208 * s, 52 * s)
      blend(i, rim, rimA)
      const bodyA = roundRectCoverage(x + 0.5, y + 0.5, 14 * s, 26 * s, 228 * s, 204 * s, 50 * s)
      blend(i, body, bodyA)
      // Speaker slot across the top: the "notch" itself.
      const barA = roundRectCoverage(x + 0.5, y + 0.5, 62 * s, 62 * s, 132 * s, 16 * s, 8 * s)
      blend(i, bar, barA * 0.9)
      // Two friendly eyes — the mascot.
      blend(i, eye, circleCoverage(x + 0.5, y + 0.5, 100 * s, 162 * s, 17 * s))
      blend(i, eye, circleCoverage(x + 0.5, y + 0.5, 156 * s, 162 * s, 17 * s))
    }
  }
  return px
}

mkdirSync(join(root, 'resources'), { recursive: true })
for (const [name, size] of [
  ['icon.png', 256],
  ['tray.png', 32],
  ['icon-512.png', 512]
]) {
  writeFileSync(join(root, 'resources', name), encodePng(size, size, draw(size)))
}
console.log('wrote resources/icon.png, resources/tray.png, resources/icon-512.png')
