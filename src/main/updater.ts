import { Notification, app, net } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { toPersianDigits } from '@shared/persian'
import type { UpdateState } from '@shared/types'
import { megabytes, pickInstaller } from '@shared/update'
import { isNewer } from '@shared/version'
import { downloadVerified } from './update-file'
import { openSettingsWindow } from './windows'

const RELEASES_API = 'https://api.github.com/repos/sahandse/Qio/releases/latest'
const FIRST_CHECK_MS = 12_000
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000
const TIMEOUT_MS = 8_000

interface ReleaseAsset {
  name?: string
  size?: number
  digest?: string | null
  browser_download_url?: string
}

interface Release {
  tag_name?: string
  draft?: boolean
  prerelease?: boolean
  assets?: ReleaseAsset[]
}

interface Candidate {
  version: string
  url: string
  name: string
  sha: string
  size: number | null
}

const state: UpdateState = {
  phase: 'idle',
  current: app.getVersion(),
  latest: null,
  progress: 0,
  sha: null,
  sizeMb: null,
  error: null,
  installable: app.isPackaged
}

let candidate: Candidate | null = null
let verified: { path: string; sha: string } | null = null
let onChange: (() => void) | null = null
let onAlert: ((version: string, detail: string) => void) | null = null
let checking = false
let downloading = false
let announced = ''

function updateDir(): string {
  return join(app.getPath('temp'), 'qio-update')
}

export function initUpdater(push: () => void, alert?: (version: string, detail: string) => void): void {
  onChange = push
  onAlert = alert ?? null
  state.current = app.getVersion()
  state.installable = app.isPackaged
  // A previous run may have left a half-downloaded installer behind.
  void rm(updateDir(), { recursive: true, force: true }).catch(() => undefined)
}

export function updateState(): UpdateState {
  return { ...state }
}

function setState(patch: Partial<UpdateState>): void {
  Object.assign(state, patch)
  onChange?.()
}

function announce(version: string): void {
  if (announced === version) return
  announced = version
  const body = `Qio ${toPersianDigits(version)} آماده است — برای دیدن جزئیات، روی این اعلان بزن.`
  onAlert?.(version, body)
  if (!Notification.isSupported()) return
  const notification = new Notification({
    title: 'نسخهٔ تازهٔ Qio',
    body,
    silent: true
  })
  notification.on('click', () => openSettingsWindow('about'))
  notification.show()
}

async function fetchRelease(): Promise<Release> {
  const response = await net.fetch(RELEASES_API, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': `Qio/${app.getVersion()}`
    },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })
  if (!response.ok) throw new Error(`releases ${response.status}`)
  return (await response.json()) as Release
}

/** `notify` adds a notification for timer checks; tapping it opens the About tab. */
export async function checkForUpdate(notify = false): Promise<UpdateState> {
  if (checking || downloading || state.phase === 'installing') return updateState()
  checking = true
  setState({ phase: 'checking', error: null, progress: 0, sha: null })
  try {
    const release = await fetchRelease()
    const tag = release.tag_name
    if (!tag || release.draft || release.prerelease) {
      setState({ phase: 'latest', latest: null })
      return updateState()
    }
    const version = tag.replace(/^v/i, '')
    if (!isNewer(tag, app.getVersion())) {
      candidate = null
      verified = null
      setState({ phase: 'latest', latest: version, error: null, progress: 0, sha: null })
      return updateState()
    }
    if (verified && candidate?.version === version) {
      setState({ phase: 'ready', latest: version })
      return updateState()
    }
    const installer = pickInstaller(release.assets)
    if (!installer?.asset.browser_download_url || !installer.asset.name) {
      setState({ phase: 'error', latest: version, error: 'فایل نصب با هش SHA‑256 در این نسخه پیدا نشد.' })
      return updateState()
    }
    candidate = {
      version,
      url: installer.asset.browser_download_url,
      name: installer.asset.name,
      sha: installer.sha,
      size: installer.asset.size ?? null
    }
    verified = null
    setState({
      phase: 'available',
      latest: version,
      sizeMb: megabytes(installer.asset.size),
      error: null,
      progress: 0,
      sha: null
    })
    if (notify) announce(version)
    return updateState()
  } catch {
    setState({ phase: 'error', error: 'بررسی نسخهٔ تازه نشد؛ اینترنت را نگاه کنید.' })
    return updateState()
  } finally {
    checking = false
  }
}

const DOWNLOAD_ERRORS = {
  network: 'دریافت فایل نصب قطع شد؛ دوباره تلاش کنید.',
  size: 'حجم فایل نصب با نسخهٔ رسمی نمی‌خواند؛ فایل پاک شد.',
  hash: 'هش SHA‑256 فایل با نسخهٔ رسمی نمی‌خواند؛ فایل پاک شد.'
} as const

export async function downloadUpdate(): Promise<boolean> {
  if (downloading || !candidate) return false
  const target = candidate
  downloading = true
  const file = join(updateDir(), target.name)
  let pushed = 0
  setState({ phase: 'downloading', progress: 0, error: null, sha: null })
  try {
    await mkdir(updateDir(), { recursive: true })
    await rm(file, { force: true })
    const result = await downloadVerified({
      url: target.url,
      file,
      sha: target.sha,
      size: target.size,
      headers: { 'user-agent': `Qio/${app.getVersion()}` },
      fetch: net.fetch,
      onProgress: (ratio) => {
        const now = Date.now()
        if (now - pushed < 250) return
        pushed = now
        setState({ progress: ratio })
      },
      onDownloaded: () => setState({ phase: 'verifying', progress: 1 })
    })
    if (!result.ok) {
      setState({ phase: 'error', error: DOWNLOAD_ERRORS[result.reason] })
      return false
    }
    verified = { path: file, sha: result.sha }
    setState({ phase: 'ready', sha: result.sha, error: null })
    return true
  } catch {
    await rm(file, { force: true }).catch(() => undefined)
    setState({ phase: 'error', error: DOWNLOAD_ERRORS.network })
    return false
  } finally {
    downloading = false
  }
}

/** Runs the verified installer silently, then brings the new build back up. */
export function installUpdate(): boolean {
  if (!app.isPackaged || state.phase !== 'ready' || !verified) return false
  if (!existsSync(verified.path)) {
    setState({ phase: 'error', error: 'فایل نصب روی دیسک نیست؛ دوباره دریافت کنید.' })
    return false
  }
  setState({ phase: 'installing', error: null })
  try {
    // The NSIS build relaunches the app itself when told it is an update and forced to run.
    const child = spawn(verified.path, ['/S', '--updated', '--force-run'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    })
    child.unref()
  } catch {
    setState({ phase: 'error', error: 'شروع نصب ممکن نشد.' })
    return false
  }
  setTimeout(() => app.quit(), 700)
  return true
}

export function startUpdateCheck(): void {
  if (!app.isPackaged) return
  setTimeout(() => void checkForUpdate(true), FIRST_CHECK_MS)
  setInterval(() => void checkForUpdate(true), CHECK_EVERY_MS)
}
