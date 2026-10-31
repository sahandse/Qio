import type { Nudge, PageId } from '@shared/types'
import {
  ICON,
  BallIcon,
  BellIcon,
  BoltIcon,
  CloseIcon,
  CoffeeIcon,
  DownloadIcon,
  HeadphonesIcon,
  LyricsIcon,
  ShelfIcon,
  TimerIcon,
  TodoIcon,
  WalkIcon,
  WaterIcon,
  WifiIcon
} from './Icons'

/** The same mark for a nudge in the pill and for its line in the alerts page. */
export function NudgeIcon({ kind, size = ICON.sm }: { kind: Nudge['kind']; size?: number }) {
  if (kind === 'water') return <WaterIcon size={size} />
  if (kind === 'todo') return <TodoIcon size={size} />
  if (kind === 'power') return <BoltIcon size={size} />
  if (kind === 'shelf') return <ShelfIcon size={size} />
  if (kind === 'lyrics') return <LyricsIcon size={size} />
  if (kind === 'network') return <WifiIcon size={size} />
  if (kind === 'headphones') return <HeadphonesIcon size={size} />
  if (kind === 'football') return <BallIcon size={size} />
  if (kind === 'move') return <WalkIcon size={size} />
  if (kind === 'coffee') return <CoffeeIcon size={size} />
  if (kind === 'update') return <DownloadIcon size={size} />
  if (kind === 'system') return <BellIcon size={size} />
  return <TimerIcon size={size} />
}

export function NudgePill({
  nudge,
  onDismiss,
  onOpenPage
}: {
  nudge: Nudge
  onDismiss: () => void
  onOpenPage?: (page: PageId) => void
}) {
  const actions = nudge.actions ?? []
  return (
    <div className={`nudge nudge-${nudge.kind}`} role="status">
      <span className="nudge-icon">
        <NudgeIcon kind={nudge.kind} />
      </span>
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
                  if (action.page) onOpenPage?.(action.page)
                  else window.qio.nudgeAction(nudge.id, action.id)
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
