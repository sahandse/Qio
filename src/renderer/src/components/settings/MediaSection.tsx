import type { SystemState } from '@shared/types'
import { MuteIcon, SunIcon, VolumeIcon } from '../Icons'
import { SliderRow, Toggle } from './controls'

export function MediaSection({ system }: { system: SystemState }) {
  return (
    <section className="settings-card wide">
      <h3>صدا و صفحه</h3>
      <SliderRow
        label="صدا"
        icon={system.muted ? <MuteIcon size={13} /> : <VolumeIcon size={13} />}
        value={system.volume ?? 0}
        disabled={system.volume === null}
        onChange={(next) => void window.qio.system.setVolume(next)}
      />
      <Toggle
        label="بی‌صدا"
        checked={system.muted}
        onChange={(next) => void window.qio.system.setMute(next)}
      />
      <SliderRow
        label="روشنایی"
        icon={<SunIcon size={13} />}
        value={system.brightness ?? 0}
        disabled={system.brightness === null}
        onChange={(next) => void window.qio.system.setBrightness(next)}
      />
      {system.brightness === null && (
        <p className="settings-note">
          روشنایی روی نمایشگر داخلی لپ‌تاپ کار می‌کند؛ مانیتور خارجی کنترل خودش را دارد.
        </p>
      )}
      <div className="settings-note">ساعت Qio همیشه ۲۴ساعته است؛ به تنظیم ساعت ویندوز کاری ندارد.</div>
    </section>
  )
}
