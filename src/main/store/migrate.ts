/**
 * qio.json is upgraded one version at a time, so a file written by any older
 * release can still be read. Each step only reshapes keys; the store's own
 * cleaners still clamp every value afterwards.
 */
export const CURRENT_VERSION = 2

type Json = Record<string, unknown>

const migrations: Record<number, (data: Json) => Json> = {
  // 1 -> 2: the night palette arrived. Files from 1.x have no opinion about it,
  // so they inherit the default (on) explicitly instead of relying on fallbacks.
  1: (data) => {
    const settings = data.settings && typeof data.settings === 'object' ? { ...(data.settings as Json) } : {}
    if (settings.autoNight === undefined) settings.autoNight = true
    return { ...data, settings }
  }
}

export function migrate(raw: unknown): Json {
  let data: Json = raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...(raw as Json) } : {}
  let version =
    typeof data.version === 'number' && Number.isFinite(data.version) ? Math.floor(data.version) : 0

  // Version 0 is the oldest unversioned file; its layout already matches 1.
  if (version < 1) version = 1

  while (version < CURRENT_VERSION) {
    const step = migrations[version]
    if (step) data = step(data)
    version += 1
  }

  return { ...data, version: CURRENT_VERSION }
}
