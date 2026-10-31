/**
 * A dependency-free QR Code (ISO/IEC 18004 Model 2) encoder.
 * Pure and platform neutral, so the notch panel can draw a real, scannable
 * symbol offline in both the main and the renderer process.
 */
export type QrEcc = 'L' | 'M' | 'Q' | 'H'

export type QrMode = 'numeric' | 'alphanumeric' | 'byte'

export interface QrMatrix {
  /** Modules on one side without the quiet zone: 4 * version + 17. */
  size: number
  /** modules[row][col], [0][0] is the top-left module. */
  modules: boolean[][]
  version: number
  ecc: QrEcc
  mask: number
}

export interface QrSvgOptions {
  cell?: number
  margin?: number
  dark?: string
  light?: string
  dot?: boolean
  label?: string
}

const LEVELS: QrEcc[] = ['L', 'M', 'Q', 'H']

/** The 2-bit ECC indicator inside the format string; M is 00, so it is not ordered. */
const FORMAT_LEVEL: Record<QrEcc, number> = { L: 1, M: 0, Q: 3, H: 2 }

const MODE_BITS: Record<QrMode, number> = { numeric: 1, alphanumeric: 2, byte: 4 }

const ALPHANUM_SET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'

/** Total codewords per version; identical for all four levels of that version. */
const TOTAL_CODEWORDS = [
  26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991, 1085, 1156, 1258, 1364,
  1474, 1588, 1706, 1828, 1921, 2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706
]

/** EC codewords per block and block count, per level (L, M, Q, H) then version 1..40. */
const EC_PER_BLOCK: number[][] = [
  [7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
]

const BLOCK_COUNT: number[][] = [
  [1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
]

/** Alignment pattern centres, indexed by version; version 1 has none. */
const ALIGNMENT_CENTERS: number[][] = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
  [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78],
  [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]
]

/** Mask conditions, as (row + col) arithmetic from the standard's table. */
const MASKS: ((row: number, col: number) => boolean)[] = [
  (row, col) => (row + col) % 2 === 0,
  (row) => row % 2 === 0,
  (_row, col) => col % 3 === 0,
  (row, col) => (row + col) % 3 === 0,
  (row, col) => (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0,
  (row, col) => ((row * col) % 2) + ((row * col) % 3) === 0,
  (row, col) => (((row * col) % 2) + ((row * col) % 3)) % 2 === 0,
  (row, col) => (((row + col) % 2) + ((row * col) % 3)) % 2 === 0
]

/** GF(256) built from the QR primitive polynomial x^8 + x^4 + x^3 + x^2 + 1. */
function buildGf(): { exp: number[]; log: number[] } {
  const exp = new Array<number>(512).fill(0)
  const log = new Array<number>(256).fill(0)
  let value = 1
  for (let power = 0; power < 255; power++) {
    exp[power] = value
    log[value] = power
    value <<= 1
    if (value & 0x100) value ^= 0x11d
  }
  for (let power = 255; power < 512; power++) exp[power] = exp[power - 255]
  return { exp, log }
}

const GF = buildGf()

function gmul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF.exp[GF.log[a] + GF.log[b]]
}

/** Generator polynomials for 0..30 EC codewords, coefficients highest power first. */
function buildGenerators(): number[][] {
  const list: number[][] = [[1]]
  for (let degree = 1; degree <= 30; degree++) {
    const previous = list[degree - 1]
    const next = new Array<number>(degree + 1).fill(0)
    for (let j = 0; j < previous.length; j++) {
      next[j] ^= previous[j]
      next[j + 1] ^= gmul(previous[j], GF.exp[degree - 1])
    }
    list.push(next)
  }
  return list
}

const GENERATORS = buildGenerators()

function rsRemainder(data: Uint8Array, degree: number): Uint8Array {
  const generator = GENERATORS[degree]
  const remainder = new Uint8Array(degree)
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0]
    remainder.copyWithin(0, 1)
    remainder[degree - 1] = 0
    for (let j = 0; j < degree; j++) remainder[j] ^= gmul(generator[j + 1], factor)
  }
  return remainder
}

function levelRow(ecc: QrEcc): number {
  return LEVELS.indexOf(ecc)
}

function dataCodewords(version: number, ecc: QrEcc): number {
  const row = levelRow(ecc)
  return TOTAL_CODEWORDS[version - 1] - EC_PER_BLOCK[row][version - 1] * BLOCK_COUNT[row][version - 1]
}

function countBits(mode: QrMode, version: number): number {
  const group = version <= 9 ? 0 : version <= 26 ? 1 : 2
  if (mode === 'numeric') return [10, 12, 14][group]
  return mode === 'alphanumeric' ? [9, 11, 13][group] : [8, 16, 16][group]
}

