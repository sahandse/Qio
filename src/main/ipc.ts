import { BrowserWindow, ClipboardItem, app, clipboard, dialog, ipcMain, nativeImage, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { AiEvent, AiSettings, AppState, LaunchItem, MediaCommand, Note, Nudge, PickedColor, Settings } from '@shared/types'
import { aiReady } from '@shared/ai'
import { addLaunchItems, baseName, moveLaunch, urlName, webUrl } from '@shared/launch'
import type { Store } from './store'
import type { AlertCenter } from './alerts'
import type { WindowsBridge } from './bridge'
import type { CoffeeService } from './coffee'
import type { ClipService } from './clip'
import type { MonitorService } from './monitor'
import type { FootballService } from './football'
import { AiAbortError, streamCompletion, testCompletion } from './ai'
import type { AiPrompt } from './ai'
import { fetchLyrics } from './lyrics'
import { dismissPicker, openEyedropper, pickerFrame, showPicker } from './screen'
import { checkForUpdate, downloadUpdate, installUpdate } from './updater'
import {
  closeDrawWindow,
  hideOverlay,
  openDrawWindow,
  openSettingsWindow,
  repositionWindows,
  sendToNotch,
  setNotchPosition,
  sizeNotch
} from './windows'
import { pickFocusPatch, pickSavePayload, pickSettingsPatch, pickTodoPatch } from '@shared/validate'

export interface IpcContext {
  store: Store
  bridge: WindowsBridge
  football: FootballService
  coffee: CoffeeService
  clip: ClipService
  alerts: AlertCenter
  monitor: MonitorService
  getState(): AppState
  notify(title: string, body: string): void
  raiseNudge(kind: Nudge['kind'], title: string, detail?: string): void
  onNudgeAction(id: string, action: string): void
  refreshTray(): void
  applyLoginItem(): void
  setNotchVisible(visible: boolean): void
  syncNotch(): void
  getLastCover(): { key: string; dataUrl: string }
  recordPick(color: PickedColor): void
}

const iconCache = new Map<string, string>()
let reportedReady = false

function isWebUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

export function registerIpc(ctx: IpcContext): void {
  const { store, bridge } = ctx
  const streams = new Map<string, AbortController>()

  const launchList = (): LaunchItem[] => store.settings.launch.items
  const commitLaunch = (items: LaunchItem[]): LaunchItem[] => {
    store.patchSettings({ launch: { items } })
    return store.settings.launch.items
  }
  const makeLaunch = (kind: LaunchItem['kind'], target: string, name = ''): LaunchItem => ({
    id: randomUUID(),
    kind,
    target,
    name: name.trim().slice(0, 80) || (kind === 'url' ? urlName(target) : baseName(target)),
    addedAt: Date.now()
  })

  /** The renderer never supplies paths; Windows' own picker does. */
  const pickPaths = async (
    sender: Electron.WebContents,
    properties: ('openFile' | 'openDirectory' | 'multiSelections')[]
  ): Promise<string[]> => {
    const parent = BrowserWindow.fromWebContents(sender)
    const options: Electron.OpenDialogOptions = {
      title: 'افزودن به اجرای سریع',
      buttonLabel: 'افزودن',
      properties
    }
    const result =
      parent && !parent.isDestroyed()
        ? await dialog.showOpenDialog(parent, options)
        : await dialog.showOpenDialog(options)
    return result.canceled ? [] : result.filePaths
  }

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
    const clean = pickSettingsPatch(patch)
    const before = store.settings.startWithWindows
    const settings = store.patchSettings(clean)
    if (settings.startWithWindows !== before) ctx.applyLoginItem()
    if ('hideFullscreen' in clean) ctx.syncNotch()
    if ('clipboard' in clean) ctx.clip.sync()
    if ('notchPosition' in clean) {
      setNotchPosition(settings.notchPosition)
      repositionWindows()
    }
    ctx.refreshTray()
    return settings
  })

  ipcMain.handle('ai:patch', (_event, patch: Partial<Omit<AiSettings, 'apiKey'>>) => store.patchAiSettings(patch ?? {}))
  ipcMain.handle('ai:key', (_event, key: string) => store.setAiKey(key))
  ipcMain.handle('ai:clear', () => {
    store.clearAiMessages()
    return true
  })
  ipcMain.handle('ai:test', () => testCompletion(store.aiSettings))

  ipcMain.handle('ai:send', (event, text: string) => {
    const prompt = typeof text === 'string' ? text.trim().slice(0, 4000) : ''
    if (!prompt) return { ok: false, error: 'متن پیام خالی است.' }
    if (!aiReady(store.aiSettings)) return { ok: false, error: 'اول در تنظیمات، سرویس و کلید را کامل کن.' }
    if (streams.size > 0) return { ok: false, error: 'یک پاسخ در جریان است؛ اول متوقفش کن.' }

    const requestId = randomUUID()
    const controller = new AbortController()
    streams.set(requestId, controller)
    store.addAiMessage('user', prompt)

    const settings = store.aiSettings
    const history: AiPrompt[] = store.aiMessages
      .slice(-16)
      .map((message) => ({ role: message.role, content: message.text }))
    const messages: AiPrompt[] = settings.systemPrompt
      ? [{ role: 'system', content: settings.systemPrompt }, ...history]
      : history
    const sender = event.sender
    const send = (payload: AiEvent): void => {
      if (!sender.isDestroyed()) sender.send('ai:event', payload)
    }

    setTimeout(() => {
      void (async () => {
        let full = ''
        try {
          await streamCompletion(settings, messages, controller.signal, (chunk) => {
            full += chunk
            send({ type: 'delta', requestId, delta: chunk })
          })
          const message = full.trim() ? store.addAiMessage('assistant', full) : null
          send({ type: 'done', requestId, message: message ?? undefined })
        } catch (error) {
          if (error instanceof AiAbortError) {
            const message = full.trim() ? store.addAiMessage('assistant', full) : null
            send({ type: 'done', requestId, message: message ?? undefined, stopped: true })
          } else {
            send({ type: 'error', requestId, error: error instanceof Error ? error.message : 'خطای ناشناخته' })
          }
        } finally {
          streams.delete(requestId)
        }
      })()
    }, 0)

    return { ok: true, requestId }
  })

  ipcMain.on('ai:stop', (_event, requestId: string) => {
    streams.get(requestId)?.abort()
  })

  ipcMain.handle('todos:add', (_event, text: string, dueAt: number | null) => store.addTodo(text, dueAt ?? null))
  ipcMain.handle('todos:update', (_event, id: string, patch: Record<string, unknown>) => {
    if (typeof id === 'string') store.updateTodo(id, pickTodoPatch(patch))
  })
  ipcMain.handle('todos:remove', (_event, id: string) => store.removeTodo(id))
  ipcMain.handle('todos:clear-done', () => store.clearDoneTodos())

  ipcMain.handle('notes:add', (_event, text: string, tint?: Note['tint']) => store.addNote(text, tint ?? undefined))
  ipcMain.handle('notes:update', (_event, id: string, patch: Partial<Pick<Note, 'text' | 'pinned' | 'tint'>>) =>
    store.updateNote(id, patch ?? {})
  )
  ipcMain.handle('notes:remove', (_event, id: string) => store.removeNote(id))

  ipcMain.handle('water:add', (_event, ml: number) => {
    const amount = Number(ml)
    if (Number.isFinite(amount) && amount > 0) store.addWater(amount)
  })
  ipcMain.handle('water:remove', (_event, id: string) => store.removeWaterEntry(id))

  ipcMain.handle('alerts:act', (_event, id: string, action: string) => {
    if (typeof id !== 'string' || typeof action !== 'string') return false
    return ctx.alerts.act(id, action)
  })
  ipcMain.handle('alerts:read', (_event, id: string) =>
    typeof id === 'string' ? ctx.alerts.read(id) : false
  )
  ipcMain.handle('alerts:read-all', () => ctx.alerts.readAll())
  ipcMain.handle('alerts:clear', () => ctx.alerts.clear())

  ipcMain.handle('shelf:add', (_event, paths: string[]) => {
    const items: { kind: 'file'; path: string; name: string; size: number; isDir: boolean }[] = []
    for (const path of Array.isArray(paths) ? paths : []) {
      try {
        const info = statSync(path)
        items.push({
          kind: 'file',
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

  ipcMain.handle('shelf:add-text', async () => {
    const text = (await clipboard.readText()).trim()
    if (!text) return false
    const firstLine = text.split(/\r?\n/).find((line: string) => line.trim()) ?? text
    store.addShelf([
      {
        kind: 'text',
        path: '',
        name: firstLine.trim().slice(0, 80),
        size: text.length,
        isDir: false,
        text: text.slice(0, 20_000)
      }
    ])
    return true
  })

  ipcMain.handle('shelf:copy', async (_event, id: string) => {
    const item = store.shelf.find((entry) => entry.id === id)
    if (!item) return false
    await clipboard.writeText(item.kind === 'text' ? (item.text ?? '') : item.path)
    return true
  })

  ipcMain.handle('shelf:remove', (_event, id: string) => store.removeShelf(id))
  ipcMain.handle('shelf:clear', () => store.clearShelf())

  ipcMain.handle('shelf:open', async (_event, id: string) => {
    const item = store.shelf.find((entry) => entry.id === id)
    if (!item) return false
    if (item.kind === 'text') {
      clipboard.writeText(item.text ?? '')
      return true
    }
    const error = await shell.openPath(item.path)
    if (error) ctx.raiseNudge('shelf', 'این فایل باز نشد', error)
    return !error
  })

  ipcMain.handle('shelf:reveal', (_event, id: string) => {
    const item = store.shelf.find((entry) => entry.id === id)
    if (!item) return false
    if (item.kind === 'text') return false
    if (item.isDir) {
      void shell.openPath(item.path)
    } else {
      shell.showItemInFolder(item.path)
    }
    return true
  })

  ipcMain.handle('shelf:icon', async (_event, id: string) => {
    const item = store.shelf.find((entry) => entry.id === id)
    if (!item || item.kind === 'text') return ''
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

  ipcMain.on('shelf:drag', async (event, ids: string[]) => {
    const items = store.shelf.filter((entry) => Array.isArray(ids) && ids.includes(entry.id))
    const files = items.filter((item) => item.kind === 'file' && existsSync(item.path)).map((item) => item.path)
    if (files.length === 0) return
    const fallback = nativeImage.createFromPath(join(app.getAppPath(), 'resources', 'tray.png'))
    let icon = fallback
    try {
      const fileIcon = await app.getFileIcon(files[0], { size: 'normal' })
      if (!fileIcon.isEmpty()) icon = fileIcon
    } catch {
      // Keep the Qio icon when Windows has no file icon to offer.
    }
    try {
      event.sender.startDrag({ file: files[0], files, icon })
    } catch (error) {
      console.error('[qio] drag out failed', error)
    }
  })

  ipcMain.handle('launch:add-files', async (event) => {
    const picked = await pickPaths(event.sender, ['openFile', 'multiSelections'])
    if (picked.length === 0) return null
    const fresh: LaunchItem[] = []
    for (const path of picked) {
      try {
        const info = statSync(path)
        fresh.push(makeLaunch(info.isDirectory() ? 'folder' : 'file', path))
      } catch {
        // Gone between the pick and the stat; leaving it out is kinder than a dead tile.
      }
    }
    return commitLaunch(addLaunchItems(launchList(), fresh))
  })

  ipcMain.handle('launch:add-folder', async (event) => {
    const picked = await pickPaths(event.sender, ['openDirectory', 'multiSelections'])
    if (picked.length === 0) return null
    const fresh: LaunchItem[] = []
    for (const path of picked) {
      try {
        if (statSync(path).isDirectory()) fresh.push(makeLaunch('folder', path))
      } catch {
        // Same as above: a path that is already gone is not a shortcut.
      }
    }
    return commitLaunch(addLaunchItems(launchList(), fresh))
  })

  // Only http(s) survives webUrl; null tells the settings panel the address was refused.
  ipcMain.handle('launch:add-url', (_event, raw: unknown) => {
    const target = webUrl(raw)
    if (!target) return null
    return commitLaunch(addLaunchItems(launchList(), [makeLaunch('url', target)]))
  })

  ipcMain.handle('launch:remove', (_event, id: unknown) => {
    if (typeof id !== 'string') return launchList()
    return commitLaunch(launchList().filter((item) => item.id !== id))
  })

  ipcMain.handle('launch:move', (_event, id: unknown, delta: unknown) => {
    if (typeof id !== 'string' || typeof delta !== 'number' || !Number.isFinite(delta)) return launchList()
    return commitLaunch(moveLaunch(launchList(), id, delta))
  })

  ipcMain.handle('launch:open', async (_event, id: unknown) => {
    if (typeof id !== 'string') return false
    const item = launchList().find((entry) => entry.id === id)
    if (!item) return false
    if (item.kind === 'url') {
      try {
        await shell.openExternal(item.target)
        return true
      } catch {
        ctx.raiseNudge('system', `«${item.name}» باز نشد`, 'مرورگر پیش‌فرض این نشانی را نپذیرفت.')
        return false
      }
    }
    if (!existsSync(item.target)) {
      ctx.raiseNudge('system', `«${item.name}» پیدا نشد`, 'مسیر عوض شده یا فایل پاک شده است.')
      return false
    }
    const error = await shell.openPath(item.target)
    if (error) ctx.raiseNudge('system', `«${item.name}» باز نشد`, error)
    return !error
  })

  ipcMain.handle('launch:icon', async (_event, id: unknown) => {
    if (typeof id !== 'string') return ''
    const item = launchList().find((entry) => entry.id === id)
    if (!item || item.kind === 'url') return ''
    const cached = iconCache.get(item.target)
    if (cached) return cached
    try {
      const icon = await app.getFileIcon(item.target, { size: 'large' })
      const dataUrl = icon.isEmpty() ? '' : icon.toDataURL()
      if (dataUrl) iconCache.set(item.target, dataUrl)
      return dataUrl
    } catch {
      return ''
    }
  })

  ipcMain.handle('focus:patch', (_event, patch: Record<string, unknown>) =>
    store.patchFocus(pickFocusPatch(patch))
  )

  // A cup is either timed or open-ended; anything else on the wire is ignored.
  ipcMain.handle('coffee:brew', (_event, minutes: unknown) => {
    if (minutes === null) return ctx.coffee.brew(null)
    if (typeof minutes === 'number' && Number.isFinite(minutes)) return ctx.coffee.brew(minutes)
    return store.coffee
  })
  ipcMain.handle('coffee:release', () => ctx.coffee.release())

  // History lives in RAM; the renderer only ever receives the summaries it can draw.
  ipcMain.handle('clip:view', () => ctx.clip.view)
  ipcMain.handle('clip:use', (_event, id: unknown) =>
    typeof id === 'string' ? ctx.clip.use(id) : false
  )
  ipcMain.handle('clip:remove', (_event, id: unknown) =>
    typeof id === 'string' ? ctx.clip.remove(id) : ctx.clip.view
  )
  ipcMain.handle('clip:clear', () => ctx.clip.clear())
  ipcMain.handle('clip:pause', (_event, paused: unknown) => ctx.clip.setPaused(paused === true))

  // Read on demand: the monitor tab polls this, and nothing samples in the background.
  ipcMain.handle('sys:sample', () => ctx.monitor.sample())

  ipcMain.handle('screen:picker-open', () => openEyedropper())
  ipcMain.handle('screen:picker-frame', () => pickerFrame())
  ipcMain.handle('screen:picker-ready', () => {
    showPicker()
    return true
  })
  ipcMain.handle('screen:picker-cancel', () => {
    // Close on the next tick so the renderer still gets its reply.
    setImmediate(dismissPicker)
    return true
  })
  ipcMain.handle('screen:pick', (_event, hex: unknown, x: unknown, y: unknown) => {
    if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return false
    const color = hex.toLowerCase()
    clipboard.writeText(color)
    ctx.recordPick({
      hex: color,
      x: Math.max(0, Math.round(Number(x) || 0)),
      y: Math.max(0, Math.round(Number(y) || 0)),
      at: Date.now()
    })
    setImmediate(dismissPicker)
    return true
  })
  ipcMain.handle('screen:draw-open', () => {
    openDrawWindow()
    return true
  })
  ipcMain.handle('screen:draw-close', () => {
    closeDrawWindow()
    return true
  })
  ipcMain.handle('screen:copy', (_event, text: unknown) => {
    if (typeof text !== 'string' || text.length === 0 || text.length > 64) return false
    clipboard.writeText(text)
    return true
  })

  ipcMain.handle('updater:check', () => checkForUpdate())
  ipcMain.handle('updater:download', () => downloadUpdate())
  ipcMain.handle('updater:install', () => installUpdate())

  ipcMain.handle('football:catalog', (_event, force?: unknown) => ctx.football.catalog(force === true))
  ipcMain.handle('football:team', (_event, id: unknown) => ctx.football.toggleTeam(id))
  ipcMain.handle('football:refresh', () => ctx.football.refresh())
  ipcMain.handle('football:tables', (_event, force?: unknown) => ctx.football.tables(force === true))

  ipcMain.handle('media:command', (_event, command: MediaCommand, value?: number) => {
    bridge.mediaCommand(command, typeof value === 'number' ? value : undefined)
    return true
  })

  ipcMain.handle('system:volume', (_event, level: number) => bridge.setVolume(Number(level) / 100))
  ipcMain.handle('system:volume-nudge', (_event, step: number) => bridge.nudgeVolume(Number(step)))
  ipcMain.handle('system:mute', (_event, muted: boolean) => bridge.setMuted(Boolean(muted)))
  ipcMain.handle('system:brightness', (_event, level: number) => bridge.setBrightness(Number(level)))

  ipcMain.handle('system:copy-text', (_event, text: string) => {
    if (typeof text !== 'string' || text.length === 0 || text.length > 100_000) return false
    clipboard.writeText(text)
    return true
  })
  ipcMain.handle('system:login-item', () => app.isPackaged && app.getLoginItemSettings().openAtLogin)

  // A picture the renderer drew, handed to the OS clipboard by the only process allowed to.
  ipcMain.handle('system:copy-image', async (_event, png: unknown) => {
    if (typeof png !== 'string' || png.length === 0 || png.length > 4_000_000) return false
    const bytes = Buffer.from(png, 'base64')
    if (bytes.length === 0) return false
    await clipboard.write([new ClipboardItem({ 'image/png': new Blob([new Uint8Array(bytes)], { type: 'image/png' }) })])
    return true
  })

  /** Save dialog, then a single file. The renderer never names a path. */
  ipcMain.handle('file:save', async (_event, raw: unknown) => {
    const payload = pickSavePayload(raw)
    if (!payload) return null
    const parent = BrowserWindow.fromWebContents(_event.sender) ?? null
    const options = {
      defaultPath: join(app.getPath('downloads'), payload.name),
      filters: [
        payload.kind === 'png'
          ? { name: 'PNG', extensions: ['png'] }
          : { name: 'SVG', extensions: ['svg'] }
      ]
    }
    const { canceled, filePath } = parent
      ? await dialog.showSaveDialog(parent, options)
      : await dialog.showSaveDialog(options)
    if (canceled || !filePath) return null
    try {
      const body =
        payload.kind === 'png' ? Buffer.from(payload.body, 'base64') : Buffer.from(payload.body, 'utf8')
      await writeFile(filePath, body)
      return basename(filePath)
    } catch (error) {
      ctx.raiseNudge('shelf', 'ذخیره نشد', error instanceof Error ? error.message : undefined)
      return null
    }
  })

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
  ipcMain.handle('window:settings', (_event, tab?: string) => {
    openSettingsWindow(typeof tab === 'string' ? tab : undefined)
    return true
  })
  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
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
  ipcMain.on('nudge:action', (_event, id: unknown, action: unknown) => {
    if (typeof id === 'string' && typeof action === 'string') ctx.onNudgeAction(id, action)
  })
}
