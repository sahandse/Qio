import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { CALC_FUNCTIONS, evaluate, formatNumber } from '../src/shared/calc.ts'
import type { CalcResult } from '../src/shared/calc.ts'

type Ctx = { ans?: number; angle?: 'deg' | 'rad' }

function num(input: string, ctx?: Ctx): CalcResult {
  const out = evaluate(input, ctx)
  if (!out.ok) assert.fail(`«${input}» should evaluate, got ${out.error}`)
  return out
}

function err(input: string, ctx?: Ctx): string {
  const out = evaluate(input, ctx)
  if (out.ok) assert.fail(`«${input}» should fail, got ${out.display}`)
  return out.error
}

function close(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 1e-12, `expected ${actual} to be ≈ ${expected}`)
}

/** Every message the panel shows to a user has to be Persian. */
const PERSIAN = /[\u0600-\u06ff]/

describe('persian and arabic input', () => {
  const normalized: [string, number][] = [
    ['۱۲+۳۰', 42],
    ['٣٤+٦', 40],
    ['۴٫۵×۲', 9],
    ['۱۰ ÷ ۴', 2.5],
    ['۱۰ − ۳', 7],
    ['۷٪', 0.07],
    ['۱۲۳٬۴۵۶', 123456],
    ['1,000 + 1', 1001],
    ['1,234,567 * 2', 2469134],
    ['۰٫۱ + ۰٫۲', 0.30000000000000004]
  ]
  for (const [input, value] of normalized) {
    it(`reads ${input}`, () => assert.equal(num(input).value, value))
  }

  it('tells an argument comma from a thousands comma', () => {
    assert.equal(num('pow(2,10)').value, 1024)
    assert.equal(num('pow(2,100)').value, Math.pow(2, 100))
    assert.equal(num('(1,000+2)*2').value, 2004)
  })

  it('answers in Persian digits with a Persian decimal separator', () => {
    assert.equal(num('۱۲+۳۰').display, '۴۲')
    assert.equal(num('1/4').display, '۰٫۲۵')
    assert.equal(num('-7').display, '-۷')
  })
})

describe('persian words', () => {
  const table: [string, number][] = [
    ['۲۰٪ روی ۱۵۰', 30],
    ['۲۰٪ از ۱۵۰', 30],
    ['۲۰ درصد ۱۵۰', 30],
    ['۱۵ درصد', 0.15],
    ['۲۰۰ + ۱۵٪', 230]
  ]
  for (const [input, value] of table) {
    it(`${input} = ${value}`, () => close(num(input).value, value))
  }

  const units: [string, number][] = [
    ['۱۰ کیلومتر به مایل', 6.2137119223733395],
    ['۵ کیلوگرم به گرم', 5000],
    ['۲ ساعت به دقیقه', 120],
    ['۳ متر به سانتی‌متر', 300],
    ['۳ متر به سانتیمتر', 300],
    ['۱ گیگابایت به بایت', 1024 ** 3],
    ['۱۰۰ کیلومتربرساعت به مایلبرساعت', 62.13711922373339]
  ]
  for (const [input, value] of units) {
    it(`${input} converts`, () => close(num(input).value, value))
  }

  it('keeps the temperature words', () => {
    close(num('۱۰۰ سانتیگراد به فارنهایت').value, 212)
    close(num('0 کلوین به سانتیگراد').value, -273.15)
  })

  it('says which word it could not read', () => {
    assert.match(err('۲۰ ددر ۱۵۰'), /نماد/)
  })
})

