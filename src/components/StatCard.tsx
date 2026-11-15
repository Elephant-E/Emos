import type { ReactNode } from 'react'
import { CardHead } from './CardHead'

/**
 * 大数字卡片：标签 → 数值（可带单位）→ 一行说明，数值 44px。
 * action 是卡片头右侧的操作（如「胡萝卜余额」上的「转赠」），有它时标签行改用 CardHead。
 */
export function StatCard({
  label,
  value,
  unit,
  note,
  action,
  tone,
  word,
  loud,
  secondary,
}: {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  note?: ReactNode
  action?: ReactNode
  /** 数值用警示色（封禁、欠费等） */
  tone?: 'danger'
  /** 数值本身是文字而不是数字，用小一号 */
  word?: boolean
  /** 说明用强调色（默认是弱色） */
  loud?: boolean
  /** 次要指标：数值降到 30px，一屏只留一个 44px 的主数字 */
  secondary?: boolean
}) {
  return (
    <article className={secondary ? 'card card--stat card--secondary' : 'card card--stat'}>
      {action ? <CardHead title={label}>{action}</CardHead> : <p className="stat__label">{label}</p>}
      <p className="stat__value" style={tone === 'danger' ? { color: 'var(--c-red)' } : undefined}>
        {word ? <span className="stat__word stat__word--sm">{value}</span> : value}
        {/* 值是破折号时不拼单位，否则会渲染成「— 个」并在窄列里被拆开 */}
        {unit && value !== '—' ? <small>{unit}</small> : null}
      </p>
      {note ? <p className={loud ? 'stat__delta' : 'stat__delta stat__delta--quiet'}>{note}</p> : null}
    </article>
  )
}
