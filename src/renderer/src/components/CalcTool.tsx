import { useMemo, useRef, useState } from 'react'
import { evaluate, type CalcOutput } from '@shared/calc'
import { toPersianDigits } from '../lib/jalali'

interface Turn {
  expr: string
  display: string
  value: number
}

/** The notch window lives as long as the app, so a module array is a session-only history. */
const history: Turn[] = []
let lastAnswer = 0

const MAX_TURNS = 12
const EXAMPLES = ['۲۰٪ روی ۱۵۰', '۲۰۰ + ۱۵٪', '۱۰ کیلومتر به مایل', 'sqrt(144) + 2^10']

function remember(turn: Turn): void {
  const same = history.findIndex((entry) => entry.expr === turn.expr)
  if (same >= 0) history.splice(same, 1)
  history.unshift(turn)
  if (history.length > MAX_TURNS) history.length = MAX_TURNS
  lastAnswer = turn.value
}

/** The extras worth showing under a result: the conversion it did, and the radix forms. */
function notes(out: CalcOutput): string[] {
  if (!out.ok) return []
  const list: string[] = []
  if (out.unit) list.push(`${out.unit.from} → ${out.unit.to}`)
  if (out.hex) list.push(out.hex)
  if (out.binary) list.push(out.binary)
  return list
}

export function CalcTool() {
  const [expr, setExpr] = useState('')
  const [angle, setAngle] = useState<'deg' | 'rad'>('deg')
  const [revision, setRevision] = useState(0)
  const field = useRef<HTMLInputElement>(null)

  const out = useMemo(() => evaluate(expr, { ans: lastAnswer, angle }), [expr, angle, revision])
  const typing = expr.trim() !== ''

  const commit = () => {
    if (!out.ok || !typing) return
    remember({ expr: expr.trim(), display: out.display, value: out.value })
    setExpr('')
    setRevision((value) => value + 1)
    field.current?.focus()
  }

  return (
    <div className="calc-page">
      <div className="calc-body">
        <div className="calc-entry">
          <input
            ref={field}
            className="calc-field"
            value={expr}
            dir="auto"
            spellCheck={false}
            autoComplete="off"
            maxLength={2000}
            placeholder={
              lastAnswer
                ? `ans = ${toPersianDigits(String(lastAnswer))}`
                : '۲۰٪ روی ۱۵۰ · ۱۰ کیلومتر به مایل'
            }
            aria-label="عبارت"
            onChange={(event) => setExpr(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commit()
              } else if (event.key === 'Escape') {
                setExpr('')
              }
            }}
          />
          <button
            type="button"
            className={`calc-flag${angle === 'rad' ? ' on' : ''}`}
            onClick={() => setAngle(angle === 'deg' ? 'rad' : 'deg')}
            title="واحد زاویه: درجه یا رادیان"
          >
            {angle === 'deg' ? 'DEG' : 'RAD'}
          </button>
          <button type="button" className="calc-flag" onClick={commit} disabled={!typing || !out.ok}>
            =
          </button>
        </div>

        <div className={`calc-read${out.ok || !typing ? '' : ' bad'}`} aria-live="polite">
          <strong className="calc-value">{typing ? (out.ok ? out.display : out.error) : '—'}</strong>
          {typing && out.ok && notes(out).length > 0 && (
            <div className="calc-meta">
              {notes(out).map((note) => (
                <span className="calc-note" key={note}>
                  {note}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {history.length > 0 ? (
        <div className="calc-history" data-scroll aria-label="تاریخچه">
          {history.map((turn) => (
            <button
              type="button"
              key={`${turn.expr}-${turn.value}`}
              className="calc-turn"
              title={turn.expr}
              onClick={() => {
                setExpr(turn.expr)
                field.current?.focus()
              }}
            >
              <span className="calc-turn-expr">{turn.expr}</span>
              <span className="calc-turn-value">{turn.display}</span>
            </button>
          ))}
          <button
            type="button"
            className="calc-clear"
            title="تاریخچه از حافظه می‌رود، نه از دیسک"
            onClick={() => {
              history.length = 0
              lastAnswer = 0
              setRevision((value) => value + 1)
            }}
          >
            پاک کردن
          </button>
        </div>
      ) : (
        <div className="calc-examples">
          {EXAMPLES.map((example) => (
            <button
              type="button"
              key={example}
              className="calc-example"
              onClick={() => {
                setExpr(example)
                field.current?.focus()
              }}
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