describe('arithmetic', () => {
  const table: [string, number][] = [
    ['1+2*3', 7],
    ['(1+2)*3', 9],
    ['10-4-3', 3],
    ['100/5/2', 10],
    ['2*3+4*5', 26],
    ['-5', -5],
    ['-(-5)', 5],
    ['--5', 5],
    ['+5', 5],
    ['-(3+4)', -7],
    ['1.5+1.25', 2.75],
    ['7*7', 49],
    ['2^10', 1024],
    ['5^0', 1],
    ['9^0.5', 3],
    ['2^3^2', 512],
    ['-2^2', -4],
    ['(-2)^2', 4],
    ['2^-2', 0.25],
    ['17 mod 5', 2],
    ['100 mod 7', 2],
    ['2^10 mod 7', 2],
    ['1e3+1', 1001],
    ['2e-1', 0.2]
  ]
  for (const [input, value] of table) {
    it(`${input} = ${value}`, () => assert.equal(num(input).value, value))
  }

  it('reads power right to left and under unary minus', () => {
    assert.equal(num('2^3^2').value, 512)
    assert.equal(num('-2^2').value, -4)
    assert.equal(num('2^-3').value, 0.125)
  })

  it('never uses % as modulo', () => {
    close(num('17 % 5').value, 0.85)
    assert.equal(num('1 mod 3').value, 1)
  })

  it('refuses division by zero', () => {
    assert.match(err('5 /0'), /تقسیم بر صفر/)
    assert.match(err('mod(4,0)'), /تقسیم بر صفر/)
  })

  it('leaves a dangling operator as an error', () => {
    assert.match(err('1 mod'), /کامل/)
    assert.match(err('1 +'), /کامل/)
    assert.match(err('1 + +'), /کامل/)
  })
})

describe('percent', () => {
  const table: [string, number][] = [
    ['50%', 0.5],
    ['15%', 0.15],
    ['200 + 15%', 230],
    ['200 - 15%', 170],
    ['100 + 10% + 5%', 115.5],
    ['50% + 10%', 0.55],
    ['20% of 150', 30],
    ['1.5% of 200', 3],
    ['200 + 15% of 50', 207.5],
    ['50% * 2', 1],
    ['200 * 10%', 20],
    ['(100 + 10%) / 2', 55],
    ['50% of 50%', 0.25]
  ]
  for (const [input, value] of table) {
    it(`${input} = ${value}`, () => close(num(input).value, value))
  }

  it('accepts the percent sign typed in Persian', () => {
    assert.equal(num('۲۰۰ + ۱۵٪').value, 230)
  })
})

describe('factorial', () => {
  const table: [string, number][] = [
    ['5!', 120],
    ['0!', 1],
    ['1!', 1],
    ['3!+1', 7],
    ['(2+1)!', 6],
    ['10!', 3628800],
    ['-3!', -6]
  ]
  for (const [input, value] of table) {
    it(`${input} = ${value}`, () => assert.equal(num(input).value, value))
  }

  it('refuses non-integers and negatives, in Persian', () => {
    assert.match(err('2.5!'), /فاکتوریل/)
    assert.match(err('(-3)!'), /فاکتوریل/)
    assert.ok(PERSIAN.test(err('0.5!')))
  })

  it('refuses a factorial too large for a double', () => {
    assert.match(err('99999999999999999999!'), /فاکتوریل/)
    assert.equal(num('170!').ok, true)
    assert.match(err('171!'), /خیلی بزرگ/)
  })
})

describe('constants and juxtaposition', () => {
  it('knows pi, e and tau', () => {
    assert.equal(num('pi').value, Math.PI)
    assert.equal(num('π').value, Math.PI)
    assert.equal(num('e').value, Math.E)
    assert.equal(num('tau').value, Math.PI * 2)
  })

  it('multiplies by writing things side by side', () => {
    close(num('2π').value, 6.283185307179586)
    assert.equal(num('2pi').value, Math.PI * 2)
    assert.equal(num('3(4)').value, 12)
    assert.equal(num('(1+2)(3+4)').value, 21)
    assert.equal(num('2 abs(-3)').value, 6)
  })

  it('rejects a name it does not know', () => {
    assert.match(err('x + 1'), /نمی‌شناسیم/)
    assert.ok(PERSIAN.test(err('x + 1')))
  })
})

