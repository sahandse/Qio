import { useCallback, useEffect, useRef, useState } from 'react'
import type { PanelId } from '@shared/types'
import { NotchBar } from './components/NotchBar'
import { LyricsPanel, MusicPanel } from './components/MusicPanel'
import { FocusPanel } from './components/FocusPanel'
import { WaterPanel } from './components/WaterPanel'
import { ShelfPanel } from './components/ShelfPanel'
import { TodoPanel } from './components/TodoPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { NudgePill } from './components/NudgePill'
import {
  CloseIcon,
  LyricsIcon,
  MusicIcon,
  SettingsIcon,
  ShelfIcon,
  TimerIcon,
  TodoIcon,
  WaterIcon
} from './components/Icons'
import { useAppState, useNudge } from './lib/state'
import { useFocusEngine } from './lib/focus'
import { primeAudio } from './lib/chime'

const TABS: { id: PanelId; label: string; Icon: typeof MusicIcon }[] = [
  { id: 'music', label: 'Music', Icon: MusicIcon },
  { id: 'lyrics', label: 'Lyrics', Icon: LyricsIcon },
  { id: 'focus', label: 'Focus', Icon: TimerIcon },
  { id: 'water', label: 'Water', Icon: WaterIcon },
  { id: 'shelf', label: 'Shelf', Icon: ShelfIcon },
  { id: 'todo', label: 'Tasks', Icon: TodoIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon }
]

export default function App() {
  const state = useAppState()
  const nudge = useNudge()
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [panel, setPanel] = useState<PanelId>('music')
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [dropping, setDropping] = useState(false)
  const shellRef = useRef<HTMLDivElement>(null)
  const pinTimer = useRef<number | null>(null)
  const dragDepth = useRef(0)

  useFocusEngine(state)

  const pin = useCallback((ms = 6000) => {
    setPinned(true)
    if (pinTimer.current) window.clearTimeout(pinTimer.current)
    pinTimer.current = window.setTimeout(() => setPinned(false), ms)
  }, [])

  useEffect(() => {
    const offOpen = window.qio.onOpen((next) => {
      setPanel(next)
      setHover(true)
      pin()
    })
    const offPulse = window.qio.onPulse(() => {
      setHover(true)
      pin()
    })
    return () => {
      offOpen()
      offPulse()
    }
  }, [pin])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHover(false)
        setPinned(false)
      }
    }
    window.addEventListener('keydown', onKey)
    const prime = () => primeAudio()
    window.addEventListener('pointerdown', prime, { once: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', prime)
    }
  }, [])

  /** The main process resizes the window to whatever this element measures. */
  useEffect(() => {
    const element = shellRef.current
    if (!element) return
    let last = { width: 0, height: 0 }
    const observer = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect()
      const width = Math.ceil(rect.width)
      const height = Math.ceil(rect.height)
      if (width === last.width && height === last.height) return
      last = { width, height }
      void window.qio.window.size(width, height)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const expanded = hover || pinned

  const onDrop = async (event: React.DragEvent) => {
    event.preventDefault()
    dragDepth.current = 0
    setDropping(false)
    const files = Array.from(event.dataTransfer?.files ?? [])
    const paths = files.map((file) => window.qio.pathForFile(file)).filter((path) => Boolean(path))
    if (paths.length === 0) return
    const added = await window.qio.shelf.add(paths)
    setPanel('shelf')
    setHover(true)
    pin()
    if (added > 0) {
      void window.qio.notify(
        'shelf',
        `${added} item${added === 1 ? '' : 's'} on the shelf`,
        'Drag them out into any app whenever you need.'
      )
    }
  }

  return (
    <div
      className={`stage${dropping ? ' stage-drop' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragEnter={(event) => {
        event.preventDefault()
        dragDepth.current += 1
        setDropping(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        dragDepth.current -= 1
        if (dragDepth.current <= 0) {
          dragDepth.current = 0
          setDropping(false)
        }
      }}
      onDrop={onDrop}
    >
      <div className="shell" ref={shellRef} data-expanded={expanded ? 'true' : 'false'}>
        <NotchBar
          state={state}
          expanded={expanded}
          onOpen={() => {
            setHover(true)
            pin()
          }}
          onToggleMinimal={() => void window.qio.patchSettings({ minimalNotch: !state?.settings.minimalNotch })}
        />

        {expanded && (
          <div className="panel">
            <div className="tabs" role="tablist">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={panel === id}
                  className={`tab${panel === id ? ' active' : ''}`}
                  onClick={() => setPanel(id)}
                  title={label}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
              <span className="tabs-spacer" />
              <button
                type="button"
                className="icon-button tiny"
                title="Close (Esc)"
                onClick={() => {
                  setHover(false)
                  setPinned(false)
                }}
              >
                <CloseIcon size={15} />
              </button>
            </div>

            <div className="panel-body" role="tabpanel">
              {panel === 'music' && <MusicPanel state={state} />}
              {panel === 'lyrics' && <LyricsPanel state={state} />}
              {panel === 'focus' && <FocusPanel state={state} />}
              {panel === 'water' && <WaterPanel state={state} />}
              {panel === 'shelf' && <ShelfPanel state={state} />}
              {panel === 'todo' && <TodoPanel state={state} />}
              {panel === 'settings' && <SettingsPanel state={state} />}
            </div>
          </div>
        )}

        {dropping && <div className="drop-hint">Release to add to the shelf</div>}

        {nudge && nudge.id !== dismissed && (
          <NudgePill nudge={nudge} onDismiss={() => setDismissed(nudge.id)} />
        )}
      </div>
    </div>
  )
}
