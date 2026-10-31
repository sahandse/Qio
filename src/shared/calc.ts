/**
 * The calculator's expression engine: one string in, one result out. Pure and
 * total — the notch calls it on every keystroke, so it must never throw.
 */
import { toPersianDigits } from './persian'

export interface CalcResult {
  ok: true
  value: number
  display: string
  hex?: string
  binary?: string
  unit?: { from: string; to: string }
}

export interface CalcError {
  ok: false
  error: string
}

export type CalcOutput = CalcResult | CalcError

type Family = 'length' | 'mass' | 'temp' | 'data' | 'time' | 'speed'
type Mode = 'deg' | 'rad'

const MAX_INPUT = 10_000
const MAX_TOKENS = 2_000
const MAX_DEPTH = 300
/** 170! is the last factorial that still fits a double. */
const MAX_FACTORIAL = 170
/** Above 2^53 the 0x/0b forms would be invented digits. */
const MAX_RADIX = 1e15
const DEG = Math.PI / 180

/** Every expected failure travels as this and is turned back into a CalcError by evaluate. */
class CalcFail extends Error {}

type Word = { kind: 'ident'; text: string; lower: string }

type Token =
  | { kind: 'num'; value: number }
  | Word
  | { kind: 'op'; text: string }

interface State {
  tokens: Token[]
  pos: number
  depth: number
  ans: number
  angle: Mode
}

/** pct marks a term a desk calculator takes from the left operand: `200 + 15%`. */
interface Val {
  v: number
  pct: boolean
}

const CONST: Record<string, number> = {
  pi: Math.PI,
  tau: Math.PI * 2,
  e: Math.E
}

interface FnSpec {
  min: number
  max: number
  apply: (args: number[], s: State) => number
}

function toRadians(value: number, s: State): number {
  return s.angle === 'deg' ? value * DEG : value
}

function fromRadians(value: number, s: State): number {
  return s.angle === 'deg' ? value / DEG : value
}

function one(apply: (a: number, s: State) => number): FnSpec {
  return { min: 1, max: 1, apply: (args, s) => apply(args[0], s) }
}

function two(apply: (a: number, b: number) => number): FnSpec {
  return { min: 2, max: 2, apply: (args) => apply(args[0], args[1]) }
}

function many(apply: (args: number[]) => number): FnSpec {
  return { min: 1, max: 8, apply }
}

function inRange(name: string, a: number, lo: number, hi: number): number {
  if (!(a >= lo && a <= hi)) throw new CalcFail(`«${name}» ورودی‌اش باید بین ${toPersianDigits(lo)} تا ${toPersianDigits(hi)} باشد`)
  return a
}

function positive(name: string, a: number): number {
  if (a <= 0) throw new CalcFail(`«${name}» فقط برای عدد مثبت تعریف شده`)
  return a
}

function remainder(a: number, b: number): number {
  if (b === 0) throw new CalcFail('تقسیم بر صفر مجاز نیست')
  return a - b * Math.trunc(a / b)
}

const FN: Record<string, FnSpec> = {
  sin: one((a, s) => Math.sin(toRadians(a, s))),
  cos: one((a, s) => Math.cos(toRadians(a, s))),
  tan: one((a, s) => Math.tan(toRadians(a, s))),
  asin: one((a, s) => fromRadians(Math.asin(inRange('asin', a, -1, 1)), s)),
  acos: one((a, s) => fromRadians(Math.acos(inRange('acos', a, -1, 1)), s)),
  atan: one((a, s) => fromRadians(Math.atan(a), s)),
  sqrt: one((a) => {
    if (a < 0) throw new CalcFail('جذر عدد منفی تعریف نشده')
    return Math.sqrt(a)
  }),
  cbrt: one((a) => Math.cbrt(a)),
  abs: one((a) => Math.abs(a)),
  round: one((a) => Math.round(a)),
  floor: one((a) => Math.floor(a)),
  ceil: one((a) => Math.ceil(a)),
  ln: one((a) => Math.log(positive('ln', a))),
  log: one((a) => Math.log10(positive('log', a))),
  exp: one((a) => Math.exp(a)),
  pow: two((a, b) => Math.pow(a, b)),
  mod: two(remainder),
  min: many((args) => Math.min(...args)),
  max: many((args) => Math.max(...args))
}

