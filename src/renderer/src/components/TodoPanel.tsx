import { useMemo, useState } from 'react'
import type { AppState, Todo } from '@shared/types'
import { formatClock, formatDueTime, relativeDay } from '../lib/format'
import { toPersianDigits } from '../lib/jalali'
import { ICON, CheckIcon, CloseIcon, PencilIcon, PlusIcon, TodoIcon, TrashIcon } from './Icons'
import { PanelEmpty } from './PanelEmpty'

type DueKind = 'none' | '30m' | '1h' | '3h' | 'tonight' | 'tomorrow'

function dueToTimestamp(kind: DueKind): number | null {
  const now = new Date()
  switch (kind) {
    case '30m':
      return Date.now() + 30 * 60_000
    case '1h':
      return Date.now() + 60 * 60_000
    case '3h':
      return Date.now() + 180 * 60_000
    case 'tonight': {
      const target = new Date(now)
      target.setHours(20, 0, 0, 0)
      if (target.getTime() < Date.now()) target.setDate(target.getDate() + 1)
      return target.getTime()
    }
    case 'tomorrow': {
      const target = new Date(now)
      target.setDate(target.getDate() + 1)
      target.setHours(9, 0, 0, 0)
      return target.getTime()
    }
    default:
      return null
  }
}

function dueShort(todo: Todo, hour24: boolean): string {
  if (!todo.dueAt) return ''
  if (todo.dueAt < Date.now()) return 'گذشته'
  const date = new Date(todo.dueAt)
  const day = relativeDay(date)
  return day === 'امروز' ? formatClock(date, false, hour24) : day
}

export function TodoPanel({ state }: { state: AppState | null }) {
  const todos = state?.todos ?? []
  const hour24 = state?.system.hour24 ?? true
  const [text, setText] = useState('')
  const [due, setDue] = useState<DueKind>('30m')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)

  const done = useMemo(() => todos.filter((todo) => todo.done), [todos])
  const list = useMemo(() => {
    const open = todos
      .filter((todo) => !todo.done)
      .sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity))
    const finished = done.slice().sort((a, b) => (b.dueAt ?? b.createdAt) - (a.dueAt ?? a.createdAt))
    return [...open, ...finished]
  }, [todos, done])

  const submit = () => {
    const value = text.trim()
    if (!value) return
    void window.qio.todos.add(value, dueToTimestamp(due))
    setText('')
    setAdding(false)
  }

  return (
    <div className="todo-page">
      <div className="todo-side">
        <span
          className="todo-ring"
          style={{ ['--p' as string]: `${todos.length > 0 ? (done.length / todos.length) * 360 : 0}deg` }}
          aria-hidden="true"
        >
          <span className="todo-ring-core">
            <span className="todo-count">
              {toPersianDigits(done.length)}
              <span className="todo-slash">/</span>
              {toPersianDigits(todos.length)}
            </span>
          </span>
        </span>
        <span className="todo-label">انجام‌شده</span>
      </div>

      <div className="todo-content">
        <div className="todo-tools">
          <button
            type="button"
            className={`pill primary${adding ? ' on' : ''}`}
            onClick={() => {
              setAdding((value) => !value)
              setEditing(false)
            }}
            title="افزودن کار"
          >
            <PlusIcon size={ICON.xs} /> افزودن
          </button>
          <button
            type="button"
            className={`pill todo-edit${editing ? ' on' : ''}`}
            onClick={() => {
              setEditing((value) => !value)
              setAdding(false)
            }}
            title="ویرایش فهرست"
            aria-label="ویرایش فهرست"
          >
            <PencilIcon size={ICON.xs} />
          </button>
          <span className="todo-open">
            {todos.length === done.length && todos.length > 0
              ? 'همه انجام شد'
              : `${toPersianDigits(todos.length - done.length)} کار باز`}
          </span>
        </div>

        {adding ? (
          <form
            className="todo-form"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <div className="todo-form-top">
              <input
                className="mini-input"
                autoFocus
                placeholder="چه کاری؟"
                value={text}
                maxLength={200}
                onChange={(event) => setText(event.target.value)}
              />
              <button type="button" className="round round-quiet" onClick={() => setAdding(false)} title="بستن">
                <CloseIcon size={ICON.xs} />
              </button>
            </div>
            <div className="todo-form-row">
              <select className="mini-select" value={due} onChange={(event) => setDue(event.target.value as DueKind)}>
                <option value="none">بدون زمان</option>
                <option value="30m">۳۰ دقیقه</option>
                <option value="1h">۱ ساعت</option>
                <option value="3h">۳ ساعت</option>
                <option value="tonight">امشب</option>
                <option value="tomorrow">فردا</option>
              </select>
              <button type="submit" className="pill primary" disabled={!text.trim()}>
                ثبت
              </button>
            </div>
          </form>
        ) : (
          <div className="todo-list" data-scroll>
            {list.length === 0 && (
              <PanelEmpty
                icon={<TodoIcon size={ICON.md} />}
                title="فهرست خالی است"
                hint="یک کار با زمان اضافه کن تا Qio خبرت کند."
              />
            )}
            {list.map((todo) => (
              <div key={todo.id} className={`todo-row${todo.done ? ' done' : ''}`}>
                <button
                  type="button"
                  className={`todo-check${todo.done ? ' on' : ''}`}
                  onClick={() => void window.qio.todos.update(todo.id, { done: !todo.done })}
                  title={todo.done ? 'برگرداندن' : 'انجام شد'}
                  aria-label={todo.done ? 'برگرداندن' : 'انجام شد'}
                >
                  {todo.done && <CheckIcon size={10} />}
                </button>
                <span className="todo-text" dir="auto" title={todo.text}>
                  {todo.text}
                </span>
                {todo.dueAt && <span className={`todo-due${todo.dueAt < Date.now() && !todo.done ? ' late' : ''}`}>{dueShort(todo, hour24)}</span>}
                {editing && (
                  <button
                    type="button"
                    className="todo-delete"
                    onClick={() => void window.qio.todos.remove(todo.id)}
                    title={todo.dueAt ? formatDueTime(todo.dueAt) : 'حذف'}
                    aria-label="حذف"
                  >
                    <TrashIcon size={ICON.xs} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {editing && done.length > 0 && !adding && (
          <button type="button" className="todo-clear" onClick={() => void window.qio.todos.clearDone()}>
            پاک کردن {toPersianDigits(done.length)} کار انجام‌شده
          </button>
        )}
      </div>
    </div>
  )
}
