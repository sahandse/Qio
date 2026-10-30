import type { Settings } from '@shared/types'
import { HourRow, NumberRow, Toggle } from './controls'

export function HealthSection({
  settings,
  onPatch
}: {
  settings: Settings
  onPatch: (next: Partial<Settings>) => void
}) {
  return (
    <>
      <section className="settings-card">
        <h3>آب</h3>
        <NumberRow
          label="اندازهٔ بطری"
          value={settings.water.bottleMl}
          min={100}
          max={3000}
          step={50}
          suffix="میلی‌لیتر"
          onChange={(next) => onPatch({ water: { ...settings.water, bottleMl: next } })}
        />
        <NumberRow
          label="هدف روزانه"
          value={settings.water.goalMl}
          min={250}
          max={8000}
          step={250}
          suffix="میلی‌لیتر"
          onChange={(next) => onPatch({ water: { ...settings.water, goalMl: next } })}
        />
        <NumberRow
          label="یادآوری هر"
          value={settings.water.remindEveryMin}
          min={15}
          max={240}
          step={15}
          suffix="دقیقه"
          onChange={(next) => onPatch({ water: { ...settings.water, remindEveryMin: next } })}
        />
        <HourRow
          label="شروع یادآوری"
          value={settings.water.startHour}
          onChange={(next) => onPatch({ water: { ...settings.water, startHour: next } })}
        />
        <HourRow
          label="پایان یادآوری"
          value={settings.water.endHour}
          onChange={(next) => onPatch({ water: { ...settings.water, endHour: next } })}
        />
        <Toggle
          label="یادآوری آب"
          hint="یک یادآوری آرام در نچ، وقتی هنوز به هدف نرسیده‌ای"
          checked={settings.water.reminders}
          onChange={(next) => onPatch({ water: { ...settings.water, reminders: next } })}
        />
      </section>

      <section className="settings-card">
        <h3>تمرکز</h3>
        <NumberRow
          label="طول تمرین"
          value={settings.focus.workMin}
          min={5}
          max={120}
          step={5}
          suffix="دقیقه"
          onChange={(next) => onPatch({ focus: { ...settings.focus, workMin: next } })}
        />
        <NumberRow
          label="استراحت کوتاه"
          value={settings.focus.shortBreakMin}
          min={1}
          max={60}
          suffix="دقیقه"
          onChange={(next) => onPatch({ focus: { ...settings.focus, shortBreakMin: next } })}
        />
        <NumberRow
          label="استراحت بلند"
          value={settings.focus.longBreakMin}
          min={5}
          max={90}
          step={5}
          suffix="دقیقه"
          onChange={(next) => onPatch({ focus: { ...settings.focus, longBreakMin: next } })}
        />
        <NumberRow
          label="استراحت بلند هر"
          value={settings.focus.longBreakEvery}
          min={2}
          max={12}
          suffix="دوره"
          onChange={(next) => onPatch({ focus: { ...settings.focus, longBreakEvery: next } })}
        />
        <Toggle
          label="صدای زنگ"
          hint="دو نُت نرم وقتی یک دوره تمام می‌شود"
          checked={settings.focus.chime}
          onChange={(next) => onPatch({ focus: { ...settings.focus, chime: next } })}
        />
      </section>

      <section className="settings-card">
        <h3>حرکت</h3>
        <Toggle
          label="یادآور بلند شدن"
          hint="وقتی مدتی پشت میز می‌مانی، نچ بلندت می‌کند"
          checked={settings.move.enabled}
          onChange={(next) => onPatch({ move: { ...settings.move, enabled: next } })}
        />
        <NumberRow
          label="هر"
          value={settings.move.everyMin}
          min={20}
          max={180}
          step={5}
          suffix="دقیقه"
          onChange={(next) => onPatch({ move: { ...settings.move, everyMin: next } })}
        />
        <HourRow
          label="از ساعت"
          value={settings.move.startHour}
          onChange={(next) => onPatch({ move: { ...settings.move, startHour: next } })}
        />
        <HourRow
          label="تا ساعت"
          value={settings.move.endHour}
          onChange={(next) => onPatch({ move: { ...settings.move, endHour: next } })}
        />
        <Toggle
          label="اعلان ویندوز"
          hint="علاوه بر نچ، یک اعلان هم گوشهٔ صفحه نشان داده شود"
          checked={settings.move.notify}
          onChange={(next) => onPatch({ move: { ...settings.move, notify: next } })}
        />
        <p className="settings-note">
          هر پنج دقیقه بدون لمس کیبورد و ماوس استراحت حساب می‌شود و شمارنده از نو شروع می‌شود؛
          فقط حضور پیوسته پشت میز به یادآور می‌رسد.
        </p>
      </section>
    </>
  )
}
