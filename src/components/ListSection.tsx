import type { ReactNode } from 'react'
import { EmptyBlock, ErrorBlock, LoadingBlock, LoadingGrid, LoadingRows } from './StateBlock'
import { ListCard } from './ListCard'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { InfiniteSentinel } from './InfiniteSentinel'

/**
 * 列表页的「卡片 + 四态 + 分页器」外壳。
 *
 * 站内原来每个列表页各写一遍：`error ? ErrorBlock : isLoading ? LoadingBlock :
 * items.length === 0 ? EmptyBlock : <ListCard>…</ListCard>`，共 15 处。
 * 手写版经常漏两种情形——页码越界被说成「本来就没有」、分页器在空态里消失。
 * 这里一次说清：
 *
 * - 出错 → 错误块（带重试）
 * - 加载 → 骨架
 * - 空且 `total > 0` → 页码越界（回第一页），并保留分页器
 * - 空且 `total === 0` → 真正的空态（标题/动作由调用方给）
 * - 有数据 → 卡片 + 表格 + 分页器
 */
export function ListSection<T>({
  isLoading,
  error,
  onRetry,
  items,
  total,
  idKey,
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
  /** 手机端改为滚动加载：传了它就不再渲染分页器，滑到底部触发 onLoadMore */
  infinite,
  /** 内容自带网格（RecordGrid）时连外层容器也不要：直接渲染，只留状态块与哨兵 */
  bare = false,
  children,
}: {
  isLoading: boolean
  error: unknown
  onRetry: () => void
  items: readonly T[]
  total: number
  idKey: (item: T) => string | number | undefined | null
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
  // 同时手机不需要页码控件——滑到底部自动续下一页
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

  return (
    <ListCard items={items} total={total} idKey={idKey} scope={scope}>
      {children}
    </ListCard>
  )
}