/** Names the panel shows in its hint row. */
export const CALC_FUNCTIONS: readonly string[] = Object.keys(FN)

interface UnitSpec {
  family: Family
  /** Multiplier to the family's base unit (metre, gram, byte, second, km/h). */
  factor: number
}

const UNITS: Record<string, UnitSpec> = {
  mm: { family: 'length', factor: 0.001 },
  cm: { family: 'length', factor: 0.01 },
  m: { family: 'length', factor: 1 },
  km: { family: 'length', factor: 1000 },
  in: { family: 'length', factor: 0.0254 },
  ft: { family: 'length', factor: 0.3048 },
  yd: { family: 'length', factor: 0.9144 },
  mi: { family: 'length', factor: 1609.344 },
  mg: { family: 'mass', factor: 0.001 },
  g: { family: 'mass', factor: 1 },
  kg: { family: 'mass', factor: 1000 },
  lb: { family: 'mass', factor: 453.59237 },
  oz: { family: 'mass', factor: 28.349523125 },
  c: { family: 'temp', factor: 1 },
  f: { family: 'temp', factor: 1 },
  k: { family: 'temp', factor: 1 },
  b: { family: 'data', factor: 1 },
  kb: { family: 'data', factor: 1024 },
  mb: { family: 'data', factor: 1024 ** 2 },
  gb: { family: 'data', factor: 1024 ** 3 },
  tb: { family: 'data', factor: 1024 ** 4 },
  pb: { family: 'data', factor: 1024 ** 5 },
  ms: { family: 'time', factor: 0.001 },
  s: { family: 'time', factor: 1 },
  min: { family: 'time', factor: 60 },
  h: { family: 'time', factor: 3600 },
  d: { family: 'time', factor: 86400 },
  kph: { family: 'speed', factor: 1 },
  mph: { family: 'speed', factor: 1.609344 }
}

const TO_CELSIUS: Record<string, (v: number) => number> = {
  c: (v) => v,
  f: (v) => ((v - 32) * 5) / 9,
  k: (v) => v - 273.15
}

const FROM_CELSIUS: Record<string, (v: number) => number> = {
  c: (v) => v,
  f: (v) => (v * 9) / 5 + 32,
  k: (v) => v + 273.15
}

function faDigit(d: string): string {
  const code = d.charCodeAt(0)
  return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660))
}

/**
 * The Persian words people actually type, folded onto the engine's own keywords.
 * Keys are written without the zero-width joiner; the matcher allows a space or a
 * joiner between any two letters, so «سانتی‌متر» and «سانتی متر» both land on cm.
 */
const FA_WORDS: readonly (readonly [string, string])[] = [
  ['روی', ' of '],
  ['از', ' of '],
  ['به', ' to '],
  ['کیلومتربرساعت', 'kph'],
  ['مایلبرساعت', 'mph'],
  ['سانتیگراد', 'c'],
  ['سلسیوس', 'c'],
  ['فارنهایت', 'f'],
  ['کلوین', 'k'],
  ['میلیمتر', 'mm'],
  ['سانتیمتر', 'cm'],
  ['کیلومتر', 'km'],
  ['متر', 'm'],
  ['اینچ', 'in'],
  ['فوت', 'ft'],
  ['یارد', 'yd'],
  ['مایل', 'mi'],
  ['کیلوگرم', 'kg'],
  ['گرم', 'g'],
  ['پوند', 'lb'],
  ['اونس', 'oz'],
  ['ثانیه', 's'],
  ['دقیقه', 'min'],
  ['ساعت', 'h'],
  ['روز', 'd'],
  ['کیلوبایت', 'kb'],
  ['مگابایت', 'mb'],
  ['گیگابایت', 'gb'],
  ['ترابایت', 'tb'],
  ['پتابایت', 'pb'],
  ['بایت', 'b']
]