describe('functions', () => {
  const table: [string, number][] = [
    ['sqrt(16)', 4],
    ['cbrt(27)', 3],
    ['cbrt(-8)', -2],
    ['abs(-7)', 7],
    ['round(2.5)', 3],
    ['round(-2.5)', -2],
    ['floor(-1.2)', -2],
    ['ceil(0.1)', 1],
    ['ln(e)', 1],
    ['log(100)', 2],
    ['log(1)', 0],
    ['exp(0)', 1],
    ['pow(2,10)', 1024],
    ['min(3,1,2)', 1],
    ['max(2,8)', 8],
    ['mod(17,5)', 2],
    ['min(4)', 4],
    ['sqrt(2^2+1)', Math.sqrt(5)],
    ['sin(0)', 0],
    ['cos(0)', 1],
    ['atan(1)', 45],
    ['asin(0.5)', 30],
    ['acos(1)', 0]
  ]
  for (const [input, value] of table) {
    it(`${input}`, () => close(num(input).value, value))
  }

  it('takes log base 10 and ln base e', () => {
    close(num('log(1000)').value, 3)
    close(num('ln(1000)').value, Math.log(1000))
  })

  it('trigonometry follows the angle context', () => {
    close(num('sin(30)').value, 0.5)
    close(num('sin(pi/6)', { angle: 'rad' }).value, 0.5)
    close(num('sin(pi/6 RAD)').value, 0.5)
    close(num('sin(30 DEG)').value, 0.5)
    close(num('cos(pi RAD)').value, -1)
    close(num('tan(45)').value, 1)
  })

  it('keeps the angle mode for the rest of the expression', () => {
    close(num('sin(30 DEG) + cos(60)').value, 1)
    close(num('cos(0 RAD) + sin(pi/2)').value, 2)
    close(num('asin(0.5)').value, 30)
    close(num('asin(0.5 RAD)').value, Math.PI / 6)
    close(num('acos(0.5 RAD)').value, Math.PI / 3)
  })

  it('reports argument problems in Persian', () => {
    assert.match(err('sqrt(-1)'), /جذر/)
    assert.match(err('ln(0)'), /ln/)
    assert.match(err('log(-5)'), /log/)
    assert.match(err('asin(2)'), /asin/)
    assert.match(err('acos(1.5)'), /acos/)
    assert.match(err('sin()'), /پارامتر/)
    assert.match(err('sin(1,2)'), /پارامتر/)
    assert.match(err('pow(2)'), /۲ پارامتر/)
    assert.match(err('tan'), /پرانتز/)
    assert.match(err('sqrt(4'), /بسته نشده/)
    assert.ok(PERSIAN.test(err('pow(2)')))
  })
})

describe('number bases', () => {
  const table: [string, number][] = [
    ['0xFF', 255],
    ['0xff', 255],
    ['0xF0+1', 241],
    ['0b1011', 11],
    ['0o17', 15],
    ['0x10 + 1', 17],
    ['۰xFF', 255]
  ]
  for (const [input, value] of table) {
    it(`${input} = ${value}`, () => assert.equal(num(input).value, value))
  }

  it('rejects a prefix with no digits behind it', () => {
    assert.match(err('0x + 1'), /کامل/)
    assert.match(err('0b2'), /کامل/)
  })

  it('offers hex and binary forms for a whole result', () => {
    assert.equal(num('42').hex, '0x2A')
    assert.equal(num('42').binary, '0b101010')
    assert.equal(num('0xFF').hex, '0xFF')
    assert.equal(num('0xFF').binary, '0b11111111')
    assert.equal(num('-5').hex, '-0x5')
    assert.equal(num('5!').binary, '0b1111000')
    assert.equal(num('2 GB in MB').hex, '0x800')
  })

  it('leaves hex and binary out for anything not a whole number', () => {
    assert.equal(num('1/3').hex, undefined)
    assert.equal(num('1/3').binary, undefined)
    assert.equal(num('1.5').hex, undefined)
    assert.equal(num('2^60').hex, undefined)
  })
})

