import { useState } from 'react'
import type { AppState, LaunchItem } from '@shared/types'
import { toPersianDigits } from '../lib/jalali'
import { LaunchArt } from './LaunchArt'
import { ICON, PlusIcon, SettingsIcon } from './Icons'

function Tile({ item }: { item: LaunchItem }) {
  const [missing, setMissing] = useState(false)

  return (
    <button
      type="button"
      className={`launch-tile${missing ? ' missing' : ''}`}
      title={missing ? `${item.name} — باز نشد` : item.target}
      aria-label={`باز کردن ${item.name}`}
      onClick={() => {
        setMissing(false)
        void window.qio.launch.open(item.id).then((ok) => setMissing(!ok))
      }}
    >
      <LaunchArt item={item} className="launch-tile-art" />
      <span className="launch-tile-name" dir="auto">
        {item.name}
      </span>
    </button>
  )
}

/** The fifth tool: everything pinned in settings, one press away from the notch. */
export function LaunchTool({ state }: { state: AppState | null }) {
  const items = state?.settings.launch.items ?? []

  if (items.length === 0) {
    return (
      <div className="launch-empty">
        <p>هنوز چیزی پین نشده — برنامه، پوشه، فایل یا یک سایت را اضافه کن تا همین‌جا یک‌ضربه باز شود.</p>
        <button
          type="button"
          className="pill primary"
          onClick={() => void window.qio.window.openSettings('launch')}
        >
          <PlusIcon size={ICON.xs} /> افزودن میان‌بر
        </button>
      </div>
    )
  }

  return (
    <div className="launch-tool">
      <div className="launch-grid" data-scroll aria-label="میان‌برهای اجرای سریع">
        {items.map((item) => (
          <Tile key={item.id} item={item} />
        ))}
      </div>
      <div className="launch-foot">
        <span className="launch-hint">{toPersianDigits(items.length)} میان‌بر · همه محلی‌اند</span>
        <button
          type="button"
          className="launch-manage"
          title="مدیریت میان‌برها"
          aria-label="مدیریت میان‌برها"
          onClick={() => void window.qio.window.openSettings('launch')}
        >
          <SettingsIcon size={ICON.xs} />
        </button>
      </div>
    </div>
  )
}
