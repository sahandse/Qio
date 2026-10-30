/** Two letters for a crest-less team: "تراکتور" becomes "تر", "ذوب آهن" becomes "ذآ". */
export function crestText(name: string): string {
  const parts = name
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '؟'
  if (parts.length === 1) return parts[0].slice(0, 2)
  return `${parts[0][0]}${parts[1][0]}`
}
