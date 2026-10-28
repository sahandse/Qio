import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import type { MascotState, PanelId } from '@shared/types'
import { NotchBar } from './components/NotchBar'
import { CalendarPanel } from './components/CalendarPanel'
import { LyricsPanel, MusicPanel } from './components/MusicPanel'
import { FocusPanel } from './components/FocusPanel'
import { WaterPanel } from './components/WaterPanel'
import { ShelfPanel } from './components/ShelfPanel'
import { TodoPanel } from './components/TodoPanel'
import { NotesPanel } from './components/NotesPanel'
import { AiPanel } from './components/AiPanel'
import { NudgePill } from './components/NudgePill'
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LyricsIcon,
  MusicIcon,
  NoteIcon,
  ShelfIcon,
  SparklesIcon,
  TimerIcon,
  TodoIcon,
  WaterIcon
} from './components/Icons'
import { useAppState, useNudge } from './lib/state'
import { useFocusEngine } from './lib/focus'
import { primeAudio } from './lib/chime'

type PageId = Exclude<PanelId, 'settings'>

interface PageDef {
  id: PageId
  title: string
  width: number
  height: number
  /** Accent of the page as an rgb triplet, so each panel glows in its own colour. */
  hue: string
  Icon: ComponentType<{ size?: number }>
}

