import type { Settings } from '@shared/types'
import { BoltIcon } from '../Icons'
import { NumberRow, SliderRow, Toggle } from './controls'

export function GeneralSection({
  settings,
  packaged,
  onPatch
}: {
  settings: Settings
  packaged?: boolean
  onPatch: (next: Partial<Settings>) => void
}) {
  return (
    <>
      <section className="settings-card">
        <h3>Qio</h3>
        <Toggle
          label="اجرا هنگام ورود به ویندوز"
          hint={packaged === false ? 'در نسخهٔ نصب‌شده فعال می‌شود' : 'بعد از هر ورود، Qio منتظرت است'}
          checked={settings.startWithWindows}
          onChange={(next) => onPatch({ startWithWindows: next })}
        />
        <Toggle
          label="نچ باریک"
          hint="به‌جای ساعت، یک خط نازک — مناسب نمایشگرهای کوچک"
          checked={settings.minimalNotch}
          onChange={(next) => onPatch({ minimalNotch: next })}
        />
        <Toggle
          label="متن آهنگ"
          hint="متن هم‌زمان از LRCLIB برای آهنگ در حال پخش"
          checked={settings.lyrics}
          onChange={(next) => onPatch({ lyrics: next })}
        />
        <Toggle
          label="کنار رفتن در تمام‌صفحه"
          hint="وقتی بازی یا ویدیو تمام صفحه است، نچ پنهان می‌شود"
          checked={settings.hideFullscreen}
          onChange={(next) => onPatch({ hideFullscreen: next })}
        />
        <SliderRow
          label="اندازهٔ نچ"
          hint="روی نمایشگرهای پهن خودکار کمی بزرگ‌تر می‌شود"
          value={settings.notchScale * 100}
          min={85}
          max={150}
          step={5}
          onChange={(next) => onPatch({ notchScale: next / 100 })}
        />
        <Toggle
          label="حالت شب خودکار"
          hint="از ۹ شب تا ۷ صبح رنگ‌ها گرم و کم‌نور می‌شوند"
          checked={settings.autoNight}
          onChange={(next) => onPatch({ autoNight: next })}
        />
      </section>

      <section className="settings-card">
        <h3>ساعت</h3>
        <div className="setting-row">
          <span className="setting-text">
            <strong>حالت ساعت</strong>
            <small>
              {settings.presence.mode === 'always'
                ? 'ساعت همیشه روی نچ می‌ماند.'
                : 'ساعت بیشتر وقت‌ها کنار می‌رود و هر چند دقیقه یک‌بار برمی‌گردد.'}
            </small>
          </span>
          <span className="setting-chips" role="group" aria-label="حالت ساعت">
            <button
              type="button"
              className={`setting-chip${settings.presence.mode === 'always' ? ' on' : ''}`}
              aria-pressed={settings.presence.mode === 'always'}
              onClick={() => onPatch({ presence: { ...settings.presence, mode: 'always' } })}
            >
              همیشه
            </button>
            <button
              type="button"
              className={`setting-chip${settings.presence.mode === 'peek' ? ' on' : ''}`}
              aria-pressed={settings.presence.mode === 'peek'}
              onClick={() => onPatch({ presence: { ...settings.presence, mode: 'peek' } })}
            >
              دوره‌ای
            </button>
          </span>
        </div>
        {settings.presence.mode === 'peek' && (
          <>
            <NumberRow
              label="هر"
              value={settings.presence.everyMin}
              min={1}
              max={180}
              suffix="دقیقه"
              onChange={(next) => onPatch({ presence: { ...settings.presence, everyMin: next } })}
            />
            <NumberRow
              label="مدت نمایش"
              value={settings.presence.forSec}
              min={3}
              max={60}
              step={1}
              suffix="ثانیه"
              onChange={(next) => onPatch({ presence: { ...settings.presence, forSec: next } })}
            />
            <p className="settings-note">
              نچ همیشه بالای صفحه می‌ماند؛ فقط ساعت است که در فاصله‌ها پنهان می‌شود. با بردن
              نشانگر روی نچ یا باز کردن پنل، ساعت همان‌جا می‌ماند.
            </p>
          </>
        )}
      </section>

      <section className="settings-card">
        <h3>کنترل</h3>
        <div className="settings-note">
          کلیدهای ۱ تا ۹ بین صفحه‌ها جابه‌جا می‌شوند، Esc پنل را می‌بندد و چرخ ماوس هم صفحه بعد را می‌آورد.
        </div>
        <div className="settings-actions">
          <button type="button" className="pill" onClick={() => void window.qio.window.setVisible(false)}>
            <BoltIcon size={12} /> پنهان کردن نچ
          </button>
          <button type="button" className="pill danger" onClick={() => void window.qio.window.quit()}>
            خروج از Qio
          </button>
        </div>
      </section>
    </>
  )
}
