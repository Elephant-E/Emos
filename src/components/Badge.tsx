import type { ReactNode } from 'react'

export type BadgeTone = 'ok' | 'wait' | 'run' | 'warn' | 'off' | 'danger'

/**
 * 状态徽标。站内原本两种写法混用：有的带 `<i />` 圆点、有的不带，
 * 色调靠手写 `badge badge--ok` 字符串，状态与颜色的对应关系散在三张映射表里。
 *
 * 这里统一成「圆点 + 文案」，色调只允许这几种，状态映射表留在各页的字典里。
 */
export function Badge({
  tone = 'off',
  children,
  dot = true,
  title,
}: {
  tone?: BadgeTone
  children: ReactNode
  /** 需要纯文字标签（如「官方」）时关掉圆点 */
  dot?: boolean
  title?: string
}) {
  return (
    <span className={`badge badge--${tone}`} title={title}>
      {dot ? <i /> : null}
      {children}
    </span>
  )
}
