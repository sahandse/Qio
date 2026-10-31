import type { Settings } from '@shared/types'
import { ICON, BoltIcon } from '../Icons'
import { NumberRow, SliderRow, Toggle } from './controls'
import { Card, Chip, SettingRow } from './ui'

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
      <Card title="Qio">
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
        <Toggle
          label="حالت آرام"
          hint="حرکت‌های تزئینی، ورود پله‌ای و غلتیدن اعداد خاموش می‌شود"
          checked={settings.calm}
          onChange={(next) => onPatch({ calm: next })}
        />
        <Toggle
          label="رنگ فصل"
          hint="نچ با ماه جاری هم‌رنگ می‌شود؛ نوروز و یلدا جلوهٔ خودشان را دارند"
          checked={settings.seasonal}
          onChange={(next) => onPatch({ seasonal: next })}
        />
      </Card>

      <Card title="ساعت">
        <SettingRow
          label="حالت ساعت"
          hint={
            settings.presence.mode === 'always'
              ? 'ساعت همیشه روی نچ می‌ماند.'
              : 'ساعت بیشتر وقت‌ها کنار می‌رود و هر چند دقیقه یک‌بار برمی‌گردد.'
          }
        >
          <span className="setting-chips" role="group" aria-label="حالت ساعت">
            <Chip
              active={settings.presence.mode === 'always'}
              onClick={() => onPatch({ presence: { ...settings.presence, mode: 'always' } })}
            >
              همیشه
            </Chip>
            <Chip
              active={settings.presence.mode === 'peek'}
              onClick={() => onPatch({ presence: { ...settings.presence, mode: 'peek' } })}
            >
              دوره‌ای
            </Chip>
          </span>
        </SettingRow>
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
      </Card>

      <Card title="جای نچ">
        <SettingRow
          label="به کدام لبه بچسبد"
          hint={
            settings.notchPosition === 'center'
              ? 'وسطِ لبهٔ بالا؛ همان جای همیشگی.'
              : settings.notchPosition === 'left'
                ? 'گوشهٔ چپ لبهٔ بالا؛ کنار منوی استارت.'
                : 'گوشهٔ راست لبهٔ بالا؛ کنار ساعت ویندوز.'
          }
        >
          <span className="setting-chips" role="group" aria-label="جای نچ">
            <Chip active={settings.notchPosition === 'right'} onClick={() => onPatch({ notchPosition: 'right' })}>
              راست
            </Chip>
            <Chip active={settings.notchPosition === 'center'} onClick={() => onPatch({ notchPosition: 'center' })}>
              وسط
            </Chip>
            <Chip active={settings.notchPosition === 'left'} onClick={() => onPatch({ notchPosition: 'left' })}>
              چپ
            </Chip>
          </span>
        </SettingRow>
        <p className="settings-note">
          جابه‌جایی بی‌درنگ روی نمایشگر اصلی اعمال می‌شود؛ نچ مهمان‌نوازِ لبه‌هاست و هشت پیکسل
          هوا برای سایه‌اش نگه می‌دارد. اگر نمایشگر دومی وصل یا قطع شود، همان‌جا می‌ماند.
        </p>
      </Card>

      <Card title="خاطرهٔ کلیپ‌بورد">
        <Toggle
          label="چیزهایی که کپی می‌کنی را به یاد آور"
          hint="فقط در حافظهٔ همین نشست؛ روی دیسک نوشته نمی‌شود و با بستن Qio فراموش می‌شود"
          checked={settings.clipboard.enabled}
          onChange={(next) => onPatch({ clipboard: { ...settings.clipboard, enabled: next } })}
        />
        {settings.clipboard.enabled && (
          <NumberRow
            label="حداکثر"
            value={settings.clipboard.limit}
            min={5}
            max={100}
            step={5}
            suffix="مورد"
            onChange={(next) => onPatch({ clipboard: { ...settings.clipboard, limit: next } })}
          />
        )}
        <p className="settings-note">
          تا این کلید خاموش است، Qio اصلاً کلیپ‌بورد را نمی‌خواند. روشن که کردی، متن و تصویر
          نگه داشته می‌شود؛ فایل‌هایی که از Explorer کپی می‌کنی نه — همان‌ها را قفسه دارد.
          تاریخچه در همان پنجرهٔ قفسه، تب «کلیپ‌بورد» است.
        </p>
      </Card>

      <Card title="کنترل">
        <div className="settings-note">
          کلیدهای ۱ تا ۹ بین صفحه‌ها جابه‌جا می‌شوند، Esc پنل را می‌بندد و چرخ ماوس هم صفحه بعد را می‌آورد.
        </div>
        <div className="settings-actions">
          <button type="button" className="pill" onClick={() => void window.qio.window.setVisible(false)}>
            <BoltIcon size={ICON.xs} /> پنهان کردن نچ
          </button>
          <button type="button" className="pill danger" onClick={() => void window.qio.window.quit()}>
            خروج از Qio
          </button>
        </div>
      </Card>
    </>
  )
}
