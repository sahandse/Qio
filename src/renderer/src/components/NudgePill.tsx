import type { Nudge } from '@shared/types'
import { BoltIcon, CloseIcon, TimerIcon, TodoIcon, WaterIcon } from './Icons'

export function NudgePill({ nudge, onDismiss }: { nudge: Nudge; onDismiss: () => void }) {
  const icon =
    nudge.kind === 'water' ? (
      <WaterIcon size={15} />
    ) : nudge.kind === 'todo' ? (
      <TodoIcon size={15} />
    ) : nudge.kind === 'power' ? (
      <BoltIcon size={15} />
    ) : (
      <TimerIcon size={15} />
    )

  return (
    <div className="nudge" role="status">
      <span className="nudge-icon">{icon}</span>
      <span className="nudge-text">
        <strong>{nudge.title}</strong>
        {nudge.detail && <small>{nudge.detail}</small>}
      </span>
      <button type="button" className="icon-button tiny" onClick={onDismiss} title="بستن">
        <CloseIcon size={13} />
      </button>
    </div>
  )
}
