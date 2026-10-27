import { useEffect, useState } from 'react'
import type { AppState, ShelfItem } from '@shared/types'
import { formatBytes } from '../lib/format'
import { toPersianDigits } from '../lib/jalali'
import { CloseIcon, FolderOpenIcon, PlusIcon, ShelfIcon, TrashIcon } from './Icons'

function fileIcon(id: string): string {
  const [icon, setIcon] = useState('')
  useEffect(() => {
    let alive = true
    void window.qio.shelf.icon(id).then((dataUrl) => {
      if (alive) setIcon(dataUrl)
    })
    return () => {
      alive = false
    }
  }, [id])
  return icon
}

function ShelfCard({ item }: { item: ShelfItem }) {
  const icon = fileIcon(item.id)

  return (
    <div
      className="shelf-card"
      draggable
      onDragStart={() => window.qio.shelf.drag(item.id)}
      onClick={() => void window.qio.shelf.open(item.id)}
      title={`${item.path}\nبرای باز کردن کلیک کن · به هر برنامه‌ای بکش`}
    >
      <span className="shelf-icon">{icon ? <img src={icon} alt="" /> : <ShelfIcon size={20} />}</span>
      <span className="shelf-name" dir="auto">
        {item.name}
      </span>
      <span className="shelf-size">{formatBytes(item.size, item.isDir)}</span>
      <span className="shelf-tools">
        <button
          type="button"
          className="icon-button tiny"
          title="نمایش در Explorer"
          onClick={(event) => {
            event.stopPropagation()
            void window.qio.shelf.reveal(item.id)
          }}
        >
          <FolderOpenIcon size={13} />
        </button>
        <button
          type="button"
          className="icon-button tiny"
          title="حذف از قفسه"
          onClick={(event) => {
            event.stopPropagation()
            void window.qio.shelf.remove(item.id)
          }}
        >
          <CloseIcon size={13} />
        </button>
      </span>
    </div>
  )
}

export function ShelfPanel({ state }: { state: AppState | null }) {
  const items = state?.shelf ?? []

  return (
    <div className="shelf">
      <div className="shelf-head">
        <span className="shelf-count">
          {items.length === 0 ? 'خالی' : `${toPersianDigits(items.length)} مورد`}
        </span>
        <div className="shelf-head-actions">
          <button
            type="button"
            className="button"
            onClick={() =>
              void window.qio.notify(
                'shelf',
                'فایل‌ها را روی نچ بکش',
                'سر جایشان می‌مانند — Qio فقط مسیر را به یاد می‌آورد.'
              )
            }
          >
            <PlusIcon size={14} /> چطور کار می‌کند
          </button>
          {items.length > 0 && (
            <button type="button" className="button" onClick={() => void window.qio.shelf.clear()}>
              <TrashIcon size={14} /> پاک کردن
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="shelf-empty">
          <ShelfIcon size={26} />
          <strong>فایل‌ها را اینجا رها کن</strong>
          <span className="panel-hint">
            هر چیزی را از Explorer روی نچ بکش. فایل‌ها کپی یا آپلود نمی‌شوند — Qio یادش می‌ماند کجا هستند و وقتی
            بیرونشان می‌کشی برمی‌گرداند.
          </span>
        </div>
      ) : (
        <div className="shelf-grid">
          {items.map((item) => (
            <ShelfCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
