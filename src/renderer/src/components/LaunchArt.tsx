import { useEffect, useState } from 'react'
import type { LaunchItem } from '@shared/types'
import { ICON, LaunchIcon, LinkIcon } from './Icons'

function useLaunchIcon(item: LaunchItem): string {
  const [icon, setIcon] = useState('')
  useEffect(() => {
    if (item.kind === 'url') {
      setIcon('')
      return
    }
    let alive = true
    void window.qio.launch.icon(item.id).then((dataUrl) => {
      if (alive) setIcon(dataUrl)
    })
    return () => {
      alive = false
    }
  }, [item.id, item.kind])
  return icon
}

/** The Windows icon for a pinned path, or the link glyph for a site. */
export function LaunchArt({ item, className }: { item: LaunchItem; className: string }) {
  const icon = useLaunchIcon(item)
  return (
    <span className={className} aria-hidden="true">
      {item.kind === 'url' ? (
        <LinkIcon size={ICON.md} />
      ) : icon ? (
        <img src={icon} alt="" />
      ) : (
        <LaunchIcon size={ICON.md} />
      )}
    </span>
  )
}