const FA_LOOKUP = new Map(FA_WORDS)

/** Longest word first: کیلومتر has to win over the متر hiding inside it. */
const FA_WORD_RE = new RegExp(
  FA_WORDS.map(([word]) => word)
    .sort((a, b) => b.length - a.length)
    .map((word) => word.split('').join('[\\s\\u200c]*'))
    .join('|'),
  'g'
)

function faWord(match: string): string {
  return FA_LOOKUP.get(match.replace(/[\s\u200c]/g, '')) ?? match
}

/** Persian and Arabic-Indic keyboards plus the typographic operator signs. */
function normalize(raw: string): string {
  return raw
    .replace(/[\u06f0-\u06f9\u0660-\u0669]/g, faDigit)
    .replace(/\u066b/g, '.')
    .replace(/\u066a/g, '%')
    .replace(/\u066c/g, '')
    .replace(/[\u00d7\u22c5]/g, '*')
    .replace(/\u00f7/g, '/')
    .replace(/[\u2212\u2013]/g, '-')
    .replace(/\u03c0/g, 'pi')
    .replace(/درصد(?=[\s\u200c]*[\d.])/g, ' % of ')
    .replace(/درصد/g, '%')
    .replace(FA_WORD_RE, faWord)
}

function isDigit(c: string): boolean {
  return c >= '0' && c <= '9'
}

function radixPattern(base: number): RegExp {
  return base === 16 ? /[0-9a-fA-F]/ : base === 8 ? /[0-7]/ : /[01]/
}

/**
 * A thousands comma and an argument comma look identical, so a comma only joins a
 * number when no function parenthesis is open around it: `pow(2,100)` keeps two
 * arguments while `1,000 + 1` reads as one number.
 */
function scanNumber(src: string, start: number, grouped: boolean): [number, number] {
  const at = (i: number): string => src[i] ?? ''
  const head = src.slice(start, start + 2).toLowerCase()
  if (head === '0x' || head === '0b' || head === '0o') {
    const base = head === '0x' ? 16 : head === '0b' ? 2 : 8
    const wanted = radixPattern(base)
    let i = start + 2
    let body = ''
    while (wanted.test(at(i))) body += at(i++)
    if (!body) throw new CalcFail('عدد کامل نیست')
    return [parseInt(body, base), i]
  }
  let i = start
  let text = ''
  while (isDigit(at(i))) text += at(i++)
  if (grouped) {
    while (at(i) === ',' && /^[0-9]{3}(?![0-9])/.test(src.slice(i + 1))) {
      text += src.slice(i + 1, i + 4)
      i += 4
    }
  }
  if (at(i) === '.') {
    i += 1
    text += '.'
    while (isDigit(at(i))) text += at(i++)
  }
  if (/^[eE][+-]?[0-9]/.test(src.slice(i, i + 3))) {
    text += 'e'
    i += 1
    if (at(i) === '+' || at(i) === '-') text += at(i++)
    while (isDigit(at(i))) text += at(i++)
  }
  return [Number(text), i]
}

function tokenize(src: string): Token[] {
  const out: Token[] = []
  /** One entry per open parenthesis: true when a function name opened it. */
  const callLevels: boolean[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c) || '\u200e\u200f\u200c\u202b\u202e'.includes(c)) {
      i += 1
      continue
    }
    if (isDigit(c) || (c === '.' && isDigit(src[i + 1] ?? ''))) {
      const [value, at] = scanNumber(src, i, !callLevels.includes(true))
      out.push({ kind: 'num', value })
      i = at
      continue
    }
    if (/[a-z]/i.test(c)) {
      let j = i
      while (j < src.length && /[a-z]/i.test(src[j])) j += 1
      const text = src.slice(i, j)
      out.push({ kind: 'ident', text, lower: text.toLowerCase() })
      i = j
      continue
    }
    if ('+-*/^%!(),'.includes(c)) {
      if (c === '(') callLevels.push(lastIsIdent(out))
      if (c === ')') callLevels.pop()
      out.push({ kind: 'op', text: c })
      i += 1
      continue
    }
    throw new CalcFail(`نماد «${c}» را نمی‌شناسیم`)
  }
  return out
}

