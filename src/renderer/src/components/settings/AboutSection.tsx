import { TelegramIcon } from '../Icons'

export function AboutSection() {
  return (
    <section className="settings-card settings-about">
      <h3>درباره</h3>
      <button
        type="button"
        className="about-telegram"
        onClick={() => void window.qio.window.openExternal('https://t.me/sahandse')}
        title="گفت‌وگو در تلگرام"
      >
        <span className="about-telegram-mark" aria-hidden="true">
          <TelegramIcon size={17} />
        </span>
        <span className="about-telegram-id" dir="ltr">
          @sahandse
        </span>
      </button>
    </section>
  )
}
