import type { ReactNode } from 'react'

/** A titled settings surface; every section is a Card. */
export function Card({
  title,
  className,
  children
}: {
  title: string
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`settings-card${className ? ` ${className}` : ''}`}>
      <h3>{title}</h3>
      {children}
    </section>
  )
}

/**
 * One label/control line. The wrapper stays whatever the row behaves like:
 * a button when the whole row toggles, a label when a native control follows it.
 */
export function SettingRow({
  label,
  hint,
  icon,
  as = 'div',
  onClick,
  role,
  ariaChecked,
  children
}: {
  label: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  as?: 'div' | 'label' | 'button'
  onClick?: () => void
  role?: string
  ariaChecked?: boolean
  children: ReactNode
}) {
  const body = (
    <>
      <span className="setting-text">
        <strong>
          {icon}
          {label}
        </strong>
        {hint && <small>{hint}</small>}
      </span>
      <span className="setting-control">{children}</span>
    </>
  )

  if (as === 'button') {
    return (
      <button
        type="button"
        className="setting-row"
        onClick={onClick}
        role={role}
        aria-checked={ariaChecked}
      >
        {body}
      </button>
    )
  }
  if (as === 'label') {
    return <label className="setting-row">{body}</label>
  }
  return <div className="setting-row">{body}</div>
}

/** A pressed/unpressed choice inside a chip group. */
export function Chip({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" className={`setting-chip${active ? ' on' : ''}`} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  )
}
