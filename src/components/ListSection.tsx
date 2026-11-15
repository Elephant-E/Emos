import type { ReactNode } from 'react'
import { EmptyBlock, ErrorBlock, LoadingBlock, OutOfRangeBlock } from './StateBlock'
import { ListCard } from './ListCard'
import { Pager } from './Pager'

/**
 * 列表页的「卡片 + 四态 + 分页器」外壳。
 *
 * 站内原来每个列表页各写一遍：`error ? ErrorBlock : isLoading ? LoadingBlock :
 * items.length === 0 ? EmptyBlock : <ListCard>…<Pager/></ListCard>`，共 15 处。
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
  page,
  pageSize,
  onPage,
  onPageSize,
  sizes,
  idKey,
  scope,
  emptyTitle,
  emptyAction,
  emptyHint,
  loadingRows = 8,
  loadingCols = 5,
  paginated = true,
  outOfRange,
  children,
}: {
  isLoading: boolean
  error: unknown
  onRetry: () => void
  items: readonly T[]
  total: number
  page: number
  pageSize: number
  onPage: (page: number) => void
  onPageSize?: (size: number) => void
  sizes?: readonly number[]
  idKey: (item: T) => string | number | undefined | null
  scope?: string | number
  emptyTitle: string
  emptyAction?: ReactNode
  emptyHint?: string
  loadingRows?: number
  loadingCols?: number
  /** 一次取全的列表（封禁列表等）关掉分页器 */
  paginated?: boolean
  /**
   * 显式声明「空是因为页码越界」。
   * 有些页面在客户端二次筛选（订单的支付/发货/关键词），此时 `total > 0` 也可能只是
   * 「这页被筛掉了」，不能一律当成越界——那种页面自己算好传进来。
   */
  outOfRange?: boolean
  children: ReactNode
}) {
  const pager = paginated ? (
    <Pager total={total} page={page} pageSize={pageSize} onPage={onPage} onPageSize={onPageSize} sizes={sizes} />
  ) : null

  if (error) return <ErrorBlock error={error} onRetry={onRetry} />
  if (isLoading) return <LoadingBlock rows={loadingRows} columns={loadingCols} />

  if (items.length === 0) {
    // 总条数不为 0 说明是页码越界，不是「本来就没有」（调用方也可显式指定）
    if (outOfRange ?? (paginated && total > 0)) {
      return (
        <div className="table-card">
          <OutOfRangeBlock onFirstPage={() => onPage(1)} />
          {pager}
        </div>
      )
    }
    return <EmptyBlock title={emptyTitle} hint={emptyHint} action={emptyAction} />
  }

  return (
    <ListCard items={items} total={total} idKey={idKey} scope={scope}>
      {children}
      {pager}
    </ListCard>
  )
}
