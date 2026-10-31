import { useMemo, useState } from 'react'
import { encodeQr, toPath, toSvg, type QrEcc, type QrMatrix } from '@shared/qr'
import { toPersianDigits } from '../lib/jalali'
import { ICON, DownloadIcon } from './Icons'

/** The four levels, told in the words a person actually chooses with. */
const LEVELS: { id: QrEcc; label: string; hint: string }[] = [
  { id: 'L', label: 'کم', hint: 'کوچک‌ترین کد، تا ۷٪ آسیب را جبران می‌کند' },
  { id: 'M', label: 'متوسط', hint: 'پیش‌فرض، تا ۱۵٪' },
  { id: 'Q', label: 'زیاد', hint: 'برای چاپ روی محصول، تا ۲۵٪' },
  { id: 'H', label: 'خیلی زیاد', hint: 'برای تابلو و فضای شلوغ، تا ۳۰٪' }
]

const QUIET = 4
const PREVIEW_PX = 118

function pngBase64(matrix: QrMatrix, scale: number): string {
  const edge = (matrix.size + QUIET * 2) * scale
  const canvas = document.createElement('canvas')
  canvas.width = edge
  canvas.height = edge
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, edge, edge)
  ctx.fillStyle = '#111827'
  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (!matrix.modules[row][col]) continue
      ctx.fillRect((col + QUIET) * scale, (row + QUIET) * scale, scale, scale)
    }
  }
  return canvas.toDataURL('image/png').slice('data:image/png;base64,'.length)
}

function slug(text: string): string {
  const flat = text.trim().replace(/\s+/g, '-').slice(0, 28)
  return flat || 'qr'
}

export function QrTool() {
  const [text, setText] = useState('')
  const [ecc, setEcc] = useState<QrEcc>('M')
  const [note, setNote] = useState('')

  const matrix = useMemo(() => (text.trim() ? encodeQr(text, ecc) : null), [text, ecc])
  const edge = matrix ? matrix.size + QUIET * 2 : 1

  const say = (message: string) => {
    setNote(message)
    window.setTimeout(() => setNote(''), 2400)
  }

  const copyImage = async () => {
    if (!matrix) return
    const png = pngBase64(matrix, 8)
    if (!png) return
    say((await window.qio.system.copyPng(png)) ? 'تصویر در کلیپ‌بورد است' : 'کپی نشد')
  }

  const save = async (kind: 'png' | 'svg') => {
    if (!matrix) return
    const body = kind === 'png' ? pngBase64(matrix, 12) : toSvg(matrix, { cell: 10, margin: QUIET })
    if (!body) return
    const name = `qio-${slug(text)}`
    const saved = await window.qio.system.save({ kind, body, name })
    say(saved ? `${saved} ذخیره شد` : 'چیزی ذخیره نشد')
  }

  return (
    <div className="qr-page">
      <div className="qr-side">
        <textarea
          className="qr-field"
          value={text}
          rows={3}
          spellCheck={false}
          maxLength={2953}
          placeholder="لینک، متن، شماره کارت…"
          aria-label="متن کیوآر"
          onChange={(event) => setText(event.target.value)}
        />

        <div className="qr-levels" role="group" aria-label="میزان جبران خطا">
          {LEVELS.map((level) => (
            <button
              type="button"
              key={level.id}
              className={`qr-level${ecc === level.id ? ' on' : ''}`}
              title={level.hint}
              onClick={() => setEcc(level.id)}
            >
              {level.label}
            </button>
          ))}
        </div>

        <div className="qr-actions">
          <button type="button" className="pill" onClick={() => void copyImage()} disabled={!matrix}>
            <DownloadIcon size={ICON.xs} /> کپی تصویر
          </button>
          <button type="button" className="pill" onClick={() => void save('png')} disabled={!matrix}>
            PNG
          </button>
          <button type="button" className="pill" onClick={() => void save('svg')} disabled={!matrix}>
            SVG
          </button>
        </div>

        <p className="qr-note" aria-live="polite">
          {note ||
            (text.trim() && !matrix
              ? 'این متن در بزرگ‌ترین QR هم جا نمی‌شود؛ کوتاه‌ش کن یا جبران خطا را کم کن.'
              : 'همین‌جا ساخته می‌شود: بدون سرویس، بدون اینترنت، بدون سر زدن متن به هیچ‌جا.')}
        </p>
      </div>

      <div className="qr-plate">
        {matrix ? (
          <svg
            className="qr-art"
            viewBox={`0 0 ${edge} ${edge}`}
            width={PREVIEW_PX}
            height={PREVIEW_PX}
            shapeRendering="crispEdges"
            role="img"
            aria-label="پیش‌نمای کیوآر"
          >
            <rect width={edge} height={edge} fill="#ffffff" />
            <path fill="#111827" d={toPath(matrix, 1, QUIET)} />
          </svg>
        ) : (
          <div className="qr-blank" aria-hidden="true">
            <span>QR</span>
          </div>
        )}
        <span className="qr-spec">
          {matrix
            ? `نسخه ${toPersianDigits(matrix.version)} · ${toPersianDigits(matrix.size)}×${toPersianDigits(matrix.size)} ماژول`
            : 'چیزی برای کدنویسی نیست'}
        </span>
      </div>
    </div>
  )
}
