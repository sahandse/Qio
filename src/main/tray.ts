import { Menu, Tray, app, nativeImage } from 'electron'
import { join } from 'node:path'
import type { Settings } from '@shared/types'

export interface TrayHandlers {
  getSettings(): Settings
  patchSettings(patch: Partial<Settings>): void
  onOpenPanel(panel: 'settings' | 'music' | 'focus'): void
  onToggleNotch(visible: boolean): void
  onQuit(): void
}

let tray: Tray | null = null
let handlers: TrayHandlers | null = null
let notchVisible = true

function trayIcon() {
  const path = join(app.getAppPath(), 'resources', 'tray.png')
  const image = nativeImage.createFromPath(path)
  return image.isEmpty() ? nativeImage.createEmpty() : image
}

export function setupTray(trayHandlers: TrayHandlers): Tray {
  handlers = trayHandlers
  tray = new Tray(trayIcon())
  tray.setToolTip('Qio — a living notch')
  tray.on('click', () => {
    notchVisible = true
    handlers?.onToggleNotch(true)
    handlers?.onOpenPanel('music')
  })
  refreshTray()
  return tray
}

export function setTrayNotchVisible(visible: boolean): void {
  notchVisible = visible
  refreshTray()
}

export function refreshTray(): void {
  if (!tray || !handlers) return
  const settings = handlers.getSettings()
  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Qio',
      click: () => {
        notchVisible = true
        handlers?.onToggleNotch(true)
        handlers?.onOpenPanel('music')
      }
    },
    { type: 'separator' },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: settings.startWithWindows,
      click: (item) => handlers?.patchSettings({ startWithWindows: item.checked })
    },
    {
      label: 'Qio mascot',
      type: 'checkbox',
      checked: settings.mascot,
      click: (item) => handlers?.patchSettings({ mascot: item.checked })
    },
    {
      label: 'Minimal notch',
      type: 'checkbox',
      checked: settings.minimalNotch,
      click: (item) => handlers?.patchSettings({ minimalNotch: item.checked })
    },
    {
      label: 'Show on screen',
      type: 'checkbox',
      checked: notchVisible,
      click: (item) => {
        notchVisible = item.checked
        handlers?.onToggleNotch(item.checked)
      }
    },
    { type: 'separator' },
    { label: `About Qio ${app.getVersion()}`, click: () => handlers?.onOpenPanel('settings') },
    { label: 'Quit Qio', click: () => handlers?.onQuit() }
  ])
  tray.setContextMenu(menu)
}