function lastIsIdent(tokens: Token[]): boolean {
  const last = tokens[tokens.length - 1]
  return !!last && last.kind === 'ident'
}

function peek(s: State): Token | undefined {
  return s.tokens[s.pos]
}

function step(s: State): void {
  s.pos += 1
}

function plain(v: number): Val {
  return { v, pct: false }
}

function guard(value: number): number {
  if (Number.isNaN(value)) throw new CalcFail('عبارت به جواب نمی‌رسد')
  if (!Number.isFinite(value)) throw new CalcFail('عدد خیلی بزرگ است')
  return value
}

function factorial(n: number): number {
  if (n < 0) throw new CalcFail('فاکتوریل عدد منفی تعریف نشده')
  if (!Number.isInteger(n)) throw new CalcFail('فاکتوریل فقط برای عدد صحیح است')
  if (n > MAX_FACTORIAL) throw new CalcFail('عدد برای فاکتوریل خیلی بزرگ است')
  let out = 1
  for (let k = 2; k <= n; k += 1) out *= k
  return out
}

function enter(s: State): void {
  s.depth += 1
  if (s.depth > MAX_DEPTH) throw new CalcFail('عبارت بیش از حد تودرتو است')
}

function leave(s: State): void {
  s.depth -= 1
}

/** `to`/`in` only opens a unit clause when the expression ends right after it. */
function splitUnits(tokens: Token[]): { expr: Token[]; from?: Word; to?: Word } {
  let depth = 0
  let at = -1
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]
    if (t.kind === 'op' && t.text === '(') depth += 1
    else if (t.kind === 'op' && t.text === ')') depth = Math.max(0, depth - 1)
    else if (depth === 0 && t.kind === 'ident' && (t.lower === 'to' || t.lower === 'in')) at = i
  }
  if (at < 0 || at + 1 >= tokens.length) return { expr: tokens }
  const tail = tokens.slice(at + 1)
  const to = tail.length === 1 ? tail[0] : undefined
  if (!to || to.kind !== 'ident') return { expr: tokens }
  if (!UNITS[to.lower]) throw new CalcFail(`واحد «${to.text}» را نمی‌شناسیم`)
  const head = tokens.slice(0, at)
  const from = head[head.length - 1]
  if (!from || from.kind !== 'ident' || !UNITS[from.lower]) throw new CalcFail('واحد مبدأ مشخص نیست')
  return { expr: head.slice(0, -1), from, to }
}

function parseExpr(s: State): Val {
  enter(s)
  let left = parseMul(s)
  for (;;) {
    const t = peek(s)
    if (!t || t.kind !== 'op' || (t.text !== '+' && t.text !== '-')) break
    step(s)
    const right = parseMul(s)
    const delta = right.pct ? left.v * right.v : right.v
    left = plain(guard(t.text === '-' ? left.v - delta : left.v + delta))
  }
  leave(s)
  return left
}

function startsValue(t: Token): boolean {
  if (t.kind === 'num') return true
  if (t.kind === 'op') return t.text === '('
  return !['mod', 'of', 'to', 'in', 'deg', 'rad'].includes(t.lower)
}

function parseMul(s: State): Val {
  let left = parseUnary(s)
  for (;;) {
    const t = peek(s)
    if (!t) break
    let op = ''
    if (t.kind === 'op' && (t.text === '*' || t.text === '/')) op = t.text
    else if (t.kind === 'ident' && t.lower === 'mod') op = 'mod'
    else if (t.kind === 'ident' && t.lower === 'of') op = 'of'
    else if (startsValue(t)) op = 'imp'
    else break
    if (op !== 'imp') step(s)
    const right = parseUnary(s)
    let v: number
    if (op === '/') {
      if (right.v === 0) throw new CalcFail('تقسیم بر صفر مجاز نیست')
      v = left.v / right.v
    } else if (op === 'mod') {
      v = remainder(left.v, right.v)
    } else {
      v = left.v * right.v
    }
    // Anything around a percent term makes it absolute: `50% * 2`, `20% of 150`.
    left = plain(guard(v))
  }
  return left
}

