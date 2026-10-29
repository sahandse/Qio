import { BrowserWindow, Notification, app, dialog, screen } from 'electron'
import { randomUUID } from 'node:crypto'
import type { AppState, MediaState, Nudge, OverlayPayload, SystemState } from '@shared/types'
import { toPersianDigits } from '@shared/persian'
import { WindowsBridge } from './bridge'
import { registerIpc } from './ipc'
import { Store } from './store'
import { dateKey } from './store/defaults'
import { refreshTray, setTrayNotchVisible, setupTray } from './tray'
import { startUpdateCheck } from './updater'
import {
  createNotchWindow,
  createOverlayWindow,
  getNotchWindow,
  hideOverlay,
  openSettingsWindow,
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
  /** Qio always reads the clock in 24-hour form, whatever Windows is set to. */
  hour24: true,
  fullscreen: false,
  startWithWindows: false
}
let lastCoverKey = ''
let lastCoverSent = ''
let overlayArmed = false
let lastWaterReminderAt = 0
let lowBatteryWarned = false
let lastCharging: boolean | null = null
let lastHeadphones: boolean | null = null
let fullscreen = false
let manualHidden = false
const nudges = new Map<string, NodeJS.Timeout>()

function getState(): AppState {
  return {
    settings: store.settings,
    todos: store.todos,
    shelf: store.shelf,
    notes: store.notes,
    water: store.waterState(),
    focus: store.focus,
    ai: { settings: store.aiPublic(), messages: store.aiMessages },
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
  revealForAlert()
  sendToNotch('nudge', nudge)
  const timer = setTimeout(() => {
    nudges.delete(nudge.id)
    sendToNotch('nudge:clear', nudge.id)
  }, NUDGE_MS)
  nudges.set(nudge.id, timer)
}

/** An alert that nobody can see is not an alert, so the notch is brought back for it. */
function revealForAlert(): void {
  if (manualHidden || fullscreenHides()) return
  showNotch()
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

function showNotch(): boolean {
  const window = getNotchWindow()
  if (!window || window.isDestroyed()) return false
  window.showInactive()
  return true
}

function hideNotch(): void {
  const window = getNotchWindow()
  if (window && !window.isDestroyed() && window.isVisible()) window.hide()
}

function fullscreenHides(): boolean {
  return fullscreen && store.settings.hideFullscreen
}

/** The notch stays up while the clock comes and goes, so only these two rules move it. */
function syncNotch(): void {
  if (manualHidden || fullscreenHides()) {
    hideNotch()
    return
  }
  showNotch()
}

function setNotchVisible(visible: boolean): void {
  manualHidden = !visible
  syncNotch()
  setTrayNotchVisible(visible)
}

/** Games and videos get the whole screen; Qio steps aside and comes back afterwards. */
function applyFullscreen(active: boolean): void {
  if (active === fullscreen) return
  fullscreen = active
  syncNotch()
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

  bridge.on('fullscreen', (value: boolean) => {
    system = { ...system, fullscreen: value }
    pushState()
    applyFullscreen(value)
  })

  bridge.on('headphones', (payload: { connected: boolean; name: string }) => {
    if (payload.connected && lastHeadphones === false) {
      raiseNudge('headphones', 'هدفون وصل شد', payload.name.split('(')[0].trim())
    }
    lastHeadphones = payload.connected
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
  store.onChange(() => {
    pushState()
    applyFullscreen(fullscreen)
  })
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
      if (panel === 'settings') {
        openSettingsWindow()
        return
      }
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
  if (!window.isVisible() && !showNotch()) return
  sendToNotch('notch:pulse', Date.now())
}

if (!app.requestSingleInstanceLock()) {
  void app.whenReady().then(() => {
    dialog.showMessageBoxSync({
      type: 'info',
      title: 'Qio',
      message: 'Qio از قبل در حال اجراست.',
      detail:
        'نمونهٔ دیگری از Qio باز است و نچ آن بالای صفحه قرار دارد. برای اجرای این نسخه، اول از منوی آیکون Qio کنار ساعت «خروج از Qio» را بزنید.',
      buttons: ['باشه'],
      noLink: true
    })
    app.quit()
  })
} else {
  app.setAppUserModelId(APP_ID)

  app.on('second-instance', () => pinsNotch())

  app.whenReady().then(() => {
    store = new Store()
    bridge = new WindowsBridge()

    const notch = createNotchWindow(false)
    notch.once('ready-to-show', () => {
      if (!manualHidden) showNotch()
    })
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
      syncNotch,
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
    startUpdateCheck()
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
