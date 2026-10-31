import { useState } from 'react'
import { MAX_LAUNCH_ITEMS, webUrl } from '@shared/launch'
import type { Settings } from '@shared/types'
import { toPersianDigits } from '../../lib/jalali'
import { ChevronRightIcon, FolderOpenIcon, ICON, PlusIcon, TrashIcon } from '../Icons'
import { LaunchArt } from '../LaunchArt'
import { Status } from '../Status'

/** Quick launch is managed here only; the notch tool just draws what this list holds. */
export function LaunchSection({ settings }: { settings: Settings }) {
  const items = settings.launch.items
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const full = items.length >= MAX_LAUNCH_ITEMS

  const addPath = async (kind: 'file' | 'folder') => {
    if (busy || full) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const next = kind === 'file' ? await window.qio.launch.addFiles() : await window.qio.launch.addFolder()
      if (next && next.length === items.length) setNotice('این مورد از قبل پین شده است.')
    } finally {
      setBusy(false)
    }
  }

  const addUrl = async () => {
    const target = webUrl(url)
    if (!target) {
      setNotice('')
      setError('نشانی معتبر نیست؛ فقط http یا https پذیرفته می‌شود.')
      return
    }
    if (full) {
      setError(`بیشتر از ${toPersianDigits(MAX_LAUNCH_ITEMS)} میان‌بر جا نمی‌شود.`)
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const next = await window.qio.launch.addUrl(target)
      if (next) {
        setUrl('')
        if (next.length === items.length) setNotice('این نشانی از قبل پین شده است.')
      } else {
        setError('این نشانی پذیرفته نشد؛ فقط http یا https.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="settings-card">
        <h3>افزودن میان‌بر</h3>
        <p className="settings-note">
          برنامه، فایل، پوشه یا یک وب‌سایت. پنجرهٔ انتخاب، مسیر را از خود ویندوز می‌گیرد و Qio فقط
          همین مسیر را ذخیره می‌کند.
        </p>
        <div className="launch-add-row">
          <button type="button" className="pill" disabled={busy || full} onClick={() => void addPath('file')}>
            <PlusIcon size={ICON.xs} /> افزودن فایل یا برنامه
          </button>
          <button type="button" className="pill" disabled={busy || full} onClick={() => void addPath('folder')}>
            <FolderOpenIcon size={ICON.xs} /> افزودن پوشه
          </button>
        </div>
        <div className="launch-url-row">
          <input
            className="setting-input"
            value={url}
            dir="ltr"
            spellCheck={false}
            autoComplete="off"
            placeholder="https://example.com"
            aria-label="نشانی سایت"
            onChange={(event) => {
              setUrl(event.target.value)
              setError('')
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void addUrl()
              }
            }}
          />
          <button type="button" className="pill primary" disabled={busy || !url.trim()} onClick={() => void addUrl()}>
            <PlusIcon size={ICON.xs} /> افزودن سایت
          </button>
        </div>
        {error && (
          <Status tone="warn" className="launch-status">
            {error}
          </Status>
        )}
        {notice && <p className="settings-note">{notice}</p>}
        <p className="settings-note">
          {toPersianDigits(items.length)} از {toPersianDigits(MAX_LAUNCH_ITEMS)} میان‌بر.
          {full ? ' برای افزودن مورد تازه، یکی را بردار.' : ' ترتیب همین فهرست، ترتیب کاشی‌ها در نچ است.'}
        </p>
      </section>

      <section className="settings-card wide">
        <h3>میان‌برهای پین‌شده</h3>
        {items.length === 0 ? (
          <p className="settings-note">هنوز چیزی اضافه نشده — از کارت بالا شروع کن.</p>
        ) : (
          <div className="launch-list" data-scroll>
            {items.map((item, index) => (
              <div className="launch-row" key={item.id}>
                <LaunchArt item={item} className="launch-row-art" />
                <span className="launch-row-text">
                  <strong dir="auto">{item.name}</strong>
                  <small dir="ltr">{item.target}</small>
                </span>
                <span className="launch-row-actions">
                  <button
                    type="button"
                    className="launch-order up"
                    title="بالا"
                    aria-label={`بردن ${item.name} بالاتر`}
                    disabled={index === 0}
                    onClick={() => void window.qio.launch.move(item.id, -1)}
                  >
                    <ChevronRightIcon size={ICON.xs} />
                  </button>
                  <button
                    type="button"
                    className="launch-order down"
                    title="پایین"
                    aria-label={`بردن ${item.name} پایین‌تر`}
                    disabled={index === items.length - 1}
                    onClick={() => void window.qio.launch.move(item.id, 1)}
                  >
                    <ChevronRightIcon size={ICON.xs} />
                  </button>
                  <button
                    type="button"
                    className="launch-order launch-remove"
                    title="حذف"
                    aria-label={`حذف ${item.name}`}
                    onClick={() => void window.qio.launch.remove(item.id)}
                  >
                    <TrashIcon size={ICON.xs} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="settings-note">
          همه‌چیز روی همین دستگاه می‌ماند؛ فقط نشانی‌های http و https با مرورگر پیش‌فرض باز می‌شوند و
          بقیه با خود ویندوز. هیچ چیز از این فهرست به بیرون فرستاده نمی‌شود.
        </p>
      </section>
    </>
  )
}
