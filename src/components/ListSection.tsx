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
 * - 加载 → 与真实内容同形的骨架（`loadingKind` 决定行卡 / 网格 / 单行）
 * - 空 → 空态（标题与动作由调用方给）
 * - 有数据 → 内容 + 触底哨兵（滚动加载；分页器已全站移除）
 *
 * 列表本身就是卡片，不再套额外的壳层；内容自带网格（`RecordGrid`）时也不加容器。
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
    // 「还有下一页」时不能落到空态：有些页面是拿回一页后在本地再筛一次
    // （上游忽略 is_pay 之类的过滤参数），本页可能一条都不命中。
    // 这时要用哨兵继续往下取，否则用户看到「没有结果」却再也不会加载第 2 页。
    if (infinite?.hasMore) {
      return (
        <>
          <p className="card-note">本页没有符合条件的结果，正在继续加载…</p>
          <InfiniteSentinel
            onLoadMore={infinite.onLoadMore}
            disabled={false}
            loading={infinite.loading}
          />
        </>
      )
    }
    return <EmptyBlock title={emptyTitle} hint={emptyHint} action={emptyAction} />
  }

  // 续页时在列表后面补两三条同形骨架：用户能看出「正在加载更多」，
  // 而不是盯着列表尾部以为加载不动了
  const moreSkeleton = infinite?.loading ? (
    loadingKind === 'grid' ? (
      <LoadingGrid count={gridShape === 'poster' ? 4 : 3} shape={gridShape} badges={loadingBadges} lines={loadingLines} />
    ) : (
      <LoadingRows
        count={2}
        single={loadingKind === 'single-rows'}
        poster={loadingPoster}
        lines={loadingLines}
        actions={loadingActions}
        extra={loadingExtra}
        fullActions={loadingFullActions}
        multi={loadingMulti}
        value={loadingValue}
      />
    )
  ) : null

  return (
    <>
      {children}
      {moreSkeleton}
      {infinite && (infinite.hasMore || infinite.loading) ? (
        <InfiniteSentinel onLoadMore={infinite.onLoadMore} disabled={!infinite.hasMore} loading={infinite.loading} />
      ) : null}
    </>
  )
}
