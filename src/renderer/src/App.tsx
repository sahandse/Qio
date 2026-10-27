import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PanelId } from '@shared/types'
import { NotchBar } from './components/NotchBar'
import { CalendarPanel } from './components/CalendarPanel'
import { LyricsPanel, MusicPanel } from './components/MusicPanel'
import { FocusPanel } from './components/FocusPanel'
import { WaterPanel } from './components/WaterPanel'
import { ShelfPanel } from './components/ShelfPanel'
import { TodoPanel } from './components/TodoPanel'
import { NudgePill } from './components/NudgePill'
import { ChevronLeftIcon, ChevronRightIcon } from './components/Icons'
import { useAppState, useNudge } from './lib/state'
import { useFocusEngine } from './lib/focus'
import { primeAudio } from './lib/chime'

type PageId = Exclude<PanelId, 'settings'>

interface PageDef {
  id: PageId
  title: string
  width: number
  height: number
}

const PAGES: PageDef[] = [
  { id: 'calendar', title: 'تقویم', width: 420, height: 300 },
  { id: 'music', title: 'آهنگ', width: 420, height: 140 },
  { id: 'lyrics', title: 'متن آهنگ', width: 520, height: 140 },
  { id: 'focus', title: 'تمرکز', width: 420, height: 140 },
  { id: 'water', title: 'آب', width: 420, height: 140 },
  { id: 'shelf', title: 'قفسه', width: 420, height: 140 },
  { id: 'todo', title: 'کارها', width: 420, height: 140 }
]

const COLLAPSED = { width: 150, height: 30 }

function isPage(id: PanelId): id is PageId {
  return id !== 'settings'
}