describe('unit conversion', () => {
  const table: [string, number][] = [
    ['5 km to mi', 5000 / 1609.344],
    ['72 f in c', (72 - 32) * 5 / 9],
    ['2 GB in MB', 2048],
    ['90 min to h', 1.5],
    ['1 m to cm', 100],
    ['10 mm to cm', 1],
    ['254 in to m', 6.4516],
    ['3 ft to yd', 1],
    ['2 yd to ft', 6],
    ['1 kg to g', 1000],
    ['500 g to mg', 500000],
    ['1 lb to oz', 16],
    ['3 oz to g', 85.048569375],
    ['1 kb to b', 1024],
    ['1 pb in mb', 1024 ** 3],
    ['500 ms to s', 0.5],
    ['1 d to h', 24],
    ['2 h to min', 120],
    ['60 mph in kph', 96.56064],
    ['1 kph to mph', 1 / 1.609344],
    ['0 c to f', 32],
    ['100 c in f', 212],
    ['-40 f to c', -40],
    ['0 k to c', -273.15],
    ['37 c to k', 310.15]
  ]
  for (const [input, value] of table) {
    it(`${input}`, () => close(num(input).value, value))
  }

  it('carries the unit pair the user typed', () => {
    assert.deepEqual(num('5 km to mi').unit, { from: 'km', to: 'mi' })
    assert.equal(num('5 km to mi').display, '۳٫۱۰۶۸۵۵۹۶۱')
    assert.deepEqual(num('2 GB in MB').unit, { from: 'GB', to: 'MB' })
    assert.deepEqual(num('72 f in c').unit, { from: 'f', to: 'c' })
    assert.equal(num('1+1').unit, undefined)
  })

  it('works with Persian digits around the units', () => {
    close(num('۲ km to m').value, 2000)
    assert.equal(evaluate('۵ کیلومتر').ok, false)
  })

  it('refuses unknown units and mixed families', () => {
    assert.match(err('5 km to kg'), /تبدیل «km» به «kg»/)
    assert.match(err('5 km to zork'), /واحد «zork»/)
    assert.match(err('1 to zork'), /واحد «zork»/)
    assert.match(err('5 c to km'), /تبدیل/)
    assert.match(err('5 km to'), /کامل/)
    assert.match(err('to mi'), /مبدأ/)
    assert.match(err('5 km'), /تبدیل کامل نشده/)
    assert.ok(PERSIAN.test(err('5 km to kg')))
  })
})

describe('display and precision', () => {
  it('rounds float noise away for display only', () => {
    assert.equal(num('0.1 + 0.2').display, '۰٫۳')
    assert.equal(num('0.1 + 0.2').value, 0.30000000000000004)
    assert.equal(num('1/3*3').display, '۱')
    assert.equal(num('asin(0.5)').display, '۳۰')
  })

  const displays: [string, string][] = [
    ['100', '۱۰۰'],
    ['0', '۰'],
    ['1/8', '۰٫۱۲۵'],
    ['1/3', '۰٫۳۳۳۳۳۳۳۳۳۳'],
    ['-1/2', '-۰٫۵'],
    ['2π', '۶٫۲۸۳۱۸۵۳۰۷'],
    ['2^50', '۱۱۲۵۸۹۹۹۰۶۸۴۲۶۲۴'],
    ['2^60', '۱٫۱۵۲۹۲۱۵۰۵e+۱۸'],
    ['1e16', '۱e+۱۶'],
    ['1e-9', '۰٫۰۰۰۰۰۰۰۰۱'],
    ['1e-10', '۱e-۱۰']
  ]
  for (const [input, display] of displays) {
    it(`${input} displays as ${display}`, () => assert.equal(num(input).display, display))
  }

  it('keeps a genuinely large whole number exact', () => {
    assert.equal(num('2^50').value, 1125899906842624)
    assert.equal(num('2^50').display, '۱۱۲۵۸۹۹۹۰۶۸۴۲۶۲۴')
    assert.equal(num('20!').display, '۲٫۴۳۲۹۰۲۰۰۸e+۱۸')
  })

  it('formatNumber stays ASCII and Persian-free', () => {
    assert.equal(formatNumber(42), '42')
    assert.equal(formatNumber(-7), '-7')
    assert.equal(formatNumber(0), '0')
    assert.equal(formatNumber(0.5), '0.5')
    assert.equal(formatNumber(1 / 3), '0.3333333333')
    assert.equal(formatNumber(123456.789), '123456.789')
    assert.equal(formatNumber(1e16), '1e+16')
    assert.equal(formatNumber(1e-9), '0.000000001')
    assert.equal(formatNumber(1e-10), '1e-10')
    assert.equal(formatNumber(Number.NaN), 'NaN')
    assert.equal(formatNumber(Number.POSITIVE_INFINITY), '∞')
    assert.equal(formatNumber(Number.NEGATIVE_INFINITY), '-∞')
  })
})

