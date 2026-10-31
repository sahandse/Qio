import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AI_GROUPS,
  AI_PROVIDERS,
  aiEndpointUrl,
  aiModel,
  aiReady,
  providerById,
  resolveAi
} from '../src/shared/ai.ts'

const REQUESTED = ['qoder', 'opencode', 'freebuff']

test('every provider id is unique and the requested coding services are present', () => {
  const ids = AI_PROVIDERS.map((provider) => provider.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const id of REQUESTED) assert.ok(ids.some((value) => value === id), `${id} is missing`)
  for (const id of ['mistral', 'groq', 'cerebras', 'together', 'fireworks', 'perplexity', 'moonshot', 'zai', 'nvidia', 'sambanova']) {
    assert.ok(ids.some((value) => value === id), `${id} is missing`)
  }
})

test('provider groups cover every entry in the order the settings page draws them', () => {
  const groupIds = AI_GROUPS.map((group) => group.id)
  for (const provider of AI_PROVIDERS) assert.ok(groupIds.includes(provider.group), `${provider.id} has no group`)
  for (const group of groupIds) assert.ok(AI_PROVIDERS.some((provider) => provider.group === group), `${group} is empty`)
  assert.deepEqual(
    AI_PROVIDERS.filter((provider) => provider.group === 'agents').map((provider) => provider.id).sort(),
    [...REQUESTED].sort()
  )
})

test('model suggestions are clean, unique and always include the default model', () => {
  for (const provider of AI_PROVIDERS) {
    assert.ok(Array.isArray(provider.models), `${provider.id} has no model list`)
    assert.equal(new Set(provider.models).size, provider.models.length, `${provider.id} repeats a model`)
    if (provider.models.length > 0) {
      assert.ok(provider.models.includes(provider.model), `${provider.id} default is not among its suggestions`)
    }
    for (const model of provider.models) {
      assert.ok(model.length > 0 && model.length <= 80, `${provider.id} has a bad model id`)
      assert.ok(!/\s/.test(model), `${provider.id} model "${model}" contains whitespace`)
    }
  }
})

test('remote presets carry an address and the local ones only use loopback', () => {
  for (const provider of AI_PROVIDERS) {
    if (provider.id === 'custom') {
      assert.equal(provider.baseUrl, '')
      continue
    }
    assert.match(provider.baseUrl, /^https?:\/\//, `${provider.id} has no address`)
    if (provider.group === 'local' || provider.id === 'freebuff') {
      assert.match(provider.baseUrl, /^http:\/\/(127\.0\.0\.1|localhost)/, `${provider.id} must stay local`)
    } else {
      assert.match(provider.baseUrl, /^https:\/\//, `${provider.id} must use https`)
    }
  }
})

test('qoder, opencode and freebuff resolve to their documented endpoints', () => {
  assert.equal(aiEndpointUrl({ provider: 'qoder', baseUrl: '' }), 'https://api.qoder.com/v1/chat/completions')
  assert.equal(aiEndpointUrl({ provider: 'opencode', baseUrl: '' }), 'https://opencode.ai/inference/openai/v1/chat/completions')
  assert.equal(aiEndpointUrl({ provider: 'freebuff', baseUrl: '' }), 'http://127.0.0.1:8080/v1/chat/completions')
  assert.equal(aiModel({ provider: 'qoder', model: '' }), 'qwen3.8-max-preview')
  assert.equal(aiModel({ provider: 'opencode', model: '' }), 'grok-code')
  assert.equal(aiModel({ provider: 'freebuff', model: '' }), 'openai/gpt-6-luna')
  assert.equal(aiModel({ provider: 'qoder', model: 'my-model' }), 'my-model')
  assert.equal(providerById('qoder').label, 'Qoder')
  assert.equal(providerById('zai').label, 'Z.AI (GLM)')
  assert.equal(providerById('retired-service' as never).id, 'gapgpt')
})

test('new providers keep the local key rule: present before ready, never required for the proxy', () => {
  const settings = {
    provider: 'opencode' as const,
    baseUrl: '',
    model: '',
    apiKey: '',
    temperature: 0.7,
    systemPrompt: 'x'
  }
  assert.equal(resolveAi(settings).needsKey, true)
  assert.equal(aiReady(settings), false)
  assert.equal(aiReady({ ...settings, apiKey: 'sk-test' }), true)
  const freebuff = { ...settings, provider: 'freebuff' as const }
  assert.equal(resolveAi(freebuff).needsKey, false)
  assert.equal(aiReady(freebuff), true)
  assert.equal(aiReady({ ...settings, provider: 'custom' }), false)
  assert.equal(aiReady({ ...settings, provider: 'custom', baseUrl: 'https://example.com/v1', model: 'x' }), true)
})

test('stored provider ids survive cleanup and unknown ones fall back', async () => {
  const { cleanAiSettings } = await import('../src/main/store/defaults.ts')
  assert.equal(cleanAiSettings({ provider: 'qoder' }).provider, 'qoder')
  assert.equal(cleanAiSettings({ provider: 'opencode' }).provider, 'opencode')
  assert.equal(cleanAiSettings({ provider: 'freebuff' }).provider, 'freebuff')
  assert.equal(cleanAiSettings({ provider: 'sambanova' }).provider, 'sambanova')
  assert.equal(cleanAiSettings({ provider: 'retired-service' }).provider, 'gapgpt')
  assert.equal(cleanAiSettings({ provider: 'qoder', model: '  qwen3.7-max  ' }).model, 'qwen3.7-max')
})
