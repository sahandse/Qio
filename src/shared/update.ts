const SHA256 = /^[0-9a-f]{64}$/i
const INSTALLER = /^Qio-Setup-[0-9A-Za-z.-]+\.exe$/

/** GitHub reports an asset digest as "sha256:<hex>"; anything else is unusable. */
export function sha256Digest(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = /^sha256:([0-9a-f]{64})$/i.exec(value.trim())
  return match ? match[1].toLowerCase() : null
}

export function sha256Matches(expected: string, actual: string): boolean {
  return SHA256.test(expected) && expected.toLowerCase() === actual.toLowerCase()
}

export function isInstallerAsset(name: unknown): name is string {
  return typeof name === 'string' && INSTALLER.test(name)
}

/** Chooses the Windows installer that carries a SHA-256 digest, if the release has one. */
export function pickInstaller<T extends { name?: string; digest?: string | null }>(
  assets: T[] | undefined
): { asset: T; sha: string } | null {
  for (const asset of assets ?? []) {
    if (!isInstallerAsset(asset.name)) continue
    const sha = sha256Digest(asset.digest)
    if (sha) return { asset, sha }
  }
  return null
}

export function megabytes(bytes: number | null | undefined): number | null {
  if (!bytes || bytes <= 0) return null
  return Math.round((bytes / (1024 * 1024)) * 10) / 10
}
