import type { ReactNode } from 'react'

export type StatusTone = 'ok' | 'info' | 'warn' | 'danger'

/** One status voice for the whole app: a tone-coloured dot, then the message. */
export function Status({
  tone = 'info',
  role = 'status',
  className,
  children
}: {
  tone?: StatusTone
  role?: 'status' | 'alert'
  className?: string
  children: ReactNode
}) {
  return (
    <span className={`status status-${tone}${className ? ` ${className}` : ''}`} role={role}>
      <span className="status-dot" aria-hidden="true" />
      {children}
    </span>
  )
}
