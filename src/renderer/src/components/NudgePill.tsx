import type { Nudge } from '@shared/types'
import {
  ICON,
  BallIcon,
  BoltIcon,
  CloseIcon,
  HeadphonesIcon,
  LyricsIcon,
  ShelfIcon,
  TimerIcon,
  TodoIcon,
  WalkIcon,
  WaterIcon,
  WifiIcon
} from './Icons'

function iconFor(kind: Nudge['kind']) {
  if (kind === 'water') return <WaterIcon size={ICON.sm} />
  if (kind === 'todo') return <TodoIcon size={ICON.sm} />
  if (kind === 'power') return <BoltIcon size={ICON.sm} />
  if (kind === 'shelf') return <ShelfIcon size={ICON.sm} />
  if (kind === 'lyrics') return <LyricsIcon size={ICON.sm} />
  if (kind === 'network') return <WifiIcon size={ICON.sm} />
  if (kind === 'headphones') return <HeadphonesIcon size={ICON.sm} />
  if (kind === 'football') return <BallIcon size={ICON.sm} />
  if (kind === 'move') return <WalkIcon size={ICON.sm} />
  return <TimerIcon size={ICON.sm} />
}

export function NudgePill({ nudge, onDismiss }: { nudge: Nudge; onDismiss: () => void }) {
  const actions = nudge.actions ?? []
  return (
    <div className={`nudge nudge-${nudge.kind}`} role="status">
      <span className="nudge-icon">{iconFor(nudge.kind)}</span>
      <span className="nudge-text">
        <strong>{nudge.title}</strong>
        {nudge.detail && <small>{nudge.detail}</small>}
        {actions.length > 0 && (
          <span className="nudge-actions">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`nudge-action${action.primary ? ' primary' : ''}`}
                onClick={() => {
                  window.qio.nudgeAction(nudge.id, action.id)
                  onDismiss()
                }}
              >
                {action.label}
              </button>
            ))}
          </span>
        )}
      </span>
      <button type="button" className="nudge-close" onClick={onDismiss} title="بستن" aria-label="بستن">
        <CloseIcon size={ICON.xs} />
      </button>
    </div>
  )
}
