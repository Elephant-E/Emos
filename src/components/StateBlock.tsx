import type { ReactNode } from 'react'
import { IconAlert, IconEmpty } from './icons'
/** 网格列表的骨架：与 RecordGrid 的卡片同形（图片位 + 两行文字），换页不跳 */
export function LoadingGrid({
  count = 10,
  shape = 'poster',
  badges = false,
  lines = 2,
}: {
  count?: number
  shape?: 'poster' | 'wide' | 'square'
  /** 真实卡片右上角有角标时才留角标位，否则骨架会多出一个永远不出现的胶囊 */
  badges?: boolean
  /** 文字行数：影库/片单是标题 + 次要信息两行，商品卡多一行价格 */
  lines?: number
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
            {Array.from({ length: lines }).map((_, line) => (
              <div
                key={line}
                className="skeleton"
                style={{ height: line === 0 ? 14 : 12, width: line === 0 ? '62%' : line === 1 ? '38%' : '48%' }}
              />
            ))}
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
  value = false,
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
  /** 真实行右侧有数值列（榜单分数、资金金额）时留出同样的位置 */
  value?: boolean
}) {
  // 封面尺寸必须跟真实行一致：信息型单列（片单详情）的封面是 72 宽、按 2:3 得到 108 高，
  // 高列（订单、榜单）是 112×168；方图统一 72×72。写错就会比真实行高或矮一截
  const posterSize =
    poster === 'poster'
      ? single
        ? { width: 72, height: 108 }
        : { width: 112, height: 168 }
      : poster === 'square'
        ? { width: 72, height: 72 }
        : null
  const lineWidths = ['46%', '62%', '52%']

  return (
    <div
      className={`record-rows${single ? ' record-rows--single' : ''}${multi ? ' record-rows--multi' : ''}`}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`record-row${posterSize ? '' : ' record-row--plain'}`}>
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
                // 行高按真实文字量给：标题 ~20px、次要行 ~16px，否则骨架比真实行矮一截
                style={{ height: line === 0 ? 20 : 16, width: lineWidths[Math.min(line, lineWidths.length - 1)] }}
              />
            ))}
          </div>
          {actions > 0 || value ? (
            <div className={`record-row__actions${fullActions ? ' record-row__actions--full' : ''}`}>
              {Array.from({ length: actions }).map((__, action) => (
                <div
                  key={action}
                  className="skeleton"
                  style={{ width: fullActions ? undefined : 56, height: 32, borderRadius: 'var(--r-item)' }}
                />
              ))}
              {value ? (
                <span className="record-row__value">
                  <span className="skeleton" style={{ display: 'block', width: '100%', height: 16 }} />
                </span>
              ) : null}
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

interface EmptyBlockProps {
  title: string
  hint?: string
  action?: ReactNode
}
export function EmptyBlock({ title, hint, action }: EmptyBlockProps) {
  return (
    <div>
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
}
export function ErrorBlock({ error, onRetry }: ErrorBlockProps) {
  const status = (error as { status?: number } | null)?.status
  const message = error instanceof Error ? error.message : ''
  const timedOut = status === 0
  return (
    <div>
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
