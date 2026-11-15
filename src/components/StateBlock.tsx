import type { ReactNode } from 'react'
import { IconAlert, IconEmpty } from './icons'
/** 网格列表的骨架：与 RecordGrid 的卡片同形（图片位 + 两行文字），换页不跳 */
export function LoadingGrid({ count = 10, shape = 'poster' }: { count?: number; shape?: 'poster' | 'wide' | 'square' }) {
  return (
    <div className={`record-grid record-grid--${shape}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="record-tile">
          <div className={`record-tile__media record-tile__media--${shape} skeleton`} style={{ boxShadow: 'none' }}>
            {/* 右上角标位置也留出来，加载完不要在视觉上跳一下 */}
            <div className="record-tile__badges">
              <span className="skeleton" style={{ width: 34, height: 20 }} />
            </div>
          </div>
          <div className="record-tile__body">
            <div className="skeleton" style={{ height: 13, width: '62%' }} />
            <div className="skeleton" style={{ height: 11, width: '38%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function LoadingBlock({ rows = 5, columns = 5, bare = false }: { rows?: number; columns?: number; bare?: boolean }) {
  return (
    <div className={bare ? undefined : 'table-card'} aria-busy="true" aria-live="polite">
      <div style={{ padding: 'var(--sp-4)' }}>
        <div className="skeleton" style={{ height: 14, width: '22%', marginBottom: 'var(--gap-card)' }} />
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} style={{ display: 'flex', gap: 'var(--sp-4)', marginBottom: 'var(--stack)', alignItems: 'center' }}>
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
        <p className="state__title" role="alert">{title}</p>
        {hint ? <p className="state__hint">{hint}</p> : null}
        {action ? <div className="state__actions">{action}</div> : null}
      </div>
    </div>
  )
}
interface ErrorBlockProps {
  error: unknown
  onRetry?: () => void
  bare?: boolean
}
export function ErrorBlock({ error, onRetry, bare = false }: ErrorBlockProps) {
  const status = (error as { status?: number } | null)?.status
  const message = error instanceof Error ? error.message : ''
  const timedOut = status === 0
  return (
    <div className={bare ? undefined : 'table-card'}>
      <div className="state">
        <span className="state__icon" style={{ color: 'var(--c-red)' }}>
          <IconAlert />
        </span>
        <p className="state__title" role="alert">{timedOut ? '连不上服务器' : '这一屏没取到数据'}</p>
        {!timedOut && message ? <p className="state__hint">{message}</p> : null}
        {onRetry ? (
          <div className="state__actions">
            <button type="button" className="btn btn--ghost" onClick={onRetry}>
              重试
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** 搜索没命中时的「清空搜索」，四个列表页共用 */
export function ClearSearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn btn--ghost" onClick={onClick}>
      清空搜索
    </button>
  )
}

/**
 * 页码越界：列表为空但页码 > 1。
 * 与「本来就没有内容」区分开，并给一个回第一页的出口——
 * 否则用户被困在当前页，只能手改 URL。
 */
