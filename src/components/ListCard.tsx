import type { ReactNode } from 'react'

/**
 * 列表卡片：表格外面那层 `.table-card`。
 *
 * key 只跟 scope（筛选条件）走——以前把 items.length / total 也拼进 key，
 * 滚动加载追加一页就会整段重挂：淡入动画重放、滚动位置跳回顶部。
 */
export function ListCard({
  scope,
  children,
}: {
  /** 筛选条件：变了才重放淡入动画 */
  scope?: string | number
  children: ReactNode
}) {
  return (
    <div className="table-card content-in" key={String(scope ?? 'all')}>
      {children}
    </div>
  )
}
