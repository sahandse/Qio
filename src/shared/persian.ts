const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (digit) => FA_DIGITS[Number(digit)])
}
