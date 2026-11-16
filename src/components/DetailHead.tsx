import type { ReactNode } from 'react'

/**
 * 详情页页头：左边一张图，右边一段文字。
 *
 * 影片、片单、用户三处原本各写一遍同样的结构（`.detail-head > __row > 图 + __text`），
 * 图片比例、间距、文本层级各不相同。这里统一成一个组件：
 *
 * - `media`：可选的左侧图片；不传时整行都是文字（详情头不再强制带图）
 * - `chips`：状态徽标与标签那一行（可空）
 * - `children`：自由内容（描述、统计），按顺序排在 chips 下面
 */
export function DetailHead({
  media,
  chips,
  children,
}: {
  media?: ReactNode
  chips?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="detail-head">
      <div className={`detail-head__row${media ? '' : ' detail-head__row--text-only'}`}>
        {media}
        <div className="detail-head__text">
          {chips ? <div className="detail-head__chips">{chips}</div> : null}
          {children}
        </div>
      </div>
    </section>
  )
}

/** 详情页头里的统计块：数值在上、说明在下，等距排开 */
export function DetailStats({ items }: { items: Array<{ value: ReactNode; label: string }> }) {
  return (
    <div className="detail-stats">
      {items.map((item) => (
        <div className="detail-stat" key={item.label}>
          {item.value}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
