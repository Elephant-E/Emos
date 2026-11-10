import type { ReactNode } from 'react'

/**
 * 「搜索 → 选一条」的候选列表。
 *
 * 弹窗里按名字搜一条记录、点一下选中，这个动作在四个地方各写了一遍
 * （影片详情移资源、片单加影片、片单加歌曲、上传选影片），
 * 连「搜索中…」和「没有找到「x」」两句文案都一样。
 *
 * 行内容各页不同，所以这里只管容器：高度上限、滚动、加载与无结果。
 */
export function PickList({
  loading,
  query,
  count,
  children,
}: {
  loading?: boolean
  query?: string
  count: number
  children: ReactNode
}) {
  return (
    <div className="pick-list">
      {loading ? <p className="muted">搜索中…</p> : null}
      {children}
      {!loading && query?.trim() && count === 0 ? <p className="muted">没有找到「{query.trim()}」</p> : null}
    </div>
  )
}
