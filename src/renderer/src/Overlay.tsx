import { useEffect, useState } from 'react'
import type { OverlayPayload } from '@shared/types'
import { layoutLabel } from './lib/format'
import { toPersianDigits } from './lib/jalali'
import { BatteryIcon, BoltIcon, KeyboardIcon, MuteIcon, SunIcon, VolumeIcon } from './components/Icons'

export default function Overlay() {
  const [payload, setPayload] = useState<OverlayPayload | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const offShow = window.qio.onOverlay((next) => {
      setPayload(next)
      setNonce((value) => value + 1)
    })
    const offReset = window.qio.onOverlayReset(() => setPayload(null))
    return () => {
      offShow()
      offReset()
    }
  }, [])

  if (!payload) return null

  const percent = (value: number) => `${toPersianDigits(Math.round(value))}٪`

  return (
    <div className="overlay-stage">
      <div className="overlay-card" key={nonce}>
        {payload.kind === 'volume' && (
          <>
            <span className="overlay-icon">{payload.muted ? <MuteIcon size={20} /> : <VolumeIcon size={20} />}</span>
            <div className="overlay-body">
              <span className="overlay-label">{payload.muted ? 'بی‌صدا' : 'صدا'}</span>
              <span className="overlay-meter">
                <span
                  className="overlay-meter-fill"
                  style={{ transform: `scaleX(${Math.min(1, Math.max(0, (payload.value ?? 0) / 100))})` }}
                />
              </span>
            </div>
            <span className="overlay-value">{percent(payload.value ?? 0)}</span>
          </>
        )}

        {payload.kind === 'brightness' && (
          <>
            <span className="overlay-icon">
              <SunIcon size={20} />
            </span>
            <div className="overlay-body">
              <span className="overlay-label">روشنایی</span>
              <span className="overlay-meter">
                <span
                  className="overlay-meter-fill"
                  style={{ transform: `scaleX(${Math.min(1, Math.max(0, (payload.value ?? 0) / 100))})` }}
                />
              </span>
            </div>
            <span className="overlay-value">{percent(payload.value ?? 0)}</span>
          </>
        )}

        {payload.kind === 'capslock' && (
          <>
            <span className={`overlay-icon${payload.capsLock ? ' on' : ''}`}>
              <KeyboardIcon size={20} />
            </span>
            <div className="overlay-body">
              <span className="overlay-label">Caps Lock</span>
              <span className="overlay-note">{payload.capsLock ? 'روشن' : 'خاموش'}</span>
            </div>
          </>
        )}

        {payload.kind === 'layout' && (
          <>
            <span className="overlay-icon">
              <KeyboardIcon size={20} />
            </span>
            <div className="overlay-body">
              <span className="overlay-label">صفحه‌کلید</span>
              <span className="overlay-note">{layoutLabel(payload.label ?? '')}</span>
            </div>
          </>
        )}

        {payload.kind === 'power' && (
          <>
            <span className={`overlay-icon${payload.charging ? ' on' : ''}`}>
              {payload.charging ? <BoltIcon size={20} /> : <BatteryIcon size={20} />}
            </span>
            <div className="overlay-body">
              <span className="overlay-label">{payload.charging ? 'در حال شارژ' : 'باتری'}</span>
              <span className="overlay-meter">
                <span
                  className="overlay-meter-fill"
                  style={{ transform: `scaleX(${Math.min(1, Math.max(0, (payload.battery ?? 0) / 100))})` }}
                />
              </span>
            </div>
            <span className="overlay-value">{percent(payload.battery ?? 0)}</span>
          </>
        )}
      </div>
    </div>
  )
}