function payloadBits(mode: QrMode, length: number): number {
  if (mode === 'numeric') return 10 * Math.floor(length / 3) + [0, 4, 7][length % 3]
  if (mode === 'alphanumeric') return 11 * Math.floor(length / 2) + 6 * (length % 2)
  return 8 * length
}

function payloadSize(text: string, mode: QrMode, bytes: number[]): number {
  return mode === 'byte' ? bytes.length : text.length
}

function fits(mode: QrMode, length: number, version: number, ecc: QrEcc): boolean {
  return 4 + countBits(mode, version) + payloadBits(mode, length) <= dataCodewords(version, ecc) * 8
}

function chooseVersion(mode: QrMode, length: number, ecc: QrEcc): number {
  for (let version = 1; version <= 40; version++) {
    if (fits(mode, length, version, ecc)) return version
  }
  return 0
}

function capacityChars(mode: QrMode, version: number, ecc: QrEcc): number {
  const budget = dataCodewords(version, ecc) * 8 - 4 - countBits(mode, version)
  if (budget < 0) return 0
  if (mode === 'byte') return Math.floor(budget / 8)
  if (mode === 'alphanumeric') {
    const pairs = Math.floor(budget / 11)
    return pairs * 2 + (budget - pairs * 11 >= 6 ? 1 : 0)
  }
  const triples = Math.floor(budget / 10)
  const rest = budget - triples * 10
  return triples * 3 + (rest >= 7 ? 2 : rest >= 4 ? 1 : 0)
}

function toUtf8(text: string): number[] {
  return Array.from(new TextEncoder().encode(text))
}

export function pickMode(text: string): QrMode {
  let digits = text.length > 0
  let alphanum = text.length > 0
  for (const char of text) {
    if (char < '0' || char > '9') digits = false
    if (ALPHANUM_SET.indexOf(char) < 0) alphanum = false
  }
  if (digits) return 'numeric'
  return alphanum ? 'alphanumeric' : 'byte'
}

function writeCodewords(text: string, mode: QrMode, version: number, ecc: QrEcc, bytes: number[]): Uint8Array {
  const capacity = dataCodewords(version, ecc)
  const out = new Uint8Array(capacity)
  let cursor = 0
  const push = (value: number, bits: number) => {
    for (let bit = bits - 1; bit >= 0; bit--) {
      out[cursor >> 3] |= ((value >> bit) & 1) << (7 - (cursor & 7))
      cursor++
    }
  }
  push(MODE_BITS[mode], 4)
  const length = payloadSize(text, mode, bytes)
  push(length, countBits(mode, version))
  if (mode === 'numeric') {
    for (let start = 0; start + 3 <= length; start += 3) push(Number.parseInt(text.slice(start, start + 3), 10), 10)
    const rest = length % 3
    if (rest === 1) push(Number.parseInt(text.slice(length - 1), 10), 4)
    if (rest === 2) push(Number.parseInt(text.slice(length - 2), 10), 7)
  } else if (mode === 'alphanumeric') {
    for (let start = 0; start + 2 <= length; start += 2) {
      push(ALPHANUM_SET.indexOf(text[start]) * 45 + ALPHANUM_SET.indexOf(text[start + 1]), 11)
    }
    if (length % 2 === 1) push(ALPHANUM_SET.indexOf(text[length - 1]), 6)
  } else {
    for (const byte of bytes) push(byte, 8)
  }
  push(0, Math.min(4, capacity * 8 - cursor))
  if (cursor % 8 !== 0) push(0, 8 - (cursor % 8))
  const filled = cursor >> 3
  for (let index = filled; index < capacity; index++) out[index] = (index - filled) % 2 === 0 ? 0xec : 0x11
  return out
}

/** Blocks are filled in order; the standard puts the shorter blocks first, then interleaves by column. */
function interleave(data: Uint8Array, version: number, ecc: QrEcc): Uint8Array {
  const row = levelRow(ecc)
  const total = TOTAL_CODEWORDS[version - 1]
  const blocks = BLOCK_COUNT[row][version - 1]
  const ecLength = EC_PER_BLOCK[row][version - 1]
  const shortLength = Math.floor(total / blocks) - ecLength
  const shortBlocks = blocks - (total % blocks)
  const chunks: Uint8Array[] = []
  const errors: Uint8Array[] = []
  let cursor = 0
  for (let index = 0; index < blocks; index++) {
    const length = shortLength + (index < shortBlocks ? 0 : 1)
    const chunk = data.subarray(cursor, cursor + length)
    cursor += length
    chunks.push(chunk)
    errors.push(rsRemainder(chunk, ecLength))
  }
  const out = new Uint8Array(total)
  let write = 0
  const longLength = shortLength + 1
  for (let column = 0; column < longLength; column++) {
    for (let index = 0; index < blocks; index++) {
      if (column < chunks[index].length) out[write++] = chunks[index][column]
    }
  }
  for (let column = 0; column < ecLength; column++) {
    for (let index = 0; index < blocks; index++) out[write++] = errors[index][column]
  }
  return out
}

