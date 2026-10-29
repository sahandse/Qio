import { useEffect, useRef, useState } from 'react'
import type { AiMessage, AppState } from '@shared/types'
import { toPersianDigits } from '../lib/jalali'
import {
  ICON,
  CheckIcon,
  CopyIcon,
  SendIcon,
  SettingsIcon,
  SparklesIcon,
  StopIcon,
  TrashIcon
} from './Icons'
import { Status } from './Status'

interface Props {
  state: AppState | null
  busy: boolean
  /** Text arriving from the provider while an answer streams in. */
  streaming: string
  error: string | null
  online: boolean
  onSend: (text: string) => void
  onStop: () => void
  onRetry: () => void
  onOpenSettings: () => void
}

const SUGGESTIONS = ['امروز روی چه چیزی تمرکز کنم؟', 'یک ایدهٔ کوچک برای شروع', 'این مفهوم را ساده توضیح بده']

interface Chunk {
  code: boolean
  body: string
}

/** Splits an answer into prose and fenced code; an unfinished fence counts as code. */
function parseAnswer(text: string): Chunk[] {
  const chunks: Chunk[] = []
  let rest = text
  while (rest.length > 0) {
    const open = rest.indexOf('```')
    if (open === -1) {
      chunks.push({ code: false, body: rest })
      break
    }
    const before = rest.slice(0, open)
    if (before.trim()) chunks.push({ code: false, body: before })
    let tail = rest.slice(open + 3)
    const firstBreak = tail.indexOf('\n')
    if (firstBreak !== -1 && /^[\w+#.-]{0,16}$/.test(tail.slice(0, firstBreak).trim())) {
      tail = tail.slice(firstBreak + 1)
    }
    const close = tail.indexOf('```')
    const code = (close === -1 ? tail : tail.slice(0, close)).replace(/\n$/, '')
    if (code.trim()) chunks.push({ code: true, body: code })
    rest = close === -1 ? '' : tail.slice(close + 3)
  }
  return chunks
}

/** Clipboard write through the main process, with a short "copied" flash. */
function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    []
  )

  const copy = (value: string) => {
    void window.qio.system.copyText(value).then((ok) => {
      if (!ok) return
      setCopied(true)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1600)
    })
  }

  return [copied, copy]
}

function CodeBlock({ code }: { code: string }) {
  const [copied, copy] = useCopy()
  return (
    <div className="ai-code-wrap">
      <pre className="ai-code" dir="ltr">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        className={`ai-code-copy${copied ? ' done' : ''}`}
        onClick={() => copy(code)}
        title={copied ? 'کپی شد' : 'کپی کد'}
        aria-label={copied ? 'کپی شد' : 'کپی کد'}
      >
        {copied ? <CheckIcon size={ICON.xs} /> : <CopyIcon size={ICON.xs} />}
      </button>
    </div>
  )
}

function Bubble({ message }: { message: AiMessage }) {
  const [copied, copy] = useCopy()
  const assistant = message.role === 'assistant'
  const chunks: Chunk[] = assistant ? parseAnswer(message.text) : [{ code: false, body: message.text }]

  return (
    <div className={`ai-msg ${message.role}`}>
      {chunks.map((chunk, index) =>
        chunk.code ? (
          <CodeBlock key={index} code={chunk.body} />
        ) : (
          <p key={index} dir="auto">
            {chunk.body.trim()}
          </p>
        )
      )}
      {assistant && (
        <button
          type="button"
          className={`ai-copy${copied ? ' done' : ''}`}
          onClick={() => copy(message.text)}
          title={copied ? 'کپی شد' : 'کپی پاسخ'}
          aria-label={copied ? 'کپی شد' : 'کپی پاسخ'}
        >
          {copied ? <CheckIcon size={ICON.xs} /> : <CopyIcon size={ICON.xs} />}
        </button>
      )}
    </div>
  )
}

