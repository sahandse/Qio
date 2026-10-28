import { useMemo, useState } from 'react'
import type { AppState, Note, NoteTint } from '@shared/types'
import { relativeTime } from '../lib/format'
import { toPersianDigits } from '../lib/jalali'
import { NoteIcon, PinIcon, PlusIcon, TrashIcon } from './Icons'

const TINTS: { id: NoteTint; label: string }[] = [
  { id: 'mint', label: 'سبز' },
  { id: 'sky', label: 'آبی' },
  { id: 'amber', label: 'کهربایی' },
  { id: 'violet', label: 'بنفش' }
]

export function NotesPanel({ state }: { state: AppState | null }) {
  const notes = state?.notes ?? []
  const [text, setText] = useState('')
  const [tint, setTint] = useState<NoteTint>('mint')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const ordered = useMemo(
    () =>
      notes
        .slice()
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt),
    [notes]
  )

  const add = () => {
    const value = text.trim()
    if (!value) return
    void window.qio.notes.add(value, tint)
    setText('')
  }

  const startEdit = (note: Note) => {
    setEditingId(note.id)
    setDraft(note.text)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft('')
  }

  const saveEdit = () => {
    if (!editingId) return
    const value = draft.trim()
    if (value) void window.qio.notes.update(editingId, { text: value })
    else void window.qio.notes.remove(editingId)
    cancelEdit()
  }

  return (
    <div className="notes-page">
      <form
        className="note-composer"
        onSubmit={(event) => {
          event.preventDefault()
          add()
        }}
      >
        <span className="note-composer-mark" aria-hidden="true">
          <NoteIcon size={13} />
        </span>
        <input
          className="note-input"
          value={text}
          maxLength={4000}
          placeholder="یک یادداشت تازه…"
          aria-label="یادداشت تازه"
          onChange={(event) => setText(event.target.value)}
        />
        <div className="note-tints" role="group" aria-label="رنگ یادداشت">
          {TINTS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`note-tint tint-${entry.id}${tint === entry.id ? ' on' : ''}`}
              onClick={() => setTint(entry.id)}
              title={entry.label}
              aria-label={entry.label}
              aria-pressed={tint === entry.id}
            />
          ))}
        </div>
        <button type="submit" className="note-send" disabled={!text.trim()} title="ثبت یادداشت" aria-label="ثبت یادداشت">
          <PlusIcon size={12} />
        </button>
      </form>

      <div className="notes-list" data-scroll>
        {ordered.length === 0 && (
          <div className="notes-empty">
            <NoteIcon size={17} />
            <span>یادداشت‌های کوتاه اینجا می‌مانند — سنجاقشان کن تا بالای فهرست بمانند.</span>
          </div>
        )}

        {ordered.map((note) =>
          editingId === note.id ? (
            <form
              key={note.id}
              className={`note-edit tint-${note.tint}`}
              onSubmit={(event) => {
                event.preventDefault()
                saveEdit()
              }}
            >
              <textarea
                className="note-edit-input"
                autoFocus
                rows={2}
                dir="auto"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') cancelEdit()
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    saveEdit()
                  }
                }}
              />
              <div className="note-edit-actions">
                <button type="submit" className="mini-button">
                  ذخیره
                </button>
                <button type="button" className="mini-button" onClick={cancelEdit}>
                  لغو
                </button>
              </div>
            </form>
          ) : (
            <div key={note.id} className={`note-row tint-${note.tint}${note.pinned ? ' pinned' : ''}`}>
              <button type="button" className="note-main" onClick={() => startEdit(note)} title="ویرایش یادداشت">
                <span className="note-text" dir="auto">
                  {note.text}
                </span>
                <span className="note-meta">
                  {note.pinned && <PinIcon size={9} />}
                  {relativeTime(note.updatedAt)}
                </span>
              </button>
              <div className="note-actions">
                <button
                  type="button"
                  className={`note-icon-btn${note.pinned ? ' on' : ''}`}
                  onClick={() => void window.qio.notes.update(note.id, { pinned: !note.pinned })}
                  title={note.pinned ? 'برداشتن سنجاق' : 'سنجاق به بالا'}
                  aria-label={note.pinned ? 'برداشتن سنجاق' : 'سنجاق به بالا'}
                  aria-pressed={note.pinned}
                >
                  <PinIcon size={11} />
                </button>
                <button
                  type="button"
                  className="note-icon-btn danger"
                  onClick={() => void window.qio.notes.remove(note.id)}
                  title="حذف"
                  aria-label="حذف"
                >
                  <TrashIcon size={11} />
                </button>
              </div>
            </div>
          )
        )}
      </div>

      <div className="notes-foot">
        <span>{toPersianDigits(notes.length)} یادداشت</span>
        <span className="notes-hint">کلیک روی هر یادداشت، ویرایشش می‌کند</span>
      </div>
    </div>
  )
}
