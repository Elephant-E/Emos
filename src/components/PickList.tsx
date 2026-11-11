import type { ReactNode } from 'react'

/**
 * 「搜索 → 选一条」的候选列表。
 * 行内容各页不同，这里只管容器：高度上限、滚动、加载与无结果。
 */
export function PickList({
  loading,
  query,
  count,
  emptyText,
  children,
}: {
  loading?: boolean
  query?: string
  count: number
  /** 无结果时的那句话；不传就是「没有找到「x」」 */
  emptyText?: string
  children: ReactNode
}) {
  return (
    <div className="pick-list">
      {loading ? <p className="muted">搜索中…</p> : null}
      {children}
      {!loading && query?.trim() && count === 0 ? (
        <p className="muted">{emptyText ?? `没有找到「${query.trim()}」`}</p>
      ) : null}
    </div>
  )
}
