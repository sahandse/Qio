import type { ReactNode } from 'react'

/** The resting face every empty panel shares: one mark, a title, a quiet hint. */
export function PanelEmpty({
  icon,
  title,
  hint,
  dashed,
  action
}: {
  icon: ReactNode
  title?: string
  hint: ReactNode
  dashed?: boolean
  action?: ReactNode
}) {
  return (
    <div className={`panel-empty${dashed ? ' dashed' : ''}`}>
      {icon}
      {title && <strong>{title}</strong>}
      <span>{hint}</span>
      {action}
    </div>
  )
}
