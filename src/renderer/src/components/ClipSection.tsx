import { useEffect, useState } from 'react'
import type { ClipEntry, ClipView, Settings } from '@shared/types'
import { formatBytes, relativeTime } from '../lib/format'
import { toPersianDigits } from '../lib/jalali'
import { ICON, ClipboardIcon, PauseIcon, PlayIcon, TrashIcon } from './Icons'
import { PanelEmpty } from './PanelEmpty'

function Tile({ entry, onUse, onRemove }: { entry: ClipEntry; onUse: () => void; onRemove: () => void }) {
  const image = entry.kind === 'image'
  return (
    <div
      className={`clip-tile${image ? ' image' : ''}`}
      onClick={onUse}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onUse()
        }
      }}
      title={image ? `${toPersianDigits(entry.width)}×${toPersianDigits(entry.height)} — کلیک برای بازگرداندن` : 'کلیک برای بازگرداندن'}
    >
      {image ? (
        <span className="clip-art">
          {entry.thumb && <img src={entry.thumb} alt="" />}
        </span>
      ) : (
        <span className="clip-text" dir="auto">
          {entry.preview}
        </span>
      )}
      <span className="clip-meta">
        <span>{relativeTime(entry.at)}</span>
        {entry.hits > 1 && <b>{`×${toPersianDigits(entry.hits)}`}</b>}
        <button
          type="button"
          className="clip-drop"
          title="فراموش کن"
          aria-label="فراموش کردن این مورد"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
        >
          <TrashIcon size={9} />
        </button>
      </span>
    </div>
  )
}

export function ClipSection({ settings }: { settings: Settings }) {
  const [view, setView] = useState<ClipView | null>(null)
  const [flash, setFlash] = useState('')

  useEffect(() => {
    let alive = true
    void window.qio.clip.view().then((next) => {
      if (alive) setView(next)
    })
    const off = window.qio.clip.onChanged((next) => setView(next))
    return () => {
      alive = false
      off()
    }
  }, [])

  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(() => setFlash(''), 1400)
    return () => clearTimeout(timer)
  }, [flash])

  const clip = settings.clipboard

  if (!clip.enabled) {
    return (
      <div className="clip-page">
        <PanelEmpty
          dashed
          icon={<ClipboardIcon size={ICON.xl} />}
          title="خاطرهٔ کلیپ‌بورد خاموش است"
          hint="تا روشنش نکنی، Qio هیچ‌وقت کلیپ‌بورد را نمی‌خواند. بعد از روشن کردن، فقط همین نشست به یاد می‌ماند: روی دیسک نوشته نمی‌شود و با بستن برنامه فراموش می‌شود."
          action={
            <button
              type="button"
              className="clip-enable"
              onClick={() => void window.qio.patchSettings({ clipboard: { ...clip, enabled: true } })}
            >
              روشنش کن
            </button>
          }
        />
      </div>
    )
  }

  const entries = view?.entries ?? []

  return (
    <div className="clip-page">
      {entries.length === 0 ? (
        <PanelEmpty
          icon={<ClipboardIcon size={ICON.xl} />}
          title="هنوز چیزی نگه نداشتم"
          hint="هر متنی که از این به بعد کپی کنی، اینجا می‌نشیند. برای بازگرداندن یک مورد رویش کلیک کن."
        />
      ) : (
        <div className="clip-strip" data-scroll>
          {entries.map((entry) => (
            <Tile
              key={entry.id}
              entry={entry}
              onUse={() => {
                void window.qio.clip.use(entry.id)
                setFlash('به کلیپ‌بورد برگشت')
              }}
              onRemove={() => void window.qio.clip.remove(entry.id)}
            />
          ))}
        </div>
      )}

      <div className="clip-foot">
        <span className="clip-note">
          {flash
            ? flash
            : `${toPersianDigits(entries.length)} مورد · ${formatBytes(view?.bytes ?? 0)} در حافظه · با خاموش کردن پاک می‌شود`}
        </span>
        <div className="shelf-tools">
          <button
            type="button"
            className={`mini-button${view?.paused ? ' warn' : ''}`}
            title={view?.paused ? 'ادامهٔ خاطره' : 'موقتاً نگه‌داشتن'}
            onClick={() => void window.qio.clip.setPaused(!view?.paused)}
          >
            {view?.paused ? <PlayIcon size={ICON.xs} /> : <PauseIcon size={ICON.xs} />}
            {view?.paused ? 'ادامه' : 'توقف'}
          </button>
          <button
            type="button"
            className="mini-button danger"
            title="فراموش کردن همه"
            onClick={() => void window.qio.clip.clear()}
          >
            <TrashIcon size={ICON.xs} /> پاک کن
          </button>
          <button
            type="button"
            className="mini-button"
            title="خاموش کردن خاطرهٔ کلیپ‌بورد"
            onClick={() => void window.qio.patchSettings({ clipboard: { ...clip, enabled: false } })}
          >
            خاموش
          </button>
        </div>
      </div>
    </div>
  )
}
