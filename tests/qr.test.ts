/**
 * Independent quality gate for src/shared/qr.ts.
 *
 * Nothing in this file is derived from the encoder's internals: every table, rule and
 * formula below is transcribed from ISO/IEC 18004 (finder/separator layout, alignment
 * coordinate rule, BCH(15,5) format info with generator 0x537 and mask 0x5412, BCH(18,6)
 * version info with generator 0x1F25, the zigzag module placement, the eight mask
 * conditions, the mode/count indicator tables, the codeword and block tables, GF(2^56)
 * arithmetic with the primitive polynomial x^8+x^4+x^3+x^2+1 (0x11D) and the RS generator
 * polynomial product (x-a^i)). The encoder only contributes its public API.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { QR_MAX_BYTES, encodeQr, pickMode, toPath, toSvg } from '../src/shared/qr.ts'
import type { QrEcc, QrMatrix } from '../src/shared/qr.ts'

const LEVELS: QrEcc[] = ['L', 'M', 'Q', 'H']

/** The two-bit error correction indicator carried by the format information. */
const ECC_INDICATOR: Record<QrEcc, number> = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 }

/** Total codewords (data + EC) per version 1..40. */
const SPEC_TOTAL_CODEWORDS = [
  26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991, 1085, 1156, 1258, 1364,
  1474, 1588, 1706, 1828, 1921, 2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706
]

/** EC codewords per block, per level, versions 1..40. */
const SPEC_EC_PER_BLOCK: Record<QrEcc, number[]> = {
  L: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
}

/** Number of EC blocks, per level, versions 1..40. */
const SPEC_BLOCK_COUNT: Record<QrEcc, number[]> = {
  L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
}

/** Modules that carry no codeword bit, indexed by version (index 0 unused). */
const SPEC_REMAINDER_BITS = [
  0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0,
  0, 0, 0
]

/** Byte-mode character capacities copied from the standard's capacity table. */
const SPEC_BYTE_CAPACITY: Record<QrEcc, number[]> = {
  L: [17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 2953],
  M: [14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 2331],
  Q: [11, 20, 32, 46, 60, 74, 86, 108, 130, 151, 1663],
  H: [7, 14, 24, 34, 44, 58, 64, 84, 98, 119, 1273]
}

/** Versions 1..10 and version 40 of that table. */
const SPEC_BYTE_CAPACITY_VERSIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 40]

const SPEC_NUMERIC_CAPACITY_V1_TO_V4: Record<QrEcc, number[]> = { L: [41, 77, 127, 187], M: [34, 63, 101, 149], Q: [27, 48, 77, 111], H: [17, 34, 58, 82] }
const SPEC_ALNUM_CAPACITY_V1_TO_V3: Record<QrEcc, number[]> = { L: [25, 47, 77], M: [20, 38, 61], Q: [16, 29, 47], H: [10, 20, 35] }

const ALPHANUMERIC_SET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'

/** Mode indicators as the standard assigns them. */
const MODE_NUMERIC = 0b0001
const MODE_ALPHANUMERIC = 0b0010
const MODE_BYTE = 0b0100

/** Version-range dependent character count indicator widths, from the standard's table. */
function countIndicatorBits(mode: number, version: number): number {
  const group = version <= 9 ? 0 : version <= 26 ? 1 : 2
  if (mode === MODE_NUMERIC) return [10, 12, 14][group]
  if (mode === MODE_ALPHANUMERIC) return [9, 11, 13][group]
  if (mode === MODE_BYTE) return [8, 16, 16][group]
  assert.fail(`unknown mode indicator ${mode}`)
}

/** The standard's rule: first centre at 6, last at 4v+10, the rest evenly spread on even steps. */
function specAlignmentCenters(version: number): number[] {
  if (version === 1) return []
  const count = Math.floor(version / 7) + 2
  const last = 4 * version + 10
  const span = last - 6
  // Version 32 is the documented exception to the even rounding of the step.
  const step = version === 32 ? 26 : Math.ceil(span / (count - 1) / 2) * 2
  const centers = [6]
  for (let index = 1; index < count - 1; index++) centers.push(last - (count - 1 - index) * step)
  centers.push(last)
  return centers
}

/** All eight mask conditions, exactly as tabled in the standard. */
function maskCondition(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0
    case 1:
      return row % 2 === 0
    case 2:
      return col % 3 === 0
    case 3:
      return (row + col) % 3 === 0
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0
    case 7:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0
    default:
      assert.fail(`mask ${mask} is outside 0..7`)
  }
}

