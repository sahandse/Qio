import type { AiSettings } from '@shared/types'
import { resolveAi } from '@shared/ai'

export interface AiPrompt {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Requests the user cancelled on purpose, kept apart from real failures. */
export class AiAbortError extends Error {
  constructor() {
    super('aborted')
    this.name = 'AiAbortError'
  }
}

export class AiError extends Error {}

const STREAM_TIMEOUT_MS = 120_000
const TEST_TIMEOUT_MS = 30_000

function redact(text: string, key: string): string {
  if (!key) return text
  return text.split(key).join('***')
}

function statusMessage(status: number, label: string): string {
  if (status === 401 || status === 403) return 'کلید API پذیرفته نشد؛ یک‌بار دیگر بررسی‌اش کن.'
  if (status === 402) return 'اعتبار حساب این سرویس کافی نیست.'
  if (status === 404) return 'مدل یا آدرس پیدا نشد؛ نام مدل و Base URL را بررسی کن.'
  if (status === 408 || status === 504) return `${label} دیر پاسخ داد؛ دوباره امتحان کن.`
  if (status === 429) return 'درخواست‌ها زیاد شد؛ کمی بعد دوباره امتحان کن.'
  if (status >= 500) return `${label} الان پاسخ نمی‌دهد؛ بعداً امتحان کن.`
  return `${label} درخواست را رد کرد (کد ${status}).`
}

interface Deadline {
  signal: AbortSignal
  timedOut(): boolean
  done(): void
}

function deadline(signal: AbortSignal, ms: number): Deadline {
  const controller = new AbortController()
  let timedOut = false
  const onAbort = (): void => controller.abort()
  if (signal.aborted) controller.abort()
  else signal.addEventListener('abort', onAbort, { once: true })
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, ms)
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    done: () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
    }
  }
}

interface Prepared {
  url: string
  model: string
  key: string
  label: string
  headers: Record<string, string>
}

function prepare(settings: AiSettings): Prepared {
  const resolved = resolveAi(settings)
  if (!resolved.url) throw new AiError('آدرس سرویس خالی است؛ Base URL را در تنظیمات پر کن.')
  if (!resolved.model) throw new AiError('نام مدل خالی است؛ در تنظیمات یک مدل بنویس.')
  if (resolved.needsKey && !resolved.key) throw new AiError('کلید API ثبت نشده؛ در تنظیمات هوش مصنوعی واردش کن.')
  return {
    url: resolved.url,
    model: resolved.model,
    key: resolved.key,
    label: resolved.label,
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
      ...(resolved.key ? { authorization: `Bearer ${resolved.key}` } : {})
    }
  }
}

function body(prepared: Prepared, settings: AiSettings, messages: AiPrompt[], stream: boolean): string {
  return JSON.stringify({
    model: prepared.model,
    messages,
    stream,
    temperature: Math.min(2, Math.max(0, settings.temperature)),
    ...(stream ? {} : { max_tokens: 1 })
  })
}

async function failure(response: Response, prepared: Prepared): Promise<AiError> {
  let detail = ''
  try {
    detail = (await response.text()).slice(0, 400)
  } catch {
    // The status alone is still useful.
  }
  const hint = /model/i.test(detail) ? ' نام مدل را بررسی کن.' : ''
  return new AiError(statusMessage(response.status, prepared.label) + hint)
}

function contentOf(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const choices = (value as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return ''
  const choice = choices[0] as Record<string, unknown>
  const delta = choice.delta as { content?: unknown } | undefined
  const message = choice.message as { content?: unknown } | undefined
  const candidates = [delta?.content, choice.text, message?.content]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate) return candidate
  }
  return ''
}

/** Streams one completion, calling onDelta with each piece of text. */
export async function streamCompletion(
  settings: AiSettings,
  messages: AiPrompt[],
  signal: AbortSignal,
  onDelta: (chunk: string) => void
): Promise<string> {
  const prepared = prepare(settings)
  const gate = deadline(signal, STREAM_TIMEOUT_MS)
  try {
    const response = await fetch(prepared.url, {
      method: 'POST',
      headers: prepared.headers,
      body: body(prepared, settings, messages, true),
      signal: gate.signal
    })
    if (!response.ok) throw await failure(response, prepared)

    const type = response.headers.get('content-type') ?? ''
    if (!response.body || !type.includes('event-stream')) {
      let parsed: unknown = null
      try {
        parsed = await response.json()
      } catch {
        throw new AiError(`${prepared.label} پاسخ خوانا نفرستاد.`)
      }
      const text = contentOf(parsed)
      if (!text) throw new AiError(`${prepared.label} پاسخ خالی فرستاد.`)
      onDelta(text)
      return text
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let newline = buffer.indexOf('\n')
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        newline = buffer.indexOf('\n')
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (data === '[DONE]') return full
        let parsed: unknown = null
        try {
          parsed = JSON.parse(data)
        } catch {
          continue
        }
        const chunk = contentOf(parsed)
        if (!chunk) continue
        full += chunk
        onDelta(chunk)
      }
    }
    return full
  } catch (error) {
    if (gate.timedOut()) throw new AiError(`${prepared.label} دیر پاسخ داد؛ دوباره امتحان کن.`)
    if (signal.aborted) throw new AiAbortError()
    if (error instanceof AiError) throw error
    const message = error instanceof Error ? redact(error.message, prepared.key) : ''
    if (/abort/i.test(message)) throw new AiAbortError()
    throw new AiError(`اتصال به ${prepared.label} برقرار نشد؛ اینترنت یا Base URL را بررسی کن.`)
  } finally {
    gate.done()
  }
}

/** Sends a one-token request so the settings page can confirm the key and model. */
export async function testCompletion(settings: AiSettings): Promise<{ ok: boolean; error?: string; ms?: number }> {
  const started = Date.now()
  const controller = new AbortController()
  const gate = deadline(controller.signal, TEST_TIMEOUT_MS)
  try {
    const prepared = prepare(settings)
    const response = await fetch(prepared.url, {
      method: 'POST',
      headers: prepared.headers,
      body: body(prepared, settings, [{ role: 'user', content: 'سلام' }], false),
      signal: gate.signal
    })
    if (!response.ok) throw await failure(response, prepared)
    await response.arrayBuffer()
    return { ok: true, ms: Date.now() - started }
  } catch (error) {
    if (gate.timedOut()) return { ok: false, error: 'پاسخ دیر آمد؛ دوباره امتحان کن.' }
    if (error instanceof AiError) return { ok: false, error: error.message }
    return { ok: false, error: 'اتصال برقرار نشد؛ اینترنت یا Base URL را بررسی کن.' }
  } finally {
    gate.done()
  }
}
