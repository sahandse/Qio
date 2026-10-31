import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { AppMeta, QioApi, Unsubscribe } from '@shared/api'
import type { AiEvent, AppState, ClipView, CoffeeState, FocusState, LyricResult, MediaCommand, Note, Nudge, OverlayPayload, PanelId, PickerFrame, Settings, SystemSample, Todo, UpdateState } from '@shared/types'

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
  nudgeAction: (id, action) => ipcRenderer.send('nudge:action', id, action),
  onOpen: (callback) => subscribe<PanelId>('notch:open', callback),
  onPulse: (callback) => subscribe<number>('notch:pulse', callback),
  onOverlay: (callback) => subscribe<OverlayPayload>('overlay:show', callback),
  onOverlayReset: (callback) => subscribe<unknown>('overlay:reset', () => callback()),
  onSettingsTab: (callback) => subscribe<string>('settings:tab', callback),
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

  notes: {
    add: (text, tint) => ipcRenderer.invoke('notes:add', text, tint) as Promise<Note | null>,
    update: (id, patch) => ipcRenderer.invoke('notes:update', id, patch) as Promise<void>,
    remove: (id) => ipcRenderer.invoke('notes:remove', id) as Promise<void>
  },

  shelf: {
    add: (paths) => ipcRenderer.invoke('shelf:add', paths) as Promise<number>,
    addText: () => ipcRenderer.invoke('shelf:add-text') as Promise<boolean>,
    copy: (id) => ipcRenderer.invoke('shelf:copy', id) as Promise<boolean>,
    remove: (id) => ipcRenderer.invoke('shelf:remove', id) as Promise<void>,
    clear: () => ipcRenderer.invoke('shelf:clear') as Promise<void>,
    open: (id) => ipcRenderer.invoke('shelf:open', id) as Promise<boolean>,
    reveal: (id) => ipcRenderer.invoke('shelf:reveal', id) as Promise<boolean>,
    icon: (id) => ipcRenderer.invoke('shelf:icon', id) as Promise<string>,
    drag: (ids) => ipcRenderer.send('shelf:drag', ids)
  },

  focus: {
    patch: (patch) => ipcRenderer.invoke('focus:patch', patch) as Promise<FocusState>
  },

  coffee: {
    brew: (minutes) => ipcRenderer.invoke('coffee:brew', minutes) as Promise<CoffeeState>,
    release: () => ipcRenderer.invoke('coffee:release') as Promise<CoffeeState>
  },

  clip: {
    view: () => ipcRenderer.invoke('clip:view') as Promise<ClipView>,
    use: (id) => ipcRenderer.invoke('clip:use', id) as Promise<boolean>,
    remove: (id) => ipcRenderer.invoke('clip:remove', id) as Promise<ClipView>,
    clear: () => ipcRenderer.invoke('clip:clear') as Promise<ClipView>,
    setPaused: (paused) => ipcRenderer.invoke('clip:pause', Boolean(paused)) as Promise<ClipView>,
    onChanged: (callback) => subscribe<ClipView>('clip:changed', callback)
  },

  sys: {
    sample: () => ipcRenderer.invoke('sys:sample') as Promise<SystemSample>
  },

  alerts: {
    act: (id, action) => ipcRenderer.invoke('alerts:act', id, action) as Promise<boolean>,
    read: (id) => ipcRenderer.invoke('alerts:read', id) as Promise<boolean>,
    readAll: () => ipcRenderer.invoke('alerts:read-all') as Promise<boolean>,
    clear: () => ipcRenderer.invoke('alerts:clear') as Promise<boolean>
  },

  football: {
    catalog: (force) => ipcRenderer.invoke('football:catalog', force === true),
    toggleTeam: (id) => ipcRenderer.invoke('football:team', id),
    refresh: () => ipcRenderer.invoke('football:refresh'),
    tables: (force) => ipcRenderer.invoke('football:tables', force === true)
  },

  ai: {
    patch: (patch) => ipcRenderer.invoke('ai:patch', patch),
    setKey: (key) => ipcRenderer.invoke('ai:key', key),
    clear: () => ipcRenderer.invoke('ai:clear') as Promise<boolean>,
    test: () => ipcRenderer.invoke('ai:test'),
    send: (text) => ipcRenderer.invoke('ai:send', text),
    stop: (requestId) => ipcRenderer.send('ai:stop', requestId),
    onEvent: (callback) => subscribe<AiEvent>('ai:event', callback)
  },

  media: {
    command: (command: MediaCommand, value?: number) =>
      ipcRenderer.invoke('media:command', command, value) as Promise<boolean>
  },

  screen: {
    openPicker: () => ipcRenderer.invoke('screen:picker-open') as Promise<boolean>,
    frame: () => ipcRenderer.invoke('screen:picker-frame') as Promise<PickerFrame | null>,
    ready: () => ipcRenderer.invoke('screen:picker-ready') as Promise<boolean>,
    pick: (hex, x, y) => ipcRenderer.invoke('screen:pick', hex, x, y) as Promise<boolean>,
    cancelPicker: () => ipcRenderer.invoke('screen:picker-cancel') as Promise<boolean>,
    openDraw: () => ipcRenderer.invoke('screen:draw-open') as Promise<boolean>,
    closeDraw: () => ipcRenderer.invoke('screen:draw-close') as Promise<boolean>,
    copy: (text) => ipcRenderer.invoke('screen:copy', text) as Promise<boolean>
  },

  updater: {
    check: () => ipcRenderer.invoke('updater:check') as Promise<UpdateState>,
    download: () => ipcRenderer.invoke('updater:download') as Promise<boolean>,
    install: () => ipcRenderer.invoke('updater:install') as Promise<boolean>
  },

  system: {
    setVolume: (level) => ipcRenderer.invoke('system:volume', level) as Promise<void>,
    nudgeVolume: (step) => ipcRenderer.invoke('system:volume-nudge', step) as Promise<void>,
    setMute: (muted) => ipcRenderer.invoke('system:mute', muted) as Promise<void>,
    setBrightness: (level) => ipcRenderer.invoke('system:brightness', level) as Promise<void>,
    copyText: (text) => ipcRenderer.invoke('system:copy-text', text) as Promise<boolean>,
    copyPng: (png) => ipcRenderer.invoke('system:copy-image', png) as Promise<boolean>,
    save: (input) => ipcRenderer.invoke('file:save', input) as Promise<string | null>,
    loginItem: () => ipcRenderer.invoke('system:login-item') as Promise<boolean>
  },

  window: {
    size: (width, height) => ipcRenderer.invoke('window:size', { width, height }) as Promise<boolean>,
    setVisible: (visible) => ipcRenderer.invoke('window:visible', visible) as Promise<boolean>,
    openSettings: (tab) => ipcRenderer.invoke('window:settings', tab) as Promise<boolean>,
    close: () => ipcRenderer.invoke('window:close') as Promise<void>,
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
