import type { AlertItem, AppState, PageId } from '@shared/types'
import { relativeTime } from '../lib/format'
import { toPersianDigits } from '../lib/jalali'
import { ICON, BellIcon, CloseIcon } from './Icons'
import { NudgeIcon } from './NudgePill'
import { PanelEmpty } from './PanelEmpty'

export function NotificationsPanel({
  state,
  onOpenPage
}: {
  state: AppState | null
  onOpenPage: (page: PageId) => void
}) {
  const items: AlertItem[] = state?.alerts ?? []
  const unread = items.filter((item) => !item.read).length
  const windowsOn = state?.settings.alerts.windows ?? false

  const run = (item: AlertItem, action: { id: string; page?: PageId }) => {
    void window.qio.alerts.act(item.id, action.id)
    if (action.page) onOpenPage(action.page)
  }

  return (
    <div className="alerts-page">
      <div className="alerts-list" data-scroll>
        {items.length === 0 && (
          <PanelEmpty
            icon={<BellIcon size={ICON.md} />}
            hint="هر اعلانی که Qio بفرستد اینجا می‌ماند — تا وقتی برنامه بسته شود."
          />
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className={`alert-row${item.read ? '' : ' unread'} source-${item.source}`}
            onClick={() => {
              if (!item.read) void window.qio.alerts.read(item.id)
            }}
          >
            <span className="alert-icon">
              <NudgeIcon kind={item.kind} size={ICON.sm} />
            </span>
            <div className="alert-body">
              <div className="alert-title-row">
                <strong className="alert-title" dir="auto">
                  {item.title}
                </strong>
                <span className="alert-time">{relativeTime(item.at)}</span>
              </div>
              {item.detail && (
                <span className="alert-detail" dir="auto">
                  {item.detail}
                </span>
              )}
              <div className="alert-foot">
                <span className="alert-app">{item.source === 'windows' ? (item.app ?? 'ویندوز') : 'Qio'}</span>
                {item.actions.length > 0 && (
                  <span className="alert-actions">
                    {item.actions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        className={`alert-action${action.primary ? ' primary' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          run(item, action)
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </span>
                )}
              </div>
            </div>
            {!item.read && <span className="alert-dot" aria-hidden="true" />}
          </div>
        ))}
      </div>

      <div className="alerts-foot">
        <span>
          {unread > 0
            ? `${toPersianDigits(unread)} اعلان خوانده‌نشده از ${toPersianDigits(items.length)}`
            : `${toPersianDigits(items.length)} اعلان`}
        </span>
        {items.length > 0 && (
          <button
            type="button"
            className="mini-button"
            title="پاک کردن فهرست"
            onClick={() => void window.qio.alerts.clear()}
          >
            <CloseIcon size={ICON.xs} />
            پاک کردن
          </button>
        )}
      </div>

      <span className="alerts-note">
        {windowsOn
          ? 'اعلان‌های ویندوز فقط خوانده می‌شوند؛ پاسخ فقط برای اعلان‌های Qio فرستاده می‌شود.'
          : 'برای دیدن اعلان‌های ویندوز، آینه‌سازی را در تنظیمات روشن کن.'}
      </span>
    </div>
  )
}
