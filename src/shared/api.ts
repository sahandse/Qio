import type {
  AppState,
  FocusState,
  LyricResult,
  MediaCommand,
  Note,
  Nudge,
  OverlayPayload,
  PanelId,
  Settings,
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
  onOpen(callback: (panel: PanelId) => void): Unsubscribe
  onPulse(callback: (at: number) => void): Unsubscribe
  onOverlay(callback: (payload: OverlayPayload) => void): Unsubscribe
  onOverlayReset(callback: () => void): Unsubscribe
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

  media: {
    command(command: MediaCommand, value?: number): Promise<boolean>
  }

  system: {
    setVolume(level: number): Promise<void>
    nudgeVolume(step: number): Promise<void>
    setMute(muted: boolean): Promise<void>
    setBrightness(level: number): Promise<void>
    loginItem(): Promise<boolean>
  }

  window: {
    size(width: number, height: number): Promise<boolean>
    setVisible(visible: boolean): Promise<boolean>
    openSettings(): Promise<boolean>
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
