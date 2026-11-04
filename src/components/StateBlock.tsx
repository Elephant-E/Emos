import type { ReactNode } from 'react'
import { IconAlert, IconEmpty } from './icons'
export function LoadingBlock({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="table-card" aria-busy="true" aria-live="polite">
      <div style={{ padding: 16 }}>
        <div className="skeleton" style={{ height: 14, width: '22%', marginBottom: 18 }} />
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} style={{ display: 'flex', gap: 16, marginBottom: 14, alignItems: 'center' }}>
            <div className="skeleton" style={{ height: 40, width: 34, flex: 'none' }} />
            {Array.from({ length: columns }).map((__, c) => (
              <div
                key={c}
                className="skeleton"
                style={{ height: 12, flex: c === 0 ? 2 : 1, maxWidth: c === 0 ? 260 : 120 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
interface EmptyBlockProps {
  title: string
  hint?: string
  action?: ReactNode
}
export function EmptyBlock({ title, hint, action }: EmptyBlockProps) {
  return (
    <div className="table-card">
      <div className="state">
        <span className="state__icon">
          <IconEmpty />
        </span>
        <p className="state__title">{title}</p>
        {hint ? <p className="state__hint">{hint}</p> : null}
        {action ? <div className="state__actions">{action}</div> : null}
      </div>
    </div>
  )
}
interface ErrorBlockProps {
  error: Error & { status?: number }
  onRetry?: () => void
}
export function ErrorBlock({ error, onRetry }: ErrorBlockProps) {
  const timedOut = error.status === 0
  return (
    <div className="table-card">
      <div className="state">
        <span className="state__icon" style={{ color: 'var(--c-red)' }}>
          <IconAlert />
        </span>
        <p className="state__title">{timedOut ? '连不上服务器' : '这一屏没取到数据'}</p>
        <p className="state__hint">
          {timedOut
            ? '网络请求没有到达服务器。检查网络或稍后重试。'
            : error.message || '接口返回了错误。如果是权限问题，请联系管理员。'}
        </p>
        <div className="state__actions">
          {onRetry ? (
            <button className="btn btn--ghost" onClick={onRetry}>
              重试
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
