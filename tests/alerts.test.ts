import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ALERT_LIMIT,
  defaultAlertActions,
  filetimeToMs,
  isOwnToast,
  parseToastText,
  toastAppLabel
} from '../src/shared/alerts.ts'
import { AlertCenter } from '../src/main/alerts.ts'
import { mergeSettings } from '../src/main/store/defaults.ts'
import { pickSettingsPatch } from '../src/shared/validate.ts'
import { PAGE_IDS } from '../src/shared/types.ts'

test('football and shelf alerts carry a page shortcut; the rest stay quiet', () => {
  assert.deepEqual(defaultAlertActions('football'), [
    { id: 'open', label: 'باز کردن بازی‌ها', page: 'football' }
  ])
  assert.deepEqual(defaultAlertActions('shelf'), [{ id: 'open', label: 'دیدن قفسه', page: 'shelf' }])
  assert.deepEqual(defaultAlertActions('water'), [])
  assert.deepEqual(defaultAlertActions('system'), [])
})

test('toast payload text becomes a title and a joined detail', () => {
  const payload =
    '<toast><visual><binding template="ToastGeneric"><text>دانلود تمام شد</text>' +
    '<text>Qio ۱.۵</text><text>۳۴ مگابایت</text></binding></visual></toast>'
  assert.deepEqual(parseToastText(payload), { title: 'دانلود تمام شد', detail: 'Qio ۱.۵ · ۳۴ مگابایت' })
})

test('toast text decodes entities, drops inner tags and ignores empty bindings', () => {
  assert.deepEqual(parseToastText('<text>a &amp; b</text><text><b>bold</b> &#1587;</text>'), {
    title: 'a & b',
    detail: 'bold س'
  })
  assert.equal(parseToastText('<toast><visual /></toast>'), null)
  assert.equal(parseToastText('<text>   </text>'), null)
})

test('toast text is capped so one row cannot swallow the page', () => {
  const long = 'x'.repeat(500)
  const parsed = parseToastText(`<text>${long}</text><text>${long}</text>`)
  assert.equal(parsed?.title.length, 160)
  assert.equal(parsed?.detail?.length, 400)
})

test('FILETIME converts to Unix milliseconds', () => {
  assert.equal(filetimeToMs(116_444_736_000_000_000n), 0)
  assert.equal(filetimeToMs(116_444_736_010_000_000n), 1_000)
  assert.equal(filetimeToMs(134_380_845_457_663_271n), 1_793_610_945_766)
})

test('app labels never expose a raw AUMID', () => {
  assert.equal(toastAppLabel(''), 'ویندوز')
  assert.equal(toastAppLabel('com.sahandse.qio'), 'Qio')
  assert.equal(toastAppLabel('Windows.SystemToast.StorageSense'), 'ویندوز')
  assert.equal(toastAppLabel('Microsoft.Windows.Explorer'), 'ویندوز')
  assert.equal(toastAppLabel('Microsoft.ZuneMusic_8wekyb3d8bbwe!Microsoft.ZuneMusic'), 'Zune Music')
})

test('Qio’s own toasts are recognised and skipped', () => {
  assert.equal(isOwnToast('com.sahandse.qio', 'com.sahandse.qio'), true)
  assert.equal(isOwnToast('com.sahandse.qio.toast', 'com.sahandse.qio'), true)
  assert.equal(isOwnToast('electron.app.electron', 'com.sahandse.qio'), true)
  assert.equal(isOwnToast('com.spotify.client', 'com.sahandse.qio'), false)
})

test('the alert center keeps newest first, dedupes and marks read', () => {
  let changes = 0
  const center = new AlertCenter(() => {
    changes += 1
  })
  center.record({ id: 'a', kind: 'water', title: 'آب' })
  center.record({ id: 'b', kind: 'todo', title: 'کار' })
  center.record({ id: 'a', kind: 'water', title: 'تکراری' })
  assert.deepEqual(center.list.map((item) => item.id), ['b', 'a'])
  assert.equal(center.list[0].read, false)

  assert.equal(center.act('b', 'done'), true)
  assert.equal(center.list[0].read, true)
  assert.equal(center.act('missing', 'done'), false)

  assert.equal(center.readAll(), true)
  assert.equal(center.readAll(), false)
  assert.equal(center.clear(), true)
  assert.equal(center.clear(), false)
  assert.deepEqual(center.list, [])
  assert.ok(changes >= 5)
})

test('an alert action reaches its handler and a title is trimmed to fit', () => {
  const center = new AlertCenter(() => undefined)
  const actions: string[] = []
  center.record({
    kind: 'water',
    title: 'ت'.repeat(400),
    detail: 'د'.repeat(800),
    onAction: (action) => actions.push(action)
  })
  const [item] = center.list
  assert.equal(item.title.length, 300)
  assert.equal(item.detail?.length, 600)
  center.act(item.id, 'drank')
  assert.deepEqual(actions, ['drank'])
})

test('mirrored toasts arrive oldest first so the newest lands on top', () => {
  const center = new AlertCenter(() => undefined)
  center.recordMany([
    { id: 'win:1', kind: 'system', title: 'اول', app: 'ویندوز', at: 1 },
    { id: 'win:2', kind: 'system', title: 'دوم', app: 'ویندوز', at: 2 }
  ])
  center.recordMany([{ id: 'win:2', kind: 'system', title: 'دوم', app: 'ویندوز', at: 2 }])
  assert.deepEqual(center.list.map((item) => item.id), ['win:2', 'win:1'])
  assert.equal(center.list[0].source, 'windows')
  assert.deepEqual(center.list[0].actions, [])
})

test('the oldest alerts fall off once the cap is reached', () => {
  const center = new AlertCenter(() => undefined)
  for (let index = 0; index < ALERT_LIMIT + 3; index += 1) {
    center.record({ id: `a${index}`, kind: 'system', title: String(index) })
  }
  assert.equal(center.list.length, ALERT_LIMIT)
  assert.equal(center.list[0].id, `a${ALERT_LIMIT + 2}`)
  assert.equal(center.act('a0', 'x'), false)
})

test('the alerts page is a real page and windows mirroring defaults on', () => {
  assert.ok(PAGE_IDS.includes('alerts'))
  assert.equal(mergeSettings({}).alerts.windows, true)
  assert.equal(mergeSettings({ alerts: { windows: false } }).alerts.windows, false)
  assert.deepEqual(pickSettingsPatch({ alerts: { windows: false, hidden: true } }), {
    alerts: { windows: false }
  })
})
