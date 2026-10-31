/** Quick-launch rules: what counts as a shortcut, what is dropped, and how the list moves. */
import type { LaunchItem, LaunchKind } from './types'

/** Enough for a full strip in the notch without turning the tools tab into a launcher page. */
export const MAX_LAUNCH_ITEMS = 24
const MAX_TARGET_CHARS = 2048
const MAX_NAME_CHARS = 80

function isKind(value: unknown): value is LaunchKind {
  return value === 'file' || value === 'folder' || value === 'url'
}

/** Windows paths only: a drive letter or a UNC share, never a bare word. */
export function isAbsoluteTarget(target: string): boolean {
  return /^[a-z]:[\\/]/i.test(target) || target.startsWith('\\\\')
}

/**
 * An http(s) address, normalized. Anything else — file:, javascript:, bare text —
 * comes back as null, so main never hands a scheme of the renderer's choosing to the shell.
 */
export function webUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const typed = raw.trim()
  if (!typed || typed.length > MAX_TARGET_CHARS) return null
  let url: URL
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(typed) ? typed : `https://${typed}`)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (!url.hostname) return null
  url.username = ''
  url.password = ''
  return url.toString()
}

/** The last segment of a path, used when a name is missing or a shortcut is added. */
export function baseName(target: string): string {
  const parts = target.split(/[/\\]/).filter(Boolean)
  return (parts[parts.length - 1] ?? target).slice(0, MAX_NAME_CHARS)
}

export function urlName(target: string): string {
  try {
    const url = new URL(target)
    const host = url.hostname.replace(/^www\./i, '')
    const path = url.pathname.replace(/\/+$/, '')
    return `${host}${path}`.slice(0, MAX_NAME_CHARS) || target.slice(0, MAX_NAME_CHARS)
  } catch {
    return target.slice(0, MAX_NAME_CHARS)
  }
}

export function launchName(item: Pick<LaunchItem, 'kind' | 'target' | 'name'>): string {
  const cleaned = item.name.trim()
  if (cleaned) return cleaned.slice(0, MAX_NAME_CHARS)
  return item.kind === 'url' ? urlName(item.target) : baseName(item.target)
}

/** Windows paths are case-insensitive; addresses are already normalized. */
function keyOf(kind: LaunchKind, target: string): string {
  return `${kind}:${kind === 'url' ? target : target.toLowerCase()}`
}

/** Drops malformed, duplicated or non-local entries; what survives is safe to draw and open. */
export function cleanLaunchItems(raw: unknown): LaunchItem[] {
  if (!Array.isArray(raw)) return []
  const items: LaunchItem[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Partial<LaunchItem>
    if (typeof item.id !== 'string' || !item.id.trim()) continue
    if (!isKind(item.kind) || typeof item.target !== 'string') continue
    const target = item.kind === 'url' ? webUrl(item.target) : item.target.trim().slice(0, MAX_TARGET_CHARS)
    if (!target) continue
    if (item.kind !== 'url' && !isAbsoluteTarget(target)) continue
    const key = keyOf(item.kind, target)
    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      id: item.id.trim().slice(0, 64),
      kind: item.kind,
      target,
      name: launchName({ kind: item.kind, target, name: typeof item.name === 'string' ? item.name : '' }),
      addedAt: typeof item.addedAt === 'number' && Number.isFinite(item.addedAt) ? item.addedAt : 0
    })
    if (items.length >= MAX_LAUNCH_ITEMS) break
  }
  return items
}

/** Appends what is new, keeps the first copy of anything repeated, and stops at the cap. */
export function addLaunchItems(current: LaunchItem[], incoming: LaunchItem[]): LaunchItem[] {
  const next = [...current]
  const seen = new Set(next.map((item) => keyOf(item.kind, item.target)))
  for (const item of incoming) {
    if (next.length >= MAX_LAUNCH_ITEMS) break
    const key = keyOf(item.kind, item.target)
    if (seen.has(key)) continue
    seen.add(key)
    next.push(item)
  }
  return next
}

/** Moves one item by one slot; the ends hold, so an arrow press never wraps the list. */
export function moveLaunch(items: LaunchItem[], id: string, delta: number): LaunchItem[] {
  const from = items.findIndex((item) => item.id === id)
  if (from < 0 || delta === 0) return items
  const to = Math.min(items.length - 1, Math.max(0, from + (delta < 0 ? -1 : 1)))
  if (to === from) return items
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
