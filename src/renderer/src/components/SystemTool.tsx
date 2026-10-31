import { useEffect, useRef, useState } from 'react'
import type { SystemSample } from '@shared/types'
import { formatBytes } from '../lib/format'
import { toPersianDigits } from '../lib/jalali'
import { ICON, CpuIcon } from './Icons'

const EVERY_MS = 2000

function percent(value: number): string {
  return toPersianDigits(Math.round(value * 100))
}

function rate(bytes: number): string {
  return `${formatBytes(bytes)}/s`
}

/** A small labelled meter; the bar width IS the reading, so it never lies about scale. */
function Meter({
  label,
  fill,
  detail
}: {
  label: string
  fill: number
  detail: string
}) {
  return (
    <div className="sys-row">
      <span className="sys-top">
        <span className="sys-label">{label}</span>
        <span className="sys-detail">{detail}</span>
      </span>
      <span className="sys-bar" aria-hidden="true">
        <span className="sys-fill" style={{ width: `${Math.round(Math.min(1, Math.max(0, fill)) * 100)}%` }} />
      </span>
    </div>
  )
}

export function SystemTool() {
  const [sample, setSample] = useState<SystemSample | null>(null)
  const [error, setError] = useState(false)
  const live = useRef(true)

  useEffect(() => {
    live.current = true
    let timer = 0
    const read = async () => {
      try {
        const next = await window.qio.sys.sample()
        if (live.current) {
          setSample(next)
          setError(false)
        }
      } catch {
        if (live.current) setError(true)
      }
      if (live.current) timer = window.setTimeout(read, EVERY_MS)
    }
    void read()
    return () => {
      live.current = false
      window.clearTimeout(timer)
    }
  }, [])

  if (error && !sample) {
    return (
      <div className="sys-page">
        <p className="sys-empty">خواندن وضعیت سیستم ممکن نشد. یک‌بار دیگر سر بزن.</p>
      </div>
    )
  }

  const cpu = sample?.cpu.usage ?? 0
  const memShare = sample ? sample.mem.used / Math.max(1, sample.mem.total) : 0
  const net = sample?.net ?? null

  return (
    <div className="sys-page">
      <div className="sys-grid">
        <Meter label="پردازنده" fill={cpu} detail={`${percent(cpu)}٪`} />
        <Meter
          label="حافظه"
          fill={memShare}
          detail={sample ? `${formatBytes(sample.mem.used)} از ${formatBytes(sample.mem.total)}` : '…'}
        />
        <Meter
          label="شبکه"
          fill={net ? Math.min(1, (net.rx + net.tx) / (5 * 1024 * 1024)) : 0}
          detail={net ? `↓ ${rate(net.rx)} · ↑ ${rate(net.tx)}` : 'در انتظار نمونهٔ دوم'}
        />
        <Meter
          label="Qio"
          fill={sample ? Math.min(1, sample.app.cpu / 100) : 0}
          detail={sample ? `${percent(sample.app.cpu / 100)}٪ · ${formatBytes(sample.app.memory)}` : '…'}
        />
        {(sample?.disks ?? []).map((disk) => (
          <Meter
            key={disk.name}
            label={`درایو ${disk.name}`}
            fill={disk.used / Math.max(1, disk.total)}
            detail={sample ? `${formatBytes(disk.used)} از ${formatBytes(disk.total)}` : '…'}
          />
        ))}
      </div>

      <p className="sys-foot">
        <CpuIcon size={ICON.xs} />
        {sample
          ? `${toPersianDigits(sample.cpu.cores)} هستهٔ ${sample.cpu.model.replace(/\(R\)|\(TM\)|CPU|@.*$/gi, '').trim() || 'پردازنده'}`
          : 'در حال نمونه‌گیری…'}
        <span className="sys-hint">فقط وقتی این صفحه باز است نمونه می‌گیرد.</span>
      </p>
    </div>
  )
}
