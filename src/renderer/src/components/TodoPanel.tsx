import { useMemo, useState } from 'react'
import type { AppState } from '@shared/types'
import { formatDueTime } from '../lib/format'
import { toPersianDigits } from '../lib/jalali'
import { CloseIcon, TodoIcon } from './Icons'

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

export function TodoPanel({ state }: { state: AppState | null }) {
  const todos = state?.todos ?? []
  const [text, setText] = useState('')
  const [due, setDue] = useState<DueKind>('none')
  const [showDone, setShowDone] = useState(false)

  const open = useMemo(
    () => todos.filter((todo) => !todo.done).sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity)),
    [todos]
  )
  const done = useMemo(() => todos.filter((todo) => todo.done), [todos])

  const submit = () => {
    const value = text.trim()
    if (!value) return
    void window.qio.todos.add(value, dueToTimestamp(due))
    setText('')
    setDue('none')
  }

  return (
    <div className="todo">
      <form
        className="todo-add"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <input
          className="input"
          placeholder="یک کار اضافه کن…"
          value={text}
          maxLength={200}
          onChange={(event) => setText(event.target.value)}
        />
        <select className="select" value={due} onChange={(event) => setDue(event.target.value as DueKind)}>
          <option value="none">بدون یادآور</option>
          <option value="30m">۳۰ دقیقهٔ دیگر</option>
          <option value="1h">۱ ساعت دیگر</option>
          <option value="3h">۳ ساعت دیگر</option>
          <option value="tonight">امشب ۲۰:۰۰</option>
          <option value="tomorrow">فردا ۰۹:۰۰</option>
        </select>
        <button type="submit" className="button primary" disabled={!text.trim()}>
          افزودن
        </button>
      </form>

      <div className="todo-list">
        {open.length === 0 && (
          <div className="todo-empty">
            <TodoIcon size={24} />
            <span className="panel-hint">
              کاری برای امروز نمانده است. یک کار با زمان اضافه کن تا Qio موقعش خبرت کند.
            </span>
          </div>
        )}

        {open.map((todo) => {
          const overdue = Boolean(todo.dueAt && todo.dueAt < Date.now())
          return (
            <label className={`todo-row${overdue ? ' overdue' : ''}`} key={todo.id}>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => void window.qio.todos.update(todo.id, { done: true })}
              />
              <span className="todo-text" dir="auto">
                {todo.text}
              </span>
              {todo.dueAt && <span className="todo-due">{formatDueTime(todo.dueAt)}</span>}
              <button
                type="button"
                className="icon-button tiny"
                title="حذف"
                onClick={(event) => {
                  event.preventDefault()
                  void window.qio.todos.remove(todo.id)
                }}
              >
                <CloseIcon size={13} />
              </button>
            </label>
          )
        })}
      </div>

      {done.length > 0 && (
        <div className="todo-done">
          <button type="button" className="button ghost" onClick={() => setShowDone((value) => !value)}>
            {showDone ? 'پنهان کردن' : 'نمایش'} {toPersianDigits(done.length)} کار انجام‌شده
          </button>
          <button type="button" className="button ghost" onClick={() => void window.qio.todos.clearDone()}>
            پاک کردن انجام‌شده‌ها
          </button>
          {showDone && (
            <div className="todo-done-list">
              {done.map((todo) => (
                <label className="todo-row done" key={todo.id}>
                  <input
                    type="checkbox"
                    checked
                    onChange={() => void window.qio.todos.update(todo.id, { done: false })}
                  />
                  <span className="todo-text" dir="auto">
                    {todo.text}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