function formatBits(ecc: QrEcc, mask: number): number {
  const data = (FORMAT_LEVEL[ecc] << 3) | mask
  let remainder = data
  for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537)
  return ((data << 10) | remainder) ^ 0x5412
}

function versionBits(version: number): number {
  let remainder = version
  for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25)
  return (version << 12) | remainder
}

interface Grid {
  size: number
  modules: Uint8Array
  fixed: Uint8Array
}

function put(grid: Grid, row: number, col: number, dark: boolean, fixed: boolean): void {
  grid.modules[row * grid.size + col] = dark ? 1 : 0
  if (fixed) grid.fixed[row * grid.size + col] = 1
}

function drawFormat(grid: Grid, ecc: QrEcc, mask: number, fixed: boolean): void {
  const bits = formatBits(ecc, mask)
  const bit = (index: number) => ((bits >>> index) & 1) === 1
  for (let i = 0; i <= 5; i++) put(grid, i, 8, bit(i), fixed)
  put(grid, 7, 8, bit(6), fixed)
  put(grid, 8, 8, bit(7), fixed)
  put(grid, 8, 7, bit(8), fixed)
  for (let i = 9; i < 15; i++) put(grid, 8, 14 - i, bit(i), fixed)
  for (let i = 0; i < 8; i++) put(grid, 8, grid.size - 1 - i, bit(i), fixed)
  for (let i = 8; i < 15; i++) put(grid, grid.size - 15 + i, 8, bit(i), fixed)
  put(grid, grid.size - 8, 8, true, fixed)
}

function drawVersion(grid: Grid, version: number): void {
  const bits = versionBits(version)
  for (let i = 0; i < 18; i++) {
    const dark = ((bits >>> i) & 1) === 1
    const near = grid.size - 11 + (i % 3)
    const far = Math.floor(i / 3)
    put(grid, far, near, dark, true)
    put(grid, near, far, dark, true)
  }
}

function drawFinder(grid: Grid, centerRow: number, centerCol: number): void {
  for (let row = -4; row <= 4; row++) {
    for (let col = -4; col <= 4; col++) {
      const r = centerRow + row
      const c = centerCol + col
      if (r < 0 || r >= grid.size || c < 0 || c >= grid.size) continue
      const distance = Math.max(Math.abs(row), Math.abs(col))
      put(grid, r, c, distance !== 2 && distance !== 4, true)
    }
  }
}

function drawAlignment(grid: Grid, version: number): void {
  const centers = ALIGNMENT_CENTERS[version]
  const last = centers.length - 1
  for (let i = 0; i <= last; i++) {
    for (let j = 0; j <= last; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue
      for (let row = -2; row <= 2; row++) {
        for (let col = -2; col <= 2; col++) {
          put(grid, centers[i] + row, centers[j] + col, Math.max(Math.abs(row), Math.abs(col)) !== 1, true)
        }
      }
    }
  }
}

function applyMask(grid: Grid, mask: number): void {
  const condition = MASKS[mask]
  for (let row = 0; row < grid.size; row++) {
    for (let col = 0; col < grid.size; col++) {
      if (grid.fixed[row * grid.size + col] === 0 && condition(row, col)) {
        grid.modules[row * grid.size + col] ^= 1
      }
    }
  }
}

const PATTERN_A = 0b10111010000
const PATTERN_B = 0b00001011101

function penalty(modules: Uint8Array, size: number): number {
  let score = 0
  let dark = 0
  for (let i = 0; i < modules.length; i++) dark += modules[i]
  for (let horizontal = 0; horizontal < 2; horizontal++) {
    for (let line = 0; line < size; line++) {
      const at = (index: number) => (horizontal === 0 ? modules[line * size + index] : modules[index * size + line])
      let value = -1
      let run = 0
      let window = 0
      for (let index = 0; index < size; index++) {
        const current = at(index)
        if (current === value) {
          run++
        } else {
          if (run >= 5) score += 3 + (run - 5)
          value = current
          run = 1
        }
        window = ((window << 1) & 0x7ff) | current
        if (index >= 10 && (window === PATTERN_A || window === PATTERN_B)) score += 40
      }
      if (run >= 5) score += 3 + (run - 5)
    }
  }
  for (let row = 0; row + 1 < size; row++) {
    for (let col = 0; col + 1 < size; col++) {
      const value = modules[row * size + col]
      if (value === modules[row * size + col + 1] && value === modules[(row + 1) * size + col] && value === modules[(row + 1) * size + col + 1]) {
        score += 3
      }
    }
  }
  const total = size * size
  score += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10
  return score
}

