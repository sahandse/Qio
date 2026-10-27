import { useState } from 'react'
import type { AppState } from '@shared/types'
import { formatLitres } from '../lib/format'
import { TrashIcon, WaterIcon } from './Icons'

export function WaterPanel({ state }: { state: AppState | null }) {
  const water = state?.water
  const settings = state?.settings.water
  const [custom, setCustom] = useState('')

  if (!water || !settings) return <p className="panel-hint">Loading…</p>

  const percent = water.goalMl > 0 ? water.total / water.goalMl : 0
  const reached = water.total >= water.goalMl
  const max = Math.max(water.goalMl, ...water.days.map((day) => day.total), 1)

  const add = (ml: number) => {
    if (!Number.isFinite(ml) || ml <= 0) return
    void window.qio.water.add(ml)
  }

  return (
    <div className="water">
      <div className="water-top">
        <div className="bottle" aria-hidden="true">
          <span className="bottle-cap" />
          <span className="bottle-fill" style={{ height: `${Math.min(100, percent * 100)}%` }} />
        </div>

        <div className="water-summary">
          <span className="water-total">
            {formatLitres(water.total)} <small>/ {formatLitres(water.goalMl)}</small>
          </span>
          <span className={`water-state${reached ? ' ok' : ''}`}>
            {reached ? 'Goal reached — nicely done' : `${Math.round(percent * 100)}% of today's goal`}
          </span>

          <div className="water-actions">
            <button type="button" className="button primary" onClick={() => add(settings.bottleMl)}>
              <WaterIcon size={15} /> Bottle ({settings.bottleMl} ml)
            </button>
            <button type="button" className="button" onClick={() => add(250)}>
              +250 ml
            </button>
            <button type="button" className="button" onClick={() => add(500)}>
              +500 ml
            </button>
            <form
              className="water-custom"
              onSubmit={(event) => {
                event.preventDefault()
                add(Number(custom))
                setCustom('')
              }}
            >
              <input
                className="input"
                type="number"
                min={10}
                max={3000}
                step={10}
                placeholder="ml"
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
              />
              <button type="submit" className="button">
                Add
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="water-chart" role="img" aria-label="Water over the last two weeks">
        {water.days.map((day) => (
          <span className="chart-col" key={day.date} title={`${day.date}: ${day.total} ml`}>
            <span className="chart-bar-wrap">
              <span className="chart-bar" style={{ height: `${Math.max(2, (day.total / max) * 100)}%` }} />
            </span>
            <span className="chart-label">{new Date(`${day.date}T12:00:00`).toLocaleDateString([], { weekday: 'narrow' })}</span>
          </span>
        ))}
      </div>

      <div className="water-log">
        {water.entries.length === 0 && <span className="panel-hint">Nothing logged yet today.</span>}
        {[...water.entries].reverse().map((entry) => (
          <span className="water-entry" key={entry.id}>
            <span className="water-entry-ml">{entry.ml} ml</span>
            <span className="water-entry-time">
              {new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              type="button"
              className="icon-button tiny"
              title="Remove"
              onClick={() => void window.qio.water.remove(entry.id)}
            >
              <TrashIcon size={13} />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