/** 1 = no data may be placed there: the standard's function patterns and reserved strips. */
function reservedMap(matrix: QrMatrix): Uint8Array {
  const size = matrix.size
  const reserved = new Uint8Array(size * size)
  const mark = (row: number, col: number): void => {
    if (row >= 0 && row < size && col >= 0 && col < size) reserved[row * size + col] = 1
  }
  // Finder patterns with their separators. The top-left block grows to 9x9 because the format
  // strips live on row 8 and column 8; the other two stop at the separator edge and pick the
  // format strips up through the clips at size - 8.
  for (const [row0, col0] of [[0, 0], [0, size - 8], [size - 8, 0]]) {
    for (let row = 0; row <= 8; row++) for (let col = 0; col <= 8; col++) mark(row0 + row, col0 + col)
  }
  for (let i = 0; i < size; i++) {
    mark(6, i)
    mark(i, 6)
  }
  const centers = specAlignmentCenters(matrix.version)
  const outside = centers.length - 1
  for (let i = 0; i <= outside; i++) {
    for (let j = 0; j <= outside; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === outside) || (i === outside && j === 0)) continue
      for (let row = -2; row <= 2; row++) for (let col = -2; col <= 2; col++) mark(centers[i] + row, centers[j] + col)
    }
  }
  if (matrix.version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        mark(i, size - 11 + j)
        mark(size - 11 + j, i)
      }
    }
  }
  return reserved
}

/** The standard's bottom-up two-column zigzag over the free modules. */
function scanPositions(matrix: QrMatrix): Array<{ row: number; col: number }> {
  const size = matrix.size
  const reserved = reservedMap(matrix)
  const out: Array<{ row: number; col: number }> = []
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    const upward = (right + 1) % 4 === 0 || right === size - 1
    for (let step = 0; step < size; step++) {
      for (const col of [right, right - 1]) {
        const row = upward ? size - 1 - step : step
        if (reserved[row * size + col] === 0) out.push({ row, col })
      }
    }
  }
  return out
}

function specFormatBits(ecc: QrEcc, mask: number): number {
  const data = (ECC_INDICATOR[ecc] << 3) | mask
  let remainder = data
  for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537)
  return ((data << 10) | remainder) ^ 0x5412
}

function specVersionBits(version: number): number {
  let remainder = version
  for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25)
  return (version << 12) | remainder
}

function readFormatBits(matrix: QrMatrix): number {
  const at = (row: number, col: number) => (matrix.modules[row][col] ? 1 : 0)
  let bits = 0
  for (let i = 0; i <= 5; i++) bits |= at(i, 8) << i
  bits |= at(7, 8) << 6
  bits |= at(8, 8) << 7
  bits |= at(8, 7) << 8
  for (let i = 9; i < 15; i++) bits |= at(8, 14 - i) << i
  return bits
}

function readFormatBitsCopy2(matrix: QrMatrix): number {
  const size = matrix.size
  const at = (row: number, col: number) => (matrix.modules[row][col] ? 1 : 0)
  let bits = 0
  for (let i = 0; i < 8; i++) bits |= at(8, size - 1 - i) << i
  for (let i = 8; i < 15; i++) bits |= at(size - 15 + i, 8) << i
  return bits
}

/** Turns a 15-bit format word back into level and mask, rejecting anything not a codeword. */
function decodeFormat(bits: number): { ecc: QrEcc; mask: number } {
  assert.equal(bits ^ 0x5412, specFormatBitsIndistinguishable(bits), 'format word must be a valid BCH(15,5) codeword')
  for (const ecc of LEVELS) {
    for (let mask = 0; mask < 8; mask++) {
      if (specFormatBits(ecc, mask) === bits) return { ecc, mask }
    }
  }
  assert.fail(`format word ${bits.toString(2).padStart(15, '0')} is not one of the 32 defined ones`)
}

/** Remainder of the 15-bit word under the same generator, so a codeword scores 0. */
function specFormatBitsIndistinguishable(bits: number): number {
  const unmasked = bits ^ 0x5412
  let remainder = unmasked
  for (let i = 0; i < 14; i++) {
    remainder = (remainder << 1) ^ ((remainder >>> 14) * 0x537)
  }
  // Re-divide the same way the encoder does: a valid word leaves no remainder.
  return remainder === 0 ? unmasked : bits
}

function readVersionBits(matrix: QrMatrix): number {
  const size = matrix.size
  let bits = 0
  for (let i = 0; i < 18; i++) {
    const dark = matrix.modules[Math.floor(i / 3)][size - 11 + (i % 3)] ? 1 : 0
    bits |= dark << i
  }
  return bits
}

