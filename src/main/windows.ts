import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import type { OverlayPayload } from '@shared/types'

export const COLLAPSED_SIZE = { width: 460, height: 44 }
const OVERLAY_SIZE = { width: 460, height: 190 }
/** Space the renderer adds around its content for shadows; kept in sync with styles.css. */
export const SHELL_CHROME = { x: 14, bottom: 14 }

let notchWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let overlayTimer: NodeJS.Timeout | null = null

const preloadPath = (): string => join(__dirname, '../preload/index.js')
const devUrl = (): string | undefined => process.env['ELECTRON_RENDERER_URL']
const iconPath = (): string => join(__dirname, '../../resources/icon.png')

/** Renderer logs land in the terminal that started Qio, which makes the notch debuggable. */
function pipeRendererLogs(window: BrowserWindow): void {
  const content = window.webContents as unknown as {
    on(channel: string, listener: (...args: unknown[]) => void): void
  }
  content.on('console-message', (...args: unknown[]) => {
    const first = args[0] as { message?: string } | undefined
    const message = first && typeof first === 'object' && 'message' in first ? first.message : (args[2] as string)
    if (message) console.log(`[renderer:${window.id}] ${message}`)
  })
}

function loadPage(window: BrowserWindow, page: 'index' | 'overlay'): void {
  pipeRendererLogs(window)
  const url = devUrl()
  if (url) {
    void window.loadURL(`${url}/${page}.html`)
  } else {
    void window.loadFile(join(__dirname, `../renderer/${page}.html`))
  }
}

export function getNotchWindow(): BrowserWindow | null {
  return notchWindow
}

export function createNotchWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay()
  const { bounds } = display
  const width = COLLAPSED_SIZE.width + SHELL_CHROME.x * 2
  const height = COLLAPSED_SIZE.height + SHELL_CHROME.bottom

  const window = new BrowserWindow({
    width,
    height,
    x: Math.round(bounds.x + (bounds.width - width) / 2),
    y: bounds.y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    acceptFirstMouse: true,
    show: false,
    title: 'Qio',
    icon: iconPath(),
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  })

  window.setAlwaysOnTop(true, 'screen-saver')
  window.setMenuBarVisibility(false)
  loadPage(window, 'index')
  window.once('ready-to-show', () => window.showInactive())

  notchWindow = window
  return window
}

export function createOverlayWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay()
  const { bounds } = display
  const window = new BrowserWindow({
    ...OVERLAY_SIZE,
    x: Math.round(bounds.x + (bounds.width - OVERLAY_SIZE.width) / 2),
    y: bounds.y + 46,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  window.setIgnoreMouseEvents(true)
  window.setAlwaysOnTop(true, 'screen-saver')
  window.setFocusable(false)
  loadPage(window, 'overlay')
  overlayWindow = window
  return window
}

/** Resizes the notch to its rendered content, keeping it centred on the top screen edge. */
export function sizeNotch(contentWidth: number, contentHeight: number): void {
  if (!notchWindow || notchWindow.isDestroyed()) return
  const display = screen.getPrimaryDisplay()
  const { bounds } = display
  const width = Math.max(
    COLLAPSED_SIZE.width + SHELL_CHROME.x * 2,
    Math.min(Math.round(contentWidth) + SHELL_CHROME.x * 2, Math.round(bounds.width))
  )
  const height = Math.max(
    COLLAPSED_SIZE.height + SHELL_CHROME.bottom,
    Math.min(Math.round(contentHeight) + SHELL_CHROME.bottom, Math.round(bounds.height - 40))
  )
  notchWindow.setBounds({
    x: Math.round(bounds.x + (bounds.width - width) / 2),
    y: bounds.y,
    width,
    height
  })
}

export function repositionWindows(): void {
  const display = screen.getPrimaryDisplay()
  const { bounds } = display
  if (notchWindow && !notchWindow.isDestroyed()) {
    const [width] = notchWindow.getSize()
    notchWindow.setBounds({
      x: Math.round(bounds.x + (bounds.width - width) / 2),
      y: bounds.y,
      width,
      height: notchWindow.getSize()[1]
    })
  }
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setBounds({
      x: Math.round(bounds.x + (bounds.width - OVERLAY_SIZE.width) / 2),
      y: bounds.y + 46,
      ...OVERLAY_SIZE
    })
  }
}

export function showOverlay(payload: OverlayPayload): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  overlayWindow.webContents.send('overlay:show', payload)
  if (!overlayWindow.isVisible()) overlayWindow.showInactive()
  if (overlayTimer) clearTimeout(overlayTimer)
  overlayTimer = setTimeout(() => hideOverlay(), 2600)
}

export function hideOverlay(): void {
  if (overlayTimer) {
    clearTimeout(overlayTimer)
    overlayTimer = null
  }
  if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
    overlayWindow.webContents.send('overlay:reset')
    overlayWindow.hide()
  }
}

export function sendToNotch(channel: string, payload: unknown): void {
  if (notchWindow && !notchWindow.isDestroyed()) notchWindow.webContents.send(channel, payload)
}

/** Content-sized window, so the transparent area is never bigger than what Qio draws. */
export function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channel, payload)
  }
}
