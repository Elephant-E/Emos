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

/** 行卡片骨架：与 RecordRow 同形（封面 + 标题/信息 + 字段行 + 三键） */
export function LoadingRows({ count = 6, single = false }: { count?: number; single?: boolean }) {
  if (single) {
    // 单列（管理型）列表：小图 72×108 + 信息条 + 右侧动作条
    return (
      <div className="record-rows record-rows--single" aria-busy="true" aria-live="polite">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="record-row">
            <div className="record-row__media skeleton" style={{ height: 108 }} />
            <div className="record-row__body">
              <div className="skeleton" style={{ height: 14, width: '46%' }} />
              <div className="skeleton" style={{ height: 11, width: '30%' }} />
              <div className="skeleton" style={{ height: 11, width: '38%' }} />
            </div>
            <div className="record-row__actions">
              <div className="skeleton" style={{ width: 56, height: 30, borderRadius: 'var(--r-item)' }} />
              <div className="skeleton" style={{ width: 64, height: 30, borderRadius: 'var(--r-item)' }} />
              <div className="skeleton" style={{ width: 48, height: 30, borderRadius: 'var(--r-item)' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="record-rows" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="record-row">
          {/* 封面位按 2:3 撑开，与真实卡片同高，避免加载完高度跳一下 */}
          <div className="record-row__media skeleton" style={{ height: 168 }} />
          <div className="record-row__body">
            <div className="skeleton" style={{ height: 14, width: '58%' }} />
            <div className="skeleton" style={{ height: 20, width: 56, borderRadius: 999 }} />
          </div>
          <div className="record-row__extra">
            {[0, 1, 2].map((r) => (
              <div key={r} className="skeleton" style={{ height: 22, marginTop: r === 0 ? 0 : 2 }} />
            ))}
          </div>
          <div className="record-row__actions record-row__actions--full">
            {[0, 1, 2].map((b) => (
              <div key={b} className="skeleton" style={{ height: 36, borderRadius: 'var(--r-item)' }} />
            ))}
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