const PAGES: PageDef[] = [
  { id: 'calendar', title: 'تقویم', width: 424, height: 348, hue: '138, 230, 192', Icon: CalendarIcon },
  { id: 'music', title: 'آهنگ', width: 424, height: 198, hue: '122, 196, 255', Icon: MusicIcon },
  { id: 'lyrics', title: 'متن آهنگ', width: 540, height: 198, hue: '154, 190, 255', Icon: LyricsIcon },
  { id: 'focus', title: 'تمرکز', width: 424, height: 190, hue: '242, 200, 121', Icon: TimerIcon },
  { id: 'water', title: 'آب', width: 424, height: 204, hue: '106, 200, 255', Icon: WaterIcon },
  { id: 'shelf', title: 'قفسه', width: 424, height: 188, hue: '181, 156, 255', Icon: ShelfIcon },
  { id: 'todo', title: 'کارها', width: 430, height: 214, hue: '138, 230, 192', Icon: TodoIcon },
  { id: 'notes', title: 'یادداشت', width: 440, height: 258, hue: '255, 170, 200', Icon: NoteIcon },
  { id: 'ai', title: 'هوش مصنوعی', width: 560, height: 404, hue: '178, 160, 255', Icon: SparklesIcon }
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
  const [aiBusy, setAiBusy] = useState(false)
  const [aiStream, setAiStream] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const aiRequest = useRef<string | null>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const pinTimer = useRef<number | null>(null)
  const leaveTimer = useRef<number | null>(null)
  const dragDepth = useRef(0)
  const wheelAt = useRef(0)

  useFocusEngine(state)

  /** A short cheer when a focus round ends or the water goal is reached, plus a face while focusing. */
  const [cheer, setCheer] = useState<MascotState | null>(null)
  const cheerTimer = useRef<number | null>(null)
  const seen = useRef<{ rounds: number | null; watered: boolean | null; openTodos: number | null }>({
    rounds: null,
    watered: null,
    openTodos: null
  })

  useEffect(() => {
    if (!state) return
    const previous = seen.current
    const rounds = state.focus.completedToday
    const watered = state.water.total >= state.water.goalMl && state.water.goalMl > 0
    const open = state.todos.filter((todo) => !todo.done).length
    const gainedRound = previous.rounds != null && rounds > previous.rounds
    const clearedTodos = previous.openTodos != null && previous.openTodos > 0 && open === 0
    const reachedWater = previous.watered === false && watered
    seen.current = { rounds, watered, openTodos: open }
    if (!gainedRound && !clearedTodos && !reachedWater) return
    setCheer('success')
    if (cheerTimer.current) window.clearTimeout(cheerTimer.current)
    cheerTimer.current = window.setTimeout(() => setCheer(null), 2600)
  }, [state])

  const mascotState: MascotState | null = state?.focus.running ? 'work' : cheer

  const pin = useCallback((ms = 6000) => {
    setPinned(true)
    if (pinTimer.current) window.clearTimeout(pinTimer.current)
    pinTimer.current = window.setTimeout(() => setPinned(false), ms)
  }, [])

  const expanded = hover || pinned

  useEffect(() => {
    const off = window.qio.ai.onEvent((event) => {
      if (event.requestId !== aiRequest.current) return
      if (event.type === 'delta') {
        if (event.delta) setAiStream((current) => current + event.delta)
        return
      }
      aiRequest.current = null
      setAiBusy(false)
      setAiStream('')
      if (event.type === 'error') setAiError(event.error ?? 'پاسخ نیامد؛ دوباره امتحان کن.')
    })
    return off
  }, [])

  const sendAi = useCallback(async (value: string) => {
    setAiError(null)
    setAiStream('')
    setAiBusy(true)
    const result = await window.qio.ai.send(value)
    if (!result.ok) {
      setAiBusy(false)
      setAiError(result.error ?? 'ارسال نشد؛ دوباره امتحان کن.')
      return
    }
    aiRequest.current = result.requestId ?? null
  }, [])

  const stopAi = useCallback(() => {
    if (aiRequest.current) window.qio.ai.stop(aiRequest.current)
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
        const latin = '123456789'.indexOf(event.key)
        const persian = '۱۲۳۴۵۶۷۸۹'.indexOf(event.key)
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

  const page = useMemo(() => PAGES.find((entry) => entry.id === panel) ?? PAGES[1], [panel])

  const scale = useMemo(() => {
    const base = state?.settings.notchScale ?? 1
    return Math.round(base * 100) / 100
  }, [state?.settings.notchScale])

  /** Panels breathe on wide monitors and tighten up on small laptop screens. */
  const widthFactor = useMemo(() => {
    if (typeof window === 'undefined') return 1
    const available = window.screen.availWidth || window.innerWidth || 1920
    return Math.min(1.26, Math.max(0.9, Math.round((available / 1920) * 100) / 100))
  }, [])

  const shellSize = expanded
    ? { width: Math.round(page.width * widthFactor), height: page.height }
    : COLLAPSED

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
          className={`shell${expanded ? ' open' : ''}${dropping ? ' is-dropping' : ''} page-${page.id}`}
          style={
            expanded
              ? { width: shellSize.width, height: shellSize.height, ['--hue' as string]: page.hue }
              : { width: shellSize.width, height: shellSize.height }
          }
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
            mascotState={mascotState}
          />

          {expanded && (
            <>
              <div className="page-body" key={panel}>
                {panel === 'calendar' && <CalendarPanel />}
                {panel === 'music' && <MusicPanel state={state} onOpen={() => setPanel('lyrics')} />}
                {panel === 'lyrics' && <LyricsPanel state={state} />}
                {panel === 'focus' && <FocusPanel state={state} />}
                {panel === 'water' && <WaterPanel state={state} />}
                {panel === 'shelf' && <ShelfPanel state={state} />}
                {panel === 'todo' && <TodoPanel state={state} />}
                {panel === 'notes' && <NotesPanel state={state} />}
                {panel === 'ai' && (
                  <AiPanel
                    state={state}
                    busy={aiBusy}
                    streaming={aiStream}
                    error={aiError}
                    onSend={sendAi}
                    onStop={stopAi}
                    onOpenSettings={() => void window.qio.window.openSettings('ai')}
                  />
                )}
              </div>

              <nav className="tab-rail" aria-label="صفحه‌ها">
                {PAGES.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`tab${entry.id === panel ? ' active' : ''}`}
                    aria-label={entry.title}
                    aria-current={entry.id === panel ? 'page' : undefined}
                    data-label={entry.title}
                    onClick={() => setPanel(entry.id)}
                  >
                    <entry.Icon size={12} />
                  </button>
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
