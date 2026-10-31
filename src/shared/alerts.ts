/** Pure helpers for the alerts page, shared by main and the tests. */
import type { NudgeAction, NudgeKind } from './types'

/** How many alerts survive in memory; older ones fall off the end. */
export const ALERT_LIMIT = 100

/** Buttons every alert of this kind should offer, even when the pill showed none. */
export function defaultAlertActions(kind: NudgeKind): NudgeAction[] {
  if (kind === 'football') return [{ id: 'open', label: 'باز کردن بازی‌ها', page: 'football' }]
  if (kind === 'shelf') return [{ id: 'open', label: 'دیدن قفسه', page: 'shelf' }]
  return []
}

function decodeEntity(entity: string): string {
  if (entity === 'amp') return '&'
  if (entity === 'lt') return '<'
  if (entity === 'gt') return '>'
  if (entity === 'quot') return '"'
  if (entity === 'apos') return "'"
  if (entity.startsWith('#x') || entity.startsWith('#X')) {
    const code = Number.parseInt(entity.slice(2), 16)
    return Number.isFinite(code) ? String.fromCodePoint(code) : ''
  }
  if (entity.startsWith('#')) {
    const code = Number.parseInt(entity.slice(1), 10)
    return Number.isFinite(code) ? String.fromCodePoint(code) : ''
  }
  return `&${entity};`
}

export function decodeXmlText(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_match, entity: string) => decodeEntity(entity))
}

/** Windows toast payloads are plain XML; the text nodes are the title and the body. */
export function parseToastText(payload: string): { title: string; detail?: string } | null {
  const texts: string[] = []
  for (const match of payload.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/gi)) {
    const text = decodeXmlText(match[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    if (text) texts.push(text)
  }
  if (texts.length === 0) return null
  const title = texts[0].slice(0, 160)
  const detail = texts.slice(1).join(' · ').slice(0, 400)
  return detail ? { title, detail } : { title }
}

/** A FILETIME counts 100-ns steps from 1601; JavaScript counts milliseconds from 1970. */
export function filetimeToMs(value: bigint): number {
  const unix = value / 10_000n - 11_644_473_600_000n
  return Number(unix)
}

const SYSTEM_PREFIXES = ['Windows.', 'Microsoft.Windows.', 'MicrosoftWindows.']

/** A readable app name from a toast handler id, never a raw AUMID. */
export function toastAppLabel(primaryId: string): string {
  const id = primaryId.trim()
  if (!id) return 'ویندوز'
  if (id === 'com.sahandse.qio' || id.startsWith('com.sahandse.qio')) return 'Qio'
  if (SYSTEM_PREFIXES.some((prefix) => id.startsWith(prefix))) return 'ویندوز'

  const withoutVendor = id.replace(/^Microsoft\./i, '')
  const app = withoutVendor.includes('!') ? withoutVendor.slice(withoutVendor.indexOf('!') + 1) : withoutVendor
  const packageless = app.split('_')[0]
  const last = packageless.split('.').filter(Boolean).pop() ?? packageless
  const words = last
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/ToastHandler$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  return words || 'ویندوز'
}

/** Qio's own toasts would come back through the Windows database; skip them. */
export function isOwnToast(primaryId: string, appId: string): boolean {
  const id = primaryId.trim()
  return id === appId || id === `${appId}.toast` || id.toLowerCase() === 'electron.app.electron'
}
