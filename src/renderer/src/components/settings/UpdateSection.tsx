import { useEffect } from 'react'
import type { UpdateState } from '@shared/types'
import { toPersianDigits } from '../../lib/jalali'
import { Card } from './ui'

function statusText(update: UpdateState): string {
  switch (update.phase) {
    case 'idle':
      return 'هنوز نسخه را بررسی نکرده‌ایم.'
    case 'checking':
      return 'در حال بررسی گیت‌هاب…'
    case 'latest':
      return update.latest
        ? `نسخهٔ ${toPersianDigits(update.latest)} آخرین نسخه است.`
        : 'نسخهٔ تازه‌ای در دسترس نیست.'
    case 'available': {
      const size = update.sizeMb ? ` · ${toPersianDigits(update.sizeMb.toFixed(1))} مگابایت` : ''
      return `نسخهٔ ${toPersianDigits(update.latest ?? '')} آمادهٔ دریافت است${size}`
    }
    case 'downloading':
      return `در حال دریافت… ٪${toPersianDigits(Math.round(update.progress * 100))}`
    case 'verifying':
      return 'در حال بررسی هش SHA‑256…'
    case 'ready':
      return 'هش SHA‑256 تأیید شد؛ فایل سالم است.'
    case 'installing':
      return 'در حال نصب؛ Qio دوباره باز می‌شود…'
    case 'error':
      return update.error ?? 'مشکلی پیش آمد.'
  }
}

export function UpdateSection({ update }: { update: UpdateState }) {
  useEffect(() => {
    // Ask once when the card first appears; later phases arrive through AppState.
    if (update.phase === 'idle') void window.qio.updater.check()
  }, [])

  const busy =
    update.phase === 'checking' ||
    update.phase === 'downloading' ||
    update.phase === 'verifying' ||
    update.phase === 'installing'
  const percent = Math.round(update.progress * 100)

  return (
    <Card title="به‌روزرسانی" className="wide update-card">
      <div className="update-head">
        <span className="update-version">نسخهٔ {toPersianDigits(update.current)}</span>
        <span className={`update-state is-${update.phase}`}>{statusText(update)}</span>
      </div>

      {busy && update.phase !== 'checking' && (
        <div
          className="update-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span className="update-fill" style={{ width: `${percent}%` }} />
        </div>
      )}

      {update.phase === 'ready' && update.sha && (
        <p className="update-sha" dir="ltr">
          SHA-256 {update.sha.slice(0, 24)}…
        </p>
      )}

      <div className="settings-actions">
        {(update.phase === 'idle' || update.phase === 'latest') && (
          <button type="button" className="pill primary" onClick={() => void window.qio.updater.check()}>
            بررسی دوباره
          </button>
        )}
        {update.phase === 'available' && (
          <button type="button" className="pill primary" onClick={() => void window.qio.updater.download()}>
            دریافت به‌روزرسانی
          </button>
        )}
        {update.phase === 'ready' &&
          (update.installable ? (
            <button type="button" className="pill primary" onClick={() => void window.qio.updater.install()}>
              نصب و راه‌اندازی دوباره
            </button>
          ) : (
            <span className="update-dev">نصب فقط در نسخهٔ نصب‌شده ممکن است.</span>
          ))}
        {update.phase === 'error' && (
          <>
            <button
              type="button"
              className="pill"
              onClick={() => void (update.latest ? window.qio.updater.download() : window.qio.updater.check())}
            >
              تلاش دوباره
            </button>
            {update.latest && (
              <button type="button" className="pill" onClick={() => void window.qio.updater.check()}>
                بررسی دوباره
              </button>
            )}
          </>
        )}
      </div>

      <p className="settings-note">
        فایل نصب پیش از اجرا با هش SHA‑256 گیت‌هاب مقایسه می‌شود؛ اگر یکی نباشد اصلاً اجرا نمی‌شود.
      </p>
    </Card>
  )
}
