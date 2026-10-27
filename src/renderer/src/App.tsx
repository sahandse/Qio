import { useCallback, useEffect, useRef, useState } from 'react'
import type { PanelId } from '@shared/types'
import { NotchBar } from './components/NotchBar'
import { CalendarPanel } from './components/CalendarPanel'
import { LyricsPanel, MusicPanel } from './components/MusicPanel'
import { FocusPanel } from './components/FocusPanel'
import { WaterPanel } from './components/WaterPanel'
import { ShelfPanel } from './components/ShelfPanel'
import { TodoPanel } from './components/TodoPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { NudgePill } from './components/NudgePill'
import {
  CalendarIcon,
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
  { id: 'calendar', label: 'تقویم', Icon: CalendarIcon },
  { id: 'music', label: 'آهنگ', Icon: MusicIcon },
  { id: 'lyrics', label: 'متن آهنگ', Icon: LyricsIcon },
  { id: 'focus', label: 'تمرین', Icon: TimerIcon },
  { id: 'water', label: 'آب', Icon: WaterIcon },
  { id: 'shelf', label: 'قفسه', Icon: ShelfIcon },
  { id: 'todo', label: 'کارها', Icon: TodoIcon },
  { id: 'settings', label: 'تنظیمات', Icon: SettingsIcon }
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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
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
        return
      }
      if (event.ctrlKey || event.altKey || event.metaKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      const slot = '12345678'.indexOf(event.key) >= 0 ? '12345678'.indexOf(event.key) : '۱۲۳۴۵۶۷۸'.indexOf(event.key)
      if (slot < 0 || !TABS[slot]) return
      event.preventDefault()
      setPanel(TABS[slot].id)
      setHover(true)
      pin()
    }
    window.addEventListener('keydown', onKey)
    const prime = () => primeAudio()
    window.addEventListener('pointerdown', prime, { once: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', prime)
    }
  }, [pin])

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
        `${added} مورد به قفسه اضافه شد`,
        'هر وقت لازمشان داشتی، بیرونشان بکش.'
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
          <div
            className="tabs"
            role="tablist"
            onKeyDown={(event) => {
              const current = TABS.findIndex((tab) => tab.id === panel)
              const offset =
                event.key === 'ArrowRight' ? -1 : event.key === 'ArrowLeft' ? 1 : 0
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? TABS.length - 1
                    : offset
                      ? current + offset
                      : -1
              if (next < 0 || next >= TABS.length) return
              event.preventDefault()
              setPanel(TABS[next].id)
              tabRefs.current[next]?.focus()
            }}
          >
            {TABS.map(({ id, label, Icon }, index) => (
              <button
                key={id}
                id={`tab-${id}`}
                ref={(node) => {
                  tabRefs.current[index] = node
                }}
                type="button"
                role="tab"
                aria-selected={panel === id}
                aria-controls="qio-panel"
                tabIndex={panel === id ? 0 : -1}
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
                title="بستن (Esc)"
                onClick={() => {
                  setHover(false)
                  setPinned(false)
                }}
              >
                <CloseIcon size={15} />
              </button>
            </div>

            <div
              className="panel-body"
              role="tabpanel"
              id="qio-panel"
              aria-labelledby={`tab-${panel}`}
            >
              {panel === 'calendar' && <CalendarPanel />}
              {panel === 'music' && <MusicPanel state={state} onOpen={setPanel} />}
              {panel === 'lyrics' && <LyricsPanel state={state} />}
              {panel === 'focus' && <FocusPanel state={state} />}
              {panel === 'water' && <WaterPanel state={state} />}
              {panel === 'shelf' && <ShelfPanel state={state} />}
              {panel === 'todo' && <TodoPanel state={state} />}
              {panel === 'settings' && <SettingsPanel state={state} />}
            </div>
          </div>
        )}

        {dropping && <div className="drop-hint">برای افزودن به قفسه رها کن</div>}

        {nudge && nudge.id !== dismissed && (
          <NudgePill nudge={nudge} onDismiss={() => setDismissed(nudge.id)} />
        )}
      </div>
    </div>
  )
}
