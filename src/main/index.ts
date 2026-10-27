import { BrowserWindow, Notification, app, screen } from 'electron'
import { randomUUID } from 'node:crypto'
import type { AppState, MediaState, Nudge, OverlayPayload, SystemState } from '@shared/types'
import { toPersianDigits } from '@shared/persian'
import { WindowsBridge } from './bridge'
import { registerIpc } from './ipc'
import { Store, dateKey } from './store'
import { refreshTray, setTrayNotchVisible, setupTray } from './tray'
import {
  createNotchWindow,
  createOverlayWindow,
  getNotchWindow,
  hideOverlay,
  repositionWindows,
  sendToNotch,
  sizeNotch,
  showOverlay
} from './windows'

const APP_ID = 'com.sahandse.qio'
const NUDGE_MS = 6500

let store: Store
let bridge: WindowsBridge
let media: MediaState | null = null
let system: SystemState = {
  volume: null,
  muted: false,
  brightness: null,
  capsLock: false,
  layout: '',
  battery: null,
  charging: null,
  startWithWindows: false
}
let lastCoverKey = ''
let lastCoverSent = ''
let overlayArmed = false
let lastWaterReminderAt = 0
let lowBatteryWarned = false
let lastCharging: boolean | null = null
const nudges = new Map<string, NodeJS.Timeout>()

function getState(): AppState {
  return {
    settings: store.settings,
    todos: store.todos,
    shelf: store.shelf,
    water: store.waterState(),
    focus: store.focus,
    media,
    system: { ...system, startWithWindows: app.isPackaged && app.getLoginItemSettings().openAtLogin },
    version: app.getVersion()
  }
}

function pushState(): void {
  const state = getState()
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('state', state)
  }
}

function notify(title: string, body: string): void {
  try {
    if (!Notification.isSupported()) return
    new Notification({ title, body, silent: false }).show()
  } catch (error) {
    console.error('[qio] notification failed', error)
  }
}

/** A short in-notch alert: Qio taps you on the shoulder without opening a panel. */
function raiseNudge(kind: Nudge['kind'], title: string, detail?: string): void {
  const nudge: Nudge = { id: randomUUID(), kind, title, detail }
  sendToNotch('nudge', nudge)
  const timer = setTimeout(() => {
    nudges.delete(nudge.id)
    sendToNotch('nudge:clear', nudge.id)
  }, NUDGE_MS)
  nudges.set(nudge.id, timer)
}

function applyLoginItem(): void {
  if (!app.isPackaged) return
  try {
    app.setLoginItemSettings({
      openAtLogin: store.settings.startWithWindows,
      path: process.execPath,
      args: ['--hidden']
    })
  } catch (error) {
    console.error('[qio] could not update login item', error)
  }
}

function setNotchVisible(visible: boolean): void {
  const window = getNotchWindow()
  if (!window || window.isDestroyed()) return
  if (visible) {
    window.showInactive()
  } else {
    window.hide()
  }
  setTrayNotchVisible(visible)
}

function routeOverlay(payload: OverlayPayload): void {
  // The first reading of a value is the current state, not a change: no overlay for it.
  if (!overlayArmed) return
  if (payload.kind === 'layout' && !payload.label) return
  showOverlay(payload)
}

function wireBridge(): void {
  bridge.on('ready', () => {
    setTimeout(() => {
      overlayArmed = true
    }, 2500)
  })

  bridge.on('media', (next: MediaState, artwork: string) => {
    const coverKey = `${next.title}|${next.artist}|${next.album}`
    media = { ...next, coverKey }
    if (artwork && (coverKey !== lastCoverKey || artwork !== lastCoverSent)) {
      lastCoverKey = coverKey
      lastCoverSent = artwork
      for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed()) window.webContents.send('cover', { key: coverKey, dataUrl: artwork })
      }
    }
    pushState()
  })

  bridge.on('overlay', (payload: OverlayPayload) => {
    if (payload.kind === 'volume') {
      system = { ...system, volume: payload.value ?? system.volume, muted: Boolean(payload.muted) }
      pushState()
    } else if (payload.kind === 'brightness') {
      system = { ...system, brightness: payload.value ?? system.brightness }
      pushState()
    } else if (payload.kind === 'capslock') {
      system = { ...system, capsLock: Boolean(payload.capsLock) }
    } else if (payload.kind === 'layout') {
      system = { ...system, layout: payload.label ?? '' }
    }
    routeOverlay(payload)
  })

  bridge.on('power', (payload: { battery: number; charging: boolean }) => {
    system = { ...system, battery: payload.battery, charging: payload.charging }
    pushState()

    if (lastCharging !== null && payload.charging && !lastCharging) {
      notify('شارژر وصل شد', `باتری روی ${toPersianDigits(payload.battery)}٪ است`)
      raiseNudge('power', 'شارژر وصل شد', `باتری ${toPersianDigits(payload.battery)}٪`)
    }
    if (!payload.charging && payload.battery <= 20 && !lowBatteryWarned) {
      lowBatteryWarned = true
      notify('باتری کم', `${toPersianDigits(payload.battery)}٪ باقی مانده — هر وقت توانستی وصلش کن.`)
      raiseNudge('power', 'باتری کم', `${toPersianDigits(payload.battery)}٪ باقی مانده`)
    }
    if (payload.charging || payload.battery > 25) lowBatteryWarned = false
    lastCharging = payload.charging
  })
}

