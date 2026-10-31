import { useState } from 'react'
import type { LayoutSettings, PageId, PageSize } from '@shared/types'
import { PAGE_IDS, PAGE_SIZES } from '@shared/types'
import { toPersianDigits } from '../../lib/jalali'
import { PAGE_META } from '../../lib/pages'
import { ICON, ChevronLeftIcon, ResetIcon } from '../Icons'
import { Card } from './ui'

const SIZE_LABEL: Record<PageSize, string> = {
  '1x1': '۱×۱',
  '2x1': '۲×۱',
  '2x2': '۲×۲'
}

const SIZE_HINT: Record<PageSize, string> = {
  '1x1': 'اندازهٔ عادی صفحه',
  '2x1': 'پهن‌تر، هم‌ارتفاع',
  '2x2': 'پهن‌تر و بلندتر'
}

function defaultSizes(): Record<PageId, PageSize> {
  return Object.fromEntries(PAGE_IDS.map((id) => [id, '1x1'])) as Record<PageId, PageSize>
}

export function LayoutSection({
  layout,
  onPatch
}: {
  layout: LayoutSettings
  onPatch: (next: Partial<LayoutSettings>) => void
}) {
  const [drag, setDrag] = useState<PageId | null>(null)
  const [over, setOver] = useState<PageId | null>(null)
  const visible = layout.order.length - layout.hidden.length

  const shift = (id: PageId, delta: number) => {
    const from = layout.order.indexOf(id)
    const to = from + delta
    if (from < 0 || to < 0 || to >= layout.order.length) return
    const order = [...layout.order]
    order.splice(from, 1)
    order.splice(to, 0, id)
    onPatch({ order })
  }

  const drop = (target: PageId) => {
    if (!drag || drag === target) return
    const order = [...layout.order]
    const from = order.indexOf(drag)
    const to = order.indexOf(target)
    if (from < 0 || to < 0) return
    order.splice(from, 1)
    order.splice(Math.min(to, order.length), 0, drag)
    onPatch({ order })
  }

  return (
    <Card className="wide" title="چیدمان نچ">
      <p className="layout-lead">
        هر صفحه را از دسته‌اش بکش یا با فلش‌ها جابه‌جا کن؛ همین ترتیب، ردیف آیکون‌های زیر نچ را می‌سازد.
        اندازهٔ هر صفحه هم از ۱×۱ تا ۲×۲ انتخاب می‌شود.
      </p>

      <div className="layout-list" role="list" aria-label="ترتیب صفحه‌های نچ">
        {layout.order.map((id, index) => {
          const meta = PAGE_META[id]
          const isHidden = layout.hidden.includes(id)
          const size = layout.size[id]
          return (
            <div
              key={id}
              role="listitem"
              className={`layout-row${isHidden ? ' is-hidden' : ''}${drag === id ? ' is-dragging' : ''}${over === id ? ' is-over' : ''}`}
              onDragOver={(event) => {
                if (!drag) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setOver(id)
              }}
              onDragLeave={() => setOver((current) => (current === id ? null : current))}
              onDrop={(event) => {
                event.preventDefault()
                drop(id)
                setDrag(null)
                setOver(null)
              }}
            >
              <span
                className="layout-grip"
                draggable
                aria-hidden="true"
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', id)
                  setDrag(id)
                }}
                onDragEnd={() => {
                  setDrag(null)
                  setOver(null)
                }}
              />
              <span className="layout-name">
                <meta.Icon size={ICON.sm} />
                <strong>{meta.title}</strong>
                {id === 'football' && <small>فقط روز مسابقه</small>}
              </span>
              <div className="layout-sizes" role="group" aria-label={`اندازهٔ ${meta.title}`}>
                {PAGE_SIZES.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    className={`layout-size${size === entry ? ' on' : ''}`}
                    aria-pressed={size === entry}
                    title={SIZE_HINT[entry]}
                    onClick={() => onPatch({ size: { ...layout.size, [id]: entry } })}
                  >
                    {SIZE_LABEL[entry]}
                  </button>
                ))}
              </div>
              <div className="layout-steps">
                <button
                  type="button"
                  className="layout-step up"
                  title="بالاتر"
                  aria-label={`${meta.title}: بالاتر`}
                  disabled={index === 0}
                  onClick={() => shift(id, -1)}
                >
                  <ChevronLeftIcon size={ICON.xs} />
                </button>
                <button
                  type="button"
                  className="layout-step down"
                  title="پایین‌تر"
                  aria-label={`${meta.title}: پایین‌تر`}
                  disabled={index === layout.order.length - 1}
                  onClick={() => shift(id, 1)}
                >
                  <ChevronLeftIcon size={ICON.xs} />
                </button>
              </div>
              <button
                type="button"
                className={`layout-eye${isHidden ? ' off' : ''}`}
                aria-pressed={!isHidden}
                disabled={!isHidden && visible <= 1}
                title={
                  isHidden
                    ? 'برگرداندن به نوار'
                    : visible <= 1
                      ? 'آخرین صفحه را نمی‌شود پنهان کرد'
                      : 'پنهان‌کردن از نوار'
                }
                onClick={() =>
                  onPatch({
                    hidden: isHidden ? layout.hidden.filter((entry) => entry !== id) : [...layout.hidden, id]
                  })
                }
              >
                {isHidden ? 'نمایش' : 'پنهان'}
              </button>
            </div>
          )
        })}
      </div>

      <div className="layout-foot">
        <span>
          {toPersianDigits(String(visible))} صفحه در نوار ·{' '}
          {toPersianDigits(String(layout.hidden.length))} پنهان
        </span>
        <button
          type="button"
          className="layout-reset"
          onClick={() => onPatch({ order: [...PAGE_IDS], hidden: [], size: defaultSizes() })}
        >
          <ResetIcon size={ICON.xs} />
          چیدمان پیش‌فرض
        </button>
      </div>
      <p className="settings-note">
        صفحهٔ پنهان حذف نمی‌شود؛ فقط از ردیف نوار کنار می‌رود و از همین‌جا برمی‌گردد. کلید
        عددی ۱ تا ۹ هنوز به همان ترتیب نوار کار می‌کند.
      </p>
    </Card>
  )
}
