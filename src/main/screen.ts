import { desktopCapturer, screen } from 'electron'
import type { PickerFrame } from '@shared/types'
import { closePickerWindow, openPickerWindow, showPickerWindow } from './windows'

/** The frozen display the open picker is sampling; one picker at a time. */
let lastFrame: PickerFrame | null = null

async function capturePrimary(): Promise<PickerFrame | null> {
  const display = screen.getPrimaryDisplay()
  const scale = display.scaleFactor || 1
  const width = Math.round(display.bounds.width * scale)
  const height = Math.round(display.bounds.height * scale)
  let sources: Electron.DesktopCapturerSource[]
  try {
    sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height },
      fetchWindowIcons: false
    })
  } catch (error) {
    console.error('[qio] screen capture failed', error)
    return null
  }
  const source = sources.find((entry) => entry.display_id === String(display.id)) ?? sources[0]
  if (!source || source.thumbnail.isEmpty()) return null
  const size = source.thumbnail.getSize()
  return { dataUrl: source.thumbnail.toDataURL(), width: size.width, height: size.height, scale }
}

/** Freeze the screen and open the eyedropper; false when Windows refuses the capture. */
export async function openEyedropper(): Promise<boolean> {
  const frame = await capturePrimary()
  if (!frame) return false
  lastFrame = frame
  openPickerWindow()
  return true
}

export function pickerFrame(): PickerFrame | null {
  return lastFrame
}

/** The renderer says its copy of the frame is painted, so the window can appear. */
export function showPicker(): void {
  if (!lastFrame) return
  showPickerWindow()
}

export function dismissPicker(): void {
  lastFrame = null
  closePickerWindow()
}