function parseUnary(s: State): Val {
  enter(s)
  const t = peek(s)
  let out: Val
  if (t && t.kind === 'op' && (t.text === '-' || t.text === '+')) {
    step(s)
    const inner = parseUnary(s)
    out = { v: t.text === '-' ? -inner.v : inner.v, pct: inner.pct }
  } else {
    out = parsePower(s)
  }
  leave(s)
  return out
}

function parsePower(s: State): Val {
  const base = parsePostfix(s)
  const t = peek(s)
  if (t && t.kind === 'op' && t.text === '^') {
    step(s)
    // The exponent goes back through unary, so `-2^2` reads as `-(2^2)`.
    const exp = parseUnary(s)
    return plain(guard(Math.pow(base.v, exp.v)))
  }
  return base
}

function parsePostfix(s: State): Val {
  let val = parsePrimary(s)
  for (;;) {
    const t = peek(s)
    if (!t) break
    if (t.kind === 'op' && t.text === '!') {
      step(s)
      val = plain(guard(factorial(val.v)))
      continue
    }
    if (t.kind === 'op' && t.text === '%') {
      step(s)
      val = { v: val.v / 100, pct: true }
      continue
    }
    if (t.kind === 'ident' && (t.lower === 'deg' || t.lower === 'rad')) {
      step(s)
      s.angle = t.lower
      break
    }
    break
  }
  return val
}

function atClose(s: State): boolean {
  const t = peek(s)
  return !!t && t.kind === 'op' && t.text === ')'
}

function parseArgs(s: State, name: string): number[] {
  const open = peek(s)
  if (!open || open.kind !== 'op' || open.text !== '(') throw new CalcFail(`برای «${name}» پرانتز لازم است`)
  step(s)
  enter(s)
  const args: number[] = []
  if (!atClose(s)) {
    for (;;) {
      args.push(parseExpr(s).v)
      const t = peek(s)
      if (t && t.kind === 'op' && t.text === ',') {
        step(s)
        continue
      }
      break
    }
  }
  leave(s)
  if (!atClose(s)) throw new CalcFail(`پرانتز «${name}» بسته نشده`)
  step(s)
  return args
}

function applyFn(name: string, args: number[], s: State): number {
  const fn = FN[name]
  if (args.length < fn.min) {
    const need = fn.min === fn.max ? toPersianDigits(fn.min) : `دست کم ${toPersianDigits(fn.min)}`
    throw new CalcFail(`«${name}» به ${need} پارامتر نیاز دارد`)
  }
  if (args.length > fn.max) throw new CalcFail(`«${name}» بیشتر از ${toPersianDigits(fn.max)} پارامتر نمی‌پذیرد`)
  return guard(fn.apply(args, s))
}

function parsePrimary(s: State): Val {
  const t = peek(s)
  if (!t) throw new CalcFail('عبارت کامل نشده')
  if (t.kind === 'num') {
    step(s)
    return plain(guard(t.value))
  }
  if (t.kind === 'op' && t.text === '(') {
    step(s)
    enter(s)
    const inner = parseExpr(s)
    leave(s)
    if (!atClose(s)) throw new CalcFail('پرانتزها جفت نیستند')
    step(s)
    return inner
  }
  if (t.kind === 'ident') {
    if (FN[t.lower]) {
      const name = t.lower
      step(s)
      return plain(applyFn(name, parseArgs(s, name), s))
    }
    step(s)
    if (t.lower === 'ans') return plain(s.ans)
    if (t.lower in CONST) return plain(CONST[t.lower])
    if (UNITS[t.lower]) throw new CalcFail(`واحد «${t.text}» برای تبدیل کامل نشده`)
    throw new CalcFail(`«${t.text}» را نمی‌شناسیم`)
  }
  throw new CalcFail('عبارت کامل نیست')
}

