import { useEffect, useState } from 'react'
import type { AppState, ShelfItem } from '@shared/types'
import { formatBytes } from '../lib/format'
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
      title={`${item.path}\nClick to open · drag out into any app`}
    >
      <span className="shelf-icon">{icon ? <img src={icon} alt="" /> : <ShelfIcon size={20} />}</span>
      <span className="shelf-name">{item.name}</span>
      <span className="shelf-size">{formatBytes(item.size, item.isDir)}</span>
      <span className="shelf-tools">
        <button
          type="button"
          className="icon-button tiny"
          title="Show in Explorer"
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
          title="Remove from shelf"
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
          {items.length === 0 ? 'Empty' : `${items.length} item${items.length === 1 ? '' : 's'}`}
        </span>
        <div className="shelf-head-actions">
          <button
            type="button"
            className="button"
            onClick={() => void window.qio.notify('shelf', 'Drag files onto the notch', 'They stay where they are — Qio only remembers the path.')}
          >
            <PlusIcon size={14} /> How it works
          </button>
          {items.length > 0 && (
            <button type="button" className="button" onClick={() => void window.qio.shelf.clear()}>
              <TrashIcon size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="shelf-empty">
          <ShelfIcon size={26} />
          <strong>Drop files here</strong>
          <span className="panel-hint">
            Drag anything from Explorer onto the notch. Files are not copied or uploaded — Qio remembers where they live
            and hands them back when you drag them out.
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