export default function App() {
  const state = useAppState()
  const nudge = useNudge()
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [panel, setPanel] = useState<PageId>('music')
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [dropping, setDropping] = useState(false)
  const stackRef = useRef<HTMLDivElement>(null)
  const pinTimer = useRef<number | null>(null)
  const leaveTimer = useRef<number | null>(null)
  const dragDepth = useRef(0)
  const wheelAt = useRef(0)

  useFocusEngine(state)

  const pin = useCallback((ms = 6000) => {
    setPinned(true)
    if (pinTimer.current) window.clearTimeout(pinTimer.current)
    pinTimer.current = window.setTimeout(() => setPinned(false), ms)
  }, [])

  useEffect(() => {
    const offOpen = window.qio.onOpen((next) => {
      if (!isPage(next)) {
        void window.qio.window.openSettings()
        return
      }
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
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (event.ctrlKey || event.altKey || event.metaKey) return

      const current = PAGES.findIndex((page) => page.id === panel)
      const offset = event.key === 'ArrowLeft' ? 1 : event.key === 'ArrowRight' ? -1 : 0
      let next = -1
      if (event.key === 'Home') next = 0
      else if (event.key === 'End') next = PAGES.length - 1
      else if (offset) next = (current + offset + PAGES.length) % PAGES.length
      else {
        const latin = '1234567'.indexOf(event.key)
        const persian = '۱۲۳۴۵۶۷'.indexOf(event.key)
        const slot = latin >= 0 ? latin : persian
        if (slot >= 0) next = slot
      }
      if (next < 0 || !PAGES[next]) return
      event.preventDefault()
      setPanel(PAGES[next].id)
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
  }, [panel, pin])

  useEffect(() => {
    const offline = () =>
      void window.qio.notify('network', 'اتصال قطع شد', 'اینترنت وصل نیست؛ قفسه و آهنگ‌های محلی کار می‌کنند.')
    const online = () => void window.qio.notify('network', 'اتصال برگشت', 'دوباره به اینترنت وصل شدی.')
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    return () => {
      window.removeEventListener('offline', offline)
      window.removeEventListener('online', online)
    }
  }, [])

  /** The main process resizes the window to whatever this stack measures. */
  useEffect(() => {
    const element = stackRef.current
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
  const page = useMemo(() => PAGES.find((entry) => entry.id === panel) ?? PAGES[1], [panel])

  const scale = useMemo(() => {
    const base = state?.settings.notchScale ?? 1
    const wide = typeof window !== 'undefined' && window.screen.width >= 2400 ? 1.12 : 1
    return Math.round(base * wide * 100) / 100
  }, [state?.settings.notchScale])

  const go = useCallback(
    (delta: number) => {
      setPanel((current) => {
        const index = PAGES.findIndex((entry) => entry.id === current)
        return PAGES[(index + delta + PAGES.length) % PAGES.length].id
      })
    },
    []
  )

  const onWheel = (event: React.WheelEvent) => {
    if (!expanded) return
    if ((event.target as HTMLElement).closest('[data-scroll]')) return
    const now = Date.now()
    if (now - wheelAt.current < 380) return
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
    if (Math.abs(delta) < 6) return
    wheelAt.current = now
    go(delta > 0 ? 1 : -1)
  }

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
      void window.qio.notify('shelf', `${added} مورد به قفسه اضافه شد`, 'هر وقت لازمشان داشتی، بیرونشان بکش.')
    }
  }

  return (
    <div className="screen">
      <div className="zoomed" style={{ zoom: scale }}>
        <div className="stack" ref={stackRef}>
        <div
          className={`shell${expanded ? ' open' : ''}${dropping ? ' is-dropping' : ''}`}
          style={expanded ? { width: page.width, height: page.height } : { width: COLLAPSED.width, height: COLLAPSED.height }}
          onMouseEnter={() => {
            if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
            setHover(true)
          }}
          onMouseLeave={() => {
            if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
            leaveTimer.current = window.setTimeout(() => setHover(false), 180)
          }}
          onWheel={onWheel}
          onDragEnter={(event) => {
            event.preventDefault()
            dragDepth.current += 1
            setDropping(true)
            setHover(true)
            pin(4000)
            setPanel('shelf')
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
          <NotchBar
            state={state}
            expanded={expanded}
            title={page.title}
            onOpen={() => {
              setHover(true)
              pin()
            }}
            onSettings={() => void window.qio.window.openSettings()}
          />

          {expanded && (
            <>
              <div className="page-body">
                {panel === 'calendar' && <CalendarPanel />}
                {panel === 'music' && <MusicPanel state={state} onOpen={() => setPanel('lyrics')} />}
                {panel === 'lyrics' && <LyricsPanel state={state} />}
                {panel === 'focus' && <FocusPanel state={state} />}
                {panel === 'water' && <WaterPanel state={state} />}
                {panel === 'shelf' && <ShelfPanel state={state} />}
                {panel === 'todo' && <TodoPanel state={state} />}
              </div>

              <nav className="dots" aria-label="صفحه‌ها">
                {PAGES.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`dot${entry.id === panel ? ' active' : ''}`}
                    aria-label={entry.title}
                    title={entry.title}
                    onClick={() => setPanel(entry.id)}
                  />
                ))}
              </nav>

              <button
                type="button"
                className="page-arrow page-arrow-start"
                title="صفحهٔ قبل"
                aria-label="صفحهٔ قبل"
                onClick={() => go(-1)}
              >
                <ChevronRightIcon size={14} />
              </button>
              <button
                type="button"
                className="page-arrow page-arrow-end"
                title="صفحهٔ بعد"
                aria-label="صفحهٔ بعد"
                onClick={() => go(1)}
              >
                <ChevronLeftIcon size={14} />
              </button>
            </>
          )}

          {dropping && (
            <div className="drop-hint">
              <strong>اینجا رها کن</strong>
              <span>به قفسه اضافه می‌شود — بدون کپی</span>
            </div>
          )}
        </div>

        {nudge && nudge.id !== dismissed && <NudgePill nudge={nudge} onDismiss={() => setDismissed(nudge.id)} />}
        </div>
      </div>
    </div>
  )
}
