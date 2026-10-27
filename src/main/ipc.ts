import { app, ipcMain, nativeImage, shell } from 'electron'
import { statSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { AppState, MediaCommand, Nudge, Settings } from '@shared/types'
import type { Store } from './store'
import type { WindowsBridge } from './bridge'
import { fetchLyrics } from './lyrics'
import { hideOverlay, sendToNotch, sizeNotch } from './windows'

export interface IpcContext {
  store: Store
  bridge: WindowsBridge
  getState(): AppState
  notify(title: string, body: string): void
  raiseNudge(kind: Nudge['kind'], title: string, detail?: string): void
  refreshTray(): void
  applyLoginItem(): void
  setNotchVisible(visible: boolean): void
  getLastCover(): { key: string; dataUrl: string }
}

const iconCache = new Map<string, string>()
let reportedReady = false

function isWebUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

export function registerIpc(ctx: IpcContext): void {
  const { store, bridge } = ctx

  ipcMain.handle('app:state', () => ctx.getState())
  ipcMain.handle('app:meta', () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    platform: process.platform,
    packaged: app.isPackaged,
    dataPath: app.getPath('userData')
  }))

  ipcMain.handle('cover:last', () => ctx.getLastCover())

  ipcMain.handle('settings:patch', (_event, patch: Partial<Settings>) => {
    const before = store.settings.startWithWindows
    const settings = store.patchSettings(patch ?? {})
    if (settings.startWithWindows !== before) ctx.applyLoginItem()
    ctx.refreshTray()
    return settings
  })

  ipcMain.handle('todos:add', (_event, text: string, dueAt: number | null) => store.addTodo(text, dueAt ?? null))
  ipcMain.handle('todos:update', (_event, id: string, patch: Record<string, unknown>) =>
    store.updateTodo(id, patch)
  )
  ipcMain.handle('todos:remove', (_event, id: string) => store.removeTodo(id))
  ipcMain.handle('todos:clear-done', () => store.clearDoneTodos())

  ipcMain.handle('water:add', (_event, ml: number) => store.addWater(Number(ml) || 0))
  ipcMain.handle('water:remove', (_event, id: string) => store.removeWaterEntry(id))

  ipcMain.handle('shelf:add', (_event, paths: string[]) => {
    const items: { path: string; name: string; size: number; isDir: boolean }[] = []
    for (const path of Array.isArray(paths) ? paths : []) {
      try {
        const info = statSync(path)
        items.push({
          path,
          name: basename(path) || path,
          size: info.isDirectory() ? 0 : info.size,
          isDir: info.isDirectory()
        })
      } catch {
        // Path vanished between the drop and the stat; skipping it is the right answer.
      }
    }
    store.addShelf(items)
    return items.length
  })

  ipcMain.handle('shelf:remove', (_event, id: string) => store.removeShelf(id))
  ipcMain.handle('shelf:clear', () => store.clearShelf())

  ipcMain.handle('shelf:open', async (_event, id: string) => {
    const item = store.shelf.find((entry) => entry.id === id)
    if (!item) return false
    const error = await shell.openPath(item.path)
    if (error) ctx.raiseNudge('lyrics', 'Could not open that file', error)
    return !error
  })

  ipcMain.handle('shelf:reveal', (_event, id: string) => {
    const item = store.shelf.find((entry) => entry.id === id)
    if (!item) return false
    if (item.isDir) {
      void shell.openPath(item.path)
    } else {
      shell.showItemInFolder(item.path)
    }
    return true
  })

  ipcMain.handle('shelf:icon', async (_event, id: string) => {
    const item = store.shelf.find((entry) => entry.id === id)
    if (!item) return ''
    const cached = iconCache.get(item.path)
    if (cached) return cached
    try {
      const icon = await app.getFileIcon(item.path, { size: 'large' })
      const dataUrl = icon.isEmpty() ? '' : icon.toDataURL()
      if (dataUrl) iconCache.set(item.path, dataUrl)
      return dataUrl
    } catch {
      return ''
    }
  })

  ipcMain.on('shelf:drag', async (event, id: string) => {
    const item = store.shelf.find((entry) => entry.id === id)
    if (!item) return
    const fallback = nativeImage.createFromPath(join(app.getAppPath(), 'resources', 'tray.png'))
    let icon = fallback
    try {
      const fileIcon = await app.getFileIcon(item.path, { size: 'normal' })
      if (!fileIcon.isEmpty()) icon = fileIcon
    } catch {
      // Keep the Qio icon when Windows has no file icon to offer.
    }
    try {
      event.sender.startDrag({ file: item.path, icon })
    } catch (error) {
      console.error('[qio] drag out failed', error)
    }
  })

  ipcMain.handle('focus:patch', (_event, patch: Record<string, unknown>) => store.patchFocus(patch))

  ipcMain.handle('media:command', (_event, command: MediaCommand, value?: number) => {
    bridge.mediaCommand(command, typeof value === 'number' ? value : undefined)
    return true
  })

  ipcMain.handle('system:volume', (_event, level: number) => bridge.setVolume(Number(level) / 100))
  ipcMain.handle('system:volume-nudge', (_event, step: number) => bridge.nudgeVolume(Number(step)))
  ipcMain.handle('system:mute', (_event, muted: boolean) => bridge.setMuted(Boolean(muted)))
  ipcMain.handle('system:brightness', (_event, level: number) => bridge.setBrightness(Number(level)))
  ipcMain.handle('system:login-item', () => app.isPackaged && app.getLoginItemSettings().openAtLogin)

  ipcMain.handle('window:size', (_event, size: { width: number; height: number }) => {
    if (!size || !Number.isFinite(size.width) || !Number.isFinite(size.height)) return false
    sizeNotch(size.width, size.height)
    if (!reportedReady) {
      reportedReady = true
      console.log(`[qio] notch renderer ready (content ${Math.round(size.width)}x${Math.round(size.height)})`)
    }
    return true
  })
  ipcMain.handle('window:visible', (_event, visible: boolean) => ctx.setNotchVisible(Boolean(visible)))
  ipcMain.handle('window:quit', () => app.quit())
  ipcMain.handle('window:external', async (_event, url: string) => {
    if (typeof url === 'string' && isWebUrl(url)) await shell.openExternal(url)
  })

  ipcMain.handle('lyrics:get', async (_event, track: { title: string; artist: string; album?: string; duration?: number }) =>
    fetchLyrics(track ?? { title: '', artist: '' })
  )

  ipcMain.handle('app:nudge', (_event, nudge: { kind: Nudge['kind']; title: string; detail?: string }) => {
    if (!nudge?.title) return false
    ctx.raiseNudge(nudge.kind ?? 'lyrics', nudge.title, nudge.detail)
    return true
  })

  ipcMain.on('overlay:hide', () => hideOverlay())
  ipcMain.on('notch:pulse', () => sendToNotch('notch:pulse', Date.now()))
}
