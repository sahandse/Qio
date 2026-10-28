import type { AiProviderId, AiSettings } from './types'

export interface AiProvider {
  id: AiProviderId
  label: string
  /** Empty only for the custom provider, where the user types the address. */
  baseUrl: string
  model: string
  needsKey: boolean
  group: 'iranian' | 'foreign' | 'local' | 'custom'
  hint: string
}

/**
 * Every entry speaks the OpenAI chat-completions protocol, including Gemini's
 * compatibility endpoint, so one small client covers all of them.
 */
export const AI_PROVIDERS: AiProvider[] = [
  {
    id: 'gapgpt',
    label: 'GapGPT',
    baseUrl: 'https://api.gapgpt.app/v1',
    model: 'gpt-4o-mini',
    needsKey: true,
    group: 'iranian',
    hint: 'ایرانی · کلید از پنل گپ‌جی‌پی‌تی'
  },
  {
    id: 'avalai',
    label: 'AvalAI',
    baseUrl: 'https://api.avalai.ir/v1',
    model: 'gpt-4o-mini',
    needsKey: true,
    group: 'iranian',
    hint: 'ایرانی · کلید از پنل اوال‌ای‌آی'
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · کلید از platform.openai.com'
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · کلید از platform.deepseek.com'
  },
  {
    id: 'gemini',
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · رابط سازگار OpenAI'
  },
  {
    id: 'qwen',
    label: 'Qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · DashScope'
  },
  {
    id: 'grok',
    label: 'Grok',
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-3-mini',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · کلید از console.x.ai'
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · یک کلید، چند مدل'
  },
  {
    id: 'ollama',
    label: 'Ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'llama3.2',
    needsKey: false,
    group: 'local',
    hint: 'محلی · روی همین دستگاه'
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    baseUrl: 'http://127.0.0.1:1234/v1',
    model: 'local-model',
    needsKey: false,
    group: 'local',
    hint: 'محلی · سرور LM Studio'
  },
  {
    id: 'custom',
    label: 'سازگار با OpenAI',
    baseUrl: '',
    model: '',
    needsKey: false,
    group: 'custom',
    hint: 'هر سروری که /chat/completions دارد'
  }
]

export const AI_GROUPS: { id: AiProvider['group']; label: string }[] = [
  { id: 'iranian', label: 'ایرانی' },
  { id: 'foreign', label: 'خارجی' },
  { id: 'local', label: 'محلی' },
  { id: 'custom', label: 'دیگر' }
]

export const DEFAULT_SYSTEM_PROMPT =
  'تو دستیار کوچک Qio هستی. کوتاه، مفید و به فارسی پاسخ بده؛ مگر اینکه کاربر زبان دیگری بخواهد.'

export function providerById(id: AiProviderId): AiProvider {
  return AI_PROVIDERS.find((provider) => provider.id === id) ?? AI_PROVIDERS[0]
}

export function aiBase(settings: Pick<AiSettings, 'provider' | 'baseUrl'>): string {
  const provider = providerById(settings.provider)
  const base = (settings.baseUrl || provider.baseUrl).trim().replace(/\/+$/, '')
  return /^https?:\/\//i.test(base) ? base : ''
}

export function aiModel(settings: Pick<AiSettings, 'provider' | 'model'>): string {
  return (settings.model || providerById(settings.provider).model).trim()
}

export function aiEndpointUrl(settings: Pick<AiSettings, 'provider' | 'baseUrl'>): string {
  const base = aiBase(settings)
  if (!base) return ''
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`
}

export interface ResolvedAi {
  url: string
  model: string
  key: string
  label: string
  needsKey: boolean
}

export function resolveAi(settings: AiSettings): ResolvedAi {
  const provider = providerById(settings.provider)
  return {
    url: aiEndpointUrl(settings),
    model: aiModel(settings),
    key: settings.apiKey.trim(),
    label: provider.label,
    needsKey: provider.needsKey
  }
}

export function aiReady(settings: AiSettings): boolean {
  const resolved = resolveAi(settings)
  if (!resolved.url || !resolved.model) return false
  return resolved.needsKey ? Boolean(resolved.key) : true
}
