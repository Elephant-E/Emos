import type { ReactNode } from 'react'

/** 详情页页头：只放文字。`chips` 是徽标行，`children`（描述、统计）按顺序排在下面。 */
export function DetailHead({
  chips,
  children,
}: {
  chips?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="detail-head">
      <div className="detail-head__row">
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