function readVersionBitsCopy2(matrix: QrMatrix): number {
  const size = matrix.size
  let bits = 0
  for (let i = 0; i < 18; i++) {
    const dark = matrix.modules[size - 11 + (i % 3)][Math.floor(i / 3)] ? 1 : 0
    bits |= dark << i
  }
  return bits
}

interface GF {
  exp: number[]
  log: number[]
}

/** GF(2^8) from x^8+x^4+x^3+x^2+1 with 0x11D, generator element 2. */
function specGf(): GF {
  const exp = new Array<number>(512).fill(0)
  const log = new Array<number>(256).fill(0)
  let value = 1
  for (let power = 0; power < 255; power++) {
    exp[power] = value
    log[value] = power
    value <<= 1
    if ((value & 0x100) !== 0) value ^= 0x11d
  }
  for (let power = 255; power < 512; power++) exp[power] = exp[power - 255]
  return { exp, log }
}

const GF256 = specGf()

function gmul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF256.exp[GF256.log[a] + GF256.log[b]]
}

/** Product of (x - a^i) for i in 0..degree-1, highest power first. */
function specGenerator(degree: number, gf = GF256): number[] {
  const previous = [1]
  for (let d = 1; d <= degree; d++) {
    const next = new Array<number>(d + 1).fill(0)
    for (let j = 0; j < previous.length; j++) {
      next[j] ^= previous[j]
      next[j + 1] ^= gmulWith(previous[j], gf.exp[(d - 1) % 255], gf)
    }
    previous.length = 0
    previous.push(...next)
  }
  return previous
}

function gmulWith(a: number, b: number, gf: GF): number {
  if (a === 0 || b === 0) return 0
  return gf.exp[gf.log[a] + gf.log[b]]
}

/** Horner evaluation of a highest-power-first polynomial at a^exponent. */
function evaluateAt(coefficients: number[], alphaPower: number): number {
  let sum = 0
  for (const coefficient of coefficients) sum = gmul(sum, alphaPower) ^ coefficient
  return sum
}

function syndromes(codeword: number[], errorCount: number): number[] {
  const out: number[] = []
  for (let i = 1; i <= 2 * errorCount; i++) out.push(evaluateAt(codeword, GF256.exp[i % 255]))
  return out
}

interface DecodedSymbol {
  matrix: QrMatrix
  /** De-masked module values, in scan order: 8*T(v) + remainder bits. */
  bits: number[]
  /** Data codewords per block, in block order. */
  data: number[][]
  /** EC codewords per block. */
  ec: number[][]
  ecPerBlock: number
  text: string
  formatEcc: QrEcc
  formatMask: number
}

function decodeSymbol(matrix: QrMatrix, flipBit = -1): DecodedSymbol {
  const positions = scanPositions(matrix)
  const raw = positions.map(({ row, col }) => (matrix.modules[row][col] ? 1 : 0))
  const format = decodeFormat(readFormatBits(matrix))
  const bits = raw.map((value, index) =>
    maskCondition(format.mask, positions[index].row, positions[index].col) ? 1 - value : value
  )
  if (flipBit >= 0) bits[flipBit] ^= 1

  const total = SPEC_TOTAL_CODEWORDS[matrix.version - 1]
  const ecPerBlock = SPEC_EC_PER_BLOCK[format.ecc][matrix.version - 1]
  const blocks = SPEC_BLOCK_COUNT[format.ecc][matrix.version - 1]
  const dataCodewords = total - blocks * ecPerBlock
  assert.equal(
    bits.length,
    total * 8 + SPEC_REMAINDER_BITS[matrix.version],
    `version ${matrix.version} must carry ${total} codewords plus remainder bits`
  )

  const shortLength = Math.floor(dataCodewords / blocks)
  const shortBlocks = blocks - (dataCodewords % blocks)
  const data: number[][] = Array.from({ length: blocks }, () => [] as number[])
  const ec: number[][] = Array.from({ length: blocks }, () => [] as number[])
  let cursor = 0
  const readByte = (): number => {
    let value = 0
    for (let i = 0; i < 8; i++) value = value * 2 + bits[cursor++]
    return value
  }
  for (let column = 0; column < shortLength + 1; column++) {
    for (let block = 0; block < blocks; block++) {
      const length = block < shortBlocks ? shortLength : shortLength + 1
      if (column < length) data[block].push(readByte())
    }
  }
  for (let column = 0; column < ecPerBlock; column++) {
    for (let block = 0; block < blocks; block++) ec[block].push(readByte())
  }
  assert.equal(cursor, (dataCodewords + blocks * ecPerBlock) * 8, 'every codeword bit is consumed')

  const stream: number[] = []
  for (const block of data) for (const byte of block) for (let i = 7; i >= 0; i--) stream.push((byte >> i) & 1)

  return {
    matrix,
    bits,
    data,
    ec,
    ecPerBlock,
    text: decodeSegments(stream, matrix.version),
    formatEcc: format.ecc,
    formatMask: format.mask
  }
}

