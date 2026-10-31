import type { AiProviderId, AiSettings } from './types'

export interface AiProvider {
  id: AiProviderId
  label: string
  /** Empty only for the custom provider, where the user types the address. */
  baseUrl: string
  model: string
  needsKey: boolean
  group: 'iranian' | 'foreign' | 'agents' | 'local' | 'custom'
  hint: string
  /** Suggestions for the model field; any other id the service accepts still works. */
  models: string[]
}

/**
 * Every entry speaks the OpenAI chat-completions protocol, including Gemini's
 * compatibility endpoint, so one small client covers all of them.
 */
export const AI_PROVIDERS: AiProvider[] = [
  {
    id: 'qoder',
    label: 'Qoder',
    baseUrl: 'https://api.qoder.com/v1',
    model: 'qwen3.8-max-preview',
    needsKey: true,
    group: 'agents',
    hint: 'کدنویسی · کلید API از پنل qoder.com',
    models: [
      'qwen3.8-max-preview',
      'qwen3.7-max',
      'qwen3.7-plus',
      'kimi-k3',
      'kimi-k2.7-code',
      'glm-5.2',
      'deepseek-v4-pro',
      'deepseek-v4-flash',
      'minimax-m3'
    ]
  },
  {
    id: 'opencode',
    label: 'OpenCode Zen',
    baseUrl: 'https://opencode.ai/inference/openai/v1',
    model: 'grok-code',
    needsKey: true,
    group: 'agents',
    hint: 'کدنویسی · کلید از opencode.ai · مدل‌های free رایگان‌اند',
    models: [
      'grok-code',
      'gpt-5.6-luna',
      'gpt-5.2',
      'claude-opus-5',
      'claude-sonnet-5',
      'gemini-3.7-flash',
      'kimi-k2',
      'glm-5.1',
      'glm-4.6',
      'minimax-m2.7',
      'qwen3-coder',
      'deepseek-v4-pro',
      'glm-5-free',
      'deepseek-v4-flash-free'
    ]
  },
  {
    id: 'freebuff',
    label: 'Freebuff',
    baseUrl: 'http://127.0.0.1:8080/v1',
    model: 'openai/gpt-6-luna',
    needsKey: false,
    group: 'agents',
    hint: 'رایگان · فقط با پروکسی محلی Freebuff2API که توکن Freebuff می‌خواهد',
    models: [
      'openai/gpt-6-luna',
      'z-ai/glm-5.3-flash',
      'openai/gpt-5.6-luna',
      'anthropic/claude-sonnet-5',
      'moonshotai/kimi-k3',
      'mistralai/mistral-large'
    ]
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · کلید از platform.openai.com',
    models: [
      'gpt-5.6-luna',
      'gpt-5.2',
      'gpt-5.6',
      'gpt-5.5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-4.1',
      'o4-mini',
      'gpt-4o-mini'
    ]
  },
  {
    id: 'gemini',
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-3.7-flash',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · رابط سازگار OpenAI',
    models: [
      'gemini-3.7-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.1-pro-preview',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-flash-latest'
    ]
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-v4-flash',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · کلید از platform.deepseek.com',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-flash', 'deepseek-v4-flash-vision-exp']
  },
  {
    id: 'grok',
    label: 'Grok',
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-4.7',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · کلید از console.x.ai',
    models: ['grok-4.7', 'grok-4.6', 'grok-4.5', 'grok-4.3', 'grok-4.20-0309-reasoning', 'grok-build-0.1']
  },
  {
    id: 'qwen',
    label: 'Qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · DashScope',
    models: [
      'qwen3.8-max',
      'qwen3.8-flash',
      'qwen3.7-max',
      'qwen3.7-flash',
      'qwen3-coder-plus',
      'qwen3.6-max-preview',
      'qwen-max',
      'qwen-plus'
    ]
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · یک کلید، چند مدل',
    models: [
      'openai/gpt-5.6-luna',
      'anthropic/claude-sonnet-5',
      'anthropic/claude-opus-5',
      'google/gemini-3.7-flash',
      'x-ai/grok-4.7',
      'deepseek/deepseek-v4-pro',
      'z-ai/glm-5.3',
      'moonshotai/kimi-k3',
      'minimax/minimax-m3',
      'openai/gpt-4o-mini'
    ]
  },
  {
    id: 'mistral',
    label: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'mistral-large-latest',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · کلید از console.mistral.ai',
    models: [
      'mistral-large-latest',
      'mistral-medium-latest',
      'mistral-small-latest',
      'codestral-latest',
      'devstral-latest',
      'magistral-medium-latest',
      'ministral-8b-latest',
      'open-mistral-nemo'
    ]
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · استنتاج سریع',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.6-27b',
      'qwen/qwen3.8-27b'
    ]
  },
  {
    id: 'cerebras',
    label: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    model: 'gpt-oss-120b',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · استنتاج سریع',
    models: ['gpt-oss-120b', 'qwen-3.8-27b']
  },
  {
    id: 'together',
    label: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · مدل‌های باز',
    models: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'zai-org/GLM-5.3',
      'Qwen/Qwen3.7-Max',
      'deepseek-ai/DeepSeek-V3',
      'moonshotai/Kimi-K3',
      'MiniMaxAI/MiniMax-M2.7',
      'openai/gpt-oss-120b'
    ]
  },
  {
    id: 'fireworks',
    label: 'Fireworks',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    model: 'accounts/fireworks/models/gpt-oss-120b',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · استنتاج سریع',
    models: [
      'accounts/fireworks/models/gpt-oss-120b',
      'accounts/fireworks/models/glm-5p3',
      'accounts/fireworks/models/kimi-k3',
      'accounts/fireworks/models/deepseek-v4p1-flash',
      'accounts/fireworks/models/minimax-m3'
    ]
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai',
    model: 'sonar',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · پاسخ همراه با جست‌وجو',
    models: ['sonar', 'sonar-pro', 'sonar-reasoning-pro', 'sonar-deep-research']
  },
  {
    id: 'moonshot',
    label: 'Moonshot (Kimi)',
    baseUrl: 'https://api.moonshot.ai/v1',
    model: 'kimi-k3',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · Kimi',
    models: ['kimi-k3', 'kimi-k3.1-pro', 'kimi-k2.7-code', 'kimi-k2.6']
  },
  {
    id: 'zai',
    label: 'Z.AI (GLM)',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    model: 'glm-5.3',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · GLM',
    models: ['glm-5.3', 'glm-5.2', 'glm-5.1', 'glm-5', 'glm-4.7', 'glm-4.6', 'glm-4.5-air']
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    model: 'openai/gpt-oss-120b',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · کلید رایگان از build.nvidia.com',
    models: [
      'openai/gpt-oss-120b',
      'nvidia/nemotron-3-ultra-550b-a55b',
      'moonshotai/kimi-k3',
      'z-ai/glm-5.3',
      'deepseek-ai/deepseek-v4.1-flash',
      'minimaxai/minimax-m3.1-flash'
    ]
  },
  {
    id: 'sambanova',
    label: 'SambaNova',
    baseUrl: 'https://api.sambanova.ai/v1',
    model: 'DeepSeek-V3.2',
    needsKey: true,
    group: 'foreign',
    hint: 'خارجی · استنتاج سریع',
    models: ['DeepSeek-V3.2', 'DeepSeek-V3.1', 'Meta-Llama-3.3-70B-Instruct', 'MiniMax-M3', 'gpt-oss-120b', 'gemma-4-31B-it']
  },
  {
    id: 'gapgpt',
    label: 'GapGPT',
    baseUrl: 'https://api.gapgpt.app/v1',
    model: 'gpt-4o-mini',
    needsKey: true,
    group: 'iranian',
    hint: 'ایرانی · کلید از پنل گپ‌جی‌پی‌تی',
    models: []
  },
  {
    id: 'avalai',
    label: 'AvalAI',
    baseUrl: 'https://api.avalai.ir/v1',
    model: 'gpt-4o-mini',
    needsKey: true,
    group: 'iranian',
    hint: 'ایرانی · کلید از پنل اوال‌ای‌آی',
    models: []
  },
  {
    id: 'ollama',
    label: 'Ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'llama3.2',
    needsKey: false,
    group: 'local',
    hint: 'محلی · روی همین دستگاه',
    models: []
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    baseUrl: 'http://127.0.0.1:1234/v1',
    model: 'local-model',
    needsKey: false,
    group: 'local',
    hint: 'محلی · سرور LM Studio',
    models: []
  },
  {
    id: 'custom',
    label: 'سازگار با OpenAI',
    baseUrl: '',
    model: '',
    needsKey: false,
    group: 'custom',
    hint: 'هر سروری که /chat/completions دارد',
    models: []
  }
]

export const AI_GROUPS: { id: AiProvider['group']; label: string }[] = [
  { id: 'agents', label: 'عامل‌های کدنویسی' },
  { id: 'foreign', label: 'خارجی' },
  { id: 'iranian', label: 'ایرانی' },
  { id: 'local', label: 'محلی' },
  { id: 'custom', label: 'دیگر' }
]

export const DEFAULT_SYSTEM_PROMPT =
  'تو دستیار کوچک Qio هستی. کوتاه، مفید و به فارسی پاسخ بده؛ مگر اینکه کاربر زبان دیگری بخواهد.'

export function providerById(id: AiProviderId): AiProvider {
  return (
    AI_PROVIDERS.find((provider) => provider.id === id) ??
    AI_PROVIDERS.find((provider) => provider.id === 'gapgpt') ??
    AI_PROVIDERS[0]
  )
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
