import { Notification, app, net, shell } from 'electron'
import { toPersianDigits } from '@shared/persian'
import { isNewer } from '@shared/version'

const RELEASES_API = 'https://api.github.com/repos/sahandse/Qio/releases/latest'
const FIRST_CHECK_MS = 12_000
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000
const TIMEOUT_MS = 8_000

interface Release {
  tag_name?: string
  html_url?: string
  draft?: boolean
  prerelease?: boolean
}

/**
 * Qio is signed by nobody, so a silent install would look like malware to SmartScreen.
 * Instead the check is quiet: GitHub tells us about a newer tag and the user decides.
 */
export function startUpdateCheck(): void {
  if (!app.isPackaged) return
  let announced = ''

  const check = async (): Promise<void> => {
    try {
      const response = await net.fetch(RELEASES_API, {
        headers: {
          accept: 'application/vnd.github+json',
          'user-agent': `Qio/${app.getVersion()}`
        },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })
      if (!response.ok) return
      const release = (await response.json()) as Release
      const tag = release.tag_name
      if (!tag || release.draft || release.prerelease) return
      if (!isNewer(tag, app.getVersion()) || tag === announced) return
      announced = tag
      if (!Notification.isSupported()) return
      const version = tag.replace(/^v/i, '')
      const notification = new Notification({
        title: 'نسخهٔ تازهٔ Qio',
        body: `Qio ${toPersianDigits(version)} آماده است — برای باز کردن صفحهٔ دانلود، روی این اعلان بزن.`,
        silent: true
      })
      notification.on('click', () => {
        const page = release.html_url ?? 'https://github.com/sahandse/Qio/releases/latest'
        void shell.openExternal(page)
      })
      notification.show()
    } catch {
      // Being offline is the normal case for most of the day; the next round tries again.
    }
  }

  setTimeout(() => void check(), FIRST_CHECK_MS)
  setInterval(() => void check(), CHECK_EVERY_MS)
}
