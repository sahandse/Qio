import { useEffect, useState } from 'react'
import type { AiPublicSettings } from '@shared/types'
import { AI_GROUPS, AI_PROVIDERS, providerById } from '@shared/ai'
import { toPersianDigits } from '../../lib/jalali'

export function AiSection({ ai }: { ai: AiPublicSettings }) {
  const provider = providerById(ai.provider)
  const [base, setBase] = useState(ai.baseUrl)
  const [model, setModel] = useState(ai.model)
  const [key, setKey] = useState('')
  const [prompt, setPrompt] = useState(ai.systemPrompt)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    setBase(ai.baseUrl)
    setModel(ai.model)
    setPrompt(ai.systemPrompt)
  }, [ai.baseUrl, ai.model, ai.systemPrompt])

  const commit = (patch: Partial<Omit<AiPublicSettings, 'hasKey' | 'ready' | 'providerLabel' | 'effectiveModel'>>) => {
    setResult(null)
    void window.qio.ai.patch(patch)
  }

  const saveKey = async () => {
    if (!key.trim()) return
    await window.qio.ai.setKey(key.trim())
    setKey('')
    setResult({ ok: true, text: 'کلید ذخیره شد — فقط روی همین دستگاه.' })
  }

  const test = async () => {
    setTesting(true)
    setResult(null)
    const outcome = await window.qio.ai.test()
    setTesting(false)
    setResult(
      outcome.ok
        ? { ok: true, text: `اتصال برقرار است${outcome.ms ? ` · ${toPersianDigits((outcome.ms / 1000).toFixed(1))} ثانیه` : ''}` }
        : { ok: false, text: outcome.error ?? 'اتصال برقرار نشد.' }
    )
  }

  return (
    <>
      <section className="settings-card wide">
        <h3>سرویس هوش مصنوعی</h3>
        <div className="ai-prov">
          {AI_GROUPS.map((group) => (
            <div key={group.id} className="ai-prov-group">
              <span className="ai-prov-label">{group.label}</span>
              <div className="ai-prov-chips">
                {AI_PROVIDERS.filter((entry) => entry.group === group.id).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`ai-chip${ai.provider === entry.id ? ' on' : ''}`}
                    title={entry.hint}
                    aria-pressed={ai.provider === entry.id}
                    onClick={() => commit({ provider: entry.id, baseUrl: '', model: '' })}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="settings-note">
          {provider.hint}
          {provider.needsKey ? ' · کلید لازم است' : ' · بدون کلید کار می‌کند'}
        </p>
      </section>

      <section className="settings-card">
        <h3>اتصال</h3>
        <label className="setting-row">
          <span className="setting-text">
            <strong>آدرس سرویس</strong>
            <small>خالی بماند، آدرس پیش‌فرض {provider.label} استفاده می‌شود.</small>
          </span>
          <input
            className="setting-input"
            dir="ltr"
            value={base}
            placeholder={provider.baseUrl || 'https://…/v1'}
            onChange={(event) => setBase(event.target.value)}
            onBlur={() => base !== ai.baseUrl && commit({ baseUrl: base })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
        </label>
        <label className="setting-row">
          <span className="setting-text">
            <strong>مدل</strong>
            <small>خالی بماند، مدل پیش‌فرض سرویس انتخاب می‌شود.</small>
          </span>
          <input
            className="setting-input"
            dir="ltr"
            value={model}
            placeholder={provider.model || 'model-name'}
            onChange={(event) => setModel(event.target.value)}
            onBlur={() => model !== ai.model && commit({ model })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
        </label>
        <label className="setting-row">
          <span className="setting-text">
            <strong>کلید API</strong>
            <small>{ai.hasKey ? 'ذخیره شده — برای جایگزینی، کلید تازه را بگذار.' : 'در qio.json روی همین دستگاه می‌ماند.'}</small>
          </span>
          <input
            className="setting-input"
            dir="ltr"
            type="password"
            autoComplete="off"
            value={key}
            placeholder={ai.hasKey ? '••••••••' : 'sk-…'}
            onChange={(event) => setKey(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void saveKey()
            }}
          />
        </label>
        <div className="settings-actions">
          <button type="button" className="pill" disabled={!key.trim()} onClick={() => void saveKey()}>
            ذخیرهٔ کلید
          </button>
          {ai.hasKey && (
            <button
              type="button"
              className="pill danger"
              onClick={() => {
                void window.qio.ai.setKey('')
                setResult({ ok: true, text: 'کلید حذف شد.' })
              }}
            >
              حذف کلید
            </button>
          )}
        </div>
      </section>

      <section className="settings-card">
        <h3>آزمایش و گفت‌وگو</h3>
        <div className="settings-actions">
          <button type="button" className="pill" disabled={testing || !ai.ready} onClick={() => void test()}>
            {testing ? 'در حال آزمایش…' : 'تست اتصال'}
          </button>
          <button type="button" className="pill danger" onClick={() => void window.qio.ai.clear()}>
            پاک کردن گفت‌وگو
          </button>
        </div>
        {result && <p className={`settings-result${result.ok ? ' ok' : ' bad'}`}>{result.text}</p>}
        <p className="settings-note">
          کلید فقط برای درخواست به همان سرویس فرستاده می‌شود، در لاگ نمی‌آید و به هیچ جای دیگری نمی‌رود.
          گفت‌وگو هم محلی می‌ماند.
        </p>
      </section>

      <section className="settings-card wide">
        <h3>رفتار</h3>
        <label className="setting-row">
          <span className="setting-text">
            <strong>دستور سیستم</strong>
            <small>لحن و زبان پاسخ‌ها؛ مثلاً «کوتاه و فارسی جواب بده».</small>
          </span>
        </label>
        <textarea
          className="settings-textarea"
          rows={2}
          dir="auto"
          value={prompt}
          maxLength={600}
          onChange={(event) => setPrompt(event.target.value)}
          onBlur={() => prompt !== ai.systemPrompt && commit({ systemPrompt: prompt })}
        />
      </section>
    </>
  )
}