export function AiPanel({
  state,
  busy,
  streaming,
  error,
  online,
  onSend,
  onStop,
  onRetry,
  onOpenSettings
}: Props) {
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const ai = state?.ai
  const ready = Boolean(ai?.settings.ready)
  const messages = ai?.messages ?? []

  useEffect(() => {
    const element = listRef.current
    if (!element) return
    element.scrollTop = element.scrollHeight
  }, [messages.length, streaming, busy])

  const submit = () => {
    const value = text.trim()
    if (!value || busy) return
    setText('')
    onSend(value)
  }

  return (
    <div className="ai-chat">
      <header className="ai-chat-head">
        <span className="ai-chat-model">
          <span className="ai-chat-dot" aria-hidden="true" />
          <span className="ai-chat-provider">{ai?.settings.providerLabel ?? 'هوش مصنوعی'}</span>
          <span className="ai-chat-name" dir="ltr">
            {ai?.settings.effectiveModel ?? ''}
          </span>
        </span>
        <span className="ai-chat-tools">
          {messages.length > 0 && (
            <button
              type="button"
              className="ai-tool"
              title="گفت‌وگوی تازه"
              aria-label="گفت‌وگوی تازه"
              onClick={() => void window.qio.ai.clear()}
            >
              <TrashIcon size={ICON.xs} />
            </button>
          )}
          <button
            type="button"
            className="ai-tool"
            title="تنظیمات هوش مصنوعی"
            aria-label="تنظیمات هوش مصنوعی"
            onClick={onOpenSettings}
          >
            <SettingsIcon size={ICON.xs} />
          </button>
        </span>
      </header>

      {!ready ? (
        <div className="ai-setup">
          <span className="ai-setup-mark" aria-hidden="true">
            <SparklesIcon size={ICON.lg} />
          </span>
          <strong>یک قدم تا گفت‌وگو</strong>
          <p>
            در تنظیمات، سرویس دلخواهت را انتخاب کن و کلید API را بگذار؛ کلید فقط روی همین دستگاه
            می‌ماند و جای دیگری نمی‌رود.
          </p>
          <button type="button" className="ai-setup-cta" onClick={onOpenSettings}>
            باز کردن تنظیمات هوش مصنوعی
          </button>
        </div>
      ) : (
        <>
          <div className="ai-chat-list" data-scroll ref={listRef}>
            {messages.length === 0 && !busy && (
              <div className="ai-chat-empty">
                <SparklesIcon size={ICON.md} />
                <span>هر چیزی بپرسی، همین‌جا جواب می‌گیرد — گفت‌وگو برای دفعهٔ بعد می‌ماند.</span>
              </div>
            )}
            {messages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))}
            {busy && (
              <div className="ai-msg assistant streaming" aria-busy="true">
                {streaming ? (
                  <p dir="auto">
                    {streaming}
                    <span className="ai-caret" aria-hidden="true" />
                  </p>
                ) : (
                  <span className="ai-thinking" role="status" aria-label="در حال فکر کردن">
                    <span />
                    <span />
                    <span />
                  </span>
                )}
              </div>
            )}
            {messages.length === 0 && !busy && (
              <div className="ai-suggestions">
                {SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion} type="button" className="ai-suggestion" onClick={() => setText(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="ai-error">
              <Status tone="danger" role="alert">
                {error}
              </Status>
              <button
                type="button"
                className="ai-retry"
                onClick={onRetry}
                disabled={busy || !online}
                title="فرستادن دوبارهٔ همان پیام"
              >
                دوباره
              </button>
            </div>
          )}

          {!online && (
            <div className="ai-offline">
              <Status tone="warn">اینترنت وصل نیست؛ پاسخ تا وصل‌شدن نمی‌رسد.</Status>
            </div>
          )}

          <form
            className="ai-composer"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <input
              className="ai-input"
              value={text}
              maxLength={4000}
              placeholder={
                !online
                  ? 'آفلاین — اتصال را بررسی کن'
                  : busy
                    ? 'در حال نوشتن پاسخ…'
                    : 'از هوش مصنوعی بپرس…'
              }
              aria-label="پیام به هوش مصنوعی"
              disabled={busy}
              onChange={(event) => setText(event.target.value)}
            />
            {busy ? (
              <button
                type="button"
                className="ai-send stop"
                onClick={onStop}
                title="توقف پاسخ"
                aria-label="توقف پاسخ"
              >
                <StopIcon size={ICON.xs} />
              </button>
            ) : (
              <button
                type="submit"
                className="ai-send"
                disabled={!text.trim() || !online}
                title="ارسال"
                aria-label="ارسال"
              >
                <SendIcon size={ICON.sm} />
              </button>
            )}
          </form>
          <span className="ai-foot">
            {messages.length > 0
              ? `${toPersianDigits(messages.length)} پیام در این گفت‌وگو`
              : 'Enter می‌فرستد'}
          </span>
        </>
      )}
    </div>
  )
}