describe('ans', () => {
  it('resolves to the context value', () => {
    assert.equal(num('ans+1', { ans: 41 }).value, 42)
    assert.equal(num('ans*2', { ans: 5 }).value, 10)
    assert.equal(num('ans').value, 0)
    assert.equal(num('ans', { ans: Number.NaN }).value, 0)
    assert.equal(num('ans^2', { ans: 3 }).display, '۹')
    assert.equal(num('2 ans', { ans: 3 }).value, 6)
  })
})

describe('bad input', () => {
  it('says nothing was typed for empty input', () => {
    assert.deepEqual(evaluate(''), { ok: false, error: 'چیزی تایپ نشده' })
    assert.equal(err('   '), 'چیزی تایپ نشده')
    assert.equal(err('\n\t '), 'چیزی تایپ نشده')
    assert.equal(err('\u200f'), 'چیزی تایپ نشده')
  })

  const broken: [string, RegExp][] = [
    ['((((', /کامل/],
    [')', /کامل/],
    ['5 /0', /تقسیم/],
    ['@@', /نماد/],
    ['1e999', /خیلی بزرگ/],
    ['99999999999999999999!', /فاکتوریل/],
    ['sqrt(-1)', /جذر/],
    ['1 to zork', /واحد/],
    ['5 km to kg', /تبدیل/],
    ['%', /کامل/],
    ['1 + 2)', /کامل نیست/]
  ]
  for (const [input, pattern] of broken) {
    it(`rejects ${JSON.stringify(input)}`, () => {
      const message = err(input)
      assert.match(message, pattern)
      assert.ok(PERSIAN.test(message), `${message} is not Persian`)
    })
  }
})

describe('never throws', () => {
  const deep = `${'('.repeat(500)}1${')'.repeat(500)}`
  const hostile: string[] = [
    '',
    '((((',
    '5 /0',
    '@@',
    '1e999',
    '99999999999999999999!',
    'sqrt(-1)',
    '1 to zork',
    '1'.repeat(5000),
    '9'.repeat(5000),
    '1+1+'.repeat(1250),
    deep,
    ')'.repeat(500),
    '*'.repeat(200),
    '%%%%%%%%',
    'mod mod mod',
    '0x',
    '..',
    '٬٬٬',
    '۱۲٫٫۳۴',
    'sin(sin(sin(',
    'to to to',
    'π π π',
    'ans ans ans',
    '1 2 3 4 5',
    '2^2^2^2^2^2^2^2^2^2^2^2',
    '((((((((((1))))))))))',
    '\u0000\u0001',
    `${'('.repeat(120)}1${')'.repeat(120)}`,
    'x'.repeat(10_001)
  ]
  for (const input of hostile) {
    it(`survives ${input.length > 24 ? `${input.length} characters` : JSON.stringify(input)}`, () => {
      const out = evaluate(input)
      assert.ok(out.ok === true || out.ok === false)
      if (!out.ok) {
        assert.ok(PERSIAN.test(out.error), `${out.error} is not Persian`)
      } else {
        assert.ok(Number.isFinite(out.value))
        assert.ok(out.display.length > 0)
      }
    })
  }

  it('survives input that is not a string at all', () => {
    assert.equal(evaluate(undefined as unknown as string).ok, false)
    assert.equal(evaluate(42 as unknown as string).ok, false)
    assert.equal(evaluate('{}').ok, false)
  })

  it('only guards against real nesting', () => {
    assert.equal(num(`${'('.repeat(30)}7${')'.repeat(30)}`).value, 7)
    assert.match(err(`${'('.repeat(300)}1${')'.repeat(300)}`), /تودرتو/)
    assert.match(err(deep), /تودرتو/)
  })
})

describe('CALC_FUNCTIONS', () => {
  it('lists the hint row names', () => {
    for (const name of ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'cbrt', 'abs', 'round', 'floor', 'ceil', 'ln', 'log', 'exp', 'pow', 'min', 'max', 'mod']) {
      assert.ok(CALC_FUNCTIONS.includes(name), `${name} is missing`)
    }
    assert.equal(CALC_FUNCTIONS.length, 19)
    assert.ok(!CALC_FUNCTIONS.includes('to'))
    assert.ok(!CALC_FUNCTIONS.includes('of'))
    assert.ok(CALC_FUNCTIONS.every((name) => /^[a-z]+$/.test(name)))
  })
})
