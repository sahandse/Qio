import { useEffect, useRef, useState } from 'react'
import type { AiMessage, AppState } from '@shared/types'
import { toPersianDigits } from '../lib/jalali'
import { SendIcon, SettingsIcon, SparklesIcon, StopIcon, TrashIcon } from './Icons'

interface Props {
  state: AppState | null
  busy: boolean
  /** Text arriving from the provider while an answer streams in. */
  streaming: string
  error: string | null
  onSend: (text: string) => void
  onStop: () => void
  onOpenSettings: () => void
}

const SUGGESTIONS = ['امروز روی چه چیزی تمرکز کنم؟', 'یک ایدهٔ کوچک برای شروع', 'این مفهوم را ساده توضیح بده']

function Bubble({ message }: { message: AiMessage }) {
  return (
    <div className={`ai-msg ${message.role}`}>
      <p dir="auto">{message.text}</p>
    </div>
  )
}

export function AiPanel({ state, busy, streaming, error, onSend, onStop, onOpenSettings }: Props) {
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
              <TrashIcon size={12} />
            </button>
          )}
          <button
            type="button"
            className="ai-tool"
            title="تنظیمات هوش مصنوعی"
            aria-label="تنظیمات هوش مصنوعی"
            onClick={onOpenSettings}
          >
            <SettingsIcon size={12} />
          </button>
        </span>
      </header>

      {!ready ? (
        <div className="ai-setup">
          <span className="ai-setup-mark" aria-hidden="true">
            <SparklesIcon size={20} />
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
                <SparklesIcon size={18} />
                <span>هر چیزی بپرسی، همین‌جا جواب می‌گیرد — گفت‌وگو برای دفعهٔ بعد می‌ماند.</span>
              </div>
            )}
            {messages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))}
            {busy && (
              <div className="ai-msg assistant streaming">
                <p dir="auto">
                  {streaming}
                  <span className={`ai-caret${streaming ? '' : ' waiting'}`} aria-hidden="true" />
                </p>
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
            <p className="ai-error" role="alert">
              {error}
            </p>
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
              placeholder={busy ? 'در حال نوشتن پاسخ…' : 'از هوش مصنوعی بپرس…'}
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
                <StopIcon size={12} />
              </button>
            ) : (
              <button
                type="submit"
                className="ai-send"
                disabled={!text.trim()}
                title="ارسال"
                aria-label="ارسال"
              >
                <SendIcon size={13} />
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