function checkTodos(now: number): void {
  for (const todo of store.todos) {
    if (todo.done || !todo.dueAt || todo.notified || todo.dueAt > now) continue
    store.updateTodo(todo.id, { notified: true })
    notify(todo.text, 'موعد این کار رسید.')
    raiseNudge('todo', todo.text, 'همین حالا')
  }
}

function checkWater(): void {
  const settings = store.settings.water
  if (!settings.reminders) return
  const now = new Date()
  const hour = now.getHours() + now.getMinutes() / 60
  if (hour < settings.startHour || hour >= settings.endHour) return

  const water = store.waterState(now)
  if (water.total >= water.goalMl) return

  const windowStart = new Date(now).setHours(settings.startHour, 0, 0, 0)
  const reference = Math.max(water.lastDrinkAt ?? 0, lastWaterReminderAt || windowStart)
  if (now.getTime() < reference + settings.remindEveryMin * 60_000) return

  lastWaterReminderAt = now.getTime()
  notify(
    'وقت آب خوردن',
    `${toPersianDigits(water.total)} از ${toPersianDigits(water.goalMl)} میلی‌لیتر امروز.`
  )
  raiseNudge(
    'water',
    'وقت آب خوردن',
    `${toPersianDigits(water.total)} از ${toPersianDigits(water.goalMl)} میلی‌لیتر`
  )
}

function startSchedulers(): void {
  store.onChange(() => pushState())
  let lastDay = dateKey()

  setInterval(() => {
    const today = dateKey()
    if (today !== lastDay) {
      lastDay = today
      store.rollDay()
      pushState()
    }
  }, 30_000)

  setInterval(() => {
    checkTodos(Date.now())
    checkWater()
  }, 30_000)
}

function setupTrayAndWindow(): void {
  setupTray({
    getSettings: () => store.settings,
    patchSettings: (patch) => {
      const before = store.settings.startWithWindows
      store.patchSettings(patch)
      if (store.settings.startWithWindows !== before) applyLoginItem()
      refreshTray()
    },
    onOpenPanel: (panel) => {
      pinsNotch()
      sendToNotch('notch:open', panel)
    },
    onToggleNotch: (visible) => setNotchVisible(visible),
    onQuit: () => app.quit()
  })
}

/** QIO_SELFCHECK=1 prints what the live notch window actually rendered. Handy when debugging. */
function runSelfCheck(): void {
  const window = getNotchWindow()
  if (!window) return
  setTimeout(() => {
    void window.webContents
      .executeJavaScript(
        `(async () => {
           const state = await window.qio.getState()
           const bar = document.querySelector('.bar')
           return {
             hasBar: Boolean(bar),
             barHeight: bar ? Math.round(bar.getBoundingClientRect().height) : 0,
             clock: document.querySelector('.bar-time-main')?.textContent ?? null,
             nowPlaying: document.querySelector('.bar-track')?.textContent ?? null,
             media: state.media ? state.media.status + ': ' + state.media.title : null,
             volume: state.system.volume,
             battery: state.system.battery,
             bridgeReady: Boolean(window.qio),
             errors: window.__qioErrors ?? []
           }
         })()`
      )
      .then((info) => console.log('[qio] self-check', JSON.stringify(info)))
      .catch((error) => console.error('[qio] self-check failed', error))
  }, 2500)
}

/** The tray asked for a panel, so the notch opens itself and stays open for a moment. */
function pinsNotch(): void {
  const window = getNotchWindow()
  if (!window || window.isDestroyed()) return
  if (!window.isVisible()) window.showInactive()
  sendToNotch('notch:pulse', Date.now())
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.setAppUserModelId(APP_ID)

  app.on('second-instance', () => {
    const window = getNotchWindow()
    if (window && !window.isDestroyed()) window.showInactive()
    sendToNotch('notch:pulse', Date.now())
  })

  app.whenReady().then(() => {
    store = new Store()
    bridge = new WindowsBridge()

    createNotchWindow()
    createOverlayWindow()

    registerIpc({
      store,
      bridge,
      getState,
      notify,
      raiseNudge,
      refreshTray,
      applyLoginItem,
      setNotchVisible,
      getLastCover: () => ({ key: lastCoverKey, dataUrl: lastCoverSent })
    })

    screen.on('display-metrics-changed', () => repositionWindows())
    screen.on('display-added', () => repositionWindows())
    screen.on('display-removed', () => repositionWindows())

    setupTrayAndWindow()
    wireBridge()
    startSchedulers()
    applyLoginItem()
    bridge.start()
    if (process.env['QIO_SELFCHECK']) runSelfCheck()

    app.on('activate', () => {
      const window = getNotchWindow()
      if (!window || window.isDestroyed()) createNotchWindow()
    })
  })

  app.on('window-all-closed', () => {
    // Qio lives in the tray; closing the notch is not quitting.
  })

  app.on('before-quit', () => {
    hideOverlay()
    bridge?.stop()
    store?.flush()
  })
}
