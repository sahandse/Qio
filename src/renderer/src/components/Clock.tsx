import { memo } from 'react'
import { formatClock } from '../lib/format'
import { formatJalali } from '../lib/jalali'
import { useClock } from '../lib/state'

/**
 * The ticking time lives in its own components so the rest of the notch does not
 * re-render every five seconds just to keep the digits fresh.
 */
export const ClockText = memo(function ClockText({
  hour24,
  className,
  off
}: {
  hour24: boolean
  className?: string
  off?: boolean
}) {
  const now = useClock()
  return (
    <span
      className={`${className ?? ''}${off ? ' off' : ''}`}
      aria-hidden={off || undefined}
      title={formatJalali(now)}
    >
      {formatClock(now, false, hour24)}
    </span>
  )
})

export const ClockDate = memo(function ClockDate({ className }: { className?: string }) {
  const now = useClock()
  return <span className={className}>{formatJalali(now)}</span>
})
