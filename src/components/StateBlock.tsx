import type { ReactNode } from 'react'
import { IconAlert, IconEmpty } from './icons'
export function LoadingBlock({ rows = 5, columns = 5, bare = false }: { rows?: number; columns?: number; bare?: boolean }) {
  return (
    <div className={bare ? undefined : 'table-card'} aria-busy="true" aria-live="polite">
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
  bare?: boolean
}
export function EmptyBlock({ title, hint, action, bare = false }: EmptyBlockProps) {
  return (
    <div className={bare ? undefined : 'table-card'}>
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
  bare?: boolean
}
export function ErrorBlock({ error, onRetry, bare = false }: ErrorBlockProps) {
  const timedOut = error.status === 0
  return (
    <div className={bare ? undefined : 'table-card'}>
      <div className="state">
        <span className="state__icon" style={{ color: 'var(--c-red)' }}>
          <IconAlert />
        </span>
        <p className="state__title">{timedOut ? '连不上服务器' : '这一屏没取到数据'}</p>
        {!timedOut && error.message ? <p className="state__hint">{error.message}</p> : null}
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

/** 搜索没命中时的「清空搜索」，四个列表页共用 */
export function ClearSearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn btn--ghost" onClick={onClick}>
      清空搜索
    </button>
  )
}
