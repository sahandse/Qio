import test from 'node:test'
import assert from 'node:assert/strict'

test('cleanLayout keeps real pages, dedupes and fills the missing ones', async () => {
  const { cleanLayout } = await import('../src/main/store/defaults.ts')
  const { PAGE_IDS } = await import('../src/shared/types.ts')
  const layout = cleanLayout({
    order: ['todo', 'calendar', 'todo', 'bogus'],
    hidden: ['music', 'nope'],
    size: { todo: '2x2', ai: '2x1', music: '4x4' }
  })
  assert.deepEqual(layout.order.slice(0, 2), ['todo', 'calendar'])
  assert.equal(layout.order.length, PAGE_IDS.length)
  assert.deepEqual(new Set(layout.order), new Set(PAGE_IDS))
  assert.deepEqual(layout.hidden, ['music'])
  assert.equal(layout.size.todo, '2x2')
  assert.equal(layout.size.ai, '2x1')
  assert.equal(layout.size.music, '1x1')
})

test('the rail never loses its last visible page', async () => {
  const { cleanLayout } = await import('../src/main/store/defaults.ts')
  const { PAGE_IDS } = await import('../src/shared/types.ts')
  const layout = cleanLayout({ hidden: [...PAGE_IDS] })
  assert.equal(layout.hidden.length, PAGE_IDS.length - 1)
  assert.equal(layout.hidden.includes(layout.order[0]), false)
})

test('a missing layout falls back to the shipped order and 1x1 sizes', async () => {
  const { mergeSettings } = await import('../src/main/store/defaults.ts')
  const { PAGE_IDS } = await import('../src/shared/types.ts')
  const settings = mergeSettings({})
  assert.deepEqual(settings.layout.order, [...PAGE_IDS])
  assert.deepEqual(settings.layout.hidden, [])
  assert.ok(PAGE_IDS.every((id) => settings.layout.size[id] === '1x1'))
})

test('the notch corner keeps only left, centre and right', async () => {
  const { mergeSettings } = await import('../src/main/store/defaults.ts')
  assert.equal(mergeSettings({}).notchPosition, 'center')
  assert.equal(mergeSettings({ notchPosition: 'left' }).notchPosition, 'left')
  assert.equal(mergeSettings({ notchPosition: 'right' }).notchPosition, 'right')
  assert.equal(mergeSettings({ notchPosition: 'top' }).notchPosition, 'center')
  assert.equal(mergeSettings({ notchPosition: 3 }).notchPosition, 'center')
})