function buildSymbol(version: number, ecc: QrEcc, codewords: Uint8Array): QrMatrix {
  const size = 4 * version + 17
  const base: Grid = { size, modules: new Uint8Array(size * size), fixed: new Uint8Array(size * size) }
  for (let index = 0; index < size; index++) {
    put(base, 6, index, index % 2 === 0, true)
    put(base, index, 6, index % 2 === 0, true)
  }
  drawFinder(base, 3, 3)
  drawFinder(base, 3, size - 4)
  drawFinder(base, size - 4, 3)
  drawAlignment(base, version)
  if (version >= 7) drawVersion(base, version)
  drawFormat(base, ecc, 0, true)

  // The zigzag walks column pairs right to left; column 6 is the vertical timing pattern.
  let bit = 0
  const totalBits = codewords.length * 8
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vertical = 0; vertical < size; vertical++) {
      for (let offset = 0; offset < 2; offset++) {
        const col = right - offset
        const upward = ((right + 1) & 2) === 0
        const row = upward ? size - 1 - vertical : vertical
        if (base.fixed[row * size + col] === 0 && bit < totalBits) {
          base.modules[row * size + col] = (codewords[bit >> 3] >> (7 - (bit & 7))) & 1
          bit++
        }
      }
    }
  }

  const trial: Grid = { size, modules: new Uint8Array(size * size), fixed: base.fixed }
  let best = 0
  let bestScore = Infinity
  let bestModules = new Uint8Array(size * size)
  for (let mask = 0; mask < 8; mask++) {
    trial.modules.set(base.modules)
    applyMask(trial, mask)
    drawFormat(trial, ecc, mask, false)
    const score = penalty(trial.modules, size)
    if (score < bestScore) {
      bestScore = score
      best = mask
      bestModules = trial.modules.slice()
    }
  }

  const modules: boolean[][] = []
  for (let row = 0; row < size; row++) {
    const line: boolean[] = []
    for (let col = 0; col < size; col++) line.push(bestModules[row * size + col] === 1)
    modules.push(line)
  }
  return { size, modules, version, ecc, mask: best }
}

export function encodeQr(text: string, ecc: QrEcc = 'M'): QrMatrix | null {
  if (typeof text !== 'string' || levelRow(ecc) < 0) return null
  const mode = pickMode(text)
  const bytes = mode === 'byte' ? toUtf8(text) : []
  const version = chooseVersion(mode, payloadSize(text, mode, bytes), ecc)
  if (version === 0) return null
  const data = writeCodewords(text, mode, version, ecc, bytes)
  return buildSymbol(version, ecc, interleave(data, version, ecc))
}

function xmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function toPath(matrix: QrMatrix, cell = 4, margin = 4): string {
  const parts: string[] = []
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (!matrix.modules[row][col]) continue
      const x = (margin + col) * cell
      const y = (margin + row) * cell
      parts.push(`M${x} ${y}H${x + cell}V${y + cell}H${x}Z`)
    }
  }
  return parts.join('')
}

export function toSvg(matrix: QrMatrix, options: QrSvgOptions = {}): string {
  const cell = options.cell ?? 4
  const margin = options.margin ?? 4
  const dark = xmlText(options.dark ?? '#111827')
  const light = xmlText(options.light ?? '#ffffff')
  const edge = (matrix.size + margin * 2) * cell
  const label = options.label === undefined ? '' : ` role="img" aria-label="${xmlText(options.label)}"`
  const head =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${edge} ${edge}" width="${edge}" height="${edge}"` +
    `${label} shape-rendering="crispEdges">`
  const title = options.label === undefined ? '' : `<title>${xmlText(options.label)}</title>`
  let body = `<rect width="${edge}" height="${edge}" fill="${light}"/>`
  if (options.dot) {
    const radius = cell / 2
    const dots: string[] = []
    for (let row = 0; row < matrix.size; row++) {
      for (let col = 0; col < matrix.size; col++) {
        if (!matrix.modules[row][col]) continue
        dots.push(
          `<circle cx="${(margin + col) * cell + radius}" cy="${(margin + row) * cell + radius}" r="${radius}" fill="${dark}"/>`
        )
      }
    }
    body += dots.join('')
  } else {
    body += `<path fill="${dark}" d="${toPath(matrix, cell, margin)}"/>`
  }
  return `${head}${title}${body}</svg>`
}

const maxBytes: Record<QrEcc, number> = {
  L: capacityChars('byte', 40, 'L'),
  M: capacityChars('byte', 40, 'M'),
  Q: capacityChars('byte', 40, 'Q'),
  H: capacityChars('byte', 40, 'H')
}

/** Longest UTF-8 payload the largest symbol still holds, for capping the panel's input. */
export const QR_MAX_BYTES: Record<QrEcc, number> = Object.freeze(maxBytes)
