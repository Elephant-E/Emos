import type { ReactNode } from 'react'
import { EmptyBlock, ErrorBlock, LoadingBlock, LoadingGrid, LoadingRows } from './StateBlock'
import { ListCard } from './ListCard'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { InfiniteSentinel } from './InfiniteSentinel'

/**
 * 列表页的「四态 + 容器」外壳。
 *
 * 站内每个列表页原本各写一遍 `error ? ErrorBlock : isLoading ? LoadingBlock :
 * items.length === 0 ? EmptyBlock : …`，经常漏掉某种情形。这里一次说清：
 *
 * - 出错 → 错误块（带重试）
 * - 加载 → 与真实内容同形的骨架（行卡片 / 网格 / 表格）
 * - 空 → 空态（标题与动作由调用方给）
 * - 有数据 → 内容 + 触底哨兵（滚动加载；分页器已全站移除）
 *
 * 容器由三个开关决定：`bare`（内容自带网格，不套任何壳）、`cardList`（手机端卡片列表）、
 * 默认则套一层 `.table-card`。
 */
export function ListSection<T>({
  isLoading,
  error,
  onRetry,
  items,
  scope,
  emptyTitle,
  emptyAction,
  emptyHint,
  loadingRows = 8,
  loadingCols = 5,
  gridShape = 'poster',
  loadingKind,
  /** 内容在手机端是卡片列表：卡片自带边框，外层就不要再套一层 .table-card */
  cardList = false,
  /** 滚动加载：滑到底部触发 onLoadMore（不传就只渲染当前这批） */
  infinite,
  /** 内容自带网格（RecordGrid）时连外层容器也不要：直接渲染，只留状态块与哨兵 */
  bare = false,
  children,
}: {
  isLoading: boolean
  error: unknown
  onRetry: () => void
  items: readonly T[]
  scope?: string | number
  emptyTitle: string
  emptyAction?: ReactNode
  emptyHint?: string
  loadingRows?: number
  loadingCols?: number
  /** 网格骨架的图片比例（bare 页用） */
  gridShape?: 'poster' | 'wide' | 'square'
  /** 骨架形态：默认按 bare 推断（网格 / 表格），行卡片页显式指定 rows */
  loadingKind?: 'table' | 'grid' | 'rows' | 'single-rows'
  cardList?: boolean
  infinite?: { hasMore: boolean; loading: boolean; onLoadMore: () => void }
  bare?: boolean
  children: ReactNode
}) {
  const compact = useMediaQuery('(max-width: 600px)')

  if (error) return <ErrorBlock error={error} onRetry={onRetry} />
  if (isLoading) {
    // 骨架与真实内容同形：行卡片 / 网格 / 表格各给各的
    if (loadingKind === 'single-rows') return <LoadingRows count={loadingRows} single />
    if (loadingKind === 'rows') return <LoadingRows count={loadingRows} />
    if (loadingKind === 'grid' || (bare && loadingKind !== 'table')) {
      return <LoadingGrid count={loadingRows} shape={gridShape} />
    }
    return <LoadingBlock rows={loadingRows} columns={loadingCols} />
  }

  if (items.length === 0) {
    return <EmptyBlock title={emptyTitle} hint={emptyHint} action={emptyAction} />
  }

  // 内容自带网格：不要再套任何容器，否则就是「一层套一层」
  if (bare) {
    return (
      <>
        {children}
        {infinite ? <InfiniteSentinel onLoadMore={infinite.onLoadMore} disabled={!infinite.hasMore} loading={infinite.loading} /> : null}
      </>
    )
  }

  // 手机端的卡片列表已经有自己的边框，外面再套 .table-card 就成了一层套一层；
  // 卡片列表自带边框，外面不要再套一层;也无需页码控件——滑到底部自动续页
  if (cardList && compact) {
    return (
      <div className="record-section">
        {children}
        {infinite ? (
          <InfiniteSentinel onLoadMore={infinite.onLoadMore} disabled={!infinite.hasMore} loading={infinite.loading} />
        ) : null}
      </div>
    )
  }

  // 兜底分支（列表卡）：桌面同样要有哨兵，否则只能看到第一批
  return (
    <ListCard scope={scope}>
      {children}
      {infinite ? <InfiniteSentinel onLoadMore={infinite.onLoadMore} disabled={!infinite.hasMore} loading={infinite.loading} /> : null}
    </ListCard>
  )
}
