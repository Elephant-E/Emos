import type { ReactNode } from 'react'
import { EmptyBlock, ErrorBlock, LoadingGrid, LoadingRows } from './StateBlock'
import { InfiniteSentinel } from './InfiniteSentinel'

/**
 * 列表页的「四态 + 容器」外壳。
 *
 * 站内每个列表页原本各写一遍 `error ? ErrorBlock : isLoading ? 骨架 :
 * items.length === 0 ? EmptyBlock : …`，经常漏掉某种情形。这里一次说清：
 *
 * - 出错 → 错误块（带重试）
 * - 加载 → 与真实内容同形的骨架（行卡片 / 网格 / 表格）
 * - 空 → 空态（标题与动作由调用方给）
 * - 有数据 → 内容 + 触底哨兵（滚动加载；分页器已全站移除）
 *
 * 容器由三个开关决定：``（内容自带网格，不套任何壳）、`cardList`（手机端卡片列表）、
 * 默认则套一层 `.table-card`。
 */
export function ListSection<T>({
  isLoading,
  error,
  onRetry,
  items,
  emptyTitle,
  emptyAction,
  emptyHint,
  loadingRows = 8,
  gridShape = 'poster',
  loadingKind,
  loadingPoster = 'poster',
  loadingLines = 2,
  loadingActions = 2,
  loadingExtra = false,
  loadingFullActions = false,
  loadingMulti = false,
  loadingValue = false,
  loadingBadges = false,
  /** 滚动加载：滑到底部触发 onLoadMore（不传就只渲染当前这批） */
  infinite,
  children,
}: {
  isLoading: boolean
  error: unknown
  onRetry: () => void
  items: readonly T[]
  emptyTitle: string
  emptyAction?: ReactNode
  emptyHint?: string
  loadingRows?: number
  /** 网格骨架的图片比例（ 页用） */
  gridShape?: 'poster' | 'wide' | 'square'
  /** 骨架形态：默认按  推断（网格 / 表格），行卡片页显式指定 rows */
  loadingKind: 'grid' | 'rows' | 'single-rows'
  /** 行骨架的封面形态：跟真实行一致，避免加载完高度塌一次 */
  loadingPoster?: 'poster' | 'square' | 'none'
  /** 行骨架的文字行数 */
  loadingLines?: number
  /** 行骨架的动作按钮个数（0 = 该列表没有操作列） */
  loadingActions?: number
  /** 行骨架是否带跨整行的信息块 */
  loadingExtra?: boolean
  /** 动作是否等分成整行 */
  loadingFullActions?: boolean
  /** 骨架是否多列（求片这类待办型列表） */
  loadingMulti?: boolean
  loadingValue?: boolean
  /** 网格骨架是否留右上角角标位（卡片上真有角标才传） */
  loadingBadges?: boolean
  infinite?: { hasMore: boolean; loading: boolean; onLoadMore: () => void }
  children: ReactNode
}) {

  // 列表自己就是卡片：不再套 .table-card / .record-section 那层历史容器
  if (error) return <ErrorBlock error={error} onRetry={onRetry} />
  if (isLoading) {
    if (loadingKind === 'single-rows') {
      return (
        <LoadingRows
          count={loadingRows}
          single
          poster={loadingPoster}
          lines={loadingLines}
          actions={loadingActions}
          value={loadingValue}
        />
      )
    }
    if (loadingKind === 'rows') {
      return (
        <LoadingRows
          count={loadingRows}
          poster={loadingPoster}
          lines={loadingLines}
          actions={loadingActions}
          extra={loadingExtra}
          fullActions={loadingFullActions}
          multi={loadingMulti}
          value={loadingValue}
        />
      )
    }
    // 网格卡片没有动作列（商品卡的购买键在 LoadingGrid 里单独传）
    return <LoadingGrid count={loadingRows} shape={gridShape} badges={loadingBadges} lines={loadingLines} />
  }

  if (items.length === 0) {
    return <EmptyBlock title={emptyTitle} hint={emptyHint} action={emptyAction} />
  }

  return (
    <>
      {children}
      {infinite && (infinite.hasMore || infinite.loading) ? (
        <InfiniteSentinel onLoadMore={infinite.onLoadMore} disabled={!infinite.hasMore} loading={infinite.loading} />
      ) : null}
    </>
  )
}
