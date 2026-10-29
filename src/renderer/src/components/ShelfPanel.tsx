import { useEffect, useRef, useState } from 'react'
import type { AppState, ShelfItem } from '@shared/types'
import { formatBytes } from '../lib/format'
import { toPersianDigits } from '../lib/jalali'
import { ICON, CopyIcon, FolderOpenIcon, ShelfIcon, TextCardIcon, TrashIcon } from './Icons'
import { PanelEmpty } from './PanelEmpty'

function useFileIcon(item: ShelfItem): string {
  const [icon, setIcon] = useState('')
  useEffect(() => {
    if (item.kind === 'text') {
      setIcon('')
      return
    }
    let alive = true
    void window.qio.shelf.icon(item.id).then((dataUrl) => {
      if (alive) setIcon(dataUrl)
    })
    return () => {
      alive = false
    }
  }, [item.id, item.kind])
  return icon
}

function Tile({
  item,
  selected,
  selectedIds,
  onSelect,
  onOpen
}: {
  item: ShelfItem
  selected: boolean
  selectedIds: string[]
  onSelect: (event: React.MouseEvent) => void
  onOpen: () => void
}) {
  const icon = useFileIcon(item)
  const text = item.kind === 'text'

  return (
    <div
      className={`shelf-tile${selected ? ' selected' : ''}${text ? ' text' : ''}`}
      draggable={!text}
      onDragStart={() => {
        if (!text) window.qio.shelf.drag(selected ? selectedIds : [item.id])
      }}
      onClick={onSelect}
      onDoubleClick={onOpen}
      title={text ? (item.text ?? '').slice(0, 400) : item.path}
    >
      <span className="shelf-tile-art">
        {text ? (
          <span className="shelf-text-preview" dir="auto">
            {(item.text ?? '').slice(0, 64)}
          </span>
        ) : icon ? (
          <img src={icon} alt="" />
        ) : (
          <ShelfIcon size={ICON.lg} />
        )}
      </span>
      <span className="shelf-tile-name" dir="auto">
        {item.name}
      </span>
      {!text && <span className="shelf-tile-size">{formatBytes(item.size, item.isDir)}</span>}
    </div>
  )
}

export function ShelfPanel({ state }: { state: AppState | null }) {
  const items = state?.shelf ?? []
  const [selected, setSelected] = useState<string[]>([])
  const anchor = useRef<string | null>(null)

  useEffect(() => {
    setSelected((current) => current.filter((id) => items.some((item) => item.id === id)))
  }, [items])

  const pick = (item: ShelfItem, event: React.MouseEvent) => {
    const additive = event.ctrlKey || event.metaKey
    const range = event.shiftKey && anchor.current
    if (range) {
      const from = items.findIndex((entry) => entry.id === anchor.current)
      const to = items.findIndex((entry) => entry.id === item.id)
      if (from >= 0 && to >= 0) {
        const [a, b] = from < to ? [from, to] : [to, from]
        setSelected(items.slice(a, b + 1).map((entry) => entry.id))
        return
      }
    }
    if (additive) {
      setSelected((current) =>
        current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]
      )
      anchor.current = item.id
      return
    }
    setSelected([item.id])
    anchor.current = item.id
  }

  const open = (item: ShelfItem) => {
    void window.qio.shelf.open(item.id)
  }

  const removeSelected = () => {
    for (const id of selected) void window.qio.shelf.remove(id)
    setSelected([])
  }

  return (
    <div className="shelf-page">
      {items.length === 0 ? (
        <PanelEmpty
          dashed
          icon={<ShelfIcon size={ICON.xl} />}
          title="اینجا رها کن"
          hint="فایل‌ها کپی نمی‌شوند؛ Qio فقط مسیرشان را به یاد می‌آورد."
        />
      ) : (
        <div className="shelf-strip" data-scroll>
          {items.map((item) => (
            <Tile
              key={item.id}
              item={item}
              selected={selected.includes(item.id)}
              selectedIds={selected}
              onSelect={(event) => pick(item, event)}
              onOpen={() => open(item)}
            />
          ))}
        </div>
      )}

      <div className="shelf-foot">
        <span className="shelf-hint">
          {selected.length > 0
            ? `${toPersianDigits(selected.length)} انتخاب`
            : items.length > 0
              ? `کلیک انتخاب · دوبار کلیک باز کردن`
              : 'متن کپی‌شده را هم می‌توانی اضافه کنی'}
        </span>
        <div className="shelf-tools">
          <button
            type="button"
            className="mini-button"
            title="افزودن متن کپی‌شده"
            onClick={() => void window.qio.shelf.addText()}
          >
            <TextCardIcon size={ICON.xs} /> متن
          </button>
          {selected.length === 1 && (
            <button
              type="button"
              className="mini-button"
              title="کپی"
              onClick={() => void window.qio.shelf.copy(selected[0])}
            >
              <CopyIcon size={ICON.xs} />
            </button>
          )}
          {selected.length === 1 && items.find((item) => item.id === selected[0])?.kind === 'file' && (
            <button
              type="button"
              className="mini-button"
              title="نمایش در Explorer"
              onClick={() => void window.qio.shelf.reveal(selected[0])}
            >
              <FolderOpenIcon size={ICON.xs} />
            </button>
          )}
          {selected.length > 0 && (
            <button type="button" className="mini-button danger" title="حذف از قفسه" onClick={removeSelected}>
              <TrashIcon size={ICON.xs} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
