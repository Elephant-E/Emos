import type { ReactNode } from 'react'

/**
 * 列表卡片：表格外面那层 `.table-card`。
 *
 * 十一处都是同一个写法 —— `key={`${items.length}-${items[0]?.id}-${total}`}`
 * 套在 `content-in` 上，作用是翻页/换筛选时让淡入动画重放一次。
 * 每处都要自己手算一遍 key，字段名各写一次，还有一处（用户搜索）
 * 只用了条数，翻页后条数相同时动画就不重放。
 *
 * 这里把「什么时候算换了一份列表」收进来：条数、首条 ID、总数，
 * 加上一个可选的 scope（同一页里切 tab 也要重放时传）。
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
