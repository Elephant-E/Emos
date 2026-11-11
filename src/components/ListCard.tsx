import type { ReactNode } from 'react'

/**
 * 列表卡片：表格外面那层 `.table-card`，用条数、首条 ID、总数判定「换了一份列表」，
 * 让翻页/换筛选时淡入动画重放一次。
 */
export function ListCard<T>({
  items,
  total,
  idKey,
  scope,
  children,
}: {
  items: readonly T[]
  total: number
  /** 取首条记录的 ID，用作「换了一份数据」的判据 */
  idKey: (item: T) => string | number | undefined | null
  /** 同一页内切换分类/范围时也需重放动画，传个区分值 */
  scope?: string | number
  children: ReactNode
}) {
  const first = items.length > 0 ? (idKey(items[0]) ?? '') : ''
  return (
    <div className="table-card content-in" key={`${scope ?? ''}-${items.length}-${first}-${total}`}>
      {children}
    </div>
  )
}
