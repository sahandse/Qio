import { useMemo, useState } from 'react'
import type { AppState } from '@shared/types'
import { formatDueTime } from '../lib/format'
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
          placeholder="Add a task…"
          value={text}
          maxLength={200}
          onChange={(event) => setText(event.target.value)}
        />
        <select className="select" value={due} onChange={(event) => setDue(event.target.value as DueKind)}>
          <option value="none">No reminder</option>
          <option value="30m">In 30 minutes</option>
          <option value="1h">In 1 hour</option>
          <option value="3h">In 3 hours</option>
          <option value="tonight">Tonight 20:00</option>
          <option value="tomorrow">Tomorrow 09:00</option>
        </select>
        <button type="submit" className="button primary" disabled={!text.trim()}>
          Add
        </button>
      </form>

      <div className="todo-list">
        {open.length === 0 && (
          <div className="todo-empty">
            <TodoIcon size={24} />
            <span className="panel-hint">Nothing left for today. Add a task with a time and Qio will tap you when it is due.</span>
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
              <span className="todo-text">{todo.text}</span>
              {todo.dueAt && <span className="todo-due">{formatDueTime(todo.dueAt)}</span>}
              <button
                type="button"
                className="icon-button tiny"
                title="Delete"
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
            {showDone ? 'Hide' : 'Show'} {done.length} completed
          </button>
          <button type="button" className="button ghost" onClick={() => void window.qio.todos.clearDone()}>
            Clear completed
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
                  <span className="todo-text">{todo.text}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
