/** Numeric parts of a version tag, ignoring a leading v and any pre-release suffix. */
function parts(version: string): number[] {
  const pieces = version
    .trim()
    .replace(/^v/i, '')
    .split('-')[0]
    .split('.')
    .filter((piece) => piece.length > 0)
  if (pieces.length === 0) return []
  return pieces.map((piece) => {
    const n = Number.parseInt(piece, 10)
    return Number.isFinite(n) && n > 0 ? n : 0
  })
}

export function isNewer(candidate: string, current: string): boolean {
  const next = parts(candidate)
  const now = parts(current)
  if (next.length === 0 || now.length === 0) return false
  for (let i = 0; i < Math.max(next.length, now.length); i++) {
    const left = next[i] ?? 0
    const right = now[i] ?? 0
    if (left !== right) return left > right
  }
  return false
}
