import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { AppMeta, QioApi, Unsubscribe } from '@shared/api'
import type { AppState, FocusState, LyricResult, MediaCommand, Nudge, OverlayPayload, PanelId, Settings, Todo } from '@shared/types'

function subscribe<T>(channel: string, callback: (payload: T) => void): Unsubscribe {
  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api: QioApi = {
  getState: () => ipcRenderer.invoke('app:state') as Promise<AppState>,
  meta: () => ipcRenderer.invoke('app:meta') as Promise<AppMeta>,

  onState: (callback) => subscribe<AppState>('state', callback),
  onCover: (callback) => subscribe<{ key: string; dataUrl: string }>('cover', callback),
  getCover: () => ipcRenderer.invoke('cover:last') as Promise<{ key: string; dataUrl: string }>,
  onNudge: (callback) => subscribe<Nudge>('nudge', callback),
  onNudgeClear: (callback) => subscribe<string>('nudge:clear', callback),
  onOpen: (callback) => subscribe<PanelId>('notch:open', callback),
  onPulse: (callback) => subscribe<number>('notch:pulse', callback),
  onOverlay: (callback) => subscribe<OverlayPayload>('overlay:show', callback),
  onOverlayReset: (callback) => subscribe<unknown>('overlay:reset', () => callback()),
  hideOverlay: () => ipcRenderer.send('overlay:hide'),

  patchSettings: (patch: Partial<Settings>) => ipcRenderer.invoke('settings:patch', patch) as Promise<Settings>,

  todos: {
    add: (text, dueAt) => ipcRenderer.invoke('todos:add', text, dueAt) as Promise<Todo>,
    update: (id, patch) => ipcRenderer.invoke('todos:update', id, patch) as Promise<void>,
    remove: (id) => ipcRenderer.invoke('todos:remove', id) as Promise<void>,
    clearDone: () => ipcRenderer.invoke('todos:clear-done') as Promise<void>
  },

  water: {
    add: (ml) => ipcRenderer.invoke('water:add', ml) as Promise<void>,
    remove: (id) => ipcRenderer.invoke('water:remove', id) as Promise<void>
  },

  shelf: {
    add: (paths) => ipcRenderer.invoke('shelf:add', paths) as Promise<number>,
    remove: (id) => ipcRenderer.invoke('shelf:remove', id) as Promise<void>,
    clear: () => ipcRenderer.invoke('shelf:clear') as Promise<void>,
    open: (id) => ipcRenderer.invoke('shelf:open', id) as Promise<boolean>,
    reveal: (id) => ipcRenderer.invoke('shelf:reveal', id) as Promise<boolean>,
    icon: (id) => ipcRenderer.invoke('shelf:icon', id) as Promise<string>,
    drag: (id) => ipcRenderer.send('shelf:drag', id)
  },

  focus: {
    patch: (patch) => ipcRenderer.invoke('focus:patch', patch) as Promise<FocusState>
  },

  media: {
    command: (command: MediaCommand, value?: number) =>
      ipcRenderer.invoke('media:command', command, value) as Promise<boolean>
  },

  system: {
    setVolume: (level) => ipcRenderer.invoke('system:volume', level) as Promise<void>,
    nudgeVolume: (step) => ipcRenderer.invoke('system:volume-nudge', step) as Promise<void>,
    setMute: (muted) => ipcRenderer.invoke('system:mute', muted) as Promise<void>,
    setBrightness: (level) => ipcRenderer.invoke('system:brightness', level) as Promise<void>,
    loginItem: () => ipcRenderer.invoke('system:login-item') as Promise<boolean>
  },

  window: {
    size: (width, height) => ipcRenderer.invoke('window:size', { width, height }) as Promise<boolean>,
    setVisible: (visible) => ipcRenderer.invoke('window:visible', visible) as Promise<boolean>,
    quit: () => ipcRenderer.invoke('window:quit') as Promise<void>,
    openExternal: (url) => ipcRenderer.invoke('window:external', url) as Promise<void>
  },

  lyrics: {
    get: (track) => ipcRenderer.invoke('lyrics:get', track) as Promise<LyricResult>
  },

  notify: (kind, title, detail) => ipcRenderer.invoke('app:nudge', { kind, title, detail }) as Promise<boolean>,
  pathForFile: (file) => webUtils.getPathForFile(file)
}

contextBridge.exposeInMainWorld('qio', api)
