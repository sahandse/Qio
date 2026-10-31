import type {
  AiEvent,
  AiPublicSettings,
  AiSendResult,
  AiSettings,
  AiTestResult,
  AppState,
  ClipView,
  CoffeeState,
  FocusState,
  FootballCatalog,
  FootballSettings,
  FootballView,
  LyricResult,
  MediaCommand,
  Note,
  Nudge,
  OverlayPayload,
  PanelId,
  PickerFrame,
  Settings,
  SystemSample,
  Todo
} from './types'

export type Unsubscribe = () => void

export interface AppMeta {
  version: string
  electron: string
  node: string
  chrome: string
  platform: string
  packaged: boolean
  dataPath: string
}

export interface QioApi {
  getState(): Promise<AppState>
  meta(): Promise<AppMeta>

  onState(callback: (state: AppState) => void): Unsubscribe
  onCover(callback: (cover: { key: string; dataUrl: string }) => void): Unsubscribe
  getCover(): Promise<{ key: string; dataUrl: string }>
  onNudge(callback: (nudge: Nudge) => void): Unsubscribe
  onNudgeClear(callback: (id: string) => void): Unsubscribe
  nudgeAction(id: string, action: string): void
  onOpen(callback: (panel: PanelId) => void): Unsubscribe
  onPulse(callback: (at: number) => void): Unsubscribe
  onOverlay(callback: (payload: OverlayPayload) => void): Unsubscribe
  onOverlayReset(callback: () => void): Unsubscribe
  onSettingsTab(callback: (tab: string) => void): Unsubscribe
  hideOverlay(): void

  patchSettings(patch: Partial<Settings>): Promise<Settings>

  todos: {
    add(text: string, dueAt: number | null): Promise<Todo>
    update(id: string, patch: Partial<Todo>): Promise<void>
    remove(id: string): Promise<void>
    clearDone(): Promise<void>
  }

  water: {
    add(ml: number): Promise<void>
    remove(id: string): Promise<void>
  }

  notes: {
    add(text: string, tint?: Note['tint']): Promise<Note | null>
    update(id: string, patch: Partial<Pick<Note, 'text' | 'pinned' | 'tint'>>): Promise<void>
    remove(id: string): Promise<void>
  }

  shelf: {
    add(paths: string[]): Promise<number>
    addText(): Promise<boolean>
    copy(id: string): Promise<boolean>
    remove(id: string): Promise<void>
    clear(): Promise<void>
    open(id: string): Promise<boolean>
    reveal(id: string): Promise<boolean>
    icon(id: string): Promise<string>
    drag(ids: string[]): void
  }

  focus: {
    patch(patch: Partial<FocusState>): Promise<FocusState>
  }

  coffee: {
    /** null holds the screen awake until the cup is put down by hand. */
    brew(minutes: number | null): Promise<CoffeeState>
    release(): Promise<CoffeeState>
  }

  /** Clipboard history: RAM only, off until enabled, and never written to disk. */
  clip: {
    view(): Promise<ClipView>
    /** Put an old copy back on the clipboard. */
    use(id: string): Promise<boolean>
    remove(id: string): Promise<ClipView>
    clear(): Promise<ClipView>
    setPaused(paused: boolean): Promise<ClipView>
    onChanged(callback: (view: ClipView) => void): Unsubscribe
  }

  /** One reading of the machine. Only the monitor tab calls this, only while it is open. */
  sys: {
    sample(): Promise<SystemSample>
  }

  football: {
    /** Teams playing in the surrounding days, for the settings picker. */
    catalog(force?: boolean): Promise<FootballCatalog>
    toggleTeam(id: string): Promise<FootballSettings>
    /** Ask for a fresh slate right now (the retry button in the panel). */
    refresh(): Promise<FootballView>
  }

  ai: {
    patch(patch: Partial<Omit<AiSettings, 'apiKey'>>): Promise<AiPublicSettings>
    setKey(key: string): Promise<AiPublicSettings>
    clear(): Promise<boolean>
    test(): Promise<AiTestResult>
    send(text: string): Promise<AiSendResult>
    stop(requestId: string): void
    onEvent(callback: (event: AiEvent) => void): Unsubscribe
  }

  media: {
    command(command: MediaCommand, value?: number): Promise<boolean>
  }

  /** The eyedropper and the on-screen pen live in their own full-screen windows. */
  screen: {
    openPicker(): Promise<boolean>
    /** The frozen frame the picker window paints; null when the capture failed. */
    frame(): Promise<PickerFrame | null>
    /** Tells main the frame is painted, so the window can become visible. */
    ready(): Promise<boolean>
    pick(hex: string, x: number, y: number): Promise<boolean>
    cancelPicker(): Promise<boolean>
    openDraw(): Promise<boolean>
    closeDraw(): Promise<boolean>
    copy(text: string): Promise<boolean>
  }

  system: {
    setVolume(level: number): Promise<void>
    nudgeVolume(step: number): Promise<void>
    setMute(muted: boolean): Promise<void>
    setBrightness(level: number): Promise<void>
    copyText(text: string): Promise<boolean>
    /** A PNG without its data: prefix, put straight onto the clipboard. */
    copyPng(png: string): Promise<boolean>
    /** Ask the user where a generated picture belongs; the file name comes back. */
    save(input: { kind: 'png' | 'svg'; body: string; name: string }): Promise<string | null>
    loginItem(): Promise<boolean>
  }

  window: {
    size(width: number, height: number): Promise<boolean>
    setVisible(visible: boolean): Promise<boolean>
    openSettings(tab?: string): Promise<boolean>
    close(): Promise<void>
    quit(): Promise<void>
    openExternal(url: string): Promise<void>
  }

  lyrics: {
    get(track: { title: string; artist: string; album?: string; duration?: number }): Promise<LyricResult>
  }

  notify(kind: Nudge['kind'], title: string, detail?: string): Promise<boolean>
  pathForFile(file: File): string
}
