import type { Nudge } from '@shared/types'
import {
  BoltIcon,
  CloseIcon,
  HeadphonesIcon,
  LyricsIcon,
  ShelfIcon,
  TimerIcon,
  TodoIcon,
  WaterIcon,
  WifiIcon
} from './Icons'

function iconFor(kind: Nudge['kind']) {
  if (kind === 'water') return <WaterIcon size={13} />
  if (kind === 'todo') return <TodoIcon size={13} />
  if (kind === 'power') return <BoltIcon size={13} />
  if (kind === 'shelf') return <ShelfIcon size={13} />
  if (kind === 'lyrics') return <LyricsIcon size={13} />
  if (kind === 'network') return <WifiIcon size={13} />
  if (kind === 'headphones') return <HeadphonesIcon size={13} />
  return <TimerIcon size={13} />
}

export function NudgePill({ nudge, onDismiss }: { nudge: Nudge; onDismiss: () => void }) {
  return (
    <div className={`nudge nudge-${nudge.kind}`} role="status">
      <span className="nudge-icon">{iconFor(nudge.kind)}</span>
      <span className="nudge-text">
        <strong>{nudge.title}</strong>
        {nudge.detail && <small>{nudge.detail}</small>}
      </span>
      <button type="button" className="nudge-close" onClick={onDismiss} title="بستن" aria-label="بستن">
        <CloseIcon size={11} />
      </button>
    </div>
  )
}
