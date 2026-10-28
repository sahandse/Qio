import { toPersianDigits } from '../lib/jalali'
import { LinkIcon } from './Icons'

interface AiService {
  id: string
  name: string
  host: string
  url: string
  /** Accent of the tile, as an rgb triplet, so each service keeps its own colour. */
  accent: string
}

const IRANIAN: AiService[] = [
  { id: 'gapgpt', name: 'گپ‌جی‌پی‌تی', host: 'gapgpt.app', url: 'https://gapgpt.app', accent: '138, 230, 192' },
  { id: 'houshyar', name: 'همیار ۲۴', host: 'houshyar24.ir', url: 'https://houshyar24.ir', accent: '242, 200, 121' },
  { id: 'avalai', name: 'اوال‌ای‌آی', host: 'avalai.ir', url: 'https://avalai.ir', accent: '122, 196, 255' },
  { id: 'ivira', name: 'ویرا', host: 'ivira.ai', url: 'https://ivira.ai', accent: '255, 152, 178' },
  { id: 'yarabot', name: 'یارابات', host: 'yarabot.ir', url: 'https://yarabot.ir', accent: '181, 156, 255' },
  { id: 'zigap', name: 'زیگپ', host: 'zigap.ir', url: 'https://zigap.ir', accent: '110, 220, 214' }
]

const FOREIGN: AiService[] = [
  { id: 'chatgpt', name: 'ChatGPT', host: 'chatgpt.com', url: 'https://chatgpt.com', accent: '126, 232, 168' },
  { id: 'claude', name: 'Claude', host: 'claude.ai', url: 'https://claude.ai', accent: '240, 160, 120' },
  { id: 'gemini', name: 'Gemini', host: 'gemini.google.com', url: 'https://gemini.google.com', accent: '140, 170, 255' },
  { id: 'deepseek', name: 'DeepSeek', host: 'deepseek.com', url: 'https://chat.deepseek.com', accent: '130, 150, 255' },
  { id: 'grok', name: 'Grok', host: 'grok.com', url: 'https://grok.com', accent: '205, 208, 216' },
  { id: 'perplexity', name: 'Perplexity', host: 'perplexity.ai', url: 'https://www.perplexity.ai', accent: '108, 205, 214' },
  { id: 'qwen', name: 'Qwen', host: 'chat.qwen.ai', url: 'https://chat.qwen.ai', accent: '178, 148, 255' },
  { id: 'copilot', name: 'Copilot', host: 'microsoft.com', url: 'https://copilot.microsoft.com', accent: '120, 198, 255' }
]

function Group({ label, services, columns }: { label: string; services: AiService[]; columns: 3 | 4 }) {
  return (
    <section className="ai-group">
      <header className="ai-group-head">
        <strong>{label}</strong>
        <span>{toPersianDigits(services.length)} سرویس</span>
      </header>
      <div className={`ai-grid cols-${columns}`}>
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            className="ai-tile"
            style={{ ['--ai' as string]: service.accent }}
            title={service.url}
            onClick={() => void window.qio.window.openExternal(service.url)}
          >
            <span className="ai-dot" aria-hidden="true" />
            <span className="ai-text">
              <span className="ai-name">{service.name}</span>
              <span className="ai-host" dir="ltr">
                {service.host}
              </span>
            </span>
            <LinkIcon size={10} className="ai-open" />
          </button>
        ))}
      </div>
    </section>
  )
}

export function AiPanel() {
  return (
    <div className="ai-page">
      <Group label="ایرانی" services={IRANIAN} columns={3} />
      <Group label="خارجی" services={FOREIGN} columns={4} />
      <p className="ai-hint">در مرورگر پیش‌فرض باز می‌شود — Qio گفت‌وگوها را نمی‌بیند و ذخیره نمی‌کند.</p>
    </div>
  )
}
