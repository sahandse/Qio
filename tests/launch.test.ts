import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_LAUNCH_ITEMS,
  addLaunchItems,
  cleanLaunchItems,
  moveLaunch,
  webUrl
} from '../src/shared/launch.ts'
import type { LaunchItem } from '../src/shared/types.ts'

function item(overrides: Partial<LaunchItem> & Pick<LaunchItem, 'id' | 'kind' | 'target'>): LaunchItem {
  return { name: '', addedAt: 1, ...overrides }
}

test('webUrl accepts http and https and fills in the scheme', () => {
  assert.equal(webUrl('https://github.com/sahandse/qio'), 'https://github.com/sahandse/qio')
  assert.equal(webUrl('github.com'), 'https://github.com/')
  assert.equal(webUrl('  HTTP://example.com/a?b=1  '), 'http://example.com/a?b=1')
  assert.equal(webUrl('https://user:pass@example.com/'), 'https://example.com/')
})

test('webUrl refuses other schemes and junk', () => {
  assert.equal(webUrl('javascript:alert(1)'), null)
  assert.equal(webUrl('file:///C:/Windows/System32/calc.exe'), null)
  assert.equal(webUrl(''), null)
  assert.equal(webUrl('not a url'), null)
  assert.equal(webUrl(null), null)
  assert.equal(webUrl('https://' + 'a'.repeat(3000)), null)
})

test('cleanLaunchItems keeps local targets, normalizes names and removes duplicates', () => {
  const items = cleanLaunchItems([
    item({ id: 'a', kind: 'file', target: 'C:\\Tools\\code.exe', name: '  VS Code  ' }),
    item({ id: 'b', kind: 'file', target: 'c:\\tools\\CODE.exe' }),
    item({ id: 'c', kind: 'folder', target: 'C:\\Work' }),
    item({ id: 'd', kind: 'url', target: 'www.example.com/docs/' }),
    item({ id: 'e', kind: 'folder', target: 'relative\\path' }),
    item({ id: 'f', kind: 'url', target: 'javascript:alert(1)' }),
    { id: 'g', kind: 'file', target: 'C:\\x.txt' },
    item({ id: '', kind: 'file', target: 'C:\\y.txt' })
  ])
  assert.deepEqual(
    items.map((entry) => entry.id),
    ['a', 'c', 'd', 'g']
  )
  assert.equal(items[0].name, 'VS Code')
  assert.equal(items[1].name, 'Work')
  assert.equal(items[2].name, 'example.com/docs')
  assert.equal(items[2].target, 'https://www.example.com/docs/')
  assert.equal(items[3].name, 'x.txt')
})

test('cleanLaunchItems caps the list and survives non-lists', () => {
  const many = Array.from({ length: MAX_LAUNCH_ITEMS + 5 }, (_, index) =>
    item({ id: `id-${index}`, kind: 'folder', target: `C:\\Folder${index}` })
  )
  assert.equal(cleanLaunchItems(many).length, MAX_LAUNCH_ITEMS)
  assert.deepEqual(cleanLaunchItems('nope'), [])
  assert.deepEqual(cleanLaunchItems([null, 4, 'x']), [])
})

test('addLaunchItems keeps known shortcuts once and stops at the cap', () => {
  const first = item({ id: 'a', kind: 'url', target: 'https://a.example' })
  const list = addLaunchItems([], [first, item({ id: 'b', kind: 'url', target: 'https://a.example' })])
  assert.deepEqual(list.map((entry) => entry.id), ['a'])

  const full = Array.from({ length: MAX_LAUNCH_ITEMS }, (_, index) =>
    item({ id: `id-${index}`, kind: 'folder', target: `C:\\F${index}` })
  )
  const added = addLaunchItems(full, [item({ id: 'new', kind: 'url', target: 'https://new.example' })])
  assert.equal(added.length, MAX_LAUNCH_ITEMS)
  assert.equal(added.some((entry) => entry.id === 'new'), false)
})

test('moveLaunch walks one slot and holds at both ends', () => {
  const list = [
    item({ id: 'a', kind: 'url', target: 'https://a.example' }),
    item({ id: 'b', kind: 'url', target: 'https://b.example' }),
    item({ id: 'c', kind: 'url', target: 'https://c.example' })
  ]
  assert.deepEqual(moveLaunch(list, 'b', -1).map((entry) => entry.id), ['b', 'a', 'c'])
  assert.deepEqual(moveLaunch(list, 'b', 1).map((entry) => entry.id), ['a', 'c', 'b'])
  assert.equal(moveLaunch(list, 'a', -1), list)
  assert.equal(moveLaunch(list, 'c', 1), list)
  assert.equal(moveLaunch(list, 'missing', 1), list)
  assert.equal(moveLaunch(list, 'a', 0), list)
})

test('mergeSettings cleans the persisted launch list', async () => {
  const { mergeSettings } = await import('../src/main/store/defaults.ts')
  const settings = mergeSettings({
    launch: {
      items: [
        item({ id: 'a', kind: 'url', target: 'github.com' }),
        item({ id: 'b', kind: 'file', target: 'D:\\Media\\clip.mp4' }),
        item({ id: 'c', kind: 'file', target: 'nope' })
      ]
    }
  })
  assert.deepEqual(settings.launch.items.map((entry) => entry.id), ['a', 'b'])
  assert.equal(settings.launch.items[0].target, 'https://github.com/')
  assert.deepEqual(mergeSettings({}).launch, { items: [] })
})
