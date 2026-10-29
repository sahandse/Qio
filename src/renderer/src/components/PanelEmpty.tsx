import type { ReactNode } from 'react'

/** The resting face every empty panel shares: one mark, a title, a quiet hint. */
export function PanelEmpty({
  icon,
  title,
  hint,
  dashed
}: {
  icon: ReactNode
  title?: string
  hint: ReactNode
  dashed?: boolean
}) {
  return (
    <div className={`panel-empty${dashed ? ' dashed' : ''}`}>
      {icon}
      {title && <strong>{title}</strong>}
      <span>{hint}</span>
    </div>
  )
}
