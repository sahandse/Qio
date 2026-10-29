import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import type { AppMeta } from '@shared/api'
import type { AppState, Settings } from '@shared/types'
import { toPersianDigits } from '../lib/jalali'
import { useNightTheme } from '../lib/state'
import { CloseIcon, InfoIcon, SettingsIcon, SparklesIcon, VolumeIcon, WaterIcon } from './Icons'
import { MascotSettingsCard } from './MascotSettings'
import { AboutSection } from './settings/AboutSection'
import { AiSection } from './settings/AiSection'
import { GeneralSection } from './settings/GeneralSection'
import { HealthSection } from './settings/HealthSection'
import { MediaSection } from './settings/MediaSection'
import { Toggle } from './settings/controls'

type SettingsTab = 'general' | 'mascot' | 'ai' | 'media' | 'health' | 'about'

const TABS: { id: SettingsTab; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: 'general', label: 'عمومی', Icon: SettingsIcon },
  { id: 'mascot', label: 'ماسکوت', Icon: SparklesIcon },
  { id: 'ai', label: 'هوش مصنوعی', Icon: SparklesIcon },
  { id: 'media', label: 'صدا و صفحه', Icon: VolumeIcon },
  { id: 'health', label: 'آب و تمرکز', Icon: WaterIcon },
  { id: 'about', label: 'درباره', Icon: InfoIcon }
]

function tabFrom(value: string): SettingsTab | null {
  return TABS.find((entry) => entry.id === value)?.id ?? null
}

export function SettingsPage() {
  const [state, setState] = useState<AppState | null>(null)
  const [meta, setMeta] = useState<AppMeta | null>(null)
  const [tab, setTab] = useState<SettingsTab>(() => tabFrom(window.location.hash.replace('#', '')) ?? 'general')

  useNightTheme(state?.settings.autoNight ?? true)

  useEffect(() => {
    let alive = true
    void window.qio.getState().then((initial) => {
      if (alive) setState(initial)
    })
    const off = window.qio.onState((next) => setState(next))
    const offTab = window.qio.onSettingsTab((next) => {
      const match = tabFrom(next)
      if (match) setTab(match)
    })
    void window.qio.meta().then((next) => {
      if (alive) setMeta(next)
    })
    return () => {
      alive = false
      off()
      offTab()
    }
  }, [])

  if (!state) {
    return (
      <div className="settings-page">
        <p className="settings-empty">در حال بارگذاری…</p>
      </div>
    )
  }

  const { settings, system } = state
  const patch = (next: Partial<Settings>) => void window.qio.patchSettings(next)

  return (
    <div className="settings-page">
      <header className="settings-bar">
        <span className="settings-mark" aria-hidden="true">
          <span className="mark-eye" />
          <span className="mark-eye" />
        </span>
        <div className="settings-heading">
          <strong>تنظیمات Qio</strong>
          <small>یک نچ زنده برای ویندوز</small>
        </div>
        <span className="settings-version">
          {toPersianDigits(meta?.version ?? '')} · Electron {toPersianDigits(meta?.electron ?? '')}
        </span>
        <button
          type="button"
          className="settings-close"
          onClick={() => void window.qio.window.close()}
          title="بستن"
          aria-label="بستن"
        >
          <CloseIcon size={14} />
        </button>
      </header>

      <div className="settings-shell">
        <nav className="settings-nav" aria-label="دسته‌های تنظیمات">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`settings-tab${tab === entry.id ? ' on' : ''}`}
              aria-current={tab === entry.id ? 'page' : undefined}
              onClick={() => setTab(entry.id)}
            >
              <entry.Icon size={13} />
              <span>{entry.label}</span>
            </button>
          ))}
        </nav>

        <div className="settings-scroll">
          <div className="settings-grid">
            {tab === 'general' && (
              <GeneralSection settings={settings} packaged={meta?.packaged} onPatch={patch} />
            )}

            {tab === 'mascot' && (
              <>
                <section className="settings-card">
                  <h3>نوار نچ</h3>
                  <Toggle
                    label="ماسکوت"
                    hint="یک جفت چشم کوچک روی نچ که پلک می‌زند، می‌خوابد و سلام می‌کند"
                    checked={settings.mascot}
                    onChange={(next) => patch({ mascot: next })}
                  />
                </section>
                <MascotSettingsCard
                  style={settings.mascotStyle}
                  onPatch={(next) => patch({ mascotStyle: { ...settings.mascotStyle, ...next } })}
                />
              </>
            )}

            {tab === 'ai' && <AiSection ai={state.ai.settings} />}

            {tab === 'media' && <MediaSection system={system} />}

            {tab === 'health' && <HealthSection settings={settings} onPatch={patch} />}

            {tab === 'about' && <AboutSection />}
          </div>
        </div>
      </div>
    </div>
  )
}
