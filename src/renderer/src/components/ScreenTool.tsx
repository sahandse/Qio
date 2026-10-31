import { useState } from 'react'
import type { AppState } from '@shared/types'
import { DropperIcon, PenIcon } from './Icons'

/** The eyedropper and the screen pen, plus the colours lifted this session. */
export function ScreenTool({ state }: { state: AppState | null }) {
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState('')
  const picked = state?.picked ?? []

  const open = async (kind: 'picker' | 'draw'): Promise<void> => {
    setError(false)
    const ok = kind === 'picker' ? await window.qio.screen.openPicker() : await window.qio.screen.openDraw()
    if (!ok) setError(true)
  }

  const copy = async (hex: string): Promise<void> => {
    const ok = await window.qio.screen.copy(hex)
    if (!ok) return
    setCopied(hex)
    window.setTimeout(() => setCopied((current) => (current === hex ? '' : current)), 1200)
  }

  return (
    <div className="screen-tool">
      <div className="screen-actions">
        <button type="button" className="screen-action" onClick={() => void open('picker')}>
          <span className="screen-action-icon picker">
            <DropperIcon size={18} />
          </span>
          <span className="screen-action-text">
            <strong>رنگ از صفحه</strong>
            <small>روی هر پیکسل کلیک کن؛ کدش کپی می‌شود</small>
          </span>
          <kbd>Ctrl+Alt+C</kbd>
        </button>
        <button type="button" className="screen-action" onClick={() => void open('draw')}>
          <span className="screen-action-icon draw">
            <PenIcon size={18} />
          </span>
          <span className="screen-action-text">
            <strong>قلم روی صفحه</strong>
            <small>دور هر چیزی خط بکش، بعد Esc</small>
          </span>
          <kbd>Ctrl+Alt+D</kbd>
        </button>
      </div>

      <div className="screen-picked">
        <span className="screen-picked-label">رنگ‌های این نشست</span>
        {picked.length > 0 ? (
          <>
            <div className="screen-swatches" role="list" aria-label="رنگ‌های برداشته‌شده">
              {picked.map((entry) => (
                <button
                  key={entry.hex}
                  type="button"
                  role="listitem"
                  className="screen-swatch"
                  style={{ background: entry.hex }}
                  title={`${entry.hex} — کپی`}
                  aria-label={`${entry.hex}، کپی`}
                  onClick={() => void copy(entry.hex)}
                />
              ))}
            </div>
            <span className="screen-last" dir="ltr">
              {picked[0].hex}
            </span>
          </>
        ) : (
          <span className="screen-empty">هنوز رنگی برداشت نشده.</span>
        )}
        <span className={`screen-copied${copied ? ' on' : ''}`} aria-live="polite">
          {copied ? `${copied} کپی شد` : ''}
        </span>
      </div>

      {error && <p className="screen-error">گرفتن تصویر صفحه ممکن نشد؛ یک‌بار دیگر امتحان کن.</p>}
    </div>
  )
}
