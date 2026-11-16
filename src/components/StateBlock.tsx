import type { ReactNode } from 'react'
import { IconAlert, IconEmpty } from './icons'
/** 网格列表的骨架：与 RecordGrid 的卡片同形（图片位 + 两行文字），换页不跳 */
export function LoadingGrid({
  count = 10,
  shape = 'poster',
  badges = false,
}: {
  count?: number
  shape?: 'poster' | 'wide' | 'square'
  /** 真实卡片右上角有角标时才留角标位，否则骨架会多出一个永远不出现的胶囊 */
  badges?: boolean
}) {
  return (
    <div className={`record-grid record-grid--${shape}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="record-tile">
          <div className={`record-tile__media record-tile__media--${shape} skeleton`} style={{ boxShadow: 'none' }}>
            {badges ? (
              <div className="record-tile__badges">
                <span className="skeleton" style={{ width: 34, height: 20 }} />
              </div>
            ) : null}
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

/**
 * 行卡片骨架：与 RecordRow 同形。
 *
 * 真实行之间有差异（有没有封面、有没有信息块、动作几个），骨架也要跟着变，
 * 否则「加载中」和「加载完」是两种形状，页面会塌一次。
 */
export function LoadingRows({
  count = 6,
  single = false,
  poster = 'poster',
  lines = 3,
  actions = 2,
  extra = false,
  fullActions = false,
  multi = false,
}: {
  count?: number
  /** 管理型单列（小图 + 右侧动作） */
  single?: boolean
  /** 封面形态：与真实行一致 */
  poster?: 'poster' | 'square' | 'none'
  /** 文字行数（标题 + meta + facts） */
  lines?: number
  /** 动作按钮个数，0 表示这一列列表没有操作 */
  actions?: number
  /** 是否有跨整行的信息块（求片的「求片记录」这类） */
  extra?: boolean
  /** 动作是否等分成整行（求片三键） */
  fullActions?: boolean
  /** 待办型多列布局：与 RecordRow 的 multi 对应 */
  multi?: boolean
}) {
  const posterSize =
    poster === 'poster' ? { width: 112, height: 168 } : poster === 'square' ? { width: 72, height: 72 } : null
  const lineWidths = ['46%', '62%', '52%']

  return (
    <div
      className={`record-rows${single ? ' record-rows--single' : ''}${multi ? ' record-rows--multi' : ''}`}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="record-row">
          {posterSize ? (
            <div
              className="record-row__media skeleton"
              style={{ width: posterSize.width, height: posterSize.height }}
            />
          ) : null}
          <div className="record-row__body">
            {Array.from({ length: lines }).map((__, line) => (
              <div
                key={line}
                className="skeleton"
                style={{ height: line === 0 ? 14 : 12, width: lineWidths[Math.min(line, lineWidths.length - 1)] }}
              />
            ))}
          </div>
          {actions > 0 ? (
            <div className={`record-row__actions${fullActions ? ' record-row__actions--full' : ''}`}>
              {Array.from({ length: actions }).map((__, action) => (
                <div
                  key={action}
                  className="skeleton"
                  style={{ width: fullActions ? undefined : 56, height: 32, borderRadius: 'var(--r-item)' }}
                />
              ))}
            </div>
          ) : null}
          {/* 信息块按真实块的三行高度占位（求片的「求片记录」就是这个形状） */}
          {extra ? (
            <div className="record-row__extra">
              {[0, 1, 2].map((row) => (
                <div key={row} className="skeleton" style={{ height: 22, marginTop: row === 0 ? 0 : 2 }} />
              ))}
            </div>
          ) : null}
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