function convert(value: number, from: Word, to: Word): number {
  const a = UNITS[from.lower]
  const b = UNITS[to.lower]
  if (a.family !== b.family) throw new CalcFail(`تبدیل «${from.text}» به «${to.text}» ممکن نیست`)
  if (a.family === 'temp') return FROM_CELSIUS[to.lower](TO_CELSIUS[from.lower](value))
  return value * (a.factor / b.factor)
}

function trimZeros(text: string): string {
  if (!text.includes('.')) return text
  return text.replace(/0+$/, '').replace(/\.$/, '')
}

function fixed(value: number, sig: number): string {
  const abs = Math.abs(value)
  const scale = abs === 0 ? 0 : Math.floor(Math.log10(abs))
  const decimals = Math.max(0, Math.min(30, sig - 1 - scale))
  return trimZeros(value.toFixed(decimals))
}

function exponential(value: number): string {
  const [mantissa, power] = value.toExponential(9).split('e')
  return `${trimZeros(mantissa)}e${power}`
}

/** Plain ASCII rendering: whole numbers as themselves, others at 10 significant digits. */
export function formatNumber(value: number): string {
  if (Number.isNaN(value)) return 'NaN'
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '-∞'
  const abs = Math.abs(value)
  if (abs >= 1e16 || (abs !== 0 && abs < 1e-9)) return exponential(value)
  if (Number.isInteger(value)) return String(value)
  return fixed(value, 10)
}

function toDisplay(text: string): string {
  return toPersianDigits(text).replace(/\./g, '\u066b')
}

function radixForm(value: number, base: number, prefix: string): string {
  const body = BigInt(Math.abs(value)).toString(base)
  return `${value < 0 ? '-' : ''}${prefix}${base === 16 ? body.toUpperCase() : body}`
}

export function evaluate(raw: string, ctx?: { ans?: number; angle?: 'deg' | 'rad' }): CalcOutput {
  try {
    return run(typeof raw === 'string' ? raw : '', ctx)
  } catch (err) {
    if (err instanceof CalcFail) return { ok: false, error: err.message }
    return { ok: false, error: 'عبارت را نتوانستم بخوانم' }
  }
}

function run(raw: string, ctx: { ans?: number; angle?: 'deg' | 'rad' } | undefined): CalcOutput {
  if (raw.length > MAX_INPUT) throw new CalcFail('عبارت خیلی بلند است')
  if (!raw.trim()) return { ok: false, error: 'چیزی تایپ نشده' }
  const all = tokenize(normalize(raw))
  if (all.length === 0) return { ok: false, error: 'چیزی تایپ نشده' }
  if (all.length > MAX_TOKENS) throw new CalcFail('عبارت خیلی بلند است')
  const clause = splitUnits(all)
  const state: State = {
    tokens: clause.expr,
    pos: 0,
    depth: 0,
    ans: Number.isFinite(ctx?.ans) ? Number(ctx?.ans) : 0,
    angle: ctx?.angle === 'rad' ? 'rad' : 'deg'
  }
  const parsed = parseExpr(state)
  if (state.pos < state.tokens.length) throw new CalcFail('عبارت کامل نیست')
  const value = guard(clause.from && clause.to ? convert(parsed.v, clause.from, clause.to) : parsed.v)
  // Whole numbers are shown as they are; the 12-digit pass only kills float noise.
  const shown = Number.isInteger(value) ? value : Number(value.toPrecision(12))
  const result: CalcResult = { ok: true, value, display: toDisplay(formatNumber(shown)) }
  if (Number.isSafeInteger(value) && Math.abs(value) <= MAX_RADIX) {
    result.hex = radixForm(value, 16, '0x')
    result.binary = radixForm(value, 2, '0b')
  }
  if (clause.from && clause.to) result.unit = { from: clause.from.text, to: clause.to.text }
  return result
}