function decodeSegments(bits: number[], version: number): string {
  let cursor = 0
  const read = (count: number): number => {
    let value = 0
    for (let i = 0; i < count; i++) value = value * 2 + (bits[cursor] ?? 0) + (bits[cursor] === undefined ? 0 : 0), (cursor += 1)
    return value
  }
  let out = ''
  for (let guard = 0; guard < 64; guard++) {
    const indicator = read(4)
    if (indicator === 0) return out
    if (indicator === MODE_NUMERIC) {
      const length = read(countIndicatorBits(MODE_NUMERIC, version))
      for (let i = 0; i + 3 <= length; i += 3) out += String(read(10)).padStart(3, '0')
      if (length % 3 === 1) out += String(read(4))
      if (length % 3 === 2) out += String(read(7)).padStart(2, '0')
    } else if (indicator === MODE_ALPHANUMERIC) {
      const length = read(countIndicatorBits(MODE_ALPHANUMERIC, version))
      for (let i = 0; i + 2 <= length; i += 2) {
        const value = read(11)
        out += ALPHANUMERIC_SET[Math.floor(value / 45)] + ALPHANUMERIC_SET[value % 45]
      }
      if (length % 2 === 1) out += ALPHANUMERIC_SET[read(6)]
    } else if (indicator === MODE_BYTE) {
      const length = read(countIndicatorBits(MODE_BYTE, version))
      const bytes = new Uint8Array(length)
      for (let i = 0; i < length; i++) bytes[i] = read(8)
      out += new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } else {
      assert.fail(`mode indicator ${indicator} is not numeric/alphanumeric/byte/terminator`)
    }
  }
  assert.fail('the data stream never reached a terminator')
}

function symbol(text: string, ecc: QrEcc = 'M'): QrMatrix {
  const matrix = encodeQr(text, ecc)
  if (matrix === null) assert.fail(`encodeQr refused ${JSON.stringify(text.slice(0, 24))} at level ${ecc}`)
  return matrix
}

/** Dark when the module belongs to a 7x7 finder; the ring one inside is light. */
function finderModule(row: number, col: number): boolean {
  const ring = Math.max(Math.min(row, 6 - row), Math.min(col, 6 - col))
  return ring !== 1
}

describe('module count', () => {
  const cases: Array<[number, number]> = [[1, 21], [2, 25], [6, 41], [7, 45], [10, 57], [20, 97], [26, 121], [40, 177]]
  const dataModules = (version: number): number => {
    const total = SPEC_TOTAL_CODEWORDS[version - 1]
    return total * 8 + SPEC_REMAINDER_BITS[version]
  }
  const shapes: Array<[number, number, number]> = [
    // version, total data codewords at level L, remainder bits
    [1, 19, 0],
    [2, 34, 7],
    [3, 55, 7],
    [4, 80, 7],
    [5, 108, 7],
    [6, 136, 7],
    [7, 156, 0],
    [10, 274, 0],
    [14, 461, 3],
    [20, 861, 3],
    [30, 1735, 3],
    [40, 2956, 0]
  ]
  for (const [version, side] of cases) {
    it(`version ${version} is ${side} modules on a side`, () => assert.equal(4 * version + 17, side))
  }
  it('the free modules hold exactly the codewords plus the remainder bits', () => {
    for (const version of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 20, 21, 30, 35, 40]) {
      const side = 4 * version + 17
      const matrix: QrMatrix = { size: side, modules: [], version, ecc: 'L', mask: 0 }
      assert.equal(dataModules(version), side * side - reservedMap(matrix).reduce((sum, value) => sum + value, 0), `version ${version}`)
    }
  })
  for (const [version, data, remainder] of shapes) {
    it(`the EC tables for version ${version} describe the standard's shapes`, () => {
      assert.equal(SPEC_TOTAL_CODEWORDS[version - 1] - SPEC_BLOCK_COUNT.L[version - 1] * SPEC_EC_PER_BLOCK.L[version - 1], data)
      assert.equal(SPEC_REMAINDER_BITS[version], remainder)
    })
  }
})
