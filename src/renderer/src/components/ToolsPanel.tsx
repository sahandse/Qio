import { useState } from 'react'
import type { ReactNode } from 'react'
import type { AppState, ToolId } from '@shared/types'
import { ICON, CalcIcon, CoffeeIcon, GaugeIcon, QrIcon } from './Icons'
import { CalcTool } from './CalcTool'
import { CoffeeTool } from './CoffeeTool'
import { QrTool } from './QrTool'
import { SystemTool } from './SystemTool'

interface ToolDef {
  id: ToolId
  label: string
  Icon: (props: { size?: number }) => ReactNode
  render(state: AppState | null): ReactNode
}

const TOOLS: ToolDef[] = [
  { id: 'coffee', label: 'قهوه', Icon: CoffeeIcon, render: (state) => <CoffeeTool state={state} /> },
  { id: 'calc', label: 'حساب', Icon: CalcIcon, render: () => <CalcTool /> },
  { id: 'qr', label: 'کیوآر', Icon: QrIcon, render: () => <QrTool /> },
  { id: 'system', label: 'سیستم', Icon: GaugeIcon, render: () => <SystemTool /> }
]

/** One tab holds the small utilities, so the rail never turns into a second settings page. */
export function ToolsPanel({ state }: { state: AppState | null }) {
  const [tool, setTool] = useState<ToolId>('coffee')
  const active = TOOLS.find((entry) => entry.id === tool) ?? TOOLS[0]

  return (
    <div className="tools-page">
      {TOOLS.length > 1 && (
        <div className="seg" role="tablist" aria-label="ابزارها">
          {TOOLS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={entry.id === active.id}
              className={`seg-item${entry.id === active.id ? ' on' : ''}`}
              onClick={() => setTool(entry.id)}
            >
              <entry.Icon size={ICON.xs} />
              <span>{entry.label}</span>
            </button>
          ))}
        </div>
      )}
      <div className="tool-body">{active.render(state)}</div>
    </div>
  )
}
